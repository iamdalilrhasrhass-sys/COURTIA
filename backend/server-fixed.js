const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

// Pool WITHOUT connection test on startup
const pool = new Pool({
  user: process.env.DB_USER || 'dalilrhasrhass',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'crm_assurance',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('⚠️ DB error:', err.message);
});

// Health (no DB)
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name',
      [email, hash, firstName, lastName]
    );
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: result.rows[0].id }, 'secret', { expiresIn: '7d' });
    res.json({ user: result.rows[0], token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Not found' });
    const bcrypt = require('bcryptjs');
    const ok = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Bad password' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: result.rows[0].id }, 'secret', { expiresIn: '7d' });
    res.json({
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
      },
      token,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Clients: List
app.get('/api/clients', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'secret');
    const result = await pool.query('SELECT * FROM clients WHERE user_id = $1 LIMIT 50', [decoded.id]);
    res.json({ clients: result.rows || [] });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Clients: Create
app.post('/api/clients', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'secret');
    const { firstName, lastName, email, phone } = req.body;
    const result = await pool.query(
      'INSERT INTO clients (user_id, first_name, last_name, email, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [decoded.id, firstName, lastName, email, phone]
    );
    res.json({ client: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`✅ Backend on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});
