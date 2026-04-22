import db from "../../db.js";

const DEFAULT_USAGE_LIMIT = 1;

const normalizePromoCode = (code) => String(code || "").trim();

const normalizeStatus = (coupon) => {
    if (!coupon) return "deleted";
    if (coupon.status) return String(coupon.status).toLowerCase();
    if (coupon.isActive === false) return "paused";
    return "active";
};

const isCouponExpired = (coupon) => {
    if (!coupon?.expiryDate) return false;
    const expiry = new Date(coupon.expiryDate);
    expiry.setHours(23, 59, 59, 999);
    return expiry < new Date();
};

const isBeforeStartDate = (coupon) => {
    if (!coupon?.startsAt) return false;
    return new Date(coupon.startsAt) > new Date();
};

const parseArrayField = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }
    return [];
};

const getEmailDomain = (email) => {
    const normalized = String(email || "").trim().toLowerCase();
    const parts = normalized.split("@");
    if (parts.length < 2) return "";
    return parts[1];
};

const checkAudienceEligibility = ({ coupon, userId, email }) => {
    const audienceType = String(coupon.audienceType || "all").toLowerCase();
    if (audienceType === "all") {
        return { allowed: true };
    }

    const allowedUserIds = parseArrayField(coupon.allowedUserIds)
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
    const allowedDomains = parseArrayField(coupon.allowedDomains)
        .map((domain) => String(domain || "").trim().toLowerCase())
        .filter(Boolean);

    const normalizedUserId = Number(userId);
    const domain = getEmailDomain(email);
    const userMatch = Number.isFinite(normalizedUserId) && allowedUserIds.includes(normalizedUserId);
    const domainMatch = !!domain && allowedDomains.includes(domain);

    if (audienceType === "specific_users") {
        return userMatch
            ? { allowed: true }
            : { allowed: false, reason: "PROMO_NOT_ELIGIBLE_USER" };
    }
    if (audienceType === "business_domains") {
        return domainMatch
            ? { allowed: true }
            : { allowed: false, reason: "PROMO_NOT_ELIGIBLE_DOMAIN" };
    }
    if (audienceType === "mixed") {
        return userMatch || domainMatch
            ? { allowed: true }
            : { allowed: false, reason: "PROMO_NOT_ELIGIBLE" };
    }
    return { allowed: false, reason: "PROMO_NOT_ELIGIBLE" };
};

const getSuccessfulRedemptionCount = async ({ couponId, userId, email }) => {
    const where = {
        coupon_id: couponId,
        status: "succeeded",
    };
    const normalizedUserId = Number(userId);
    if (Number.isFinite(normalizedUserId)) {
        where.user_id = normalizedUserId;
    } else if (email) {
        where.email = String(email).trim().toLowerCase();
    } else {
        return 0;
    }
    return db.coupon_redemption.count({ where });
};

const logCouponAttempt = async ({
    couponId = null,
    code,
    userId = null,
    email = null,
    status = "failed",
    reason = null,
    meta = null,
}) => {
    if (!db.coupon_attempt) return;
    try {
        await db.coupon_attempt.create({
            coupon_id: couponId,
            code: normalizePromoCode(code),
            user_id: Number.isFinite(Number(userId)) ? Number(userId) : null,
            email: email ? String(email).trim().toLowerCase() : null,
            status,
            reason,
            meta: meta ? JSON.stringify(meta) : null,
        });
    } catch (error) {
        console.error("Coupon attempt log error:", error.message);
    }
};

