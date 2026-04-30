import { getStandardPricing } from "./pricing.js";

export const normalizePlan = (plan) => {
    const key = String(plan || "").toLowerCase().trim();
    if (["interactive_cost"].includes(key)) return "interactive_cost";
    if (["full", "one_time"].includes(key)) return "full";
    if (["first_payment", "three_part"].includes(key)) return "first_payment";
    if (["monthly_payment", "monthly"].includes(key)) return "monthly_payment";
    if (["quarterly_payment", "quarterly"].includes(key)) return "quarterly_payment";
    return "first_payment";
};

export const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

export const addMonths = (date, months) => {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + months);
    return nextDate;
};

const applyPercentageDiscount = (amount, discountPercentage = 0) => {
    const safeAmount = Number(amount || 0);
    const pct = Math.min(Math.max(Number(discountPercentage || 0), 0), 100);
    if (pct <= 0) return Math.round((safeAmount + Number.EPSILON) * 100) / 100;
    const discounted = safeAmount * (1 - pct / 100);
    return Math.round((discounted + Number.EPSILON) * 100) / 100;
};


export function getSubscriptionPlanAmounts(course, standardPricing = getStandardPricing()) {
    const fpStd = Number(standardPricing.firstPaymentAmountUSD) || 333;
    const qpStd = Number(standardPricing.quarterlyPaymentAmountUSD) || 222;
    const defaultConfiguredTotal = fpStd + qpStd * 3;

    if (!course) {
        const first = fpStd;
        const rec = qpStd;
        const total = defaultConfiguredTotal;
        return {
            configuredTotal: total,
            onceOffAmount: total,
            first3060: first,
            second3060: rec,
            third3060: rec,
            firstMonthly: first,
            monthlyAuto: Math.max(0, (total - first) / 11),
            firstQuarterly: first,
            quarterlyAuto: Math.max(0, (total - first) / 3),
            fallbackFirstPayment: first,
            fallbackRecurringPayment: rec,
        };
    }

    const selfCost = Number(course?.self_cost || 0);
    const parsedEdxApiPrice = Number(
        String(course?.price ?? "")
        .replace(/[^0-9.-]/g, "")
    );
    const interactiveCost = Number(course?.interactive_cost || 0);
    const paymentOnceOffAmount = Number(course?.payment_once_off_amount || 0);
    const computedOnceOffFromCosts =
        // (interactiveCost > 0 || selfCost > 0) ? (interactiveCost * 2) + selfCost : 0;
        (interactiveCost > 0 || selfCost > 0) ? interactiveCost + selfCost : 0;

    const fallbackFirstPayment = Number(selfCost || 500);
    const fallbackRecurringPayment = Number(interactiveCost || fallbackFirstPayment);
    const isInexa = Number(course?.course_provider_id) === 7;
    const configuredTotal = isInexa
        ? Number(paymentOnceOffAmount || selfCost || interactiveCost || 0)
        : computedOnceOffFromCosts > 0
            ? computedOnceOffFromCosts
            : Number(paymentOnceOffAmount || 1190);
    const onceOffAmount = configuredTotal;
    const first3060 = Number(course?.payment_first_30_60 || fallbackFirstPayment || 0);
    const remainder3060 = Math.max(0, configuredTotal - first3060);
    const each3060 = Math.round((remainder3060 / 2) * 100) / 100;
    const second3060 = each3060;
    const third3060 = each3060;
    const firstMonthly = Number(course?.payment_first_monthly_11 || fallbackFirstPayment || 0);
    const monthlyAuto = Math.max(0, (configuredTotal - firstMonthly) / 11);
    const firstQuarterly = Number(course?.payment_first_quarterly_3 || fallbackFirstPayment || 0);
    const quarterlyAuto = Math.max(0, (configuredTotal - firstQuarterly) / 3);

    return {
        configuredTotal,
        onceOffAmount,
        first3060,
        second3060,
        third3060,
        firstMonthly,
        monthlyAuto,
        firstQuarterly,
        quarterlyAuto,
        fallbackFirstPayment,
        fallbackRecurringPayment,
        interactiveCost: (parsedEdxApiPrice + interactiveCost)
    };
}

export function paystackFirstInstallmentUsd({
    selectedPlan,
    course,
    standardPricing = getStandardPricing(),
    discountPercentage = 0,
}) {
    const normalizedPlan = normalizePlan(selectedPlan);
    const a = getSubscriptionPlanAmounts(course, standardPricing);
    // if (normalizedPlan === "full") return applyPercentageDiscount(a.onceOffAmount, discountPercentage);
     // For full payment plans, apply annual discount in addition to promo discount
     if (normalizedPlan === "full" || normalizedPlan === "interactive_cost") {
        const annualDiscountPercentage = Number(course?.annual_discount_percentage || course?.full_payment_discount || 10);
        const totalDiscountPercentage = annualDiscountPercentage > 0 
            ? annualDiscountPercentage + discountPercentage 
            : discountPercentage;
        return applyPercentageDiscount(normalizedPlan === "full" ? a.onceOffAmount : a.interactiveCost, totalDiscountPercentage);
    }
    if (normalizedPlan === "first_payment") return applyPercentageDiscount(a.first3060, discountPercentage);
    if (normalizedPlan === "monthly_payment") return applyPercentageDiscount(a.firstMonthly, discountPercentage);
    if (normalizedPlan === "quarterly_payment") return applyPercentageDiscount(a.firstQuarterly, discountPercentage);
    return applyPercentageDiscount(a.first3060, discountPercentage);
}

