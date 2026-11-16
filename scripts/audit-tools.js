import { SerpClient } from '../src/api-client.js';
import { AuthManager } from '../src/auth.js';

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 DASTYAR SERP MCP LIVE AUDIT SUITE');
  console.log('====================================================\n');

  const token = AuthManager.getToken();
  if (!token) {
    console.error('❌ FAILED: No active session token found.');
    process.exit(1);
  }

  const tests = [
    { name: 'Admin Profile & Session', fn: () => AuthManager.getProfile() },
    { name: 'Overview Summary Stats', fn: () => SerpClient.getOverviewStats() },
    { name: 'Promotions List', fn: () => SerpClient.listPromotions({ take: 5 }) },
    { name: 'Chatbot Ads List', fn: () => SerpClient.listChatbotAds({ take: 5 }) },
    { name: 'Ad Lines List', fn: () => SerpClient.listAdLines({ take: 5 }) },
    { name: 'Ad Review Queue', fn: () => SerpClient.getAdReviewQueue({ take: 5 }) },
    { name: 'Search Trends List', fn: () => SerpClient.listSearchTrends({ take: 5 }) },
    { name: 'Intent Suggestions List', fn: () => SerpClient.listIntentSuggestions({ take: 5 }) },
    { name: 'Query Forms List', fn: () => SerpClient.listQueryForms({ take: 5 }) },
    { name: 'Keywords List', fn: () => SerpClient.listKeywords({ take: 5 }) },
    { name: 'Keyword Groups List', fn: () => SerpClient.listGroups({ take: 5 }) },
    { name: 'Live User Search Queries', fn: () => SerpClient.listUserSearchQueries({ take: 5 }) },
    { name: 'Ad Events Stream', fn: () => SerpClient.listAdEvents({ take: 5 }) },
    { name: 'Global Ad Settings', fn: () => SerpClient.getAdSettings() },
    { name: 'Brands List', fn: () => SerpClient.listBrands({ take: 5 }) },
    { name: 'Services List', fn: () => SerpClient.listServices({ take: 5 }) },
    { name: 'Clustering Jobs', fn: () => SerpClient.listClusteringJobs({ take: 5 }) },
    { name: 'Ad Line Daily Stats', fn: () => SerpClient.getAdLineDailyStats({ take: 5 }) }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const start = Date.now();
    try {
      const res = await test.fn();
      const latency = Date.now() - start;
      const count = Array.isArray(res)
        ? res.length
        : typeof res === 'object' && res !== null
          ? Object.keys(res).length
          : 1;
      console.log(`✅ [PASS] ${test.name.padEnd(28)} | ${latency.toString().padStart(4)}ms | Items/Keys: ${count}`);
      passed++;
    } catch (err) {
      const latency = Date.now() - start;
      console.log(`❌ [FAIL] ${test.name.padEnd(28)} | ${latency.toString().padStart(4)}ms | Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log(`📊 AUDIT SUMMARY: ${passed}/${tests.length} PASSED (${Math.round((passed / tests.length) * 100)}%)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
