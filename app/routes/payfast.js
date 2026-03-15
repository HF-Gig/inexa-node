import express from "express";
import { InitPayfastPayment } from "../controller/payfast.js";

const router = express.Router();

router.post('/init', InitPayfastPayment);

export default router; 