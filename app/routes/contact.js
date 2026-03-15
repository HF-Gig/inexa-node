import express from 'express';
import { submitContactForm, getAllContactForms, submitConsultationForm, updateContactStatus, deleteContact } from '../controller/contact.js';

const router = express.Router();
// POST /api/contact
router.post('/', submitContactForm);

// POST /api/consultation
router.post('/consultation', submitConsultationForm);

// GET /api/contact/get-forms
router.get('/get-forms', getAllContactForms);

// PUT /api/contact/:id/status
router.put('/:id/status', updateContactStatus);

// DELETE /api/contact/:id
router.delete('/:id', deleteContact);

export default router;
