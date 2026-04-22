import db from "../../db.js";
import { isCouponExpired, normalizePromoCode, resolveCouponForCheckout } from "../utils/promoCode.js";

const parseJsonArray = (value) => {
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

const normalizeStatus = (coupon) => {
    if (coupon.status) return String(coupon.status).toLowerCase();
    if (coupon.isActive === false) return "paused";
    return "active";
};

const toCouponDto = (coupon) => {
    if (!coupon) return null;
    return {
        ...coupon.toJSON(),
        status: normalizeStatus(coupon),
        allowedDomains: parseJsonArray(coupon.allowedDomains),
        allowedUserIds: parseJsonArray(coupon.allowedUserIds),
    };
};

const toCouponCreateUpdateInput = (payload = {}) => {
    const status = payload.status
        ? String(payload.status).toLowerCase()
        : payload.isActive === false
            ? "paused"
            : "active";
    const allowedDomains = Array.isArray(payload.allowedDomains) ? payload.allowedDomains : [];
    const allowedUserIds = Array.isArray(payload.allowedUserIds) ? payload.allowedUserIds : [];

    return {
        code: payload.code !== undefined ? normalizePromoCode(payload.code) : undefined,
        percentage: Number(payload.percentage || 0),
        isActive: status === "active",
        startsAt: payload.startsAt || null,
        expiryDate: payload.expiryDate || null,
        status,
        usageLimitPerCustomer: Number(payload.usageLimitPerCustomer || 1),
        audienceType: payload.audienceType || "all",
        allowedDomains: JSON.stringify(allowedDomains.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean)),
        allowedUserIds: JSON.stringify(
            allowedUserIds
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id))
        ),
    };
};

const getCoupons = async (req, res) => {
    try {
        const coupons = await db.coupon.findAll({
            order: [["createdAt", "DESC"]],
        });
        return res.status(200).json({
            success: true,
            data: coupons.map(toCouponDto),
        });
    } catch (error) {
        console.error("Get Coupons Error:", error);
        return res.status(500).json({ error: "Failed to fetch coupons", details: error.message });
    }
};

const getPublicActiveCoupons = async (req, res) => {
    try {
        const coupons = await db.coupon.findAll({
            where: { isActive: true },
            order: [["createdAt", "DESC"]],
        });

        const visibleCoupons = coupons
            .filter((coupon) => !isCouponExpired(coupon))
            .map((coupon) => ({
                id: coupon.id,
                code: coupon.code,
                percentage: coupon.percentage,
                expiryDate: coupon.expiryDate,
                status: normalizeStatus(coupon),
            }));

        return res.status(200).json({
            success: true,
            data: visibleCoupons,
        });
    } catch (error) {
        console.error("Get Public Coupons Error:", error);
        return res.status(500).json({ error: "Failed to fetch public coupons", details: error.message });
    }
};

const createCoupon = async (req, res) => {
    try {
        const input = toCouponCreateUpdateInput(req.body);
        if (!input.code || input.percentage <= 0) {
            return res.status(400).json({ error: "Code and percentage are required" });
        }

        const existing = await db.coupon.findOne({ where: { code: input.code } });
        if (existing) {
            return res.status(400).json({ error: "Coupon code already exists" });
        }

        const coupon = await db.coupon.create(input);

        return res.status(201).json({
            success: true,
            data: toCouponDto(coupon),
        });
    } catch (error) {
        console.error("Create Coupon Error:", error);
        return res.status(500).json({ error: "Failed to create coupon", details: error.message });
    }
};

const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const input = toCouponCreateUpdateInput({ ...req.body, code: req.body.code ?? undefined });

        const coupon = await db.coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        if (input.code && input.code !== coupon.code) {
            const existing = await db.coupon.findOne({ where: { code: input.code } });
            if (existing) {
                return res.status(400).json({ error: "Coupon code already exists" });
            }
        }

        await coupon.update({
            code: input.code !== undefined ? input.code : coupon.code,
            percentage: req.body.percentage !== undefined ? input.percentage : coupon.percentage,
            isActive: req.body.isActive !== undefined || req.body.status !== undefined ? input.isActive : coupon.isActive,
            startsAt: req.body.startsAt !== undefined ? input.startsAt : coupon.startsAt,
            expiryDate: req.body.expiryDate !== undefined ? input.expiryDate : coupon.expiryDate,
            status: req.body.status !== undefined || req.body.isActive !== undefined ? input.status : coupon.status,
            usageLimitPerCustomer:
                req.body.usageLimitPerCustomer !== undefined
                    ? input.usageLimitPerCustomer
                    : coupon.usageLimitPerCustomer,
            audienceType: req.body.audienceType !== undefined ? input.audienceType : coupon.audienceType,
            allowedDomains: req.body.allowedDomains !== undefined ? input.allowedDomains : coupon.allowedDomains,
            allowedUserIds: req.body.allowedUserIds !== undefined ? input.allowedUserIds : coupon.allowedUserIds,
        });

        return res.status(200).json({
            success: true,
            data: toCouponDto(coupon),
        });
    } catch (error) {
        console.error("Update Coupon Error:", error);
        return res.status(500).json({ error: "Failed to update coupon", details: error.message });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await db.coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        await coupon.update({ status: "deleted", isActive: false });
        return res.status(200).json({
            success: true,
            message: "Coupon deleted successfully",
        });
    } catch (error) {
        console.error("Delete Coupon Error:", error);
        return res.status(500).json({ error: "Failed to delete coupon", details: error.message });
    }
};

