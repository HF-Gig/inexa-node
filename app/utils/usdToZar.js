import axios from "axios";

let cachedRates = null;
let cachedAt = 0;
const CACHE_MS = Number(process.env.USD_ZAR_RATE_CACHE_MS) || 3600000;
const FALLBACK_ZAR = Number(process.env.USD_TO_ZAR_FALLBACK) || 18.5;

function normalizeRates(raw) {
    const out = { USD: 1 };
    if (!raw || typeof raw !== "object") return out;
    for (const [k, v] of Object.entries(raw)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) {
            out[String(k).toUpperCase()] = n;
        }
    }
    return out;
}

/**
 * Full USD-base conversion table (same API as legacy getUsdToZarRate).
 * Cached together so INR→ZAR can use rates.INR and rates.ZAR in one fetch.
 */
export async function getLatestUsdConversionRates() {
    const envZar = Number(process.env.USD_TO_ZAR_RATE);
    const now = Date.now();
    if (cachedRates != null && now - cachedAt < CACHE_MS) {
        if (Number.isFinite(envZar) && envZar > 0) {
            return { ...cachedRates, ZAR: envZar };
        }
        return cachedRates;
    }
    try {
        const { data } = await axios.get("https://api.exchangerate-api.com/v4/latest/USD", {
            timeout: 15000,
        });
        const normalized = normalizeRates(data?.rates);
        const zar = Number(normalized.ZAR);
        if (Number.isFinite(zar) && zar > 0) {
            cachedRates = normalized;
            cachedAt = now;
            if (Number.isFinite(envZar) && envZar > 0) {
                return { ...cachedRates, ZAR: envZar };
            }
            return cachedRates;
        }
    } catch (e) {
        console.error("[usdToZar] Rate fetch failed:", e.message);
    }
    if (cachedRates != null) {
        const z = Number(cachedRates.ZAR) || FALLBACK_ZAR;
        const base = { ...cachedRates, ZAR: Number.isFinite(envZar) && envZar > 0 ? envZar : z };
        return base;
    }
    const z = Number.isFinite(envZar) && envZar > 0 ? envZar : FALLBACK_ZAR;
    return { USD: 1, ZAR: z };
}

/**
 * USD→ZAR rate for Paystack. Order: USD_TO_ZAR_RATE env → cached API → stale cache → fallback.
 */
export async function getUsdToZarRate() {
    const rates = await getLatestUsdConversionRates();
    const z = Number(rates.ZAR);
    return Number.isFinite(z) && z > 0 ? z : FALLBACK_ZAR;
}

/** Course amounts in USD (major units) → ZAR subunits (cents) for Paystack. */
export function usdToZarPaystackSubunits(usdAmount, rate) {
    const usd = Number(usdAmount);
    const r = Number(rate);
    if (!Number.isFinite(usd) || usd < 0 || !Number.isFinite(r) || r <= 0) {
        return 0;
    }
    return Math.round(usd * r * 100);
}

/**
 * Course amounts in `currencyCode` major units (USD, INR, …) → ZAR subunits for Paystack.
 * Uses USD-base rates: foreign per 1 USD, so major / rate = USD equivalent.
 */
export function majorCurrencyToZarPaystackSubunits(majorAmount, currencyCode, rates) {
    const cur = String(currencyCode || "USD").toUpperCase();
    const major = Number(majorAmount);
    if (!Number.isFinite(major) || major < 0 || !rates || !Number.isFinite(Number(rates.ZAR))) {
        return 0;
    }
    const zarPerUsd = Number(rates.ZAR);
    if (cur === "ZAR") {
        return Math.round(major * 100);
    }
    if (cur === "USD") {
        return Math.round(major * zarPerUsd * 100);
    }
    const perUsd = Number(rates[cur]);
    if (!Number.isFinite(perUsd) || perUsd <= 0) {
        console.warn("[majorCurrencyToZar] missing or invalid USD rate for", cur, "; treating amount as USD face value");
        return Math.round(major * zarPerUsd * 100);
    }
    const usdEquivalent = major / perUsd;
    const zarMajor = usdEquivalent * zarPerUsd;
    return Math.round(zarMajor * 100);
}
