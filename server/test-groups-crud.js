const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
let authToken = null;
let testGroupId = null;

async function test() {
  try {
    console.log('=== GROUPS CRUD TEST ===\n');

    // 1. Login
    console.log('1. Logging in as admin...');
    const loginRes = await axios.post('http://localhost:3000/auth/login', {
      id_number: 'ADMIN-001',
      password: 'AdminPass123!'
    });
    authToken = loginRes.data.data.token;
    console.log('✅ Login successful\n');

    // 2. Get ARSEN ID for testing
    console.log('2. Getting ARSEN ID...');
    const arsenRes = await axios.get(`${API_BASE}/arsens?limit=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!arsenRes.data.data?.arsens?.length) {
      console.log('❌ No ARSEN found for testing');
      return;
    }
    const arsenId = arsenRes.data.data.arsens[0].id;
    console.log('✅ Using ARSEN ID:', arsenId, '\n');

    // 3. TEST CREATE
    console.log('3. Testing CREATE...');
    try {
      const timestamp = Date.now();
      const createRes = await axios.post(`${API_BASE}/groups`, {
        arsen_id: arsenId,
        code: `TEST-${timestamp}`,
        name: `Test Group ${timestamp}`,
        commander_name: 'Test Commander'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ CREATE successful');
      console.log('   Group ID:', createRes.data.data.groupId);
      testGroupId = createRes.data.data.groupId;
    } catch (err) {
      console.log('❌ CREATE failed:', err.response?.data?.message || err.message);
      if (err.response?.data?.debug) {
        console.log('   Debug:', err.response.data.debug);
      }
    }
    console.log('');

    // 4. TEST READ (List)
    console.log('4. Testing READ (List)...');
    try {
      const listRes = await axios.get(`${API_BASE}/groups?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ READ (List) successful');
      console.log('   Total groups:', listRes.data.data.pagination.totalItems);
    } catch (err) {
      console.log('❌ READ (List) failed:', err.response?.data?.message || err.message);
    }
    console.log('');

    // 5. TEST READ (Single)
    if (testGroupId) {
      console.log('5. Testing READ (Single)...');
      try {
        const singleRes = await axios.get(`${API_BASE}/groups/${testGroupId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ READ (Single) successful');
        console.log('   Name:', singleRes.data.data.name);
      } catch (err) {
        console.log('❌ READ (Single) failed:', err.response?.data?.message || err.message);
      }
      console.log('');
    }

    // 6. TEST UPDATE
    if (testGroupId) {
      console.log('6. Testing UPDATE...');
      try {
        const updateRes = await axios.put(`${API_BASE}/groups/${testGroupId}`, {
          name: 'Updated Test Group',
          commander_name: 'Updated Commander'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ UPDATE successful');
        console.log('   Message:', updateRes.data.message);
      } catch (err) {
        console.log('❌ UPDATE failed:', err.response?.data?.message || err.message);
        if (err.response?.data?.debug) {
          console.log('   Debug:', err.response.data.debug);
        }
      }
      console.log('');
    }

    // 7. TEST DELETE (Soft delete)
    if (testGroupId) {
      console.log('7. Testing DELETE (Soft delete)...');
      try {
        const deleteRes = await axios.delete(`${API_BASE}/groups/${testGroupId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ DELETE successful');
        console.log('   Message:', deleteRes.data.message);
      } catch (err) {
        console.log('❌ DELETE failed:', err.response?.data?.message || err.message);
      }
      console.log('');
    }

    console.log('=== TEST COMPLETE ===');

  } catch (error) {
    console.log('Test error:', error.message);
  }
}

test();
