/**
 * CRM Assurance - Backend API Server (Debug)
 * with enhanced logging
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3001', 'http://localhost:3000', '*'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Enhanced logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] → ${req.method} ${req.path}`);
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ← ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Status
app.get('/api/status', async (req, res) => {
  try {
    const pool = require('./src/db');
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'running', database: 'connected', timestamp: result.rows[0].now });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Register handler called with body:', Object.keys(req.body));
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    console.log('Creating user...');
    const User = require('./src/models/User');
    const user = await User.create(email, password, firstName, lastName, 'broker');
    console.log('User created:', user.id);

    console.log('Generating JWT...');
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'crm-assurance-secret-key-2026',
      { expiresIn: '7d' }
    );
    console.log('JWT generated');

    res.status(201).json({
      message: 'User registered',
      user: { id: user.id, email: user.email },
      token
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const User = require('./src/models/User');
    const user = await User.verifyPassword(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'crm-assurance-secret-key-2026',
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login successful', user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Client CRUD routes...
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No auth header' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid format' });
    }

    const token = parts[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crm-assurance-secret-key-2026');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', details: err.message });
  }
};

// List clients
app.get('/api/clients', verifyToken, async (req, res) => {
  try {
    const Client = require('./src/models/Client');
    const { limit = 50, offset = 0 } = req.query;
    const clients = await Client.findAll(req.user.id, parseInt(limit), parseInt(offset));
    const totalCount = await Client.count(req.user.id);
    res.json({ clients, pagination: { limit: parseInt(limit), offset: parseInt(offset), total: totalCount } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create client
app.post('/api/clients', verifyToken, async (req, res) => {
  try {
    const Client = require('./src/models/Client');
    const client = await Client.create(req.body, req.user.id);
    res.status(201).json({ message: 'Client created', client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get client
app.get('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const Client = require('./src/models/Client');
    const client = await Client.findById(req.params.id);
    if (!client || client.user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client
app.put('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const Client = require('./src/models/Client');
    const client = await Client.findById(req.params.id);
    if (!client || client.user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
    const updated = await Client.update(req.params.id, req.body, req.user.id);
    res.json({ message: 'Client updated', client: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client
app.delete('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const Client = require('./src/models/Client');
    const client = await Client.findById(req.params.id);
    if (!client || client.user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });
    const result = await Client.delete(req.params.id, req.user.id);
    res.json({ message: 'Client deleted', id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});

module.exports = app;
