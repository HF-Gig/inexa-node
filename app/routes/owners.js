import express from "express"
import { 
  createOwner, 
  deleteOwner, 
  getOwners, 
  getOwnerById,
  updateOwner,
} from "../controller/owners.js";
import { authenticateToken } from '../middleware/auth.js';
import { isAdmin, isEditor } from '../middleware/roleCheck.js';
import getUpload from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Admin only routes
router.get('', isEditor, getOwners);
router.get('/:id', isEditor, getOwnerById);
const upload = getUpload();
router.post('', isEditor, upload.single('certificate_logo_image_url'), createOwner);
router.put('/:id', isEditor, upload.single('certificate_logo_image_url'), updateOwner);
router.delete('/:id', isEditor, deleteOwner);

export default router; 