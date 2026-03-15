import express from "express"
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
  deleteUserAdmin,
  getUserById,
  updateUserProfile,
  updatePassword
} from "../controller/user.js";
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isAdmin, isEditor } from '../middleware/roleCheck.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'user-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Invalid file type!');
    }
  }
});

router.get('/get-user-info/:id', getUserById);
router.put('/update-user-profile/:id', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'government_id', maxCount: 1 }
]), updateUserProfile);
router.put('/update-password/:id', updatePassword);
router.post('/delete-account', deleteUser);

router.use(authenticateToken);

router.get('', getUsers);
router.post('', isEditor, createUser);
router.put('/:id', isEditor, updateUser);
router.delete('/:id', isEditor, deleteUserAdmin);

export default router;