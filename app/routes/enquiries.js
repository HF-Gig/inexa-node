import express from 'express';
import { createEnquiry, getEnquiries, checkEnquirySubmission } from '../controller/enquiriesController.js';
import { authenticateToken } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = express.Router();

router.post('/', optionalAuth, createEnquiry);

router.get('/', authenticateToken, getEnquiries);

router.get('/check/:course_id', optionalAuth, checkEnquirySubmission);

export default router;
