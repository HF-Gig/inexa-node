import express from 'express';
import { createTestimonial, getTestimonials, getTestimonialById, updateTestimonial, deleteTestimonial, updateTestimonialOrder } from '../controller/testimonial.js';
import { isAdmin, isEditor } from '../middleware/roleCheck.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getTestimonials);

router.use(authenticateToken);

router.put('/order', isEditor, updateTestimonialOrder);
router.post('/', isEditor, createTestimonial);
router.get('/:id', isEditor, getTestimonialById);
router.put('/:id', isEditor, updateTestimonial);
router.delete('/:id', isEditor, deleteTestimonial);

export default router;
