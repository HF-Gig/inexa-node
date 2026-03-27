import cron from "node-cron";
import { runPaystackInstallmentCharges } from "../controller/paystack.js";

/** Run once per day after midnight; adjust via PAYSTACK_CRON_EXPRESSION if needed. */
export const startPaystackInstallmentCron = () => {
    const expr = process.env.PAYSTACK_CRON_EXPRESSION || "15 6 * * *";
    cron.schedule(expr, () => {
        runPaystackInstallmentCharges().catch((err) => {
            console.error("[Paystack cron] Unhandled error:", err);
        });
    });
};
