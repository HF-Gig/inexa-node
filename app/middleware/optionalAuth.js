import jwt from 'jsonwebtoken';
import db from '../../db.js';

// Optional authentication: if a valid Bearer token is present, attach the user to req.user.
// If no token or invalid token, just continue without failing the request.
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.userInfo?.id) {
      const user = await db.user.findOne({
        where: { id: decoded.userInfo.id },
        attributes: { exclude: ['password'] },
      });

      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Swallow errors: this middleware is optional auth
    console.error('Optional auth error:', error);
  }

  return next();
};

