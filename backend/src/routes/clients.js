const express = require('express');
const router = express.Router();
const { calculateRiskScore } = require('../utils/riskCalculator');

// Middleware pour vérifier le token (sera passé en paramètre depuis server.js)
// Les routes utilisent le middleware verifyToken du serveur principal

/**
 * GET /api/clients — Lister tous les clients avec pagination
 */
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // Récupérer les clients
    const result = await pool.query(
      `SELECT 
        id, first_name as nom, last_name as prenom, 
        email, phone as telephone, address as adresse,
        status as statut, risk_score as score_risque,
        bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        notes, created_at, company_name, type as segment
      FROM clients 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Compter le total
    const countResult = await pool.query('SELECT COUNT(*) as count FROM clients');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('GET /api/clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/clients/:id — Récupérer un client par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      `SELECT 
        id, first_name as nom, last_name as prenom,
        email, phone as telephone, address as adresse,
        status as statut, risk_score as score_risque,
        bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        notes, created_at, company_name, type as segment,
        loyalty_score, lifetime_value, civility, postal_code, city, country
      FROM clients WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/clients — Créer un client
 */
router.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      nom, prenom, email, telephone, adresse, statut, segment,
      notes, bonus_malus, annees_permis, nb_sinistres_3ans,
      zone_geographique, profession, situation_familiale,
      postal_code, city, civility, country
    } = req.body;

    // Calculer le score risque
    const score = calculateRiskScore({
      bonus_malus,
      annees_permis,
      nb_sinistres_3ans,
      zone_geographique
    });

    const result = await pool.query(
      `INSERT INTO clients 
      (first_name, last_name, email, phone, address, status, type,
       risk_score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
       zone_geographique, profession, situation_familiale,
       postal_code, city, civility, country, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      RETURNING *`,
      [
        nom, prenom, email, telephone, adresse, statut || 'prospect', segment || 'particulier',
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/clients/:id — Modifier un client
 */
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      nom, prenom, email, telephone, adresse, statut, segment,
      notes, bonus_malus, annees_permis, nb_sinistres_3ans,
      zone_geographique, profession, situation_familiale,
      postal_code, city, civility, country
    } = req.body;

    // Recalculer le score
    const score = calculateRiskScore({
      bonus_malus,
      annees_permis,
      nb_sinistres_3ans,
      zone_geographique
    });

    const result = await pool.query(
      `UPDATE clients SET
       first_name = $1, last_name = $2, email = $3, phone = $4,
       address = $5, status = $6, type = $7, risk_score = $8,
       notes = $9, bonus_malus = $10, annees_permis = $11,
       nb_sinistres_3ans = $12, zone_geographique = $13,
       profession = $14, situation_familiale = $15,
       postal_code = $16, city = $17, civility = $18, country = $19,
       updated_at = NOW()
      WHERE id = $20 RETURNING *`,
      [
        nom, prenom, email, telephone, adresse, statut, segment,
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country, req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/clients/:id — Supprimer un client
 */
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
