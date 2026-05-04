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

async function test() {
  try {
    log(colors.blue, '🔍 Testing Reservist Update Fix\n');

    // Step 1: Login as admin
    log(colors.yellow, '1️⃣  Logging in as admin...');
    const loginRes = await axios.post(`http://localhost:3000/auth/login`, {
      id_number: 'ADMIN-001',
      password: 'AdminPass123!'
    });
    authToken = loginRes.data.data.token;
    log(colors.green, '✅ Login successful\n');

    // Step 2: Get a reservist to update
    log(colors.yellow, '2️⃣  Fetching reservist ID 3...');
    const getRes = await axios.get(`${API_BASE}/reservists/3`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const reservist = getRes.data.data;
    log(colors.green, `✅ Fetched reservist: ${reservist.first_name} ${reservist.last_name}\n`);

    // Step 3: Test valid update (should succeed)
    log(colors.yellow, '3️⃣  Testing VALID update...');
    try {
      const updateRes = await axios.put(`${API_BASE}/reservists/3`, {
        email: 'mike.wilson.updated@pafr.gov',
        first_name: 'Mike',
        last_name: 'Wilson',
        rank: 'Private',
        service_number: 'SN-003',
        date_of_birth: '1995-12-09',
        phone_number: '+639123456791',
        emergency_contact_name: 'Mary Wilsons',
        emergency_contact_phone: '+639987654323',
        address: '789 Pine Rd, Baguio',
        group_id: 1,  // Valid group
        city_id: 1    // Valid city in group 1
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.green, `✅ Valid update succeeded: ${updateRes.data.message}\n`);
    } catch (err) {
      log(colors.red, `❌ Valid update failed: ${err.response?.data?.message}\n`);
    }

    // Step 4: Test invalid city_id (should fail with proper error)
    log(colors.yellow, '4️⃣  Testing INVALID city_id (not in group)...');
    try {
      const updateRes = await axios.put(`${API_BASE}/reservists/3`, {
        first_name: 'Mike',
        group_id: 1,
        city_id: 999  // Invalid city
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.red, `❌ Should have failed but succeeded\n`);
    } catch (err) {
      if (err.response?.data?.code === 'INVALID_CITY') {
        log(colors.green, `✅ Correctly rejected invalid city: ${err.response.data.message}\n`);
      } else {
        log(colors.red, `❌ Wrong error: ${err.response?.data?.message}\n`);
      }
    }

    // Step 5: Test invalid group_id (should fail with proper error)
    log(colors.yellow, '5️⃣  Testing INVALID group_id...');
    try {
      const updateRes = await axios.put(`${API_BASE}/reservists/3`, {
        first_name: 'Mike',
        group_id: 999  // Invalid group
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.red, `❌ Should have failed but succeeded\n`);
    } catch (err) {
      if (err.response?.data?.code === 'INVALID_GROUP') {
        log(colors.green, `✅ Correctly rejected invalid group: ${err.response.data.message}\n`);
      } else {
        log(colors.red, `❌ Wrong error: ${err.response?.data?.message}\n`);
      }
    }

    // Step 6: Test duplicate email (should fail with proper error)
    log(colors.yellow, '6️⃣  Testing duplicate email...');
    try {
      const updateRes = await axios.put(`${API_BASE}/reservists/3`, {
        email: 'admin@pafr.gov',  // Admin's email - should fail
        first_name: 'Mike'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      log(colors.red, `❌ Should have failed but succeeded\n`);
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_EXISTS') {
        log(colors.green, `✅ Correctly rejected duplicate email: ${err.response.data.message}\n`);
      } else {
        log(colors.red, `❌ Wrong error: ${err.response?.data?.message}\n`);
      }
    }

    log(colors.blue, '✅ All tests completed!');
    process.exit(0);

  } catch (error) {
    log(colors.red, '❌ Test error:', error.message);
    if (error.response?.data) {
      log(colors.red, 'Response:', error.response.data);
    }
    process.exit(1);
  }
}

test();
