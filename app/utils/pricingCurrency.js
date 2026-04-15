import axios from "axios";

/** In-memory: ISO 3166-1 alpha-2 → ISO 4217 (primary currency). */
const countryCurrencyCache = new Map();

/**
 * Resolve primary currency for a country (e.g. IN → INR) for Paystack conversion.
 * Cached per process; uses restcountries when not cached.
 */
export async function getCurrencyCodeForCountry(isoAlpha2) {
    const cc = String(isoAlpha2 || "").toUpperCase();
    if (!cc || cc === "DEFAULT") return "USD";
    if (countryCurrencyCache.has(cc)) return countryCurrencyCache.get(cc);
    try {
        const { data } = await axios.get(
            `https://restcountries.com/v3.1/alpha/${encodeURIComponent(cc)}?fields=currencies`,
            { timeout: 12000 }
        );
        const row = Array.isArray(data) ? data[0] : data;
        const keys = row?.currencies ? Object.keys(row.currencies) : [];
        const cur = (keys[0] || "USD").toUpperCase();
        countryCurrencyCache.set(cc, cur);
        return cur;
    } catch (e) {
        console.warn("[pricingCurrency] Could not resolve currency for", cc, e.message);
        countryCurrencyCache.set(cc, "USD");
        return "USD";
    }
}

/**
 * When a country-specific cost row applies, stored amounts are in that country's currency (not USD).
 * Otherwise amounts are USD (default / global row).
 */
export async function resolvePaystackPricingCurrency(course) {
    if (!course?.has_country_specific_cost) return "USD";
    const applied = String(course.applied_cost_country_code || "").toUpperCase();
    if (!applied || applied === "DEFAULT") return "USD";
    return getCurrencyCodeForCountry(applied);
}
