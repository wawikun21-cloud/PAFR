const axios = require('axios');

async function test() {
  try {
    // Login
    const loginRes = await axios.post('http://localhost:3000/auth/login', {
      id_number: 'ADMIN-001',
      password: 'AdminPass123!'
    });
    const token = loginRes.data.data.token;
    console.log('Logged in successfully');

    // Get ARSEN ID
    const arsenRes = await axios.get('http://localhost:3000/api/arsens?limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const arsenId = arsenRes.data.data.arsens[0].id;
    console.log('Using ARSEN ID:', arsenId);

    // Test CREATE
    console.log('\nTesting CREATE...');
    const timestamp = Date.now();
    try {
      const createRes = await axios.post('http://localhost:3000/api/groups', {
        arsen_id: arsenId,
        code: `TEST-${timestamp}`,
        name: `Test Group ${timestamp}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('CREATE SUCCESS:', JSON.stringify(createRes.data, null, 2));
    } catch (err) {
      console.log('CREATE FAILED:', JSON.stringify(err.response?.data || err.message, null, 2));
    }

  } catch (error) {
    console.log('Error:', error.message);
  }
}

test();
