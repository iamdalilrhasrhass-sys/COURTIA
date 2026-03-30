/**
 * PHASE 4 - Backend Test Suite
 * Test contracts and prospects CRUD + Kanban features
 */

const axios = require('axios');

const API = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
  validateStatus: () => true
});

const results = { passed: 0, failed: 0, tests: [] };

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
  console.log('║  PHASE 4 - CONTRACTS & PROSPECTS TEST ║');
  console.log('╚════════════════════════════════════════╝\n');

  const timestamp = Date.now();
  const email = `test-phase4-${timestamp}@example.com`;
  let token = null;
  let clientId = null;
  let contractId = null;
  let prospectId = null;

  // Setup: Create user and client
  await test('Setup: Register user', async () => {
    const res = await API.post('/api/auth/register', {
      email,
      password: 'Pass123!',
      firstName: 'TestPhase4',
      lastName: 'User'
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
    token = res.data.token;
  });

  await test('Setup: Create test client', async () => {
    const res = await API.post('/api/clients', {
      firstName: 'TestClient',
      lastName: 'Phase4',
      email: `client-${timestamp}@test.com`,
      phone: '+33612345678'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
    clientId = res.data.client.id;
  });

  // ================= CONTRACTS TESTS =================

  await test('Contracts: Create contract', async () => {
    const res = await API.post('/api/contracts', {
      clientId,
      contractNumber: `CNT-${timestamp}`,
      type: 'habitation',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      annualPremium: 1200,
      status: 'actif',
      insurer: 'AXA'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${res.data.error}`);
    contractId = res.data.contract.id;
  });

  await test('Contracts: List all contracts', async () => {
    const res = await API.get('/api/contracts?limit=50&offset=0', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.contracts)) throw new Error('Not an array');
  });

  await test('Contracts: Get contract by ID', async () => {
    const res = await API.get(`/api/contracts/${contractId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.id !== contractId) throw new Error('ID mismatch');
  });

  await test('Contracts: Update contract', async () => {
    const res = await API.put(`/api/contracts/${contractId}`, {
      annualPremium: 1500,
      status: 'suspendu'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const premium = parseFloat(res.data.contract.annual_premium || 0);
    if (premium !== 1500) throw new Error(`Update not applied: got ${premium}`);
  });

  await test('Contracts: Get contracts by client', async () => {
    const res = await API.get(`/api/clients/${clientId}/contracts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.contracts)) throw new Error('Not an array');
  });

  // ================= PROSPECTS TESTS =================

  await test('Prospects: Create prospect', async () => {
    const res = await API.post('/api/prospects', {
      firstName: 'ProspectTest',
      lastName: 'Phase4',
      email: `prospect-${timestamp}@test.com`,
      phone: '+33687654321',
      company: 'ProspectCorp',
      stage: 'nouveau',
      source: 'web',
      value: 5000
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${res.data.error}`);
    prospectId = res.data.prospect.id;
  });

  await test('Prospects: List all prospects', async () => {
    const res = await API.get('/api/prospects?limit=50&offset=0', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.prospects)) throw new Error('Not an array');
  });

  await test('Prospects: Get prospect by ID', async () => {
    const res = await API.get(`/api/prospects/${prospectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.id !== prospectId) throw new Error('ID mismatch');
  });

  await test('Prospects: Update prospect', async () => {
    const res = await API.put(`/api/prospects/${prospectId}`, {
      value: 7500
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const value = parseFloat(res.data.prospect.estimated_value || 0);
    if (value !== 7500) throw new Error(`Update not applied: got ${value}`);
  });

  await test('Prospects: Get prospects by stage', async () => {
    const res = await API.get('/api/prospects/stage/nouveau', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.prospects)) throw new Error('Not an array');
  });

  await test('Prospects: Get pipeline summary', async () => {
    const res = await API.get('/api/prospects/pipeline/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!Array.isArray(res.data.stages)) throw new Error('No stages');
    if (!Array.isArray(res.data.availableStages)) throw new Error('No available stages');
  });

  await test('Prospects: Move prospect (Kanban)', async () => {
    const res = await API.put(`/api/prospects/${prospectId}/move/contact`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.prospect.stage !== 'contact') throw new Error('Stage not moved');
  });

  // ================= CLEANUP =================

  await test('Cleanup: Delete contract', async () => {
    const res = await API.delete(`/api/contracts/${contractId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('Cleanup: Delete prospect', async () => {
    const res = await API.delete(`/api/prospects/${prospectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
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
