import { SerpClient } from './api-client.js';
import { AuthManager } from './auth.js';

async function testConnection() {
  console.log('--- Testing Dastyar SERP Connection ---');
  try {
    const profile = await AuthManager.getProfile();
    console.log('✅ Authenticated successfully as:', profile.email, `(${profile.name})`);
    
    const stats = await SerpClient.getOverviewStats();
    console.log('✅ Overview Stats retrieved successfully:', stats);
    console.log('--- All Connection Tests Passed! ---');
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    process.exit(1);
  }
}

testConnection();
