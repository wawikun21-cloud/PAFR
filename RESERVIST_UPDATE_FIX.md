# Reservist Update Error - Fix Summary

## Issues Identified and Fixed

### 1. **Missing Email Uniqueness Validation** ✅ FIXED
**Problem:** When updating a reservist's email, the code didn't check if the new email already exists for another user. Since the `users` table has a UNIQUE constraint on email, the UPDATE would fail with a database error.

**Location:** Line 597 in `/server/routes/reservists.js`

**Fix Applied:**
- Added validation query before updating email
- Checks if the new email exists for ANY other user (not just the current one)
- Returns proper error response with code `EMAIL_EXISTS` if duplicate found

**Code Change:**
```javascript
// Before: Direct update without checking
db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId], ...)

// After: Check for duplicates first
db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], 
  (checkEmailErr, checkEmailResults) => {
    if (checkEmailResults?.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already in use by another user',
        code: 'EMAIL_EXISTS'
      });
    }
    // Only then update
    db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId], ...)
  }
);
```

---

### 2. **Missing Foreign Key Validation for Group and City** ✅ FIXED
**Problem:** When updating a reservist's assignment (group_id and city_id), the code attempted to update/insert without verifying that the group and city actually exist. This would result in foreign key constraint violations.

**Location:** Lines 512-575 in `/server/routes/reservists.js`

**Fix Applied:**
- Added validation for group_id - ensures the group exists
- Added validation for city_id - ensures the city exists AND belongs to the selected group
- Returns proper error responses:
  - `INVALID_GROUP` if group doesn't exist
  - `INVALID_CITY` if city doesn't exist or doesn't belong to the group

**Code Change:**
```javascript
// Before: Direct update/insert without validation
if (group_id !== undefined) {
  db.query('SELECT id FROM reservist_assignments WHERE reservist_id = ?', ...)
}

// After: Validate IDs first
if (group_id !== undefined) {
  db.query('SELECT id FROM `groups` WHERE id = ?', [group_id], 
    (groupErr, groupResults) => {
      if (!groupResults?.length) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid group_id',
          code: 'INVALID_GROUP'
        });
      }
      
      if (city_id !== undefined) {
        db.query('SELECT id FROM cities WHERE id = ? AND group_id = ?', 
          [city_id, group_id], 
          (cityErr, cityResults) => {
            if (!cityResults?.length) {
              return res.status(400).json({
                status: 'error',
                message: 'Invalid city_id or city does not belong to selected group',
                code: 'INVALID_CITY'
              });
            }
            // Only then proceed with update/insert
          }
        );
      }
    }
  );
}
```

---

## Testing the Fix

### Test Cases Now Properly Handled:

1. **Valid Update** ✅
   - All fields valid and exist in database
   - Update succeeds with status 200

2. **Duplicate Email** ✅
   - New email already belongs to another user
   - Returns 409 with `EMAIL_EXISTS` error

3. **Invalid Group ID** ✅
   - group_id doesn't exist in groups table
   - Returns 400 with `INVALID_GROUP` error

4. **Invalid City ID** ✅
   - city_id doesn't exist in cities table
   - Returns 400 with `INVALID_CITY` error

5. **City Not in Group** ✅
   - city_id exists but belongs to different group
   - Returns 400 with `INVALID_CITY` error

---

## Database Schema Context

The fixes align with your database constraints:

```sql
-- Users table
users (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,  -- ← UNIQUE constraint
  ...
)

-- Reservist Assignments table
reservist_assignments (
  id BIGINT PRIMARY KEY,
  reservist_id BIGINT NOT NULL,
  group_id BIGINT NOT NULL,            -- ← Foreign key to groups
  city_id BIGINT NOT NULL,             -- ← Foreign key to cities
  ...
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (city_id) REFERENCES cities(id)
)
```

---

## Impact

These fixes prevent:
- Silent database errors that were causing failed updates
- Confusing error messages to the user
- Inconsistent database state

The client now receives clear, actionable error messages with proper HTTP status codes, allowing the UI to display helpful feedback to users.
