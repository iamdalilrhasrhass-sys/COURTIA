const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// Lazy DB pool
let pool = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      user: process.env.DB_USER || 'dalilrhasrhass',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'crm_assurance',
    });
  }
  return pool;
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-2026';

// Health
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const hash = await bcryptjs.hash(password, 10);
    const result = await getPool().query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, hash, firstName, lastName]
    );
    const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: result.rows[0], token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await getPool().query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Not found' });
    const ok = await bcryptjs.compare(password, result.rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Bad password' });
    const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: result.rows[0].id, email: result.rows[0].email }, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Clients: List
app.get('/api/clients', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await getPool().query('SELECT * FROM clients WHERE user_id = $1 LIMIT 50', [decoded.id]);
    res.json({ clients: result.rows || [] });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Clients: Create
app.post('/api/clients', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { firstName, lastName, email } = req.body;
    const result = await getPool().query(
      'INSERT INTO clients (user_id, first_name, last_name, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [decoded.id, firstName, lastName, email]
    );
    res.json({ client: result.rows[0] });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend on http://localhost:${PORT}`);
});
