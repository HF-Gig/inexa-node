import express from 'express';
import { createSubject, getSubjects, getSubjectById, updateSubject, deleteSubject, enbl_dsbl_subjects, updateSubjectsOrder } from '../controller/subjects.js';
import { isAdmin, isEditor } from '../middleware/roleCheck.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getSubjects); // public fetch

// Protected routes
router.use(authenticateToken);

router.post('/', isEditor, createSubject);
router.get('/:id', isEditor, getSubjectById);
router.put('/order', isEditor, updateSubjectsOrder);
router.put('/:id', isEditor, updateSubject);
router.delete('/:id', isEditor, deleteSubject);
router.put('/status/:id', isEditor, enbl_dsbl_subjects);

export default router;
