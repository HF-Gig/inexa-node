import db from "../../db.js";

const updateCostsByProvider = async (req, res) => {
    try {
        const { providerId, interactiveCost, selfCost, interactiveCaption, selfCaption, paymentTypeSelf, paymentTypeInteractive } = req.body;

        if (!providerId) {
            return res.status(400).json({ error: 'providerId is required' });
        }

        const updateData = {};
        if (interactiveCost !== undefined && interactiveCost !== "") updateData.interactive_cost = interactiveCost;
        if (selfCost !== undefined && selfCost !== "") updateData.self_cost = selfCost;
        if (interactiveCaption !== undefined && interactiveCaption !== "") updateData.interactive_caption = interactiveCaption;
        if (selfCaption !== undefined && selfCaption !== "") updateData.self_caption = selfCaption;
        if (paymentTypeSelf !== undefined && paymentTypeSelf !== "") updateData.payment_type_self = paymentTypeSelf;
        if (paymentTypeInteractive !== undefined && paymentTypeInteractive !== "") updateData.payment_type_interactive = paymentTypeInteractive;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields provided to update. Please provide at least one of interactiveCost, selfCost, interactiveCaption, selfCaption, paymentTypeSelf, or paymentTypeInteractive.' });
        }

        const [updatedCount] = await db.courses.update(updateData, {
            where: {
                course_provider_id: providerId
            }
        });

        res.status(200).json({
            success: true,
            message: `Successfully updated ${updatedCount} courses.`,
            updatedCount
        });

    } catch (error) {
        console.error('Update Costs Error:', error);
        res.status(500).json({ error: 'Failed to update costs', details: error.message });
    }
};

export { updateCostsByProvider };
