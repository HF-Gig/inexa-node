import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

function getUpload(folder = 'logos') {
    const targetDir = path.join(__dirname, `../../uploads/${folder}`);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    // Configure storage
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, targetDir);
        },
        filename: function (req, file, cb) {
            // Generate unique filename with timestamp
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `${folder}-` + uniqueSuffix + path.extname(file.originalname));
        }
    });
    // Configure multer
    return multer({
        storage: storage,
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit
        }
    });
}

export default getUpload; 