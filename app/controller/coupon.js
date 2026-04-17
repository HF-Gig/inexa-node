import db from "../../db.js";

const isCouponExpired = (coupon) => {
    if (!coupon?.expiryDate) return false;
    const expiry = new Date(coupon.expiryDate);
    expiry.setHours(23, 59, 59, 999);
    return expiry < new Date();
};

const getCoupons = async (req, res) => {
    try {
        const coupons = await db.coupon.findAll({
            order: [["createdAt", "DESC"]],
        });
        return res.status(200).json({
            success: true,
            data: coupons,
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
        const { code, percentage, isActive, expiryDate } = req.body;
        if (!code || percentage === undefined) {
            return res.status(400).json({ error: "Code and percentage are required" });
        }

        const existing = await db.coupon.findOne({ where: { code } });
        if (existing) {
            return res.status(400).json({ error: "Coupon code already exists" });
        }

        const coupon = await db.coupon.create({
            code,
            percentage,
            isActive: isActive !== undefined ? isActive : true,
            expiryDate: expiryDate || null,
        });

        return res.status(201).json({
            success: true,
            data: coupon,
        });
    } catch (error) {
        console.error("Create Coupon Error:", error);
        return res.status(500).json({ error: "Failed to create coupon", details: error.message });
    }
};

const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, percentage, isActive, expiryDate } = req.body;

        const coupon = await db.coupon.findByPk(id);
        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        if (code && code !== coupon.code) {
            const existing = await db.coupon.findOne({ where: { code } });
            if (existing) {
                return res.status(400).json({ error: "Coupon code already exists" });
            }
        }

        await coupon.update({
            code: code !== undefined ? code : coupon.code,
            percentage: percentage !== undefined ? percentage : coupon.percentage,
            isActive: isActive !== undefined ? isActive : coupon.isActive,
            expiryDate: expiryDate !== undefined ? expiryDate : coupon.expiryDate,
        });

        return res.status(200).json({
            success: true,
            data: coupon,
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

        await coupon.destroy();
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
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Code is required" });
        }

        const coupon = await db.coupon.findOne({
            where: { code, isActive: true },
        });

        if (!coupon) {
            return res.status(404).json({ error: "Invalid or inactive coupon code" });
        }

        if (isCouponExpired(coupon)) {
            return res.status(400).json({ error: "Coupon code is expired" });
        }

        return res.status(200).json({
            success: true,
            data: {
                code: coupon.code,
                percentage: coupon.percentage,
            },
        });
    } catch (error) {
        console.error("Validate Coupon Error:", error);
        return res.status(500).json({ error: "Failed to validate coupon", details: error.message });
    }
};

export { getCoupons, getPublicActiveCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon };
