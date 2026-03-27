import { getStandardPricing } from "./pricing.js";

export const normalizePlan = (plan) => {
    const key = String(plan || "").toLowerCase().trim();
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

    const fallbackFirstPayment = Number(course?.self_cost || 500);
    const fallbackRecurringPayment = Number(course?.interactive_cost || fallbackFirstPayment);
    const configuredTotal = Number(course?.payment_once_off_amount || 1190);
    const onceOffAmount = configuredTotal;
    const first3060 = Number(course?.payment_first_30_60 || fallbackFirstPayment || 0);
    const second3060 = Number(course?.payment_second_30_60 || fallbackRecurringPayment || 0);
    const third3060 = Number(course?.payment_third_30_60 || fallbackRecurringPayment || 0);
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
    };
}

export function paystackFirstInstallmentUsd({ selectedPlan, course, standardPricing = getStandardPricing() }) {
    const normalizedPlan = normalizePlan(selectedPlan);
    const a = getSubscriptionPlanAmounts(course, standardPricing);
    if (normalizedPlan === "full") return a.onceOffAmount;
    if (normalizedPlan === "first_payment") return a.first3060;
    if (normalizedPlan === "monthly_payment") return a.firstMonthly;
    if (normalizedPlan === "quarterly_payment") return a.firstQuarterly;
    return a.first3060;
}

export const buildManualEftInstallments = ({
    selectedPlan,
    course,
    standardPricing = getStandardPricing(),
    currency = "usd",
    recurringAmountOverride,
}) => {
    const normalizedPlan = normalizePlan(selectedPlan);
    const amounts = getSubscriptionPlanAmounts(course, standardPricing);

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
