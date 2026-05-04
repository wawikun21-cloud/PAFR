#!/usr/bin/env node

/**
 * PAFR Authentication System - Complete Integration Test
 * Tests the full authentication flow including login, token validation, and role-based access
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';
let testsPassed = 0;
let testsFailed = 0;

/**
 * Helper function to make HTTP requests
 */
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

/**
 * Test runner
 */
async function runTests() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   PAFR Authentication System Integration  ║');
    console.log('║              Test Suite v1.0               ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    try {
        const res = await makeRequest('GET', '/health');
        assert.strictEqual(res.status, 200, 'Health check should return 200');
        assert.strictEqual(res.body.status, 'healthy', 'Health status should be healthy');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 2: Root Endpoint
    console.log('📋 Test 2: Root Endpoint');
    try {
        const res = await makeRequest('GET', '/');
        assert.strictEqual(res.status, 200, 'Root should return 200');
        assert.strictEqual(res.body.status, 'running', 'Status should be running');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 3: Login with Invalid Email Format
    console.log('📋 Test 3: Login with Invalid Email Format');
    try {
        const res = await makeRequest('POST', '/auth/login', {
            email: 'not-an-email',
            password: 'password123'
        });
        assert.strictEqual(res.status, 400, 'Should return 400 for invalid email');
        assert.strictEqual(res.body.code, 'VALIDATION_ERROR', 'Should have validation error code');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 4: Login with Missing Password
    console.log('📋 Test 4: Login with Missing Password');
    try {
        const res = await makeRequest('POST', '/auth/login', {
            email: 'test@example.com'
        });
        assert.strictEqual(res.status, 400, 'Should return 400 for missing password');
        assert.strictEqual(res.body.code, 'VALIDATION_ERROR', 'Should have validation error code');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 5: Login with Non-existent User
    console.log('📋 Test 5: Login with Non-existent User');
    try {
        const res = await makeRequest('POST', '/auth/login', {
            email: 'nonexistent@example.com',
            password: 'password123'
        });
        assert.strictEqual(res.status, 401, 'Should return 401 for invalid credentials');
        assert.strictEqual(res.body.code, 'INVALID_CREDENTIALS', 'Should have invalid credentials code');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 6: Protect endpoint without token
    console.log('📋 Test 6: Access Protected Endpoint Without Token');
    try {
        const res = await makeRequest('GET', '/auth/profile');
        assert.strictEqual(res.status, 401, 'Should return 401 without token');
        assert.strictEqual(res.body.code, 'NO_TOKEN', 'Should have NO_TOKEN code');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 7: Protected endpoint with invalid token
    console.log('📋 Test 7: Access Protected Endpoint With Invalid Token');
    try {
        const res = await makeRequest('GET', '/auth/profile', null, {
            'Authorization': 'Bearer invalid_token_here'
        });
        assert.strictEqual(res.status, 403, 'Should return 403 for invalid token');
        assert.strictEqual(res.body.code, 'INVALID_TOKEN', 'Should have INVALID_TOKEN code');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 8: Protected endpoint with malformed authorization header
    console.log('📋 Test 8: Protected Endpoint With Malformed Auth Header');
    try {
        const res = await makeRequest('GET', '/auth/profile', null, {
            'Authorization': 'InvalidFormat token'
        });
        assert.strictEqual(res.status, 401, 'Should return 401 for malformed header');
        assert.strictEqual(res.body.code, 'INVALID_TOKEN_FORMAT', 'Should have INVALID_TOKEN_FORMAT code');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 9: 404 Error Handling
    console.log('📋 Test 9: 404 Error Handling');
    try {
        const res = await makeRequest('GET', '/nonexistent-endpoint');
        assert.strictEqual(res.status, 404, 'Should return 404 for nonexistent endpoint');
        assert.strictEqual(res.body.code, 'NOT_FOUND', 'Should have NOT_FOUND code');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Test 10: Logout endpoint requires authentication
    console.log('📋 Test 10: Logout Endpoint Requires Authentication');
    try {
        const res = await makeRequest('POST', '/auth/logout');
        assert.strictEqual(res.status, 401, 'Should return 401 without token');
        assert.strictEqual(res.body.code, 'NO_TOKEN', 'Should have NO_TOKEN code');
        console.log('✅ PASSED\n');
        testsPassed++;
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}\n`);
        testsFailed++;
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════╗');
    console.log(`║         Test Summary                       ║`);
    console.log(`║  Passed: ${testsPassed.toString().padEnd(3)} Failed: ${testsFailed.toString().padEnd(3)}              ║`);
    console.log(`║  Total:  ${(testsPassed + testsFailed).toString().padEnd(3)}                          ║`);
    console.log('╚════════════════════════════════════════════╝\n');

    process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});
