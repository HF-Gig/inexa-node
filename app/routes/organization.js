import express from "express";
import {
  createOrganization,
  deleteOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
} from "../controller/organization.js";
import { authenticateToken } from '../middleware/auth.js';
import { isAdmin, isEditor } from '../middleware/roleCheck.js';
import getUpload from '../middleware/upload.js';

const router = express.Router();
const upload = getUpload('organization');

router.use(authenticateToken);

router.get('', isEditor, getOrganizations);
router.get('/:id', isEditor, getOrganizationById);
router.post('', isEditor, upload.single('organization_logo_image_url'), createOrganization);
router.post('/:id', isEditor, upload.single('organization_logo_image_url'), updateOrganization);
router.delete('/:id', isEditor, deleteOrganization);

export default router; 