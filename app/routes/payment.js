import express from "express";
import { createCheckoutSession, handleSubscriptionWebhook, cancelSubscription, getSubscriptionDetails, sendInvoiceByPaymentId, notifyPaymentCompletion, createManualEft, updatePaymentStatus, getAllPayments, deletePayment, getUserPayments } from "../controller/payment.js";
import { authenticateToken } from '../middleware/auth.js';
import { isAdmin, isStudent, isEditor } from '../middleware/roleCheck.js';

const router = express.Router();

router.post("/webhook", express.raw({ type: 'application/json' }), handleSubscriptionWebhook);

// Payment notification route (no auth required)
router.all("/notify", notifyPaymentCompletion);
router.get("/all", getAllPayments);

router.use(authenticateToken);

router.post("/checkout", isStudent, createCheckoutSession);
router.post("/manual-eft", authenticateToken, createManualEft);
router.put("/:paymentId/status", authenticateToken, updatePaymentStatus);
router.delete("/:paymentId", authenticateToken, deletePayment);
router.put("/subscription/:subscriptionId/cancel", isStudent, cancelSubscription);
router.get("/subscription/:userId", isStudent, getSubscriptionDetails);
router.get("/my-payments", authenticateToken, getUserPayments);

// Route to send invoice PDF as email attachment
router.post('/send-invoice/:paymentId', isEditor, sendInvoiceByPaymentId);

export default router;