import express from 'express';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import staffRoutes from './routes/staff.js';
import ownerRoutes from './routes/owners.js';
import edxRoutes from './routes/edx.js';
import organizationRoutes from './routes/organization.js';
import favoritesRoutes from './routes/favorites.js';
import paymentRoutes from './routes/payment.js';
import testimonialRoutes from './routes/testimonial.js';
import siteStatisticsRoutes from './routes/siteStatistics.js';
import courseProvidersRoutes from './routes/courseProviders.js';
import subjectsRoutes from './routes/subjects.js';
import contactRoutes from './routes/contact.js';
import subscriptionRoutes from './routes/subscription.js';
import payfastRoutes from './routes/payfast.js';
import paystackRoutes from './routes/paystack.js';
import enquiriesRoutes from './routes/enquiries.js';

import { getCostConfigs, updateCostConfigById, deleteCostConfigById, updateCostsByProvider } from './controller/costs.js';
import {
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
} from './controller/coupon.js';
const router = express.Router();


router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/staff', staffRoutes);
router.use('/owners', ownerRoutes);
router.use('/courses', edxRoutes);
router.use('/organization', organizationRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/payment', paymentRoutes);
router.use('/testimonial', testimonialRoutes);
router.use('/site-statistics', siteStatisticsRoutes);
router.use('/course-providers', courseProvidersRoutes);
router.use('/subjects', subjectsRoutes);
router.use('/contact', contactRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payfast', payfastRoutes);
router.use('/paystack', paystackRoutes);
router.use('/enquiries', enquiriesRoutes);

router.get('/costs', getCostConfigs);
router.post('/costs/update', updateCostsByProvider);
router.put('/costs/:id', updateCostConfigById);
router.delete('/costs/:id', deleteCostConfigById);

router.get('/coupons', getCoupons);
router.get('/coupons/public-active', getPublicActiveCoupons);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);
router.post('/coupons/validate', validateCoupon);
router.post('/coupons/:id/pause', pauseCoupon);
router.post('/coupons/:id/resume', resumeCoupon);
router.post('/coupons/:id/duplicate', duplicateCoupon);
router.get('/coupons/:id/report', getCouponUsageReport);
router.get('/coupons-dashboard', getCouponPerformanceDashboard);

export default router;