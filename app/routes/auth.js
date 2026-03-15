import express from 'express';
import { forgotPassword, login, resetPasswrod, signup, verifyEmail, completeProfile, adminLogin } from '../controller/auth.js';
import { sendSignupMail } from '../controller/sendSignupMail.js';
import { passwordChangeAlert } from '../controller/passwordChangeAlert.js';
const router = express.Router();

router.post("/signup", signup);
router.post('/signin', login)
router.post('/admin/signin', adminLogin)
router.post('/send-verification-email', sendSignupMail)
router.post('/verify-email', verifyEmail)
router.post('/complete-profile', completeProfile)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPasswrod)
router.post('/reset-password-alert', passwordChangeAlert)

export default router;