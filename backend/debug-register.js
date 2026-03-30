const User = require('./src/models/User');
const bcrypt = require('bcrypt');

async function test() {
  console.log('Testing bcrypt hash...');
  const start = Date.now();
  const hash = await bcrypt.hash('Password123!', 5);
  console.log(`Bcrypt hash took ${Date.now() - start}ms: ${hash.substring(0, 20)}...`);

  console.log('\nTesting User.create...');
  try {
    const start2 = Date.now();
    const user = await User.create('test-debug@test.com', 'Pass123', 'Test', 'Debug', 'broker');
    console.log(`User.create took ${Date.now() - start2}ms`);
    console.log('User created:', user.id);
  } catch (err) {
    console.error('Error:', err.message);
  }

  process.exit(0);
}

test();
