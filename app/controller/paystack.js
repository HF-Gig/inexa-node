import axios from "axios";
import db from "../../db.js";
import crypto from "crypto";
import { getStandardPricing } from "../utils/pricing.js";
import { getUsdToZarRate, usdToZarPaystackSubunits } from "../utils/usdToZar.js";
import {
    buildManualEftInstallments,
    normalizePlan,
    paystackFirstInstallmentUsd,
} from "../utils/installmentSchedule.js";
import { createReditusPayment } from "../integrations/reditus.js";
import { applyCountrySpecificCosts } from "./edxContent.js";

const PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize";
const PAYSTACK_CHARGE_AUTH_URL = "https://api.paystack.co/transaction/charge_authorization";

const PAYSTACK_PLAN_LABELS = {
    full: "One-time (full payment)",
    first_payment: "First payment (3-part plan)",
    monthly_payment: "First payment (12-month plan)",
    quarterly_payment: "First payment (4-quarter plan)",
};

/** Merge cost-config fields (e.g. payment_once_off_amount) onto course row — same as checkout API. */
const loadCourseForPaystackPricing = async (courseId, countryCode) => {
    if (!courseId) return null;
    const row = await db.courses.findByPk(courseId);
    if (!row) return null;
    const courseData = row.toJSON();
    await applyCountrySpecificCosts(courseData, countryCode);
    return courseData;
};

const paystackHeaders = () => ({
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
});

const notifyReditusFirstInstallment = async ({ reference, userId, email, amountUsd }) => {
    try {
        const amountCents = Math.round(Number(amountUsd) * 100);
        await createReditusPayment({
            idempotency_key: reference,
            referral_uid: userId,
            referral_email: email,
            amount_cents: amountCents,
            currency: "usd",
            subscription_id: reference,
            interval: "year",
            interval_count: 1,
        });
    } catch (e) {
        console.error("Reditus payment tracking error:", e.response?.data || e.message);
    }
};

/**
 * After successful Paystack card charge: subscription + payment row(s).
 * Multi-installment plans store Paystack authorization_code on subscription; cron debits pending rows.
 */
const processPaystackSuccess = async ({
    reference,
    userId,
    name,
    country,
    email,
    courseId,
    selectedPlan,
    authorization,
    customer,
    countryCode,
}) => {
    const standardPricing = getStandardPricing();
    const course = await loadCourseForPaystackPricing(courseId, countryCode);
    const planNorm = normalizePlan(selectedPlan);
    const schedule = buildManualEftInstallments({
        selectedPlan,
        course,
        standardPricing,
        currency: "usd",
    });

    const now = new Date();
    const startDate = new Date(now);
    const recurringDate = new Date(now);
    recurringDate.setFullYear(recurringDate.getFullYear() + 1);

    const firstUsd = Number(schedule[0]?.amount || 0);
    const authCode = authorization?.authorization_code || null;
    const reusable = authorization?.reusable === true;
    const customerCode =
        customer?.customer_code != null ? String(customer.customer_code) : customer?.id != null ? String(customer.id) : null;

    const subscription = await db.subscription.create({
        stripe_subscription_id: reference,
        name: name || email,
        country: country || "Unknown",
        user_id: userId,
        recurring_date: recurringDate,
        start_date: startDate,
        status: "active",
        span: "Yearly",
        amount: firstUsd,
        provider: "paystack",
        paystack_authorization_code: null,
        paystack_customer_code: null,
    });

    const multiPart = schedule.length > 1 && planNorm !== "full";

    if (!multiPart) {
        const paymentRecord = await db.payment.create({
            user_id: userId,
            course_id: courseId || null,
            amount: firstUsd,
            currency: "usd",
            status: "succeeded",
            payment_type: "subscription",
            invoice_number: reference,
            payment_method: "paystack",
            selected_plan: planNorm,
            installment_label: schedule[0]?.installmentLabel,
            installment_number: 1,
            total_installments: schedule[0]?.totalInstallments || 1,
            due_date: schedule[0]?.dueDate,
            paystack_parent_reference: reference,
        });
        await subscription.update({
            paystack_authorization_code: authCode,
            paystack_customer_code: customerCode,
        });
        await notifyReditusFirstInstallment({ reference, userId, email, amountUsd: firstUsd });
        return { subscription, paymentRecord };
    }

    if (!authCode || !reusable) {
        console.warn(
            "[Paystack] Installment plan but authorization missing or not reusable; recording first payment only. reference=",
            reference
        );
        const paymentRecord = await db.payment.create({
            user_id: userId,
            course_id: courseId || null,
            amount: firstUsd,
            currency: "usd",
            status: "succeeded",
            payment_type: "subscription",
            invoice_number: reference,
            payment_method: "paystack",
            selected_plan: planNorm,
            installment_label: schedule[0]?.installmentLabel,
            installment_number: 1,
            total_installments: schedule[0]?.totalInstallments,
            due_date: schedule[0]?.dueDate,
            paystack_parent_reference: reference,
        });
        await subscription.update({
            paystack_authorization_code: authCode,
            paystack_customer_code: customerCode,
        });
        await notifyReditusFirstInstallment({ reference, userId, email, amountUsd: firstUsd });
        return { subscription, paymentRecord };
    }

    await subscription.update({
        paystack_authorization_code: authCode,
        paystack_customer_code: customerCode,
    });

    const rows = schedule.map((item, idx) => ({
        user_id: userId,
        course_id: courseId || null,
        amount: item.amount,
        currency: item.currency,
        status: idx === 0 ? "succeeded" : "pending",
        payment_type: "subscription",
        invoice_number: idx === 0 ? reference : null,
        payment_method: "paystack",
        selected_plan: item.selectedPlan,
        installment_label: item.installmentLabel,
        installment_number: item.installmentNumber,
        total_installments: item.totalInstallments,
        due_date: item.dueDate,
        paystack_parent_reference: reference,
    }));

    const created = await db.payment.bulkCreate(rows);
    await notifyReditusFirstInstallment({ reference, userId, email, amountUsd: firstUsd });
    return { subscription, paymentRecord: created[0], payments: created };
};

