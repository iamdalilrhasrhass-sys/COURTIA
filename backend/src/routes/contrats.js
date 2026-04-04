const express = require('express');
const router = express.Router();

/**
 * GET /api/contrats — Lister les contrats (quotes table)
 */
router.get('/', async (req, res) => {
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
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.client_id = $1
      ORDER BY (q.quote_data->>'date_echeance') ASC`;
      params = [clientId];
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
      LEFT JOIN clients c ON q.client_id = c.id
      ORDER BY (q.quote_data->>'date_echeance') ASC`;
      params = [];
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
router.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      client_id, type_contrat, compagnie, numero,
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
router.put('/:id', async (req, res) => {
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
      `UPDATE quotes SET quote_data = $1, status = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(quoteData), statut, req.params.id]
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
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.query('DELETE FROM quotes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/contrats/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
