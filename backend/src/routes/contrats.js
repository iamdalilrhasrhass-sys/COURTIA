const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireUnderLimit } = require('../middleware/planGuard');

// Middleware pour vérifier le token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', details: err.message });
  }
};

/**
 * GET /api/contrats — Lister les contrats (quotes table)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const clientId = req.query.client_id;

    let query, params;

    if (clientId) {
      query = `SELECT 
        q.id, q.client_id, q.status as statut,
        q.quote_data->>'type_contrat' as type_contrat,
        q.quote_data->>'compagnie' as compagnie,
        q.quote_data->>'numero' as numero,
        (q.quote_data->>'prime_annuelle')::decimal as prime_annuelle,
        q.quote_data->>'date_effet' as date_effet,
        q.quote_data->>'date_echeance' as date_echeance,
        c.first_name as client_nom, c.last_name as client_prenom,
        q.created_at
      FROM quotes q
      JOIN clients c ON q.client_id = c.id AND c.courtier_id = $2
      WHERE q.client_id = $1
      ORDER BY (q.quote_data->>'date_echeance') ASC`;
      params = [clientId, req.user.id];
    } else {
      query = `SELECT 
        q.id, q.client_id, q.status as statut,
        q.quote_data->>'type_contrat' as type_contrat,
        q.quote_data->>'compagnie' as compagnie,
        q.quote_data->>'numero' as numero,
        (q.quote_data->>'prime_annuelle')::decimal as prime_annuelle,
        q.quote_data->>'date_effet' as date_effet,
        q.quote_data->>'date_echeance' as date_echeance,
        c.first_name as client_nom, c.last_name as client_prenom,
        q.created_at
      FROM quotes q
      JOIN clients c ON q.client_id = c.id AND c.courtier_id = $1
      ORDER BY (q.quote_data->>'date_echeance') ASC`;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/contrats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/contrats — Créer un contrat (quote)
 */
router.post('/', verifyToken, requireUnderLimit('contracts'), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      client_id, type_contrat, compagnie, numero,
      prime_annuelle, date_effet, date_echeance, statut
    } = req.body;

    // Vérifier que le client appartient à l'utilisateur
    const own = await pool.query('SELECT 1 FROM clients WHERE id = $1 AND courtier_id = $2', [client_id, req.user.id]);
    if (!own.rows.length) return res.status(403).json({ error: 'client_not_owned' });

    const quoteData = {
      type_contrat,
      compagnie,
      numero,
      prime_annuelle,
      date_effet,
      date_echeance
    };

    const result = await pool.query(
      `INSERT INTO quotes (client_id, quote_data, status, created_at)
      VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [client_id, JSON.stringify(quoteData), statut || 'actif']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/contrats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/contrats/:id — Modifier un contrat
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      type_contrat, compagnie, numero,
      prime_annuelle, date_effet, date_echeance, statut
    } = req.body;

    const quoteData = {
      type_contrat,
      compagnie,
      numero,
      prime_annuelle,
      date_effet,
      date_echeance
    };

    const result = await pool.query(
      `UPDATE quotes SET quote_data = $1, status = $2 
       FROM clients 
       WHERE quotes.id = $3 AND quotes.client_id = clients.id AND clients.courtier_id = $4
       RETURNING quotes.*`,
      [JSON.stringify(quoteData), statut, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/contrats/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/contrats/:id — Supprimer un contrat
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.query(
      `DELETE FROM quotes USING clients 
       WHERE quotes.id = $1 AND quotes.client_id = clients.id AND clients.courtier_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/contrats/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
