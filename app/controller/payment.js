import db from "../../db.js";
import Stripe from 'stripe';
import { sendInvoiceEmail } from '../helper/sendEmail.js';
import { getStandardPricing } from '../utils/pricing.js';
import { normalizePlan, buildManualEftInstallments } from '../utils/installmentSchedule.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const normalizePaymentStatusInput = (status) => {
    const normalized = String(status || '').toLowerCase().trim();
    if (!normalized) return '';
    if (normalized === 'sent') return 'under_review';
    if (['success', 'successed', 'succeeded'].includes(normalized)) return 'succeeded';
    if (['under review', 'under_review', 'review'].includes(normalized)) return 'under_review';
    return normalized;
};

/**
 * Creates a checkout session with immediate first payment and quarterly subscription
 * 
 * Flow:
 * 1. Frontend collects card details and creates Payment Method using Stripe Elements
 * 2. Frontend sends Payment Method ID (pm_xxx) to this endpoint
 * 3. Backend uses Payment Method ID to charge customer
 * 
 * @param {Object} req.body.payment_method - Payment Method ID from Stripe (pm_xxx)
 * @param {Number} req.body.userId - User ID
 */
const createCheckoutSession = async (req, res) => {
    const { payment_method, userId, name, country } = req.body;

    if (!payment_method || !userId) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: payment_method and userId',
            note: 'payment_method should be a Stripe Payment Method ID (pm_xxx) created on frontend'
        });
    }

    if (!name || !country) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: name and country',
            note: 'payment_method should be a Stripe Payment Method ID (pm_xxx) created on frontend'
        });
    }

    // Validate payment method format
    if (!payment_method.startsWith('pm_')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid payment method format',
            note: 'Payment method should start with "pm_" and be created using Stripe Elements on frontend'
        });
    }

    try {
        const user = await db.user.findByPk(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Get payment amounts from DB (standard pricing), fallback to env
        const pricing = await getStandardPricing();
        const firstPaymentAmount = Math.round(Number(pricing.firstPaymentAmountUSD)) || 333;
        const quarterlyPaymentAmount = Math.round(Number(pricing.quarterlyPaymentAmountUSD)) || 222;

        // Use an existing Stripe customer ID if available, otherwise create a new one
        let stripeCustomerId = user.stripe_customer_id;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                payment_method: payment_method,
                invoice_settings: {
                    default_payment_method: payment_method,
                },
            });
            stripeCustomerId = customer.id;
            // Save the new customer ID to your user record
            await user.update({ stripe_customer_id: stripeCustomerId });
        } else {
            // Retrieve the payment method to check if it's already attached
            const paymentMethodObj = await stripe.paymentMethods.retrieve(payment_method);
            console.log('paymentMethodObj :>> ', paymentMethodObj);
            if (!paymentMethodObj.customer) {
                // Not attached, safe to attach
                await stripe.paymentMethods.attach(payment_method, {
                    customer: stripeCustomerId,
                });
            } else if (paymentMethodObj.customer !== stripeCustomerId) {
                // Already attached to a different customer
                return res.status(400).json({
                    success: false,
                    error: 'Payment method is already attached to another customer.'
                });
            }
            // If already attached to this customer, do nothing (safe)
        }

        // 1. Create the initial one-time payment (first payment amount)
        const initialPaymentIntent = await stripe.paymentIntents.create({
            amount: firstPaymentAmount * 100, // Convert to cents
            currency: 'usd',
            customer: stripeCustomerId,
            payment_method: payment_method, // Using Payment Method ID, not card number
            off_session: true, // Charge immediately
            confirm: true,
            metadata: {
                payment_type: 'initial_payment',
                user_id: userId
            }
        });

        // 2. Create an invoice item (linking the payment to the invoice)
        const invoiceItem = await stripe.invoiceItems.create({
            customer: stripeCustomerId,
            amount: firstPaymentAmount * 100, // Convert to cents
            currency: 'usd',
            description: 'Initial Payment for Service', // Optional description
            metadata: {
                payment_type: 'initial_payment',
                user_id: userId
            }
        });

        // 3. Create the invoice
        const invoice = await stripe.invoices.create({
            customer: stripeCustomerId,
            auto_advance: true, // Automatically finalize the invoice
            collection_method: 'charge_automatically', // Charges automatically upon creation
            metadata: {
                payment_type: 'initial_payment',
                user_id: userId
            }
        });

        // Finalize the invoice to ensure the PDF and payment links are generated
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

        // 4. Retrieve the PDF URL for the invoice
        const invoicePdfUrl = finalizedInvoice.invoice_pdf;

        // Record the initial payment in your database
        const paymentRecord = await db.payment.create({
            user_id: user.id,
            amount: firstPaymentAmount,
            currency: 'usd',
            status: initialPaymentIntent.status,
            payment_type: 'one-time',
            invoice_number: finalizedInvoice.id, // Store the invoice ID for reference
            invoice_pdf_url: invoicePdfUrl // Store the invoice PDF URL in your database
        });
        // Send invoice email if PDF URL is present
        if (initialPaymentIntent.invoice_pdf) {
            try {
                await sendInvoiceEmail(paymentRecord.id);
            } catch (err) {
                console.error('Failed to send invoice email:', err.message);
            }
        }

        if (initialPaymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                success: false,
                error: 'Initial payment failed',
                details: initialPaymentIntent.last_payment_error
            });
        }

        // 2. Create the subscription for quarterly payments starting after 3 months
        // First, create the product and price if they don't exist
        const product = await stripe.products.create({
            name: 'Quarterly Subscription',
            description: 'Quarterly payment plan starting after 3 months'
        });

        const price = await stripe.prices.create({
            unit_amount: quarterlyPaymentAmount * 100, // Convert to cents
            currency: 'usd',
            recurring: {
                interval: 'month',
                interval_count: 3, // every 3 months
            },
            product: product.id,
        });

        // Calculate the start date (3 months from now)
        const now = new Date();
        const startDate = now;
        startDate.setMonth(startDate.getMonth() + 3);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 12);

        const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: price.id }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
            off_session: true,
            trial_end: Math.floor(startDate.getTime() / 1000), // Convert to Unix timestamp
            cancel_at: Math.floor(endDate.getTime() / 1000),
            metadata: {
                user_id: userId,
                payments_remaining: 3,
                subscription_type: 'quarterly',
                start_date: startDate.toISOString(),
            }
        });
        // Record the subscription in the subscriptions table
        await db.subscription.create({
            stripe_subscription_id: subscription.id,
            name: name,
            country: country,
            user_id: user.id,
            recurring_date: startDate,
            start_date: new Date(),
            status: subscription.status
        });

        res.status(200).json({
            success: true,
            message: 'Checkout successful!',
            initialPayment: {
                id: initialPaymentIntent.id,
                amount: firstPaymentAmount,
                status: initialPaymentIntent.status
            },
            subscription: {
                id: subscription.id,
                quarterlyAmount: quarterlyPaymentAmount,
                startDate: startDate.toISOString(),
                status: subscription.status
            },
            summary: {
                totalInitialPayment: firstPaymentAmount,
                quarterlyPaymentAmount: quarterlyPaymentAmount,
                nextPaymentDate: startDate.toISOString(),
                paymentsRemaining: 3
            }
        });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({
            error: 'Payment processing failed',
            details: error.message
        });
    }
};