const resolveCouponForCheckout = async ({
    code,
    userId,
    email,
    trackAttempt = true,
    context = "checkout",
}) => {
    const normalizedCode = normalizePromoCode(code);
    if (!normalizedCode) {
        return {
            ok: false,
            reason: "PROMO_REQUIRED",
            message: "Promo code is required",
        };
    }

    const coupon = await db.coupon.findOne({ where: { code: normalizedCode } });
    if (!coupon) {
        if (trackAttempt) {
            await logCouponAttempt({
                code: normalizedCode,
                userId,
                email,
                status: "failed",
                reason: "PROMO_NOT_FOUND",
                meta: { context },
            });
        }
        return {
            ok: false,
            reason: "PROMO_NOT_FOUND",
            message: "Invalid promo code",
        };
    }

    const status = normalizeStatus(coupon);
    if (status !== "active") {
        if (trackAttempt) {
            await logCouponAttempt({
                couponId: coupon.id,
                code: normalizedCode,
                userId,
                email,
                status: "failed",
                reason: "PROMO_INACTIVE",
                meta: { context, status },
            });
        }
        return {
            ok: false,
            reason: "PROMO_INACTIVE",
            message: "Promo code is not active",
        };
    }

    if (isBeforeStartDate(coupon)) {
        if (trackAttempt) {
            await logCouponAttempt({
                couponId: coupon.id,
                code: normalizedCode,
                userId,
                email,
                status: "failed",
                reason: "PROMO_NOT_STARTED",
                meta: { context },
            });
        }
        return {
            ok: false,
            reason: "PROMO_NOT_STARTED",
            message: "Promo code is not active yet",
        };
    }

    if (isCouponExpired(coupon)) {
        if (trackAttempt) {
            await logCouponAttempt({
                couponId: coupon.id,
                code: normalizedCode,
                userId,
                email,
                status: "failed",
                reason: "PROMO_EXPIRED",
                meta: { context },
            });
        }
        return {
            ok: false,
            reason: "PROMO_EXPIRED",
            message: "Promo code is expired",
        };
    }

    const audienceResult = checkAudienceEligibility({ coupon, userId, email });
    if (!audienceResult.allowed) {
        if (trackAttempt) {
            await logCouponAttempt({
                couponId: coupon.id,
                code: normalizedCode,
                userId,
                email,
                status: "failed",
                reason: audienceResult.reason || "PROMO_NOT_ELIGIBLE",
                meta: { context },
            });
        }
        return {
            ok: false,
            reason: audienceResult.reason || "PROMO_NOT_ELIGIBLE",
            message: "You are not eligible for this promo code",
        };
    }

    const usageLimit = Number(coupon.usageLimitPerCustomer || DEFAULT_USAGE_LIMIT);
    const usageCount = await getSuccessfulRedemptionCount({ couponId: coupon.id, userId, email });
    if (usageLimit > 0 && usageCount >= usageLimit) {
        if (trackAttempt) {
            await logCouponAttempt({
                couponId: coupon.id,
                code: normalizedCode,
                userId,
                email,
                status: "failed",
                reason: "PROMO_USAGE_LIMIT_REACHED",
                meta: { context, usageLimit, usageCount },
            });
        }
        return {
            ok: false,
            reason: "PROMO_USAGE_LIMIT_REACHED",
            message: "Promo code usage limit reached for this customer",
        };
    }

    if (trackAttempt) {
        await logCouponAttempt({
            couponId: coupon.id,
            code: normalizedCode,
            userId,
            email,
            status: "success",
            reason: null,
            meta: { context },
        });
    }

    return {
        ok: true,
        coupon,
        discountPercentage: Number(coupon.percentage || 0),
    };
};

const createCouponRedemption = async ({
    coupon,
    code,
    userId,
    email,
    paymentId = null,
    paymentReference = null,
    discountPercentage = 0,
    status = "succeeded",
}) => {
    if (!db.coupon_redemption) return null;
    const couponId = coupon?.id || null;
    if (!couponId || !paymentReference) return null;
    const existing = await db.coupon_redemption.findOne({
        where: {
            coupon_id: couponId,
            payment_reference: paymentReference,
        },
    });
    if (existing) return existing;

    return db.coupon_redemption.create({
        coupon_id: couponId,
        code: normalizePromoCode(code || coupon?.code),
        user_id: Number.isFinite(Number(userId)) ? Number(userId) : null,
        email: email ? String(email).trim().toLowerCase() : null,
        payment_id: paymentId,
        payment_reference: paymentReference,
        discount_percentage: Number(discountPercentage || 0),
        status,
    });
};

export {
    normalizePromoCode,
    isCouponExpired,
    resolveCouponForCheckout,
    createCouponRedemption,
};