const validateCoupon = async (req, res) => {
    try {
        const { code, userId, email } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Code is required" });
        }

        const result = await resolveCouponForCheckout({
            code,
            userId: userId || req.user?.id,
            email: email || req.user?.email,
            trackAttempt: true,
            context: "validate_endpoint",
        });
        if (!result.ok) {
            return res.status(400).json({
                success: false,
                error: result.message,
                reason: result.reason,
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                code: result.coupon.code,
                percentage: result.discountPercentage,
                status: normalizeStatus(result.coupon),
                expiryDate: result.coupon.expiryDate,
                usageLimitPerCustomer: result.coupon.usageLimitPerCustomer || 1,
            },
        });
    } catch (error) {
        console.error("Validate Coupon Error:", error);
        return res.status(500).json({ error: "Failed to validate coupon", details: error.message });
    }
};

const pauseCoupon = async (req, res) => {
    try {
        const coupon = await db.coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: "Coupon not found" });
        await coupon.update({ status: "paused", isActive: false });
        return res.status(200).json({ success: true, data: toCouponDto(coupon) });
    } catch (error) {
        return res.status(500).json({ error: "Failed to pause coupon", details: error.message });
    }
};

const resumeCoupon = async (req, res) => {
    try {
        const coupon = await db.coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: "Coupon not found" });
        await coupon.update({ status: "active", isActive: true });
        return res.status(200).json({ success: true, data: toCouponDto(coupon) });
    } catch (error) {
        return res.status(500).json({ error: "Failed to resume coupon", details: error.message });
    }
};

const duplicateCoupon = async (req, res) => {
    try {
        const source = await db.coupon.findByPk(req.params.id);
        if (!source) return res.status(404).json({ error: "Coupon not found" });
        const { code } = req.body;
        const normalizedCode = normalizePromoCode(code);
        if (!normalizedCode) {
            return res.status(400).json({ error: "New code is required for duplication" });
        }
        const exists = await db.coupon.findOne({ where: { code: normalizedCode } });
        if (exists) return res.status(400).json({ error: "Coupon code already exists" });

        const cloned = await db.coupon.create({
            code: normalizedCode,
            percentage: source.percentage,
            isActive: true,
            startsAt: source.startsAt,
            expiryDate: source.expiryDate,
            status: "active",
            usageLimitPerCustomer: source.usageLimitPerCustomer || 1,
            audienceType: source.audienceType || "all",
            allowedDomains: source.allowedDomains,
            allowedUserIds: source.allowedUserIds,
        });

        return res.status(201).json({ success: true, data: toCouponDto(cloned) });
    } catch (error) {
        return res.status(500).json({ error: "Failed to duplicate coupon", details: error.message });
    }
};

const getCouponUsageReport = async (req, res) => {
    try {
        const coupon = await db.coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ error: "Coupon not found" });

        const couponId = coupon.id;
        const [totalAttempts, failedAttempts, successfulApplies, successfulCheckouts] = await Promise.all([
            db.coupon_attempt.count({ where: { coupon_id: couponId } }),
            db.coupon_attempt.count({ where: { coupon_id: couponId, status: "failed" } }),
            db.coupon_attempt.count({ where: { coupon_id: couponId, status: "success" } }),
            db.coupon_redemption.count({ where: { coupon_id: couponId, status: "succeeded" } }),
        ]);

        const uniqueCustomers = await db.coupon_redemption.count({
            distinct: true,
            col: "user_id",
            where: { coupon_id: couponId, status: "succeeded" },
        });

        return res.status(200).json({
            success: true,
            data: {
                coupon: toCouponDto(coupon),
                metrics: {
                    totalAttempts,
                    successfulApplies,
                    failedAttempts,
                    successfulCheckouts,
                    numberOfTimesApplied: successfulApplies,
                    uniqueCustomers,
                },
            },
        });
    } catch (error) {
        return res.status(500).json({ error: "Failed to load coupon report", details: error.message });
    }
};

const getCouponPerformanceDashboard = async (_req, res) => {
    try {
        const coupons = await db.coupon.findAll({ order: [["createdAt", "DESC"]] });
        const rows = await Promise.all(
            coupons.map(async (coupon) => {
                const [successfulApplies, failedAttempts, successfulCheckouts] = await Promise.all([
                    db.coupon_attempt.count({ where: { coupon_id: coupon.id, status: "success" } }),
                    db.coupon_attempt.count({ where: { coupon_id: coupon.id, status: "failed" } }),
                    db.coupon_redemption.count({ where: { coupon_id: coupon.id, status: "succeeded" } }),
                ]);
                return {
                    couponId: coupon.id,
                    code: coupon.code,
                    status: normalizeStatus(coupon),
                    successfulApplies,
                    failedAttempts,
                    successfulCheckouts,
                };
            })
        );
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ error: "Failed to load dashboard", details: error.message });
    }
};

export {
    getCoupons,
    getPublicActiveCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    pauseCoupon,
    resumeCoupon,
    duplicateCoupon,
    getCouponUsageReport,
    getCouponPerformanceDashboard,
};
