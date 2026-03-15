export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            message: "Access denied. Admin privileges required.",
            status: false,
            statusCode: 403
        });
    }
};

export const isEditor = (req, res, next) => {
    if (req.user && (req.user.role === 'manager' || req.user.role === 'admin' || req.user.role === 'owner' || req.user.role === 'editor')) {
        next();
    } else {
        return res.status(403).json({
            message: "Access denied. Admin or Manager privileges required.",
            status: false,
            statusCode: 403
        });
    }
};

export const isModerator = (req, res, next) => {
    if (req.user && (req.user.role === 'manager' || req.user.role === 'admin' || req.user.role === 'owner' || req.user.role === 'editor' || req.user.role === 'moderator')) {
        next();
    } else {
        return res.status(403).json({
            message: "Access denied. Admin or Manager privileges required.",
            status: false,
            statusCode: 403
        });
    }
};

export const isInstructor = (req, res, next) => {
    if (req.user && (req.user.role === 'instructor' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({
            message: "Access denied. Instructor privileges required.",
            status: false,
            statusCode: 403
        });
    }
};

export const isStudent = (req, res, next) => {
    if (req.user && (req.user.role === 'student' || req.user.role === 'instructor' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({
            message: "Access denied. Student privileges required.",
            status: false,
            statusCode: 403
        });
    }
}; 