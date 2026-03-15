import express from "express";
import { initializeTransaction, verifyTransaction, handleWebhook } from "../controller/paystack.js";

const router = express.Router();

router.post('/initialize', initializeTransaction);
router.post('/verify', verifyTransaction);
router.post('/webhook', handleWebhook);

export default router;
