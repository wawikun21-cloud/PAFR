const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        return hash;
    } catch (error) {
        throw new Error(`Password hashing failed: ${error.message}`);
    }
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password from database
 * @returns {Promise<boolean>} - True if password matches
 */
async function comparePassword(password, hash) {
    try {
        const match = await bcrypt.compare(password, hash);
        return match;
    } catch (error) {
        throw new Error(`Password comparison failed: ${error.message}`);
    }
}

/**
 * Generate JWT token
 * @param {object} payload - Token payload (user id, role, etc.)
 * @returns {string} - JWT token
 */
function generateToken(payload) {
    try {
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        return token;
    } catch (error) {
        throw new Error(`Token generation failed: ${error.message}`);
    }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} - Decoded token payload
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw new Error(`Token verification failed: ${error.message}`);
    }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null
 */
function extractToken(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
}

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    extractToken
};
