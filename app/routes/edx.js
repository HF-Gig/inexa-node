import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { isEditor, isModerator } from '../middleware/roleCheck.js';
import { getCourses, getCoursesDetail, createCourse, updateCourse, deleteCourse, getFilterData, getAllFilterData, getCourseDetailBySlug, getPopularCourses, getFeaturedCourses, updateFeaturedCourse, updateCobranding, exportCoursesCsv } from "../controller/edxContent.js";
import { fetchAndStoreEdxCourses } from "../helper/storeTheEdxContent.js";
import getUpload from '../middleware/upload.js';

const router = express.Router();
const upload = getUpload('courses');

const uploadFields = upload.fields([
    { name: 'image_url', maxCount: 1 },
    { name: 'degree_pdf_path', maxCount: 1 }
]);

// Make /store public
router.get('/store', fetchAndStoreEdxCourses);
router.get('/popular', getPopularCourses);
router.get('', getCourses);
router.get('/filters', getFilterData);
router.get('/slug/:slug', getCourseDetailBySlug);
router.get('/featured-courses', getFeaturedCourses);
router.get('/get-course/:courseId', getCoursesDetail);

// All routes require authentication
router.use(authenticateToken);

// Export CSV (Moderator only)
router.get('/export-csv', isModerator, exportCoursesCsv);

router.get('/all-filters', isModerator, getAllFilterData);
router.get('/:courseId', isModerator, getCoursesDetail);
router.put('/featured/:position', isEditor, updateFeaturedCourse);
router.post('', isModerator, uploadFields, createCourse);
router.put('/:courseId/cobranding', isModerator, updateCobranding);
router.post('/:courseId', isModerator, uploadFields, updateCourse);
router.delete('/:courseId', isEditor, deleteCourse);

export default router; 