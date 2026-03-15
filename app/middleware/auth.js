import jwt from 'jsonwebtoken';
import db from '../../db.js';

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: "Authentication token is required",
                status: false,
                statusCode: 401
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user and attach to request
        const user = await db.user.findOne({
            where: { id: decoded?.userInfo?.id },
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(401).json({
                message: "User not found",
                status: false,
                statusCode: 401
            });
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({
            message: "Invalid or expired token",
            status: false,
            statusCode: 401
        });
    }
}; 