// Webhook handler to manage subscription lifecycle
const handleSubscriptionWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    // Find the subscription record
                    const subscription = await db.subscription.findOne({
                        where: { stripe_subscription_id: invoice.subscription }
                    });
                    if (subscription) {
                        // 1. Create a payment record
                        const payment = await db.payment.create({
                            user_id: subscription.user_id,
                            amount: invoice.amount_paid / 100, // Stripe sends amount in cents
                            currency: invoice.currency,
                            status: 'succeeded',
                            payment_type: 'subscription',
                            invoice_number: invoice.number || invoice.id,
                            invoice_pdf_url: invoice.invoice_pdf,
                        });
                        // Send invoice email if PDF URL is present
                        if (invoice.invoice_pdf) {
                            try {
                                await sendInvoiceEmail(payment.id);
                            } catch (err) {
                                console.error('Failed to send subscription invoice email:', err.message);
                            }
                        }
                        // 2. Update next billing date and status
                        const nextBillingDate = invoice.lines.data[0]?.period?.end
                            ? new Date(invoice.lines.data[0].period.end * 1000)
                            : null;
                        if (nextBillingDate) {
                            await subscription.update({
                                recurring_date: nextBillingDate,
                                status: 'active'
                            });
                        } else {
                            await subscription.update({ status: 'active' });
                        }
                    }
                }
                break;
            }
            case 'invoice.payment_failed': {
                const failedInvoice = event.data.object;
                if (failedInvoice.subscription) {
                    // Find the subscription record
                    const subscription = await db.subscription.findOne({
                        where: { stripe_subscription_id: failedInvoice.subscription }
                    });
                    if (subscription) {
                        // Create a failed payment record
                        await db.payment.create({
                            user_id: subscription.user_id,
                            amount: failedInvoice.amount_due / 100, // Stripe sends amount in cents
                            currency: failedInvoice.currency,
                            status: 'failed',
                            payment_type: 'subscription',
                            invoice_number: failedInvoice.number || failedInvoice.id,
                        });
                    }
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscriptionObj = event.data.object;
                // Update subscription status when cancelled
                await db.subscription.update(
                    { status: 'cancelled', end_date: new Date() },
                    { where: { stripe_subscription_id: subscriptionObj.id } }
                );
                break;
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

// Function to cancel subscription
const cancelSubscription = async (req, res) => {
    const { subscriptionId } = req.params;
    const { userId } = req.body;

    try {
        const payment = await db.payment.findOne({
            where: {
                stripe_subscription_id: subscriptionId,
                user_id: userId
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });

        // Update the payment record
        await payment.update({ status: 'cancelling' });

        res.status(200).json({
            message: 'Subscription cancelled successfully',
            subscription: {
                id: subscription.id,
                status: subscription.status,
                cancelAt: subscription.cancel_at
            }
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            error: 'Failed to cancel subscription',
            details: error.message
        });
    }
};

const getSubscriptionDetails = async (req, res) => {
    const { userId } = req.params;
    // console.log('userId :>> ', userId);
    try {
        const subscriptions = await db.subscription.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });

        const subscriptionDetails = subscriptions.map(sub => ({
            id: sub.id,
            stripe_subscription_id: sub.stripe_subscription_id,
            next_billing_date: sub.recurring_date,
            start_date: sub.start_date,
            end_date: sub.end_date,
            status: sub.status
        }));

        res.status(200).json({
            subscriptions: subscriptionDetails,
            summary: {
                totalSubscriptions: subscriptionDetails.length,
                activeSubscriptions: subscriptionDetails.filter(s => s.status === 'active').length
            }
        });
    } catch (error) {
        console.error('Get subscription details error:', error);
        res.status(500).json({
            error: 'Failed to get subscription details',
            details: error.message
        });
    }
};

const sendInvoiceByPaymentId = async (req, res) => {
    try {
        await sendInvoiceEmail(req.params.paymentId);
        res.json({ message: 'Invoice sent successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send invoice', details: err.message });
    }
};

const notifyPaymentCompletion = async (req, res) => {
    try {
        console.log('Payment Validation Notification :>> ');
        console.log('Body:', req.body);
        console.log('Query:', req.query);

        res.status(200).json({
            message: 'Notification received successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Notification Error:', error);
        res.status(500).json({ error: 'Failed to process notification' });

    }
};

const createManualEft = async (req, res) => {
    try {
        const { courseId, currency, selectedPlan, amount, recurringAmount, promoCode } = req.body;
        const userId = req.user ? req.user.id : req.body.userId;

        let discountPercentage = 0;
        if (promoCode) {
            const normalizedCode = String(promoCode).trim();
            if (normalizedCode) {
                const promo = await db.coupon.findOne({ where: { code: normalizedCode, isActive: true } });
                if (promo) {
                    if (promo.expiryDate) {
                        const expiry = new Date(promo.expiryDate);
                        expiry.setHours(23, 59, 59, 999);
                        if (expiry >= new Date()) {
                            discountPercentage = Number(promo.percentage || 0);
                        }
                    } else {
                        discountPercentage = Number(promo.percentage || 0);
                    }
                }
            }
        }

        const standardPricing = await getStandardPricing();
        const course = courseId ? await db.courses.findByPk(courseId) : null;
        const schedule = buildManualEftInstallments({
            selectedPlan,
            course,
            standardPricing,
            currency: currency || 'usd',
            recurringAmountOverride: recurringAmount,
            discountPercentage
        });
        const requestedAmount = Number(amount);
        if (Number.isFinite(requestedAmount) && requestedAmount > 0 && schedule.length > 0) {
            schedule[0].amount = requestedAmount;
        }
        const paymentRows = schedule.map((item) => ({
            user_id: userId,
            course_id: courseId,
            amount: item.amount,
            currency: item.currency,
            status: item.status,
            payment_type: 'subscription',
            payment_method: 'manual_eft',
            selected_plan: item.selectedPlan,
            installment_label: item.installmentLabel,
            installment_number: item.installmentNumber,
            total_installments: item.totalInstallments,
            due_date: item.dueDate,
        }));
        const createdPayments = await db.payment.bulkCreate(paymentRows);
        const firstPaymentRecord = createdPayments.find((p) => p.installment_number === 1) || createdPayments[0];

        res.status(200).json({
            success: true,
            paymentId: firstPaymentRecord.id,
            message: 'Manual EFT payment initiated',
            duePayment: {
                amount: firstPaymentRecord.amount,
                currency: firstPaymentRecord.currency,
                selectedPlan: firstPaymentRecord.selected_plan,
                installmentLabel: firstPaymentRecord.installment_label,
                installmentNumber: firstPaymentRecord.installment_number,
                totalInstallments: firstPaymentRecord.total_installments,
                dueDate: firstPaymentRecord.due_date
            },
            installmentSchedule: createdPayments
                .sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0))
                .map((p) => ({
                    paymentId: p.id,
                    amount: p.amount,
                    currency: p.currency,
                    status: p.status,
                    installmentLabel: p.installment_label,
                    installmentNumber: p.installment_number,
                    totalInstallments: p.total_installments,
                    dueDate: p.due_date
                })),
            followUpSchedule: createdPayments
                .filter((p) => Number(p.installment_number || 0) > 1)
                .sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0))
                .map((p) => p.due_date)
        });
    } catch (error) {
        console.error('Create Manual EFT Error:', error);
        res.status(500).json({ error: 'Failed to initiate payment', details: error.message });
    }
};

