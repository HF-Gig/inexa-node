import db from "../../db.js";

const getCostConfigs = async (req, res) => {
    try {
        const { providerId, courseId } = req.query;
        const where = {};
        if (providerId) {
            where.provider_id = providerId;
        }
        if (courseId) {
            where.course_id = courseId;
        }

        const configs = await db.course_cost_config.findAll({
            where,
            order: [["provider_id", "ASC"], ["course_id", "ASC"], ["country_code", "ASC"]],
            raw: true,
        });

        return res.status(200).json({
            success: true,
            data: configs,
        });
    } catch (error) {
        console.error("Get Costs Configs Error:", error);
        return res.status(500).json({ error: "Failed to fetch costs configurations", details: error.message });
    }
};

const updateCostConfigById = async (req, res) => {
    try {
        const { id } = req.params;
        const { providerId, courseId, countryCode, interactiveCost, selfCost, interactiveCaption, selfCaption, paymentTypeSelf, paymentTypeInteractive, paymentOptionOnceOff, paymentOptionThirtySixty, paymentOptionMonthly11, paymentOptionQuarterly3, paymentOnceOffAmount, paymentFirst3060, paymentSecond3060, paymentThird3060, paymentFirstMonthly11, paymentFirstQuarterly3 } = req.body;

        const config = await db.course_cost_config.findByPk(id);
        if (!config) {
            return res.status(404).json({ error: "Cost configuration not found" });
        }

        const normalizedCountryCode = countryCode ? String(countryCode).trim().toUpperCase() : "DEFAULT";
        const updateData = {
            provider_id: providerId ?? config.provider_id,
            course_id: courseId ?? config.course_id ?? null,
            country_code: normalizedCountryCode,
        };

        if (interactiveCost !== undefined && interactiveCost !== "") updateData.interactive_cost = interactiveCost;
        if (selfCost !== undefined && selfCost !== "") updateData.self_cost = selfCost;
        if (interactiveCaption !== undefined && interactiveCaption !== "") updateData.interactive_caption = interactiveCaption;
        if (selfCaption !== undefined && selfCaption !== "") updateData.self_caption = selfCaption;
        if (paymentTypeSelf !== undefined && paymentTypeSelf !== "") updateData.payment_type_self = paymentTypeSelf;
        if (paymentTypeInteractive !== undefined && paymentTypeInteractive !== "") updateData.payment_type_interactive = paymentTypeInteractive;
        if (paymentOptionOnceOff !== undefined) updateData.payment_option_once_off = Boolean(paymentOptionOnceOff);
        if (paymentOptionThirtySixty !== undefined) updateData.payment_option_thirty_sixty = Boolean(paymentOptionThirtySixty);
        if (paymentOptionMonthly11 !== undefined) updateData.payment_option_monthly_11 = Boolean(paymentOptionMonthly11);
        if (paymentOptionQuarterly3 !== undefined) updateData.payment_option_quarterly_3 = Boolean(paymentOptionQuarterly3);
        if (paymentOnceOffAmount !== undefined && paymentOnceOffAmount !== "") updateData.payment_once_off_amount = paymentOnceOffAmount;
        if (paymentFirst3060 !== undefined && paymentFirst3060 !== "") updateData.payment_first_30_60 = paymentFirst3060;
        if (paymentSecond3060 !== undefined && paymentSecond3060 !== "") updateData.payment_second_30_60 = paymentSecond3060;
        if (paymentThird3060 !== undefined && paymentThird3060 !== "") updateData.payment_third_30_60 = paymentThird3060;
        if (paymentFirstMonthly11 !== undefined && paymentFirstMonthly11 !== "") updateData.payment_first_monthly_11 = paymentFirstMonthly11;
        if (paymentFirstQuarterly3 !== undefined && paymentFirstQuarterly3 !== "") updateData.payment_first_quarterly_3 = paymentFirstQuarterly3;

        await config.update(updateData);

        return res.status(200).json({
            success: true,
            message: "Cost configuration updated successfully.",
        });
    } catch (error) {
        console.error("Update Cost Config Error:", error);
        return res.status(500).json({ error: "Failed to update cost configuration", details: error.message });
    }
};

