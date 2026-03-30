/**
 * CRM Assurance - Backend API Server
 * SQLite Version (for local macOS development)
 * 
 * Status: Phase 2 - Express scaffold with SQLite
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== DATABASE CONNECTION ====================

const dbPath = path.expandUser(process.env.DB_PATH || '~/Desktop/CRM-Assurance/crm_assurance.db');
let db;

try {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.log('⚠️  Database connection error:', err.message);
    } else {
      console.log('✅ SQLite database connected successfully');
      console.log(`   Path: ${dbPath}`);
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) console.log('Warning: Could not enable foreign keys');
      });
    }
  });
} catch (error) {
  console.log('⚠️  Database initialization error:', error.message);
}

// Helper function to expand ~ in paths
require('path').expandUser = function(p) {
  if (p[0] === '~') {
    return require('os').homedir() + p.slice(1);
  }
  return p;
};

// ==================== AUTH MIDDLEWARE ====================

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'sqlite3',
    environment: process.env.NODE_ENV || 'development'
  };
  res.json(health);
});

// API Health (detailed)
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    api: 'CRM Assurance v1.0.0',
    phase: 'Phase 2 - Express Scaffold (SQLite)',
    version: '1.0.0',
    database: 'SQLite3',
    endpoints: {
      auth: '/api/auth/login',
      clients: '/api/clients',
      contracts: '/api/contracts',
      prospects: '/api/prospects'
    }
  };
  res.json(health);
});

// ==================== AUTH ENDPOINTS ====================

app.post('/api/auth/login', (req, res) => {
  res.status(200).json({
    message: 'Login endpoint - Phase 3',
    status: 'not_implemented_yet'
  });
});

app.post('/api/auth/register', (req, res) => {
  res.status(200).json({
    message: 'Register endpoint - Phase 3',
    status: 'not_implemented_yet'
  });
});

// ==================== CLIENT ENDPOINTS ====================

app.get('/api/clients', (req, res) => {
  res.json({
    message: 'Clients list endpoint',
    status: 'pending_implementation',
    phase: 'Phase 3',
    pagination: {
      page: 1,
      limit: 50,
      total: 0
    },
    data: []
  });
});

app.get('/api/clients/:id', (req, res) => {
  res.json({
    message: `Client ${req.params.id} details`,
    status: 'pending_implementation',
    phase: 'Phase 3'
  });
});

app.post('/api/clients', (req, res) => {
  res.status(201).json({
    message: 'Create client endpoint',
    status: 'pending_implementation',
    phase: 'Phase 3'
  });
});

app.put('/api/clients/:id', (req, res) => {
  res.json({
    message: `Update client ${req.params.id}`,
    status: 'pending_implementation',
    phase: 'Phase 3'
  });
});

app.delete('/api/clients/:id', (req, res) => {
  res.json({
    message: `Delete client ${req.params.id}`,
    status: 'pending_implementation',
    phase: 'Phase 3'
  });
});

// ==================== CONTRACT ENDPOINTS ====================

app.get('/api/contracts', (req, res) => {
  res.json({
    message: 'Contracts list endpoint',
    status: 'pending_implementation',
    phase: 'Phase 3',
    data: []
  });
});

app.get('/api/contracts/:id', (req, res) => {
  res.json({
    message: `Contract ${req.params.id} details`,
    status: 'pending_implementation',
    phase: 'Phase 3'
  });
});

// ==================== PROSPECTS ENDPOINTS ====================

app.get('/api/prospects', (req, res) => {
  res.json({
    message: 'Prospects list endpoint',
    status: 'pending_implementation',
    phase: 'Phase 4',
    stages: ['prospection', 'qualification', 'proposition', 'negotiation', 'closed'],
    data: {}
  });
});

// ==================== STATUS ENDPOINTS ====================

app.get('/api/status', (req, res) => {
  res.json({
    project: 'CRM Assurance',
    version: '1.0.0',
    phase: 2,
    phase_name: 'Backend Express Scaffold (SQLite)',
    progress: '50%',
    database: 'SQLite3',
    start_date: '2026-03-26',
    deadline: '2026-04-30',
    timeline: {
      'Phase 1': { status: 'completed', progress: '40%' },
      'Phase 2': { status: 'in_progress', progress: '50%', task: 'Backend scaffold' },
      'Phase 3': { status: 'pending', progress: '0%', task: 'CRUD Clients & Auth' },
      'Phase 4': { status: 'pending', progress: '0%', task: 'Pipeline prospects' }
    },
    features: {
      authentication: 'phase_3',
      clients: 'phase_3',
      contracts: 'phase_3',
      prospects: 'phase_4',
      messaging: 'phase_5'
    }
  });
});

// ==================== DATABASE STATUS ====================

app.get('/api/database/status', (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      database: 'SQLite3',
      connected: true,
      path: dbPath,
      tables: tables.length,
      table_list: tables.map(t => t.name),
      status: 'ready'
    });
  });
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    message: 'Endpoint not implemented yet',
    status: 'phase_2_scaffold'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    status: 'error'
  });
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        🚀 CRM ASSURANCE - BACKEND API v1.0.0 (SQLite)      ║
╚════════════════════════════════════════════════════════════╝

✅ Status: Running
📍 Server: http://localhost:${PORT}
🔗 API Health: http://localhost:${PORT}/api/health
💾 Database: SQLite3 (Local)
📊 Project Status: http://localhost:${PORT}/api/status

Phase: 2 - Express Scaffold (50% complete)
Environment: ${process.env.NODE_ENV || 'development'}

🎯 Available endpoints:
   GET  /health                    → Health check
   GET  /api/health               → API info
   GET  /api/status               → Project status
   GET  /api/database/status      → Database info
   POST /api/auth/login           → (Phase 3)
   GET  /api/clients              → (Phase 3)
   GET  /api/contracts            → (Phase 3)
   GET  /api/prospects            → (Phase 4)

💾 Database: SQLite3 Connected ✅
   Path: ${dbPath}

📚 Next steps:
   1. Test endpoints: curl http://localhost:${PORT}/api/health
   2. Phase 3: Implement CRUD + JWT Auth
   3. Phase 4: Frontend React setup

💡 Run: npm run dev (for development with auto-reload)
🛑 Stop: Ctrl+C

════════════════════════════════════════════════════════════
  `);
});

module.exports = app;