export const buildManualEftInstallments = ({
    selectedPlan,
    course,
    standardPricing = getStandardPricing(),
    currency = "usd",
    recurringAmountOverride,
    discountPercentage = 0,
}) => {
    const normalizedPlan = normalizePlan(selectedPlan);
    const baseAmounts = getSubscriptionPlanAmounts(course, standardPricing);

    // For full payment plans, apply annual discount in addition to promo discount
    let totalDiscountPercentage = discountPercentage;
    if (normalizedPlan === "full") {
        const annualDiscountPercentage = Number(course?.annual_discount_percentage || course?.full_payment_discount || 10);
        totalDiscountPercentage = annualDiscountPercentage > 0 
            ? annualDiscountPercentage + discountPercentage 
            : discountPercentage;
    }

    const amounts = {
        ...baseAmounts,
        // onceOffAmount: applyPercentageDiscount(baseAmounts.onceOffAmount, discountPercentage),
        onceOffAmount: applyPercentageDiscount(baseAmounts.onceOffAmount, totalDiscountPercentage),
        first3060: applyPercentageDiscount(baseAmounts.first3060, discountPercentage),
        second3060: applyPercentageDiscount(baseAmounts.second3060, discountPercentage),
        third3060: applyPercentageDiscount(baseAmounts.third3060, discountPercentage),
        firstMonthly: applyPercentageDiscount(baseAmounts.firstMonthly, discountPercentage),
        monthlyAuto: applyPercentageDiscount(baseAmounts.monthlyAuto, discountPercentage),
        firstQuarterly: applyPercentageDiscount(baseAmounts.firstQuarterly, discountPercentage),
        quarterlyAuto: applyPercentageDiscount(baseAmounts.quarterlyAuto, discountPercentage),
    };

    let second3060 = amounts.second3060;
    let third3060 = amounts.third3060;
    let monthlyAuto = amounts.monthlyAuto;
    let quarterlyAuto = amounts.quarterlyAuto;
    const recurringOverride = Number(recurringAmountOverride);
    if (Number.isFinite(recurringOverride) && recurringOverride > 0) {
        second3060 = third3060 = monthlyAuto = quarterlyAuto = recurringOverride;
    }

    const now = new Date();

    if (normalizedPlan === "full") {
        return [
            {
                amount: amounts.onceOffAmount,
                currency,
                selectedPlan: "full",
                installmentLabel: "Full amount (one-time)",
                installmentNumber: 1,
                totalInstallments: 1,
                dueDate: now,
                status: "initiated",
            },
        ];
    }

    if (normalizedPlan === "first_payment") {
        return [
            {
                amount: amounts.first3060,
                currency,
                selectedPlan: "first_payment",
                installmentLabel: "First payment (+ 2 follow-ups)",
                installmentNumber: 1,
                totalInstallments: 3,
                dueDate: now,
                status: "initiated",
            },
            {
                amount: second3060,
                currency,
                selectedPlan: "first_payment",
                installmentLabel: "Installment after 30 days",
                installmentNumber: 2,
                totalInstallments: 3,
                dueDate: addDays(now, 30),
                status: "pending",
            },
            {
                amount: third3060,
                currency,
                selectedPlan: "first_payment",
                installmentLabel: "Installment after 60 days",
                installmentNumber: 3,
                totalInstallments: 3,
                dueDate: addDays(now, 60),
                status: "pending",
            },
        ];
    }

    if (normalizedPlan === "monthly_payment") {
        return Array.from({ length: 12 }, (_, idx) => ({
            amount: idx === 0 ? amounts.firstMonthly : monthlyAuto,
            currency,
            selectedPlan: "monthly_payment",
            installmentLabel: idx === 0 ? "First payment (monthly plan)" : `Monthly installment ${idx}`,
            installmentNumber: idx + 1,
            totalInstallments: 12,
            dueDate: addMonths(now, idx),
            status: idx === 0 ? "initiated" : "pending",
        }));
    }

    return [
        {
            amount: amounts.firstQuarterly,
            currency,
            selectedPlan: "quarterly_payment",
            installmentLabel: "First payment (quarterly plan)",
            installmentNumber: 1,
            totalInstallments: 4,
            dueDate: now,
            status: "initiated",
        },
        ...[1, 2, 3].map((quarter) => ({
            amount: quarterlyAuto,
            currency,
            selectedPlan: "quarterly_payment",
            installmentLabel: `Quarterly installment ${quarter}`,
            installmentNumber: quarter + 1,
            totalInstallments: 4,
            dueDate: addMonths(now, quarter * 3),
            status: "pending",
        })),
    ];
};
