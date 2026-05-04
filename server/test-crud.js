const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = null;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = (color, ...args) => console.log(`${color}`, ...args, colors.reset);

async function testCRUD() {
  try {
    log(colors.blue, '🔍 Testing Complete Reservist CRUD Functionality\n');

    // Step 1: Login as admin
    log(colors.yellow, '1️⃣  Logging in as admin...');
    const loginRes = await axios.post('http://localhost:3000/auth/login', {
      id_number: 'ADMIN-001',
      password: 'AdminPass123!'
    });
    authToken = loginRes.data.data.token;
    log(colors.green, '✅ Login successful\n');

    // Step 2: CREATE - Test reservist creation
    log(colors.yellow, '2️⃣  Testing CREATE (POST /api/reservists)...');
    const testEmail = `test.${Date.now()}@pafr.gov`;
    const testServiceNumber = `TEST-${Date.now().toString().slice(-4)}`;

    try {
      const createRes = await axios.post(`${API_BASE}/reservists`, {
        email: testEmail,
        password: 'TestPass123!',
        first_name: 'Test',
        last_name: 'Reservist',
        rank: 'Private',
        service_number: testServiceNumber,
        date_of_birth: '1990-01-01',
        phone_number: '+639123456789',
        emergency_contact_name: 'Test Contact',
        emergency_contact_phone: '+639987654321',
        address: 'Test Address',
        group_id: 1,
        city_id: 1
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.green, `✅ Reservist created successfully: ID ${createRes.data.data.reservistId}\n`);
      const createdReservistId = createRes.data.data.reservistId;

      // Step 3: READ - Test individual reservist retrieval
      log(colors.yellow, '3️⃣  Testing READ (GET /api/reservists/:id)...');
      const getRes = await axios.get(`${API_BASE}/reservists/${createdReservistId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.green, `✅ Retrieved reservist: ${getRes.data.data.first_name} ${getRes.data.data.last_name}\n`);

      // Step 4: READ - Test list retrieval with search
      log(colors.yellow, '4️⃣  Testing READ (GET /api/reservists with search)...');
      const listRes = await axios.get(`${API_BASE}/reservists?search=Test&page=1&limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.green, `✅ Retrieved ${listRes.data.data.reservists.length} reservists matching search\n`);

      // Step 5: UPDATE - Test valid update
      log(colors.yellow, '5️⃣  Testing UPDATE (PUT /api/reservists/:id)...');
      const updateRes = await axios.put(`${API_BASE}/reservists/${createdReservistId}`, {
        first_name: 'Updated',
        last_name: 'Reservist',
        rank: 'Corporal',
        phone_number: '+639111222333'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.green, `✅ Reservist updated successfully\n`);

      // Step 6: DELETE - Test soft delete
      log(colors.yellow, '6️⃣  Testing DELETE (DELETE /api/reservists/:id)...');
      const deleteRes = await axios.delete(`${API_BASE}/reservists/${createdReservistId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.green, `✅ Reservist deactivated successfully\n`);

      // Step 7: Verify deactivation
      log(colors.yellow, '7️⃣  Verifying deactivation (reservist should not appear in active list)...');
      const verifyRes = await axios.get(`${API_BASE}/reservists?search=Updated&page=1&limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const found = verifyRes.data.data.reservists.some(r => r.id === createdReservistId);
      if (!found) {
        log(colors.green, '✅ Deactivated reservist correctly filtered out\n');
      } else {
        log(colors.red, '❌ Deactivated reservist still appears in list\n');
      }

    } catch (err) {
      log(colors.red, `❌ CRUD operation failed: ${err.response?.data?.message}`);
      log(colors.red, `   Error code: ${err.response?.data?.code}`);
      log(colors.red, `   Full response: ${JSON.stringify(err.response?.data, null, 2)}\n`);
      return;
    }

    // Step 8: Test validation errors
    log(colors.yellow, '8️⃣  Testing validation errors...');

    // Test duplicate service number
    try {
      await axios.post(`${API_BASE}/reservists`, {
        email: 'another@test.com',
        password: 'TestPass123!',
        first_name: 'Duplicate',
        last_name: 'Test',
        rank: 'Private',
        service_number: 'SN-003', // Existing service number
        group_id: 1,
        city_id: 1
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.red, '❌ Should have rejected duplicate service number\n');
    } catch (err) {
      if (err.response?.data?.code === 'SERVICE_NUMBER_EXISTS') {
        log(colors.green, '✅ Correctly rejected duplicate service number\n');
      } else {
        log(colors.red, `❌ Wrong error for duplicate service number: ${err.response?.data?.message}\n`);
      }
    }

    // Test missing required fields
    try {
      await axios.post(`${API_BASE}/reservists`, {
        email: 'missing@test.com',
        password: 'TestPass123!'
        // Missing required fields
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.red, '❌ Should have rejected missing required fields\n');
    } catch (err) {
      if (err.response?.status === 400) {
        log(colors.green, '✅ Correctly rejected missing required fields\n');
      } else {
        log(colors.red, `❌ Wrong error for missing fields: ${err.response?.data?.message}\n`);
      }
    }

    log(colors.blue, '✅ Complete CRUD test suite completed successfully!');

  } catch (error) {
    log(colors.red, '❌ Test error:', error.message);
    if (error.response?.data) {
      log(colors.red, 'Response:', error.response.data);
    }
  }
}

testCRUD();