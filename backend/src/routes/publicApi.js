/**
 * Public API Routes — LOT 23
 * API REST publique pour intégrations tierces
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { apiKeyAuth, requireScope } = require('../middleware/apiKeyAuth');
const apiKeyService = require('../services/apiKeyService');

// ==================== INFO CABINET ====================

/**
 * GET /api/v1/me
 * Retourne les infos du cabinet authentifié
 */
router.get('/me', apiKeyAuth(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, cabinet_name, phone, plan, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'cabinet_not_found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      id: user.id,
      email: user.email,
      cabinet_name: user.cabinet_name,
      phone: user.phone,
      plan: user.plan,
      created_at: user.created_at,
      api_key: {
        name: req.apiKey.name,
        scopes: req.apiKey.scopes
      }
    });
  } catch (error) {
    console.error('GET /me error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

// ==================== CLIENTS ====================

/**
 * GET /api/v1/clients
 * Liste les clients du cabinet
 */
router.get('/clients', apiKeyAuth(['read:clients']), async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;
    
    let query = `
      SELECT id, first_name, last_name, email, phone, type, 
             company_name, created_at, updated_at
      FROM clients 
      WHERE user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;
    
    if (search) {
      query += ` AND (
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR
        company_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(parseInt(limit, 10), 1000), parseInt(offset, 10));
    
    const result = await pool.query(query, params);
    
    // Count total
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM clients WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count, 10),
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    });
  } catch (error) {
    console.error('GET /clients error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * GET /api/v1/clients/:id
 * Détail d'un client
 */
router.get('/clients/:id', apiKeyAuth(['read:clients']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM contracts WHERE client_id = c.id) as contracts_count
       FROM clients c
       WHERE c.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'client_not_found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('GET /clients/:id error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

// ==================== CONTRATS ====================

/**
 * GET /api/v1/contracts
 * Liste les contrats du cabinet
 */
router.get('/contracts', apiKeyAuth(['read:contracts']), async (req, res) => {
  try {
    const { limit = 100, offset = 0, client_id, status } = req.query;
    
    let query = `
      SELECT ct.id, ct.contract_number, ct.product_type, ct.company, 
             ct.premium_annual, ct.status, ct.start_date, ct.end_date,
             ct.client_id, c.first_name as client_first_name, c.last_name as client_last_name
      FROM contracts ct
      JOIN clients c ON c.id = ct.client_id
      WHERE ct.user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;
    
    if (client_id) {
      query += ` AND ct.client_id = $${paramIndex}`;
      params.push(parseInt(client_id, 10));
      paramIndex++;
    }
    
    if (status) {
      query += ` AND ct.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY ct.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(parseInt(limit, 10), 1000), parseInt(offset, 10));
    
    const result = await pool.query(query, params);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM contracts WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count, 10),
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    });
  } catch (error) {
    console.error('GET /contracts error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

// ==================== COMMISSIONS ====================

/**
 * GET /api/v1/commissions
 * Liste les commissions du cabinet
 */
router.get('/commissions', apiKeyAuth(['read:commissions']), async (req, res) => {
  try {
    const { limit = 100, offset = 0, year, month, status } = req.query;
    
    let query = `
      SELECT cm.id, cm.contract_id, cm.amount_cents, cm.currency, 
             cm.period_start, cm.period_end, cm.status, cm.payment_date,
             ct.contract_number, ct.company, ct.product_type
      FROM commissions cm
      LEFT JOIN contracts ct ON ct.id = cm.contract_id
      WHERE cm.user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;
    
    if (year) {
      query += ` AND EXTRACT(YEAR FROM cm.period_start) = $${paramIndex}`;
      params.push(parseInt(year, 10));
      paramIndex++;
    }
    
    if (month) {
      query += ` AND EXTRACT(MONTH FROM cm.period_start) = $${paramIndex}`;
      params.push(parseInt(month, 10));
      paramIndex++;
    }
    
    if (status) {
      query += ` AND cm.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY cm.period_start DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Math.min(parseInt(limit, 10), 1000), parseInt(offset, 10));
    
    const result = await pool.query(query, params);
    
    // Calcul du total
    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(amount_cents), 0) as total_cents
       FROM commissions WHERE user_id = $1`,
      [req.user.id]
    );
    
    res.json({
      data: result.rows.map(row => ({
        ...row,
        amount: row.amount_cents / 100 // Convertir en euros
      })),
      summary: {
        total_amount: parseInt(totalResult.rows[0].total_cents, 10) / 100
      },
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    });
  } catch (error) {
    console.error('GET /commissions error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

// ==================== WEBHOOKS ====================

/**
 * POST /api/v1/webhooks
 * Enregistre une URL de webhook
 */
router.post('/webhooks', apiKeyAuth(), async (req, res) => {
  try {
    const { url, events } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'missing_url', message: 'Webhook URL is required' });
    }
    
    // Valider l'URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'invalid_url', message: 'Invalid webhook URL format' });
    }
    
    const validEvents = ['client.created', 'client.updated', 'contract.created', 'contract.updated', 'commission.received'];
    const requestedEvents = events || validEvents.slice(0, 3);
    
    const invalidEvents = requestedEvents.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: 'invalid_events',
        message: `Invalid events: ${invalidEvents.join(', ')}`,
        valid_events: validEvents
      });
    }
    
    const webhook = await apiKeyService.registerWebhook(req.user.id, url, requestedEvents);
    
    res.status(201).json({
      message: 'Webhook registered successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret // Retourné une seule fois !
      },
      note: 'Store the secret securely. It will be used to sign webhook payloads.'
    });
  } catch (error) {
    console.error('POST /webhooks error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * GET /api/v1/webhooks
 * Liste les webhooks configurés
 */
router.get('/webhooks', apiKeyAuth(), async (req, res) => {
  try {
    const webhooks = await apiKeyService.listWebhooks(req.user.id);
    res.json({ data: webhooks });
  } catch (error) {
    console.error('GET /webhooks error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

/**
 * DELETE /api/v1/webhooks/:id
 * Supprime un webhook
 */
router.delete('/webhooks/:id', apiKeyAuth(), async (req, res) => {
  try {
    const deleted = await apiKeyService.deleteWebhook(req.params.id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'webhook_not_found' });
    }
    
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    console.error('DELETE /webhooks/:id error:', error);
    res.status(500).json({ error: 'internal_error', message: error.message });
  }
});

// ==================== API DOCS REDIRECT ====================

router.get('/', (req, res) => {
  res.json({
    name: 'COURTIA Public API',
    version: 'v1',
    documentation: '/api/docs',
    endpoints: {
      me: 'GET /api/v1/me',
      clients: 'GET /api/v1/clients',
      client_detail: 'GET /api/v1/clients/:id',
      contracts: 'GET /api/v1/contracts',
      commissions: 'GET /api/v1/commissions',
      webhooks: 'POST /api/v1/webhooks'
    }
  });
});

module.exports = router;
