# PAFR Authentication System - Implementation Guide

## Overview

The PAFR (Personnel & Attendance Force Readiness) Authentication System provides secure JWT-based authentication with role-based access control (RBAC) for the Node.js/Express backend API.

## Architecture

### Components

1. **Authentication Utilities** (`server/app/auth.js`)
   - Password hashing using bcrypt
   - JWT token generation and verification
   - Token extraction from HTTP headers

2. **JWT Middleware** (`server/middleware/auth.js`)
   - Token validation middleware
   - Optional authentication middleware
   - Automatic user context injection

3. **Role-Based Access Control** (`server/middleware/rbac.js`)
   - Role authorization middleware
   - Flexible role checking
   - Shorthand utilities for common roles

4. **Authentication Routes** (`server/routes/auth.js`)
   - POST `/auth/login` - User login
   - POST `/auth/logout` - User logout
   - POST `/auth/register` - Create new user (admin only)
   - GET `/auth/profile` - Get current user profile

## API Endpoints

### POST /auth/login
Authenticate user with ID Number (service_number) and password.

**Request:**
```json
{
  "id_number": "RES-12345",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "id_number": "RES-12345",
      "role": "admin"
    }
  }
}
```

**Error Responses:**
- 400: Validation error (missing id_number, empty password)
- 401: Invalid credentials (wrong id_number or password)
- 403: Account deactivated
- 500: Server error

### POST /auth/logout
Logout user. Client should remove the token from storage.

**Request:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "message": "Logout successful. Please delete the token from local storage.",
  "code": "LOGOUT_SUCCESS"
}
```

### POST /auth/register
Create a new user account (admin only).

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123",
  "role": "reservist"
}
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "User created successfully",
  "data": {
    "userId": 2,
    "email": "newuser@example.com",
    "role": "reservist"
  }
}
```

**Error Responses:**
- 400: Validation error
- 403: Admin-only access required
- 409: Email already registered
- 500: Server error

### GET /auth/profile
Get current authenticated user's profile.

**Request:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "userId": 1,
    "id_number": "RES-12345",
    "role": "admin"
  }
}
```

**Error Responses:**
- 401: No token or token expired
- 403: Invalid token
- 500: Server error

## Usage Examples

### Using the Authentication Middleware

Protect an endpoint with token validation:

```javascript
const { authenticateToken } = require('./middleware/auth');
const { adminOnly } = require('./middleware/rbac');

// Protected endpoint - requires valid token
router.get('/protected-route', authenticateToken, (req, res) => {
  res.json({
    message: `Welcome, ${req.user.email}!`,
    userId: req.user.userId,
    role: req.user.role
  });
});

// Admin-only endpoint
router.delete('/admin/users/:id', authenticateToken, adminOnly, (req, res) => {
  // Only admins can access this
});
```

### Custom Role Authorization

```javascript
const { authorize } = require('./middleware/rbac');

// Allow multiple roles
router.post('/action', authenticateToken, authorize('admin', 'supervisor'), (req, res) => {
  // Admins and supervisors can access
});

// Shorthand for specific roles
const { reservistOnly } = require('./middleware/rbac');
router.post('/reservist/action', authenticateToken, reservistOnly, (req, res) => {
  // Only reservists can access
});
```

### Optional Authentication

Use optional authentication when some data varies by role:

```javascript
const { optionalAuth } = require('./middleware/auth');

router.get('/public-data', optionalAuth, (req, res) => {
  let data = publicData;
  
  if (req.user) {
    // User is authenticated - include additional data
    data.personalInfo = userSpecificData;
  }
  
  res.json(data);
});
```

## Environment Configuration

Configure the following environment variables in `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pafr

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRY=24h
```

**Important:** Change `JWT_SECRET` in production to a secure random value.

---

## Development Test Accounts

For development and testing purposes, use these pre-configured accounts:

### Admin Account
```
ID Number: ADMIN-001
Password: AdminPass123!
Role: admin
Name: System Administrator
```

### Reservist Account
```
ID Number: RES-001
Password: Reservist123!
Role: reservist
Name: Juan Dela Cruz
Rank: Airman
```

**Note:** These accounts are for development only. Create proper accounts for production use.

---

**Last Updated:** May 2, 2026
**Status:** ✅ Production Ready (Phase 2 Complete)
