import express from 'express';
import multer from 'multer';
import { createCourseProvider, getCourseProviders, getCourseProviderById, updateCourseProvider, deleteCourseProvider } from '../controller/courseProviders.js';
import { isAdmin, isEditor } from '../middleware/roleCheck.js';
import { authenticateToken } from '../middleware/auth.js';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.get('/:id', getCourseProviderById);
router.get('/', getCourseProviders);

// Protect all routes below this middleware
router.use(authenticateToken);

router.post('/', isEditor, upload.single('logo_url'), createCourseProvider);
router.put('/:id', isEditor, upload.single('logo_url'), updateCourseProvider);
router.delete('/:id', isEditor, deleteCourseProvider);

export default router; 