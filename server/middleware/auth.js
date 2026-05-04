const { verifyToken, extractToken } = require('../app/auth');

/**
 * JWT Authentication Middleware
 * Verifies the JWT token in the Authorization header
 * Sets req.user with decoded token data if valid
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({
            status: 'error',
            message: 'Access token required. Please login first.',
            code: 'NO_TOKEN'
        });
    }

    const token = extractToken(authHeader);
    
    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid authorization header format. Use: Bearer <token>',
            code: 'INVALID_TOKEN_FORMAT'
        });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        const statusCode = error.message === 'Token has expired' ? 401 : 403;
        const code = error.message === 'Token has expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        
        return res.status(statusCode).json({
            status: 'error',
            message: error.message,
            code
        });
    }
}

/**
 * Optional Authentication Middleware
 * Verifies JWT token if present, but doesn't fail if missing
 * Sets req.user if token is valid, otherwise req.user is undefined
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return next();
    }

    const token = extractToken(authHeader);
    
    if (!token) {
        return next();
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
    } catch (error) {
        // If token is invalid but present, we still continue
        // This allows graceful handling of invalid tokens
    }
    
    next();
}

module.exports = {
    authenticateToken,
    optionalAuth
};
