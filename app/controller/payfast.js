import crypto from "crypto";
import db from "../../db.js";
import { getStandardPricing } from "../utils/pricing.js";

const signatureOrder = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'cell_number',
    'm_payment_id', 'amount', 'item_name', 'item_description',
    'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
    'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
    'email_confirmation', 'confirmation_address', 'payment_method',
    'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles',
    'subscription_notify_email', 'subscription_notify_webhook', 'subscription_notify_buyer'
];

function generateSignature(data, passphrase) {
    const validData = {};
    for (const key in data) {
        if (data.hasOwnProperty(key) && data[key] !== undefined && data[key] !== null && data[key] !== '') {
            validData[key] = data[key].toString().trim();
        }
    }

    const sortedKeys = Object.keys(validData).sort((a, b) => {
        const indexA = signatureOrder.indexOf(a);
        const indexB = signatureOrder.indexOf(b);

        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        return a.localeCompare(b);
    });
    const phpUrlEncode = (str) => {
        return encodeURIComponent(str)
            .replace(/%20/g, "+")
            .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16));
    };

    const query = sortedKeys
        .map(key => `${key}=${phpUrlEncode(validData[key])}`)
        .join("&");

    const stringToSign = passphrase ? `${query}&passphrase=${phpUrlEncode(passphrase.trim())}` : query;

    return crypto.createHash("md5").update(stringToSign).digest("hex");
}


export async function InitPayfastPayment(req, res) {
    try {
        const { courseId } = req.body;

        console.log(`received course id ${courseId} for payfast checkout.`)

        if (!courseId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const course = await db.courses.findOne({ where: { id: courseId } });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        const orderId = `ORDER-${Date.now()}-${courseId}`;

        const pricing = await getStandardPricing();
        const amount = pricing.firstPaymentAmountUSD;

        const paymentData = {
            merchant_id: process.env.PAYFAST_MERCHANT_ID,
            merchant_key: process.env.PAYFAST_MERCHANT_KEY,
            return_url: `${process.env.FRONTEND_URL}/payment/success`,
            cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
            // notify_url: `${process.env.BACKEND_URL}/api/payfast/notify`,
            m_payment_id: orderId,
            amount: parseFloat(amount).toFixed(2),
            item_name: course.title,
        };

        paymentData.signature = generateSignature(
            paymentData,
            process.env.PAYFAST_PASSPHRASE
        );

        const payfastUrl = process.env.PAYFAST_URL;

        return res.status(200).json({
            payfastUrl,
            paymentData,
        });
    } catch (error) {
        console.error("PayFast init error:", error);
        return res.status(500).json({
            message: "Failed to initialize payment",
        });
    }
}
