import fs from 'fs';
import path from 'path';

export const uploadLogo = async (file, folder = 'logos') => {
    try {
        if (!file) {
            return null;
        }

        // Return the file path
        const baseUrl = process.env.FILE_UPLOAD_BASE_URL || '/uploads';
        return `${baseUrl}/${folder}/${file.filename}`;
    } catch (error) {
        console.error('Error uploading logo:', error);
        throw new Error('Failed to upload logo');
    }
};

export const deleteLogo = async (filePath) => {
    try {
        if (!filePath) {
            return;
        }

        // Remove the leading slash to get the correct path
        const fullPath = path.join(process.cwd(), filePath.substring(1));
        
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log('Logo file deleted:', fullPath);
        }
    } catch (error) {
        console.error('Error deleting logo:', error);
    }
};

export const getImageUrl = (filePath) => {
    if (!filePath) return null;
    // If already an external URL, return as-is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
    }
    // Otherwise, treat as local and prepend base URL
    const baseUrl = `${process.env.BASE_URL}`;
    return `${baseUrl}${filePath}`;
}; 