import axios from 'axios';

// Test script to verify API endpoints for trainings
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

async function testTrainingsAPI() {
  try {
    console.log('Testing internal trainings API...');
    const internalResponse = await api.get('/trainings/internal', {
      params: { limit: 50, status: 'published' }
    });
    console.log('Internal trainings response:', internalResponse.data);
    
    console.log('Testing external trainings API...');
    const externalResponse = await api.get('/trainings/external', {
      params: { limit: 50, status: 'open' }
    });
    console.log('External trainings response:', externalResponse.data);
    
    return {
      internal: internalResponse.data,
      external: externalResponse.data
    };
  } catch (error) {
    console.error('API test failed:', error);
    throw error;
  }
}

// Execute test if called directly
if (require.main === module) {
  testTrainingsAPI().then(result => {
    console.log('Test completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export default testTrainingsAPI;