const markPaymentSentByUser = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user?.id;
        const payment = await db.payment.findByPk(paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        if (Number(payment.user_id) !== Number(userId)) {
            return res.status(403).json({ error: 'You can only update your own payment records' });
        }
        if (payment.payment_method !== 'manual_eft') {
            return res.status(400).json({ error: 'Only manual EFT payments can be marked as sent' });
        }
        const currentStatus = normalizePaymentStatusInput(payment.status);
        if (!['pending', 'initiated', 'declined'].includes(currentStatus)) {
            return res.status(400).json({ error: `This payment cannot be marked as sent from status: ${payment.status}` });
        }

        await payment.update({ status: 'under_review' });
        return res.status(200).json({ success: true, message: 'Payment marked as sent. Status is now under review.' });
    } catch (error) {
        console.error('Mark Payment Sent Error:', error);
        return res.status(500).json({ error: 'Failed to mark payment as sent', details: error.message });
    }
};

const updatePaymentStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { status } = req.body;
        const normalizedStatus = normalizePaymentStatusInput(status);

        const payment = await db.payment.findByPk(paymentId);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        if (!normalizedStatus) {
            return res.status(400).json({ error: 'Status is required' });
        }

        await payment.update({ status: normalizedStatus });

        res.status(200).json({
            success: true,
            message: `Payment status updated to ${normalizedStatus}`
        });
    } catch (error) {
        console.error('Update Payment Status Error:', error);
        res.status(500).json({ error: 'Failed to update payment status', details: error.message });
    }
};


