import axios from "axios";
import db from "../../db.js";
import crypto from "crypto";

const PAYSTACK_INIT_URL = "https://api.paystack.co/transaction/initialize";
const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify";

const processSuccess = async (data) => {
    const { reference, userId, name, country, amount, email, currency } = data;

    // 1. Create Subscription
    const now = new Date();
    const startDate = new Date(now);
    const recurringDate = new Date(now);
    recurringDate.setFullYear(recurringDate.getFullYear() + 1); // Yearly

    const subscription = await db.subscription.create({
        stripe_subscription_id: reference, // Using Paystack reference as unique ID
        name: name || email,
        country: country || "Unknown",
        user_id: userId,
        recurring_date: recurringDate,
        start_date: startDate,
        status: "active",
        span: "Yearly",
        amount: amount,
        provider: "paystack"
    });

    // 2. Create Payment Record
    const paymentRecord = await db.payment.create({
        user_id: userId,
        amount: amount,
        currency: currency || "zar",
        status: "succeeded",
        payment_type: "subscription",
        invoice_number: reference,
    });

    return { subscription, paymentRecord };
};

export const initializeTransaction = async (req, res) => {
    try {
        const { userId, name, country } = req.body;
        const user = await db.user.findByPk(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const amount = (parseInt(process.env.FIRST_PAYMENT_AMOUNT) || 500) * 100;
        const reference = `PAY-${Date.now()}-${userId}`;

        const response = await axios.post(PAYSTACK_INIT_URL, {
            email: user.email,
            amount: amount,
            currency: "ZAR",
            reference: reference,
            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`,
            metadata: {
                userId,
                name,
                country,
                cancel_action: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout`
            }
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json"
            }
        });

        if (response.data.status) {
            return res.status(200).json({
                success: true,
                authorization_url: response.data.data.authorization_url,
                reference: reference
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
        const { reference, userId, name, country } = req.body;

        if (!reference) {
            return res.status(400).json({ success: false, message: "Reference is required" });
        }

        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
        });

        if (response.data.data.status === "success") {
            const amount = response.data.data.amount / 100; // Paystack amount is in kobo/cents
            const email = response.data.data.customer.email;
            const currency = response.data.data.currency;

            // Check if already processed to avoid duplicates
            const existingPayment = await db.payment.findOne({ where: { invoice_number: reference } });
            if (existingPayment) {
                return res.status(200).json({
                    success: true,
                    message: "Payment already processed",
                    payment: existingPayment
                });
            }

            const result = await processSuccess({ reference, userId, name, country, amount, email, currency });
            return res.status(200).json({
                success: true,
                message: "Payment verified and recorded",
                ...result
            });
        } else {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }
    } catch (error) {
        console.error("Paystack verify error:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

export const handleWebhook = async (req, res) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(400).send('Invalid signature');
        }

        const event = req.body;
        console.log("Paystack Webhook received:", event.event);

        if (event.event === 'charge.success') {
            const { reference, amount, customer, metadata } = event.data;
            const userId = metadata?.user_id || metadata?.userId;
            const name = metadata?.name;
            const country = metadata?.country;

            // Check if already processed
            const existingPayment = await db.payment.findOne({ where: { invoice_number: reference } });
            if (!existingPayment && userId) {
                await processSuccess({
                    reference,
                    userId,
                    name,
                    country,
                    amount: event.data.amount / 100,
                    email: customer.email,
                    currency: event.data.currency
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