export const getPaystackQuote = async (req, res) => {
    try {
        const { courseId, selectedPlan, countryCode } = req.query;
        const standardPricing = getStandardPricing();
        const course = await loadCourseForPaystackPricing(courseId, countryCode);
        const normalizedPlan = normalizePlan(selectedPlan);
        const amountUsd = paystackFirstInstallmentUsd({ selectedPlan, course, standardPricing });
        const rate = await getUsdToZarRate();
        const amountMinor = usdToZarPaystackSubunits(amountUsd, rate);
        const amountZar = amountMinor / 100;
        return res.status(200).json({
            success: true,
            amount_usd: amountUsd,
            amount_zar: amountZar,
            exchange_rate: rate,
            selected_plan: normalizedPlan,
            plan_label: PAYSTACK_PLAN_LABELS[normalizedPlan] || PAYSTACK_PLAN_LABELS.first_payment,
        });
    } catch (error) {
        console.error("Paystack quote error:", error.message);
        return res.status(500).json({ success: false, message: "Could not compute Paystack quote" });
    }
};

export const initializeTransaction = async (req, res) => {
    try {
        const { userId, name, country, courseId, selectedPlan, countryCode } = req.body;
        const user = await db.user.findByPk(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const standardPricing = getStandardPricing();
        const course = await loadCourseForPaystackPricing(courseId, countryCode);
        const amountUsd = paystackFirstInstallmentUsd({ selectedPlan, course, standardPricing });
        const rate = await getUsdToZarRate();
        const amount = usdToZarPaystackSubunits(amountUsd, rate);
        const reference = `PAY-${Date.now()}-${userId}`;

        const response = await axios.post(
            PAYSTACK_INIT_URL,
            {
                email: user.email,
                amount: amount,
                currency: "ZAR",
                reference: reference,
                channels: ["card"],
                callback_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/checkout`,
                metadata: {
                    userId: String(userId),
                    name: name || "",
                    country: country || "",
                    cancel_action: `${process.env.FRONTEND_URL || "http://localhost:5173"}/checkout`,
                    ...(courseId != null && String(courseId).length
                        ? { courseId: String(courseId) }
                        : {}),
                    ...(selectedPlan ? { selectedPlan: String(selectedPlan) } : {}),
                    ...(countryCode ? { countryCode: String(countryCode) } : {}),
                },
            },
            { headers: paystackHeaders() }
        );

        if (response.data.status) {
            const data = response.data.data || {};
            return res.status(200).json({
                success: true,
                authorization_url: data.authorization_url,
                access_code: data.access_code,
                reference: reference,
                amount_usd: amountUsd,
                amount_zar: amount / 100,
                exchange_rate: rate,
            });
        } else {
            return res.status(400).json({ success: false, message: "Could not initialize transaction" });
        }
    } catch (error) {
        console.error("Paystack init error:", error.response?.data || error.message);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const verifyTransaction = async (req, res) => {
    try {
        const { reference, userId, name, country, courseId, selectedPlan, countryCode } = req.body;

        if (!reference) {
            return res.status(400).json({ success: false, message: "Reference is required" });
        }

        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        });

        const tx = response.data.data;
        if (tx?.status === "success") {
            const email = tx.customer?.email;
            const authorization = tx.authorization;
            const customer = tx.customer;

            const existingPayment = await db.payment.findOne({ where: { invoice_number: reference } });
            if (existingPayment) {
                return res.status(200).json({
                    success: true,
                    message: "Payment already processed",
                    payment: existingPayment,
                });
            }

            const result = await processPaystackSuccess({
                reference,
                userId,
                name,
                country,
                email,
                courseId,
                selectedPlan,
                authorization,
                customer,
                countryCode,
            });
            return res.status(200).json({
                success: true,
                message: "Payment verified and recorded",
                ...result,
            });
        } else {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Paystack verify error:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const handleWebhook = async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");

        if (hash !== req.headers["x-paystack-signature"]) {
            return res.status(400).send("Invalid signature");
        }

        const event = req.body;
        console.log("Paystack Webhook received:", event.event);

        if (event.event === "charge.success") {
            const { reference, customer, metadata, authorization } = event.data;
            const userId = metadata?.user_id || metadata?.userId;
            const name = metadata?.name;
            const country = metadata?.country;
            const rawCourse = metadata?.courseId ?? metadata?.course_id;
            const courseId = rawCourse === "" || rawCourse == null ? null : rawCourse;
            const selectedPlan = metadata?.selectedPlan ?? metadata?.selected_plan ?? "";
            const countryCode = metadata?.countryCode ?? metadata?.country_code ?? "";

            const existingPayment = await db.payment.findOne({ where: { invoice_number: reference } });
            if (!existingPayment && userId) {
                await processPaystackSuccess({
                    reference,
                    userId,
                    name,
                    country,
                    email: customer?.email,
                    courseId,
                    selectedPlan,
                    authorization,
                    customer,
                    countryCode: countryCode || undefined,
                });
                console.log(`Processed Paystack success for user ${userId}, reference ${reference}`);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Paystack webhook error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


async function chargeOnePaystackInstallment(paymentRow) {
    const parentRef = paymentRow.paystack_parent_reference;
    if (!parentRef) return;

    const subscription = await db.subscription.findOne({
        where: { stripe_subscription_id: parentRef, provider: "paystack" },
    });
    if (!subscription?.paystack_authorization_code) {
        console.warn(`[Paystack cron] No authorization for parent ${parentRef}, payment id ${paymentRow.id}`);
        return;
    }

    const user = await db.user.findByPk(paymentRow.user_id);
    if (!user?.email) {
        console.warn(`[Paystack cron] No email for user ${paymentRow.user_id}`);
        return;
    }

    const rate = await getUsdToZarRate();
    const usdAmount = Number(paymentRow.amount);
    const zarSubunits = usdToZarPaystackSubunits(usdAmount, rate);
    if (zarSubunits < 100) {
        console.warn(`[Paystack cron] Amount too small for payment id ${paymentRow.id}`);
        return;
    }

    const newRef = `PAY-REC-${paymentRow.id}-${Date.now()}`;

    const response = await axios.post(
        PAYSTACK_CHARGE_AUTH_URL,
        {
            authorization_code: subscription.paystack_authorization_code,
            email: user.email,
            amount: zarSubunits,
            currency: "ZAR",
            reference: newRef,
            metadata: {
                userId: String(paymentRow.user_id),
                installment_payment_id: String(paymentRow.id),
                paystack_parent_reference: String(parentRef),
            },
        },
        { headers: paystackHeaders() }
    );

    const ok = response.data?.status === true && response.data?.data?.status === "success";
    if (ok) {
        await paymentRow.update({
            status: "succeeded",
            invoice_number: response.data.data.reference || newRef,
        });
        console.log(`[Paystack cron] Charged installment payment id ${paymentRow.id}, ref ${newRef}`);
        return;
    }

    const msg = response.data?.message || JSON.stringify(response.data);
    console.error(`[Paystack cron] Charge failed payment id ${paymentRow.id}:`, msg);
    await paymentRow.update({ status: "failed" });
}

/** Daily job: debit due Paystack installments via charge_authorization. */
export async function runPaystackInstallmentCharges() {
    const { Op } = db.Sequelize;
    const cutoff = new Date();
    cutoff.setHours(23, 59, 59, 999);

    const due = await db.payment.findAll({
        where: {
            payment_method: "paystack",
            status: "pending",
            paystack_parent_reference: { [Op.ne]: null },
            due_date: { [Op.lte]: cutoff },
        },
        order: [["due_date", "ASC"]],
    });

    if (due.length) {
        console.log(`[Paystack cron] Processing ${due.length} due installment(s)`);
    }

    for (const row of due) {
        try {
            await chargeOnePaystackInstallment(row);
        } catch (e) {
            console.error(`[Paystack cron] payment id ${row.id}:`, e.response?.data || e.message);
            try {
                await row.update({ status: "failed" });
            } catch (_) {
                /* ignore */
            }
        }
    }
}
