import express from "express";
import {
  createStaff,
  deleteStaff,
  getStaff,
  getStaffById,
  updateStaff,
  assignCoursesToStaff,
  getAssignedCourses,
  unassignCoursesFromStaff,
  getInexaStaff,
  getFeaturedFacilitators,
  updateFeaturedFacilitatorPosition,
  addFeaturedFacilitator,
  removeFeaturedFacilitator,
  updateFeaturedFacilitator,
  createInexaFacilitator,
  updateInexaFacilitator,
  getInexaFacilitatorById,
  deleteInexaFacilitator
} from "../controller/staff.js";
import { authenticateToken } from '../middleware/auth.js';
import { isAdmin, isEditor } from '../middleware/roleCheck.js';
import getUpload from '../middleware/upload.js';

const router = express.Router();

router.get('/get-featured-facilitators', getFeaturedFacilitators)
router.get('/inexa-staff/:id', getInexaFacilitatorById);

// All routes require authentication
router.use(authenticateToken);
const upload = getUpload('staff');
// Admin only routes

router.post('', isEditor, upload.single('profile_image_url'), createStaff);
router.post('/inexa-staff', isEditor, upload.single('profile_image_url'), createInexaFacilitator);
// router.get('/inexa-staff/get-all', isEditor, getInexaStaff);
router.get('/get-all-inexa-staff', isEditor, getInexaStaff);
router.get('', isEditor, getStaff);
router.post('/add-featured-facilitator', isEditor, addFeaturedFacilitator);

router.put('/inexa-staff/:id', isEditor, upload.single('profile_image_url'), updateInexaFacilitator);
router.delete('/inexa-staff/:id', isEditor, deleteInexaFacilitator);
router.post('/:id', isEditor, upload.single('profile_image_url'), updateStaff);
router.post('/:id/assign-courses', isEditor, assignCoursesToStaff);
router.post('/:id/unassign-courses', isEditor, unassignCoursesFromStaff);
router.put('/featured/:position', isEditor, updateFeaturedFacilitatorPosition);
router.get('/:id', isEditor, getStaffById);
router.get('/:id/assigned-courses', isEditor, getAssignedCourses);
router.delete('/remove-featured-facilitator/:id', isEditor, removeFeaturedFacilitator);
router.put('/update-featured-facilitator/:id', isEditor, updateFeaturedFacilitator);
router.delete('/:id', isEditor, deleteStaff);

export default router;
