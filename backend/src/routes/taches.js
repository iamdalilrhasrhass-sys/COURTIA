const express = require('express');
const pool = require('../db');
const router = express.Router();

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
 * GET /api/taches — Lister les tâches (appointments)
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(`
      SELECT 
        a.id, a.title as titre, a.description, 
        a.status as statut, a.start_time as echeance,
        a.client_id, c.first_name as client_nom, c.last_name as client_prenom,
        a.created_at,
        CASE 
          WHEN a.start_time < NOW() + INTERVAL '3 days' THEN 'haute'
          WHEN a.start_time < NOW() + INTERVAL '7 days' THEN 'normale'
          ELSE 'basse'
        END as priorite
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      ORDER BY a.start_time ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/taches error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/taches — Créer une tâche
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      titre, description, client_id, echeance, statut
    } = req.body;

    const result = await pool.query(
      `INSERT INTO appointments 
       (title, description, client_id, start_time, status, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [titre, description, client_id, echeance, statut || 'a_faire', req.user?.id || 3]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/taches error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/taches/:id — Modifier une tâche
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { titre, description, statut, echeance } = req.body;

    const result = await pool.query(
      `UPDATE appointments 
       SET title = $1, description = $2, status = $3, start_time = $4
      WHERE id = $5 RETURNING *`,
      [titre, description, statut, echeance, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/taches/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/taches/:id — Supprimer une tâche
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/taches/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
