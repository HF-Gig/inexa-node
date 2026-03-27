import axios from "axios";

let cachedRate = null;
let cachedAt = 0;
const CACHE_MS = Number(process.env.USD_ZAR_RATE_CACHE_MS) || 3600000;
const FALLBACK_ZAR = Number(process.env.USD_TO_ZAR_FALLBACK) || 18.5;

/**
 * USD→ZAR rate for Paystack. Order: USD_TO_ZAR_RATE env → cached API → stale cache → fallback.
 * API matches the frontend CurrencyContext source (exchangerate-api.com v4).
 */
export async function getUsdToZarRate() {
    const envRate = Number(process.env.USD_TO_ZAR_RATE);
    if (Number.isFinite(envRate) && envRate > 0) {
        return envRate;
    }
    const now = Date.now();
    if (cachedRate != null && now - cachedAt < CACHE_MS) {
        return cachedRate;
    }
    try {
        const { data } = await axios.get("https://api.exchangerate-api.com/v4/latest/USD", {
            timeout: 15000,
        });
        const zar = Number(data?.rates?.ZAR);
        if (Number.isFinite(zar) && zar > 0) {
            cachedRate = zar;
            cachedAt = now;
            return zar;
        }
    } catch (e) {
        console.error("[usdToZar] Rate fetch failed:", e.message);
    }
    if (cachedRate != null) {
        return cachedRate;
    }
    return FALLBACK_ZAR;
}

/** Course/subscription USD (major units) → ZAR subunits (cents) for Paystack amounts. */
export function usdToZarPaystackSubunits(usdAmount, rate) {
    const usd = Number(usdAmount);
    const r = Number(rate);
    if (!Number.isFinite(usd) || usd < 0 || !Number.isFinite(r) || r <= 0) {
        return 0;
    }
    return Math.round(usd * r * 100);
}
