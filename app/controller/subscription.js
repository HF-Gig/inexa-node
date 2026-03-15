import db from '../../db.js';
import { getPaginationMetadata, formatPaginatedResponse } from '../utils/pagination.js';

export async function getAllSubscriptions(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.page_size) || 10;
        const offset = (page - 1) * pageSize;
        const { email } = req.query;

        let whereClause = {};

        if (email) {
            const user = await db.user.findOne({ where: { email } });
            if (user) {
                whereClause.user_id = user.id;
            } else {
                return res.json(formatPaginatedResponse({
                    data: [],
                    pagination: getPaginationMetadata({ page, pageSize, totalItems: 0 })
                }));
            }
        }

        const { count, rows: subscriptions } = await db.subscription.findAndCountAll({
            where: whereClause,
            limit: pageSize,
            offset: offset,
            include: [
                {
                    model: db.user,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const pagination = getPaginationMetadata({
            page,
            pageSize,
            totalItems: count
        });

        return res.json(formatPaginatedResponse({
            data: subscriptions,
            pagination
        }));
    } catch (error) {
        console.log("error in getAllSubscriptions======>", error);
        return res.json({ message: "Internal Server Error", status: false, statusCode: 500 });
    }
}

export async function createSubscription(req, res) {
    try {
        const { stripe_subscription_id, name, country, user_id, recurring_date, start_date, end_date, status, span, amount, provider } = req.body;

        if (!stripe_subscription_id || !name || !country || !user_id || !recurring_date || !start_date || !status) {
            return res.status(400).json({ message: "Missing required fields", status: false });
        }

        const newSubscription = await db.subscription.create({
            stripe_subscription_id,
            name,
            country,
            user_id,
            recurring_date,
            start_date,
            end_date,
            status,
            span,
            amount,
            provider
        });

        return res.status(201).json({
            message: "Subscription created successfully",
            status: true,
            data: newSubscription
        });
    } catch (error) {
        console.log("error in createSubscription======>", error);
        return res.status(500).json({ message: "Internal Server Error", status: false, statusCode: 500 });
    }
}

export async function updateSubscription(req, res) {
    try {
        const { id } = req.params;
        const { stripe_subscription_id, name, country, user_id, recurring_date, start_date, end_date, status, span, amount, provider } = req.body;

        const subscription = await db.subscription.findByPk(id);

        if (!subscription) {
            return res.status(404).json({ message: "Subscription not found", status: false });
        }

        await subscription.update({
            stripe_subscription_id,
            name,
            country,
            user_id,
            recurring_date,
            start_date,
            end_date,
            status,
            span,
            amount,
            provider
        });

        return res.status(200).json({
            message: "Subscription updated successfully",
            status: true,
            data: subscription
        });
    } catch (error) {
        console.log("error in updateSubscription======>", error);
        return res.status(500).json({ message: "Internal Server Error", status: false, statusCode: 500 });
    }
}

export async function deleteSubscription(req, res) {
    try {
        const { id } = req.params;
        const subscription = await db.subscription.findByPk(id);

        if (!subscription) {
            return res.status(404).json({ message: "Subscription not found", status: false });
        }

        await subscription.destroy();

        return res.status(200).json({
            message: "Subscription deleted successfully",
            status: true
        });
    } catch (error) {
        console.log("error in deleteSubscription======>", error);
        return res.status(500).json({ message: "Internal Server Error", status: false, statusCode: 500 });
    }
}
