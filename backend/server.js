/**
 * CRM Assurance - Backend API Server
 * Node.js/Express REST API
 * 
 * Phase 3 - JWT Authentication + CRUD
 * Status: Production-ready
 */

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk').default;
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import services
const telegramService = require('./src/services/telegramService');
const reminderService = require('./src/services/reminderService');
const pdfService = require('./src/services/pdfService');
const notificationService = require('./src/services/notificationService');
const excelService = require('./src/services/excelService');
const logService = require('./src/services/logService');
const backupService = require('./src/services/backupService');
const monitoringService = require('./src/services/monitoringService');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: ['https://courtia.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`;
    console.log(log);
    logService.action(`${req.method} ${req.path}`, { statusCode: res.statusCode, duration });
  });
  next();
});

// ==================== DATABASE ====================
const pool = require('./src/db');
const { initializeDatabase } = require('./src/seed');

let dbReady = false;

// Initialize database schema on startup
(async () => {
  await initializeDatabase();
  
  // Ensure appointments table exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        client_id INT REFERENCES clients(id) ON DELETE CASCADE,
        organizer_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        description TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        timezone VARCHAR(100) DEFAULT 'Europe/Paris',
        status VARCHAR(50) DEFAULT 'planifié',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ appointments table ensured');
  } catch (err) {
    console.error('❌ Error ensuring appointments table:', err.message);
  }
  
  // Ensure broker_profiles table exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS broker_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cabinet VARCHAR(255),
        orias VARCHAR(50),
        telephone VARCHAR(20),
        adresse TEXT,
        ville VARCHAR(100),
        code_postal VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ broker_profiles table ensured');
  } catch (err) {
    console.error('❌ Error ensuring broker_profiles table:', err.message);
  }
  
  dbReady = true;
  console.log('✅ Database ready');
})();

// ==================== VALIDATION ====================

function validateClient(data) {
  const errors = []
  if (!data.first_name?.trim()) errors.push('Le prénom est obligatoire')
  if (!data.last_name?.trim()) errors.push('Le nom est obligatoire')
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Email invalide')
  if (data.telephone) data.telephone = data.telephone.replace(/\s/g, '')
  if (data.risk_score !== undefined && (data.risk_score < 0 || data.risk_score > 100)) errors.push('Score risque doit être entre 0 et 100')
  const statutsValides = ['prospect', 'actif', 'perdu']
  if (data.status && !statutsValides.includes(data.status)) errors.push('Statut invalide')
  return errors
}

function validateContract(data) {
  const errors = []
  if (!data.client_id) errors.push('Client obligatoire')
  if (!data.prime_annuelle || parseFloat(data.prime_annuelle) <= 0) errors.push('Prime annuelle doit être positive')
  if (data.date_echeance && data.date_effet && new Date(data.date_echeance) <= new Date(data.date_effet)) errors.push('Date échéance doit être après date effet')
  const statutsValides = ['actif', 'en_attente', 'résilié', 'expiré']
  if (data.statut && !statutsValides.includes(data.statut)) errors.push('Statut invalide')
  return errors
}

// ==================== ROUTES ====================

// Debug: Inspect clients table columns
app.get('/api/debug/clients-columns', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients' ORDER BY ordinal_position`
    );
    res.json({
      table: 'clients',
      columns: result.rows.map(r => r.column_name),
      columnDetails: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to inspect table',
      details: err.message
    });
  }
});