const deleteCostConfigById = async (req, res) => {
    try {
        const { id } = req.params;
        const config = await db.course_cost_config.findByPk(id);
        if (!config) {
            return res.status(404).json({ error: "Cost configuration not found" });
        }

        await config.destroy();
        return res.status(200).json({
            success: true,
            message: "Cost configuration deleted successfully.",
        });
    } catch (error) {
        console.error("Delete Cost Config Error:", error);
        return res.status(500).json({ error: "Failed to delete cost configuration", details: error.message });
    }
};

const updateCostsByProvider = async (req, res) => {
    try {
        const { providerId, courseId, countryCode, interactiveCost, selfCost, interactiveCaption, selfCaption, paymentTypeSelf, paymentTypeInteractive, paymentOptionOnceOff, paymentOptionThirtySixty, paymentOptionMonthly11, paymentOptionQuarterly3, paymentOnceOffAmount, paymentFirst3060, paymentSecond3060, paymentThird3060, paymentFirstMonthly11, paymentFirstQuarterly3 } = req.body;

        if (!providerId) {
            return res.status(400).json({ error: 'providerId is required' });
        }

        const normalizedCountryCode = countryCode ? String(countryCode).trim().toUpperCase() : "DEFAULT";
        const updateData = {};
        if (interactiveCost !== undefined && interactiveCost !== "") updateData.interactive_cost = interactiveCost;
        if (selfCost !== undefined && selfCost !== "") updateData.self_cost = selfCost;
        if (interactiveCaption !== undefined && interactiveCaption !== "") updateData.interactive_caption = interactiveCaption;
        if (selfCaption !== undefined && selfCaption !== "") updateData.self_caption = selfCaption;
        if (paymentTypeSelf !== undefined && paymentTypeSelf !== "") updateData.payment_type_self = paymentTypeSelf;
        if (paymentTypeInteractive !== undefined && paymentTypeInteractive !== "") updateData.payment_type_interactive = paymentTypeInteractive;
        if (paymentOptionOnceOff !== undefined) updateData.payment_option_once_off = Boolean(paymentOptionOnceOff);
        if (paymentOptionThirtySixty !== undefined) updateData.payment_option_thirty_sixty = Boolean(paymentOptionThirtySixty);
        if (paymentOptionMonthly11 !== undefined) updateData.payment_option_monthly_11 = Boolean(paymentOptionMonthly11);
        if (paymentOptionQuarterly3 !== undefined) updateData.payment_option_quarterly_3 = Boolean(paymentOptionQuarterly3);
        if (paymentOnceOffAmount !== undefined && paymentOnceOffAmount !== "") updateData.payment_once_off_amount = paymentOnceOffAmount;
        if (paymentFirst3060 !== undefined && paymentFirst3060 !== "") updateData.payment_first_30_60 = paymentFirst3060;
        if (paymentSecond3060 !== undefined && paymentSecond3060 !== "") updateData.payment_second_30_60 = paymentSecond3060;
        if (paymentThird3060 !== undefined && paymentThird3060 !== "") updateData.payment_third_30_60 = paymentThird3060;
        if (paymentFirstMonthly11 !== undefined && paymentFirstMonthly11 !== "") updateData.payment_first_monthly_11 = paymentFirstMonthly11;
        if (paymentFirstQuarterly3 !== undefined && paymentFirstQuarterly3 !== "") updateData.payment_first_quarterly_3 = paymentFirstQuarterly3;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: "No fields provided to update. Please provide at least one field to update." });
        }

        const existingConfig = await db.course_cost_config.findOne({
            where: {
                provider_id: providerId,
                course_id: courseId || null,
                country_code: normalizedCountryCode,
            }
        });

        if (existingConfig) {
            await existingConfig.update(updateData);
        } else {
            await db.course_cost_config.create({
                provider_id: providerId,
                course_id: courseId || null,
                country_code: normalizedCountryCode,
                ...updateData,
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully saved costs for provider ${providerId} (${normalizedCountryCode === "DEFAULT" ? "default" : normalizedCountryCode}).`,
        });

    } catch (error) {
        console.error('Update Costs Error:', error);
        res.status(500).json({ error: 'Failed to update costs', details: error.message });
    }
};

export { getCostConfigs, updateCostConfigById, deleteCostConfigById, updateCostsByProvider };
