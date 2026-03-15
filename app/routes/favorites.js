import express from "express";
import { addToFavorites, removeFromFavorites, getFavorites } from "../controller/favorites.js";
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Add course to favorites
router.post('/add', addToFavorites);

// Remove course from favorites
router.delete('/remove/:course_uuid', removeFromFavorites);

// Get user's favorite courses
router.get('/list', getFavorites);

export default router; 