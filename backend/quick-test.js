const axios = require('axios');

async function test() {
  const client = axios.create({ baseURL: 'http://localhost:3000' });

  try {
    console.log('Test 1: Health');
    const h = await client.get('/health');
    console.log('✅ Health:', h.data.status);

    console.log('\nTest 2: Register');
    const r = await client.post('/api/auth/register', {
      email: 'test@test.com',
      password: 'Pass123',
      firstName: 'John',
      lastName: 'Doe'
    });
    console.log('✅ Register successful. Token:', r.data.token.substring(0, 20) + '...');

    const token = r.data.token;

    console.log('\nTest 3: Login');
    const l = await client.post('/api/auth/login', {
      email: 'test@test.com',
      password: 'Pass123'
    });
    console.log('✅ Login successful. Token:', l.data.token.substring(0, 20) + '...');

    console.log('\nTest 4: Create client');
    const c = await client.post('/api/clients', {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      phone: '+33612345678'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Client created:', c.data.client.id);

    console.log('\nTest 5: List clients');
    const list = await client.get('/api/clients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Clients:', list.data.clients.length);

    console.log('\n✅ ALL TESTS PASSED');
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

test();