const getAllPayments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { search, date, status } = req.query;

        const whereClause = {};
        const userWhereClause = {};

        // Filter by date (exact match on YYYY-MM-DD)
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);

            whereClause.created_at = {
                [db.Sequelize.Op.gte]: startDate,
                [db.Sequelize.Op.lt]: endDate
            };
        }

        // Search by email
        if (search) {
            userWhereClause.email = {
                [db.Sequelize.Op.like]: `%${search}%`
            };
        }

        if (status) {
            whereClause.status = status;
        }

        const { count, rows } = await db.payment.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: db.user,
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    where: Object.keys(userWhereClause).length > 0 ? userWhereClause : undefined
                },
                {
                    model: db.courses,
                    as: 'course',
                    attributes: ['id', 'title']
                },
            ],
            order: [['created_at', 'DESC']],
            limit: limit,
            offset: offset
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                totalHelpers: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit
            }
        });
    } catch (error) {
        console.error('Get All Payments Error:', error);
        res.status(500).json({ error: 'Failed to retrieve payments', details: error.message });
    }
};

const deletePayment = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await db.payment.findByPk(paymentId);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        await payment.destroy();

        res.status(200).json({
            success: true,
            message: 'Payment deleted successfully'
        });
    } catch (error) {
        console.error('Delete Payment Error:', error);
        res.status(500).json({ error: 'Failed to delete payment', details: error.message });
    }
};

const getUserPayments = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await db.payment.findAndCountAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit: limit,
            offset: offset,
            attributes: [
                'id',
                'amount',
                'currency',
                'status',
                'payment_type',
                'payment_method',
                'selected_plan',
                'installment_label',
                'installment_number',
                'total_installments',
                'due_date',
                'created_at',
                'invoice_pdf_url',
                'invoice_number'
            ]
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                limit: limit
            }
        });
    } catch (error) {
        console.error('Get User Payments Error:', error);
        res.status(500).json({ error: 'Failed to retrieve your payments', details: error.message });
    }
};

export { createCheckoutSession, handleSubscriptionWebhook, cancelSubscription, getSubscriptionDetails, sendInvoiceByPaymentId, notifyPaymentCompletion, createManualEft, markPaymentSentByUser, updatePaymentStatus, getAllPayments, deletePayment, getUserPayments }; 