// Health check (public - no DB required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'crm-assurance-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    api: 'crm-assurance-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Status with DB check
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'running',
      database: 'connected',
      timestamp: result.rows[0].now,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const courtier_id = req.user.id;

    // Total clients
    const clients = await pool.query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN status = $2 THEN 1 END) as actifs FROM clients WHERE courtier_id = $1',
      [courtier_id, 'actif']
    );
    const totalClients = parseInt(clients.rows[0].total);
    const activeClientsCount = parseInt(clients.rows[0].actifs);

    // Contrats actifs et commissions
    const contrats = await pool.query(
      'SELECT COUNT(*) as actifs, COALESCE(ROUND(SUM(prime_annuelle * 0.15 / 12), 2), 0) as commissions FROM contracts WHERE courtier_id = $1 AND statut = $2',
      [courtier_id, 'actif']
    );
    const activeContracts = parseInt(contrats.rows[0].actifs);
    const monthlyCommissions = parseFloat(contrats.rows[0].commissions);

    // Taux conversion
    const tauxConversion = totalClients > 0 ? Math.round((activeClientsCount / totalClients) * 100 * 10) / 10 : 0;

    // Revenus 6 derniers mois
    const revenus = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as mois,
       COALESCE(SUM(prime_annuelle), 0) as revenue
       FROM contracts WHERE courtier_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at) ASC`,
      [courtier_id]
    );

    // Alertes échéances — seulement contrats actifs dans 90j
    const alertes = await pool.query(
      `SELECT c.first_name, c.last_name, ct.type_contrat, ct.date_echeance,
       EXTRACT(DAY FROM ct.date_echeance - NOW())::int as jours_restants
       FROM contracts ct JOIN clients c ON ct.client_id = c.id
       WHERE ct.courtier_id = $1 AND ct.statut = 'actif' AND ct.date_echeance BETWEEN NOW() AND NOW() + INTERVAL '90 days'
       ORDER BY ct.date_echeance ASC LIMIT 5`,
      [courtier_id]
    );

    // Clients récents
    const recents = await pool.query(
      'SELECT id, first_name, last_name, email, status, risk_score FROM clients WHERE courtier_id = $1 AND first_name IS NOT NULL AND last_name IS NOT NULL ORDER BY created_at DESC LIMIT 5',
      [courtier_id]
    );
    const recentClients = recents.rows;
    res.json({
      totalClients,
      activeContracts,
      monthlyCommissions,
      tauxConversion,
      revenus6Mois: revenus.rows,
      alertes: alertes.rows,
      clientsRecents: recentClients
    });
  } catch (err) {
    console.error('❌ Stats error:', err);
    console.error('   Message:', err.message);
    console.error('   Code:', err.code);
    res.status(500).json({
      error: 'Failed to fetch stats',
      details: err.message,
      code: err.code
    });
  }
});

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Email, password, firstName, and lastName are required'
      });
    }

    const User = require('./src/models/User');
    const user = await User.create(email, password, firstName, lastName, 'broker');

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'crm-assurance-secret-key-2026',
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    console.error('Error message:', err?.message || 'Unknown error');
    res.status(500).json({ 
      error: err?.message || 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? err?.toString() : undefined
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const User = require('./src/models/User');
    const user = await User.verifyPassword(email, password);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'crm-assurance-secret-key-2026',
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      message: 'Login successful',
      user,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    console.error('Error message:', err?.message || 'Unknown error');
    res.status(500).json({ 
      error: err?.message || 'Login failed',
      details: process.env.NODE_ENV === 'development' ? err?.toString() : undefined
    });
  }
});

// ==================== CLIENT ROUTES ====================

// Auth middleware
const verifyToken = (req, res, next) => {
  try {
    // Handle OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn('⚠️  No authorization header in', req.method, req.path);
      return res.status(401).json({ error: 'No authorization header' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization header format' });
    }

    const token = parts[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'crm-assurance-secret-key-2026'
    );

    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Token verification error:', err.message);
    res.status(401).json({ error: 'Invalid token', details: err.message });
  }
};

// List clients
app.get('/api/clients', verifyToken, async (req, res) => {
  try {
    const Client = require('./src/models/Client');
    const { limit = 50, offset = 0 } = req.query;

    const clients = await Client.findAll(parseInt(limit), parseInt(offset));
    const totalCount = await Client.count();

    res.json({
      clients,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create client
app.post('/api/clients', verifyToken, async (req, res) => {
  try {
    // Validation
    const errors = validateClient(req.body)
    if (errors.length > 0) {
      return res.status(400).json({ errors })
    }

    // Vérifier email en doublon
    if (req.body.email) {
      const doublon = await pool.query(
        'SELECT id FROM clients WHERE email = $1 AND courtier_id = $2',
        [req.body.email, req.user.id]
      );
      if (doublon.rows.length > 0) {
        return res.status(409).json({ error: 'Un client avec cet email existe déjà.' });
      }
    }

    const Client = require('./src/models/Client');
    const client = await Client.create(req.body);

    // Auto-trigger onboarding if telegram_chat_id is provided
    if (req.body.telegram_chat_id) {
      try {
        await telegramService.sendOnboardingQuestionnaire(
          req.body.telegram_chat_id,
          `${client.first_name} ${client.last_name}`,
          client.id
        );
        console.log(`✅ Onboarding questionnaire sent for client ${client.id}`);
      } catch (telegramError) {
        console.warn('⚠️ Could not send onboarding via Telegram:', telegramError.message);
      }
    }

    res.status(201).json({
      message: 'Client created successfully',
      client,
      onboarding_triggered: !!req.body.telegram_chat_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get client
app.get('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    // Verify courtier_id ownership (security: multi-tenant isolation)
    const result = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND courtier_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client
app.put('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2',
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const Client = require('./src/models/Client');
    const updated = await Client.update(req.params.id, req.body);

    res.json({
      message: 'Client updated successfully',
      client: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client
app.delete('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2',
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const Client = require('./src/models/Client');
    const result = await Client.delete(req.params.id);

    res.json({
      message: 'Client deleted successfully',
      id: result.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== APPOINTMENTS ROUTES ====================

// List appointments by date
app.get('/api/appointments', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.user.id;
    
    let query = `
      SELECT * FROM appointments 
      WHERE organizer_id = $1 AND status != 'annulé'
      ORDER BY start_time
    `;
    const params = [userId];
    
    if (date) {
      query = `
        SELECT * FROM appointments 
        WHERE organizer_id = $1 AND DATE(start_time) = $2 AND status != 'annulé'
        ORDER BY start_time
      `;
      params.push(date);
    }
    
    const result = await pool.query(query, params);
    res.json({ appointments: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create appointment
app.post('/api/appointments', verifyToken, async (req, res) => {
  try {
    const { client_id, title, description, start_time, end_time, timezone } = req.body;
    const userId = req.user.id;
    
    if (!client_id || !title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await pool.query(
      `INSERT INTO appointments (client_id, organizer_id, title, description, start_time, end_time, timezone, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'planifié', NOW(), NOW())
       RETURNING *`,
      [client_id, userId, title, description, start_time, end_time, timezone || 'Europe/Paris']
    );
    
    res.status(201).json({ appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update appointment
app.put('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_time, end_time, status } = req.body;
    const userId = req.user.id;
    const result = await pool.query(
      `UPDATE appointments SET title=$1, description=$2, start_time=$3, end_time=$4, status=$5, updated_at=NOW()
       WHERE id=$6 AND organizer_id=$7 RETURNING *`,
      [title, description, start_time, end_time, status, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ appointment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete appointment
app.delete('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      `UPDATE appointments SET status='annulé' WHERE id=$1 AND organizer_id=$2 RETURNING *`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ONBOARDING ROUTES ====================

// Start onboarding questionnaire
app.post('/api/onboarding/:clientId/start', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { telegram_chat_id, first_name, last_name } = req.body;
    
    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' });
    }
    
    const result = await telegramService.sendOnboardingQuestionnaire(
      telegram_chat_id,
      `${first_name} ${last_name}`,
      clientId
    );
    
    res.json({ 
      success: true,
      message: 'Onboarding questionnaire sent via Telegram',
      questionnaire_sent: result.questionnaire_sent
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to send questionnaire' });
  }
});

// Save onboarding responses
app.post('/api/onboarding/:clientId/responses', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const responses = req.body;
    
    const personalProfile = {
      has_children: responses.children?.yes || false,
      children_count: responses.children?.count || 0,
      sports: responses.sports || '',
      housing_type: responses.housing || '',
      pets: responses.pets || '',
      profession: responses.profession || '',
      completed_at: new Date()
    };
    await pool.query(
      `UPDATE clients SET personal_profile=$1, onboarding_completed=true, onboarding_date=NOW() WHERE id=$2`,
      [JSON.stringify(personalProfile), clientId]
    );
    
    res.json({
      success: true,
      message: 'Onboarding responses saved',
      profile: personalProfile
    });
  } catch (error) {
    console.error('Save responses error:', error);
    res.status(500).json({ error: 'Failed to save responses' });
  }
});

// ==================== REMINDERS ROUTES ====================

// Send weekly reminder (manual trigger for testing)
app.post('/api/reminders/weekly', verifyToken, async (req, res) => {
  try {
    const { telegram_chat_id } = req.body;
    
    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' });
    }
    const inactiveClients = await reminderService.getInactiveClients(pool);
    
    if (inactiveClients.length === 0) {
      return res.json({ success: true, message: 'No inactive clients found' });
    }
    
    await telegramService.sendWeeklyReminder(telegram_chat_id, inactiveClients);
    
    res.json({ 
      success: true, 
      message: 'Weekly reminder sent',
      clients_notified: inactiveClients.length
    });
  } catch (error) {
    console.error('Reminder error:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// Get inactive clients
app.get('/api/reminders/inactive-clients', verifyToken, async (req, res) => {
  try {
    const inactiveClients = await reminderService.getInactiveClients(pool);
    
    res.json({ 
      count: inactiveClients.length,
      clients: inactiveClients 
    });
  } catch (error) {
    console.error('Get inactive clients error:', error);
    res.status(500).json({ error: 'Failed to fetch inactive clients' });
  }
});

// Test brief generation (manual trigger)
app.post('/api/reminders/test-brief/:appointmentId', verifyToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { telegram_chat_id } = req.body;
    
    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' });
    }
    const result = await pool.query(
      `SELECT a.*, c.first_name, c.last_name, c.phone FROM appointments a
       JOIN clients c ON a.client_id = c.id
       WHERE a.id = $1`,
      [appointmentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const apt = result.rows[0];
    await telegramService.sendDailyBrief(apt, telegram_chat_id);
    
    res.json({ success: true, message: 'Brief sent successfully' });
  } catch (error) {
    console.error('Brief error:', error);
    res.status(500).json({ error: 'Failed to send brief' });
  }
});

// ==================== CONTRACT ROUTES ====================

// List contracts
app.get('/api/contracts', verifyToken, async (req, res) => {
  try {
    const Contract = require('./src/models/Contract');
    const { limit = 50, offset = 0, clientId } = req.query;
    const filters = clientId ? { clientId: parseInt(clientId) } : {};

    const contracts = await Contract.findAll(parseInt(limit), parseInt(offset), filters);
    const totalCount = await Contract.count(filters);

    res.json({
      contracts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalCount
      }
    });
  } catch (err) {
    // Fallback mock data si DB non disponible
    if (err.message && err.message.includes('pool')) {
      return res.json([
        {
          id: 1,
          client_id: 1,
          type_contrat: 'auto',
          compagnie: 'AXA',
          numero: 'AXA-2024-001',
          prime_annuelle: 450,
          date_effet: '2024-01-15',
          date_echeance: '2025-01-15',
          statut: 'actif'
        },
        {
          id: 2,
          client_id: 2,
          type_contrat: 'habitation',
          compagnie: 'Allianz',
          numero: 'ALL-2024-002',
          prime_annuelle: 800,
          date_effet: '2024-03-01',
          date_echeance: '2025-03-01',
          statut: 'actif'
        }
      ]);
    }
    res.status(500).json({ error: err.message });
  }
});

// Create contract
app.post('/api/contracts', verifyToken, async (req, res) => {
  try {
    const Contract = require('./src/models/Contract');
    const contract = await Contract.create(req.body);

    res.status(201).json({
      message: 'Contract created successfully',
      contract
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get contract
app.get('/api/contracts/:id', verifyToken, async (req, res) => {
  try {
    const Contract = require('./src/models/Contract');
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contract
app.put('/api/contracts/:id', verifyToken, async (req, res) => {
  try {
    const Contract = require('./src/models/Contract');
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const updated = await Contract.update(req.params.id, req.body);

    res.json({
      message: 'Contract updated successfully',
      contract: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contract
app.delete('/api/contracts/:id', verifyToken, async (req, res) => {
  try {
    const Contract = require('./src/models/Contract');
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const result = await Contract.delete(req.params.id);

    res.json({
      message: 'Contract deleted successfully',
      id: result.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get contracts by client
app.get('/api/clients/:clientId/contracts', verifyToken, async (req, res) => {
  try {
    const Contract = require('./src/models/Contract');
    const { limit = 50, offset = 0 } = req.query;

    const contracts = await Contract.findByClientId(
      req.params.clientId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      contracts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PROSPECT ROUTES ====================

// List prospects (Kanban view)
app.get('/api/prospects', verifyToken, async (req, res) => {
  try {
    const Prospect = require('./src/models/Prospect');
    const { limit = 50, offset = 0, stage, source } = req.query;
    const filters = {};

    if (stage) filters.stage = stage;
    if (source) filters.source = source;

    const prospects = await Prospect.findAll(parseInt(limit), parseInt(offset), filters);
    const totalCount = await Prospect.count(filters);

    res.json({
      prospects,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: totalCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get prospects by stage (for Kanban)
app.get('/api/prospects/stage/:stage', verifyToken, async (req, res) => {
  try {
    const Prospect = require('./src/models/Prospect');
    const { limit = 50, offset = 0 } = req.query;

    const prospects = await Prospect.findByStage(
      req.params.stage,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      stage: req.params.stage,
      prospects,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pipeline stages (Kanban summary)
app.get('/api/prospects/pipeline/summary', verifyToken, async (req, res) => {
  try {
    const Prospect = require('./src/models/Prospect');
    const stages = await Prospect.getPipelineStages();

    res.json({
      stages,
      availableStages: Prospect.getAvailableStages()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create prospect
app.post('/api/prospects', verifyToken, async (req, res) => {
  try {
    const Prospect = require('./src/models/Prospect');
    const prospect = await Prospect.create(req.body);

    res.status(201).json({
      message: 'Prospect created successfully',
      prospect
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get prospect
app.get('/api/prospects/:id', verifyToken, async (req, res) => {
  try {
    const Prospect = require('./src/models/Prospect');
    const prospect = await Prospect.findById(req.params.id);

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    res.json(prospect);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update prospect
app.put('/api/prospects/:id', verifyToken, async (req, res) => {
  try {
    const Prospect = require('./src/models/Prospect');
    const prospect = await Prospect.findById(req.params.id);

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    const updated = await Prospect.update(req.params.id, req.body);

    res.json({
      message: 'Prospect updated successfully',
      prospect: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move prospect to stage (Kanban drag-drop)
app.put('/api/prospects/:id/move/:stage', verifyToken, async (req, res) => {
  try {
    const Prospect = require('./src/models/Prospect');
    const availableStages = Prospect.getAvailableStages();

    if (!availableStages.includes(req.params.stage)) {
      return res.status(400).json({
        error: `Invalid stage. Available: ${availableStages.join(', ')}`
      });
    }

    const prospect = await Prospect.findById(req.params.id);
    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    const updated = await Prospect.moveToStage(req.params.id, req.params.stage);

    res.json({
      message: `Prospect moved to ${req.params.stage}`,
      prospect: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete prospect
app.delete('/api/prospects/:id', verifyToken, async (req, res) => {
  try {
    const Prospect = require('./src/models/Prospect');
    const prospect = await Prospect.findById(req.params.id);

    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    const result = await Prospect.delete(req.params.id);

    res.json({
      message: 'Prospect deleted successfully',
      id: result.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SETTINGS/BROKER PROFILE ====================

// Get broker profile
app.get('/api/settings/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📋 Getting profile for user ${userId}`);
    
    const result = await pool.query(
      'SELECT * FROM broker_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log(`   ℹ️  No profile found for user ${userId} - returning empty object`);
      return res.json({});
    }
    
    console.log(`   ✓ Profile found: ${result.rows[0].id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create or update broker profile
app.post('/api/settings/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cabinet, orias, telephone, adresse, ville, code_postal } = req.body;
    
    console.log(`💾 Saving profile for user ${userId}`, { cabinet, orias, telephone, adresse, ville, code_postal });
    
    // Check if profile exists
    const existingResult = await pool.query(
      'SELECT id FROM broker_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (existingResult.rows.length > 0) {
      // Update
      const result = await pool.query(
        `UPDATE broker_profiles SET 
          cabinet = $1, orias = $2, telephone = $3, 
          adresse = $4, ville = $5, code_postal = $6, updated_at = NOW()
         WHERE user_id = $7
         RETURNING *`,
        [cabinet, orias, telephone, adresse, ville, code_postal, userId]
      );
      res.json({
        message: 'Profile updated',
        profile: result.rows[0]
      });
    } else {
      // Create
      const result = await pool.query(
        `INSERT INTO broker_profiles (user_id, cabinet, orias, telephone, adresse, ville, code_postal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, cabinet, orias, telephone, adresse, ville, code_postal]
      );
      res.status(201).json({
        message: 'Profile created',
        profile: result.rows[0]
      });
    }
  } catch (err) {
    console.error('Save profile error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ARK AI ASSISTANT ====================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.post('/api/ark/chat', verifyToken, async (req, res) => {
  try {
    const { clientData, userMessage } = req.body;
    const userId = req.user.id;

    if (!clientData || !userMessage) {
      return res.status(400).json({ error: 'clientData and userMessage are required' });
    }

    const prompt = `Tu es ARK, assistant commercial expert pour courtiers français.

CLIENT: ${clientData.first_name} ${clientData.last_name}
Contrats: ${clientData.contracts?.map(c => `${c.type} (${c.premium}€)`).join(', ') || 'Aucun'}
Score fidélité: ${clientData.loyalty_score || 0}/100
Dernière interaction: ${clientData.last_contact || 'Jamais'}

OBLIGATOIRE - Réponds en 3 parties:

1️⃣ ACTION IMMÉDIATE (délai précis):
[Actionconcrète avec timing exact]

2️⃣ SCRIPT EXACT (mot pour mot prêt à dire):
[Dialogue à utiliser avec le client]

3️⃣ OBJECTIF CHIFFRÉ (euros):
[Montant attendu ou potentiel]

QUESTION: ${userMessage}`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const arkResponse = message.content[0].text;

    // Sauvegarde en DB
    await pool.query(
      `INSERT INTO ark_conversations (client_id, user_id, user_message, ark_response, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [clientData.id, userId, userMessage, arkResponse]
    ).catch(err => console.warn('DB save skipped:', err.message));

    res.json({ response: arkResponse });
  } catch (error) {
    console.error('ARK Error:', error);
    res.status(500).json({ error: 'Failed to process ARK request' });
  }
});

function buildClientContext(clientData, userMessage) {
  const {
    first_name,
    last_name,
    email,
    phone,
    contracts = [],
    claims = [],
    alerts = [],
    riskScore,
    loyaltyScore,
    history = [],
    notes = ''
  } = clientData;

  let context = `Tu es ARK, l'assistant IA spécialisé en assurance pour courtiers. Tu analyses les données du client et donnes des actions concrètes et professionnelles.

DONNÉES CLIENT:
===============
Nom: ${first_name} ${last_name}
Email: ${email}
Téléphone: ${phone}
Risk Score: ${riskScore}/100
Score Fidélité: ${loyaltyScore}/100

CONTRATS ACTIFS:
${contracts && contracts.length > 0 
  ? contracts.map((c, i) => `${i + 1}. ${c.type || 'Contrat'} - ${c.company || 'Assureur'}: ${c.number || 'N/A'}\n   Prime: ${c.premium || 'N/A'}€/an | Expire: ${c.endDate || 'N/A'}`).join('\n')
  : 'Aucun contrat actif'}

SINISTRES (5 dernières années):
${claims && claims.length > 0
  ? claims.map(c => `- ${c.date || 'N/A'}: ${c.description || 'Description manquante'} (${c.status || 'N/A'})`).join('\n')
  : 'Aucun sinistre'}

ALERTES ACTIVES:
${alerts && alerts.length > 0
  ? alerts.map(a => `🔴 ${a.message || a}`).join('\n')
  : 'Aucune alerte'}

HISTORIQUE RÉCENT:
${history && history.length > 0
  ? history.slice(0, 5).map(h => `- ${h.date || 'N/A'}: ${h.action || h}`).join('\n')
  : 'Aucun historique'}

NOTES INTERNES:
${notes || '(Aucune note)'}

INSTRUCTIONS IMPORTANTES:
- Analyse le client et identifie les opportunités CONCRÈTES: renouvellement, cross-sell, optimisation de couverture
- Donne une réponse ACTIONNABLE et professionnelle
- Si un contrat expire bientôt, propose UNE ACTION IMMÉDIATE avec les dates exactes
- Si des alertes existent, traite-les en priorité
- Format de réponse: "ACTION: [quoi faire MAINTENANT] | DISCOURS CLIENT: [script/pitch exact à utiliser]"
- Sois concis et direct

QUESTION DU COURTIER:
"${userMessage}"

RÉPONSE ARK:`;

  return context;
}

// ==================== ARK HISTORY ROUTES ====================

// Get ARK conversations for a client
app.get('/api/ark/history/:clientId', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await pool.query(
      `SELECT id, user_message, ark_response, created_at FROM ark_conversations
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [clientId]
    );
    
    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Error fetching ARK history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Save ARK conversation
app.post('/api/ark/save-conversation', verifyToken, async (req, res) => {
  try {
    const { clientId, userMessage, arkResponse } = req.body;
    const userId = req.user.id;
    
    if (!clientId || !userMessage || !arkResponse) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await pool.query(
      `INSERT INTO ark_conversations (client_id, user_id, user_message, ark_response)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [clientId, userId, userMessage, arkResponse]
    );
    
    res.json({ conversation: result.rows[0] });
  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({ error: 'Failed to save conversation' });
  }
});

// ==================== EXPORTS ROUTES ====================

// Export clients to Excel
app.get('/api/exports/clients-excel', verifyToken, async (req, res) => {
  try {
    // Get all clients
    const clientsResult = await pool.query(
      'SELECT id, first_name, last_name, email, phone, status, loyalty_score, risk_score, created_at FROM clients ORDER BY created_at DESC'
    );
    
    // Get all contracts
    const contractsResult = await pool.query(
      `SELECT c.id, c.type, c.annual_premium, c.status, c.start_date, c.end_date, cl.first_name, cl.last_name
       FROM quotes q
       JOIN clients cl ON c.client_id = cl.id
       ORDER BY c.created_at DESC`
    );
    
    const contracts = contractsResult.rows.map(c => ({
      ...c,
      premium: c.annual_premium,
      client_name: `${c.first_name} ${c.last_name}`
    }));
    
    const filePath = await excelService.generateClientsExport(clientsResult.rows, contracts);
    
    res.download(filePath, `clients_export_${Date.now()}.xlsx`, (err) => {
      if (err) console.error('Download error:', err);
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to generate export' });
  }
});

// ==================== REPORTS ROUTES ====================

// Generate DDA PDF
app.get('/api/reports/dda/:clientId', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    // Get client data
    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const clientData = clientResult.rows[0];
    
    // Get contracts
    const contractsResult = await pool.query(
      'SELECT type, amount as premium, null as end_date FROM quotes WHERE client_id = $1 AND status = $2',
      [clientId, 'active']
    );
    
    clientData.contracts = contractsResult.rows;
    
    const filePath = await pdfService.generateDDA(clientData, pool);
    
    res.download(filePath, `DDA_${clientData.first_name}_${clientData.last_name}.pdf`, (err) => {
      if (err) console.error('Download error:', err);
    });
  } catch (error) {
    console.error('DDA generation error:', error);
    res.status(500).json({ error: 'Failed to generate DDA' });
  }
});

// Generate RGPD PDF
app.get('/api/reports/rgpd', verifyToken, async (req, res) => {
  try {
    // Get all clients
    const result = await pool.query('SELECT id, first_name, last_name, email, phone, status FROM clients ORDER BY created_at DESC');
    const clientsList = result.rows;
    
    const filePath = await pdfService.generateRGPD(clientsList, pool);
    
    res.download(filePath, `RGPD_${Date.now()}.pdf`, (err) => {
      if (err) console.error('Download error:', err);
    });
  } catch (error) {
    console.error('RGPD generation error:', error);
    res.status(500).json({ error: 'Failed to generate RGPD' });
  }
});

// Generate ACPR PDF
app.get('/api/reports/acpr', verifyToken, async (req, res) => {
  try {
    // Get statistics
    const clientCount = await pool.query('SELECT COUNT(*) FROM clients WHERE status = $1', ['active']);
    const contractCount = await pool.query('SELECT COUNT(*) FROM contrats WHERE status = $1', ['active']);
    
    const stats = {
      totalClients: clientCount.rows[0].count || 0,
      activeClients: clientCount.rows[0].count || 0,
      totalContracts: contractCount.rows[0].count || 0,
      totalRevenue: 50000,
      avgRiskScore: 65,
      avgLoyaltyScore: 72
    };
    
    const filePath = await pdfService.generateACPR(stats, pool);
    
    res.download(filePath, `ACPR_${Date.now()}.pdf`, (err) => {
      if (err) console.error('Download error:', err);
    });
  } catch (error) {
    console.error('ACPR generation error:', error);
    res.status(500).json({ error: 'Failed to generate ACPR' });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

// Test: Send contract expiring notification
app.post('/api/notifications/test/contract-expiring', verifyToken, async (req, res) => {
  try {
    const { telegram_chat_id, client_name, end_date, type, premium } = req.body;
    
    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' });
    }
    
    const contractData = {
      client_name: client_name || 'Jean Dupont',
      end_date: end_date || new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      type: type || 'Auto',
      premium: premium || 850
    };
    
    await notificationService.notifyExpiringContract(null, contractData, telegram_chat_id);
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Test: Send stagnant prospect notification
app.post('/api/notifications/test/prospect-stagnant', verifyToken, async (req, res) => {
  try {
    const { telegram_chat_id } = req.body;
    
    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' });
    }
    
    const prospectData = {
      name: 'ABC Corp SA',
      stage: 'Proposition en attente',
      last_moved: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      value: 5000,
      notes: 'En discussion depuis 3 semaines'
    };
    
    await notificationService.notifyStagnantProspect(null, prospectData, telegram_chat_id);
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Test: Send new client notification
app.post('/api/notifications/test/new-client', verifyToken, async (req, res) => {
  try {
    const { telegram_chat_id } = req.body;
    
    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' });
    }
    
    const clientData = {
      first_name: 'Marie',
      last_name: 'Martin',
      email: 'marie@example.com',
      phone: '06 12 34 56 78'
    };
    
    await notificationService.notifyNewClient(null, clientData, telegram_chat_id);
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Test: Send conversion drop notification
app.post('/api/notifications/test/conversion-drop', verifyToken, async (req, res) => {
  try {
    const { telegram_chat_id } = req.body;
    
    if (!telegram_chat_id) {
      return res.status(400).json({ error: 'telegram_chat_id required' });
    }
    
    const stats = {
      conversionRate: 8.5,
      weeklyDrop: 12,
      totalProspects: 42,
      convertedThisWeek: 2
    };
    
    await notificationService.notifyConversionDrop(null, stats, telegram_chat_id);
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ==================== CRON JOBS ====================

// Cron: Relances clients inactifs - Lundi 9h00
cron.schedule('0 9 * * 1', async () => {
  console.log('⏰ [CRON] Running weekly reminder job...');
  try {
    const inactiveClients = await reminderService.getInactiveClients(pool);
    
    if (inactiveClients.length > 0) {
      console.log(`📊 Found ${inactiveClients.length} inactive clients`);
      
      // TODO: Get broker's Telegram chat ID from config
      // For now, send to a test channel
      const telegramChatId = process.env.TELEGRAM_CHAT_ID || '123456789';
      await telegramService.sendWeeklyReminder(telegramChatId, inactiveClients);
      console.log('✅ Weekly reminder sent via Telegram');
    }
  } catch (error) {
    console.error('❌ Cron job error:', error);
  }
});

// Cron: Brief RDV 24h avant - Chaque jour à 20h
cron.schedule('0 20 * * *', async () => {
  console.log('⏰ [CRON] Running daily brief job...');
  try {
    // Get appointments for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT a.*, c.first_name, c.last_name, c.phone, c.email
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       WHERE DATE(a.start_time) = $1 AND a.status != 'annulé'
       ORDER BY a.start_time`,
      [tomorrowStr]
    );
    
    const appointments = result.rows;
    console.log(`📅 Found ${appointments.length} appointments for tomorrow`);
    
    // Send brief for each appointment
    for (const apt of appointments) {
      try {
        const brief = await telegramService.sendDailyBrief(apt);
        console.log(`✅ Brief sent for ${apt.first_name} ${apt.last_name}`);
      } catch (error) {
        console.error(`Error sending brief for appointment ${apt.id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Cron job error:', error);
  }
});

// ==================== SERVER START ====================

// Start backup scheduler
backupService.scheduleNightlyBackup();
monitoringService.startHealthCheck();

const server = app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  ✅ CRM ASSURANCE BACKEND RUNNING    ║`);
  console.log(`║  🚀 http://localhost:${PORT}${' '.repeat(18)}║`);
  console.log(`║  📦 Node.js + Express + PostgreSQL   ║`);
  console.log(`║  🔐 JWT Authentication enabled       ║`);
  console.log(`║  💾 Backup nightly à 3h              ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
  
  console.log('📍 Available endpoints:');
  console.log('   GET    /health                          (server status)');
  console.log('   GET    /api/status                      (DB check)');
  console.log('   POST   /api/auth/register               (register)');
  console.log('   POST   /api/auth/login                  (login)');
  console.log('   GET    /api/clients                     (list)');
  console.log('   POST   /api/clients                     (create)');
  console.log('   GET    /api/clients/:id                 (get)');
  console.log('   PUT    /api/clients/:id                 (update)');
  console.log('   DELETE /api/clients/:id                 (delete)');
  console.log('   GET    /api/clients/:id/contracts       (get contracts)');
  console.log('   GET    /api/contracts                   (list)');
  console.log('   POST   /api/contracts                   (create)');
  console.log('   GET    /api/contracts/:id               (get)');
  console.log('   PUT    /api/contracts/:id               (update)');
  console.log('   DELETE /api/contracts/:id               (delete)');
  console.log('   GET    /api/prospects                   (list)');
  console.log('   POST   /api/prospects                   (create)');
  console.log('   GET    /api/prospects/:id               (get)');
  console.log('   PUT    /api/prospects/:id               (update)');
  console.log('   PUT    /api/prospects/:id/move/:stage   (kanban)');
  console.log('   GET    /api/prospects/stage/:stage      (by stage)');
  console.log('   GET    /api/prospects/pipeline/summary  (kanban summary)');
  console.log('   DELETE /api/prospects/:id               (delete)');
  console.log('   POST   /api/ark/chat                    (ARK AI assistant)');
  console.log('   POST   /api/ark/ask                     (ARK with quota management)');
  console.log('   GET    /api/ark/my-usage                (usage stats)');
  console.log('   POST   /api/ark/upgrade-tier            (upgrade plan)');
  console.log('   GET    /api/admin/costs                 (admin dashboard)');
  console.log('   GET    /api/admin/costs/by-user         (detailed costs)');
  console.log('   GET    /api/admin/costs/export          (export CSV)\n');
});

// ==================== OPTION 4: ROUTES ====================

// Import routes
const arkRoutes = require('./src/routes/ark');
const adminCostsRoutes = require('./src/routes/adminCosts');

// Mount routes
app.use(arkRoutes);
app.use(adminCostsRoutes);

// ==================== 404 & ERROR HANDLERS ====================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
