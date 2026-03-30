const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock data
const users = {
  'dalil@test.com': { id: 1, email: 'dalil@test.com', firstName: 'Dalil', lastName: 'Rhasrhass' }
};

const tokens = {};

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'dalil@test.com' && password === 'password123') {
    const token = 'fake-jwt-token-' + Date.now();
    tokens[token] = users['dalil@test.com'];
    res.json({
      user: users['dalil@test.com'],
      token
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  const token = 'fake-jwt-token-' + Date.now();
  users[email] = { id: Math.random(), email, firstName, lastName };
  tokens[token] = users[email];
  res.json({ user: users[email], token });
});

// Clients: List
app.get('/api/clients', (req, res) => {
  res.json({
    clients: [
      { id: 1, first_name: 'Jean', last_name: 'Dupont', email: 'jean@example.com', phone: '+33612345678', company: 'Dupont SPA', status: 'active', risk_score: 45, loyalty_score: 72 },
      { id: 2, first_name: 'Marie', last_name: 'Martin', email: 'marie@example.com', phone: '+33687654321', company: 'Martin Inc', status: 'active', risk_score: 60, loyalty_score: 85 }
    ]
  });
});

// Clients: Create
app.post('/api/clients', (req, res) => {
  res.json({ client: { id: 3, ...req.body, status: 'active', risk_score: 50, loyalty_score: 50 } });
});

app.listen(3000, () => {
  console.log('✅ Mock backend on http://localhost:3000');
});
