/**
 * PHASE 3 - Test Backend Endpoints
 * Test all endpoints for auth and clients
 */

const http = require('http');
const BASE_URL = 'http://localhost:3000';

// Helper function for HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test runner
async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  PHASE 3 - BACKEND API TEST SUITE    ║');
  console.log('╚════════════════════════════════════════╝\n');

  let token = null;
  let clientId = null;
  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  try {
    console.log('📍 TEST 1: Health Check');
    const res = await makeRequest('GET', '/health');
    if (res.status === 200 && res.data.status === 'ok') {
      console.log('   ✅ PASS\n');
      passed++;
    } else {
      console.log('   ❌ FAIL\n');
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 2: API Status
  try {
    console.log('📍 TEST 2: API Status with DB Check');
    const res = await makeRequest('GET', '/api/status');
    if (res.status === 200 && res.data.status === 'running') {
      console.log('   ✅ PASS (DB connected)\n');
      passed++;
    } else {
      console.log('   ❌ FAIL (DB not connected)\n');
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 3: Register User
  try {
    console.log('📍 TEST 3: Register New User');
    const res = await makeRequest('POST', '/api/auth/register', {
      email: 'test.user@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User'
    });

    if (res.status === 201 && res.data.token) {
      token = res.data.token;
      console.log('   ✅ PASS (token received)\n');
      passed++;
    } else {
      console.log(`   ❌ FAIL (status: ${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`   ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 4: Login User
  if (!token) {
    try {
      console.log('📍 TEST 4: Login User');
      const res = await makeRequest('POST', '/api/auth/login', {
        email: 'test.user@example.com',
        password: 'Password123!'
      });

      if (res.status === 200 && res.data.token) {
        token = res.data.token;
        console.log('   ✅ PASS (token received)\n');
        passed++;
      } else {
        console.log(`   ❌ FAIL (status: ${res.status})\n`);
        failed++;
      }
    } catch (err) {
      console.log(`   ❌ FAIL: ${err.message}\n`);
      failed++;
    }
  } else {
    console.log('📍 TEST 4: Login User');
    console.log('   ⏭️  SKIPPED (already registered)\n');
  }

  // If no token, skip remaining tests
  if (!token) {
    console.log('❌ Cannot continue tests without authentication token.\n');
    return { passed, failed };
  }

  // Test 5: Create Client
  try {
    console.log('📍 TEST 5: Create Client');
    const res = await makeRequest('POST', '/api/clients', {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      phone: '+33612345678',
      company: 'TechCorp',
      status: 'active',
      type: 'individual',
      riskScore: 45,
      loyaltyScore: 80
    });

    const headers = { 'Authorization': `Bearer ${token}` };
    const url = new URL(BASE_URL + '/api/clients');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const reqWithAuth = http.request(options, (res2) => {
      let data = '';
      res2.on('data', chunk => data += chunk);
      res2.on('end', () => {
        const parsed = JSON.parse(data);
        if (res2.statusCode === 201) {
          clientId = parsed.client?.id;
          console.log(`   ✅ PASS (client ID: ${clientId})\n`);
          passed++;
        } else {
          console.log(`   ❌ FAIL (status: ${res2.statusCode})\n`);
          failed++;
        }
      });
    });

    reqWithAuth.on('error', (err) => {
      console.log(`   ❌ FAIL: ${err.message}\n`);
      failed++;
    });

    reqWithAuth.write(JSON.stringify({
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      phone: '+33612345678',
      company: 'TechCorp'
    }));
    reqWithAuth.end();

    // Wait for this test
    await new Promise(r => setTimeout(r, 500));
  } catch (err) {
    console.log(`   ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 6: List Clients
  try {
    console.log('📍 TEST 6: List Clients');
    const headers = { 'Authorization': `Bearer ${token}` };
    const url = new URL(BASE_URL + '/api/clients');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (res.statusCode === 200 && Array.isArray(parsed.clients)) {
          console.log(`   ✅ PASS (${parsed.clients.length} clients)\n`);
          passed++;
        } else {
          console.log(`   ❌ FAIL\n`);
          failed++;
        }
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ FAIL: ${err.message}\n`);
      failed++;
    });

    req.end();
    await new Promise(r => setTimeout(r, 500));
  } catch (err) {
    console.log(`   ❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Summary
  console.log('╔════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed}/${passed + failed} PASSED        ║`);
  console.log('╚════════════════════════════════════════╝\n');

  return { passed, failed };
}

// Run tests
runTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
});
