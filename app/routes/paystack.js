import express from "express";
import { getPaystackQuote, initializeTransaction, verifyTransaction, handleWebhook } from "../controller/paystack.js";

const router = express.Router();

router.get('/quote', getPaystackQuote);
router.post('/initialize', initializeTransaction);
router.post('/verify', verifyTransaction);
router.post('/webhook', handleWebhook);

export default router;
