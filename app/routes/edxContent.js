import express from "express"
import { getCourses, getCoursesDetail } from "../controller/edxContent.js";
import { fetchAndStoreEdxCourses } from "../helper/storeTheEdxContent.js";
const router= express.Router()
import verifyJWT from "../middleware/verifyJwt.js"

router.use(verifyJWT)
router.get('/courses',getCourses)
router.get('/course/:courseId',getCoursesDetail)
router.get('/store',fetchAndStoreEdxCourses)
export default router;
