/**
 * Role-Based Access Control (RBAC) Middleware
 * Ensures user has required role(s) to access the endpoint
 */

/**
 * Create a role-checking middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the endpoint
 * @returns {Function} - Express middleware function
 */
function authorize(...allowedRoles) {
    return (req, res, next) => {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required',
                code: 'NOT_AUTHENTICATED'
            });
        }

        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
                code: 'INSUFFICIENT_ROLE',
                userRole: req.user.role,
                requiredRoles: allowedRoles
            });
        }

        next();
    };
}

/**
 * Shorthand middleware for admin-only access
 */
function adminOnly(req, res, next) {
    return authorize('admin')(req, res, next);
}

/**
 * Shorthand middleware for reservist access
 */
function reservistOnly(req, res, next) {
    return authorize('reservist')(req, res, next);
}

/**
 * Middleware to allow both admin and reservist
 */
function anyRole(req, res, next) {
    return authorize('admin', 'reservist')(req, res, next);
}

module.exports = {
    authorize,
    adminOnly,
    reservistOnly,
    anyRole
};
