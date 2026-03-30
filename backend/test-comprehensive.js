/**
 * PHASE 3 - Comprehensive Backend Tests
 * Test all endpoints: auth and clients CRUD
 */

const axios = require('axios');

const API = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
  validateStatus: () => true  // Don't throw on any status
});

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

async function test(name, fn) {
  try {
    await fn();
    results.tests.push({ name, status: '✅' });
    results.passed++;
  } catch (err) {
    results.tests.push({ name, status: '❌', error: err.message });
    results.failed++;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  PHASE 3 - BACKEND COMPREHENSIVE TEST ║');
  console.log('╚════════════════════════════════════════╝\n');

  const timestamp = Date.now();
  const email = `test-${timestamp}@example.com`;
  let token = null;
  let clientId = null;

  // Test 1: Health Check
  await test('Health Check (/health)', async () => {
    const res = await API.get('/health');
    if (res.status !== 200 || res.data.status !== 'ok') {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });

  // Test 2: API Status
  await test('API Status (/api/status)', async () => {
    const res = await API.get('/api/status');
    if (res.status !== 200 || res.data.status !== 'running') {
      throw new Error(`Expected running status, got ${res.data.status}`);
    }
  });

  // Test 3: Register User
  await test('Register User (/api/auth/register)', async () => {
    const res = await API.post('/api/auth/register', {
      email,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User'
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201, got ${res.status}: ${res.data.error}`);
    }

    if (!res.data.token) {
      throw new Error('No token returned');
    }

    token = res.data.token;
  });

  // Test 4: Login User
  await test('Login User (/api/auth/login)', async () => {
    const res = await API.post('/api/auth/login', {
      email,
      password: 'Password123!'
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }

    if (!res.data.token) {
      throw new Error('No token in login response');
    }

    // Update token if different
    if (res.data.token !== token) {
      token = res.data.token;
    }
  });

  // Test 5: Create Client
  await test('Create Client (POST /api/clients)', async () => {
    const res = await API.post('/api/clients', {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: `alice-${timestamp}@example.com`,
      phone: '+33612345678',
      company: 'TechCorp',
      status: 'active',
      type: 'individual'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status !== 201) {
      throw new Error(`Expected 201, got ${res.status}: ${res.data.error}`);
    }

    if (!res.data.client?.id) {
      throw new Error('No client ID in response');
    }

    clientId = res.data.client.id;
  });

  // Test 6: Get Client
  await test('Get Client (GET /api/clients/:id)', async () => {
    const res = await API.get(`/api/clients/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }

    if (res.data.id !== clientId) {
      throw new Error('Client ID mismatch');
    }
  });

  // Test 7: Update Client
  await test('Update Client (PUT /api/clients/:id)', async () => {
    const res = await API.put(`/api/clients/${clientId}`, {
      firstName: 'Alice',
      lastName: 'Johnson Updated',
      status: 'inactive'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}: ${res.data.error}`);
    }

    if (res.data.client.last_name !== 'Johnson Updated') {
      throw new Error('Update not applied');
    }
  });

  // Test 8: List Clients
  await test('List Clients (GET /api/clients)', async () => {
    const res = await API.get('/api/clients?limit=50&offset=0', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }

    if (!Array.isArray(res.data.clients)) {
      throw new Error('Clients is not an array');
    }
  });

  // Test 9: Delete Client
  await test('Delete Client (DELETE /api/clients/:id)', async () => {
    const res = await API.delete(`/api/clients/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });

  // Test 10: Unauthorized Request
  await test('Unauthorized Request (no token)', async () => {
    const res = await API.get('/api/clients');

    if (res.status !== 401) {
      throw new Error(`Expected 401, got ${res.status}`);
    }
  });

  // Print results
  console.log('📊 Test Results:\n');
  results.tests.forEach(t => {
    console.log(`${t.status} ${t.name}${t.error ? ` - ${t.error}` : ''}`);
  });

  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  ${results.passed}/${results.passed + results.failed} TESTS PASSED       ${' '.repeat(15)}║`);
  console.log(`╚════════════════════════════════════════╝\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
