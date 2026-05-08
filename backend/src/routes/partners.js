/**
 * Partenaires — Routes API
 * Module de suivi des partenariats courtage
 */
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const pool = require('../db');

// GET /api/partners — Liste des partenaires du courtier
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { statut, categorie, vague, search } = req.query;

    let query = 'SELECT * FROM partners WHERE user_id = $1';
    const params = [userId];
    let paramIdx = 2;

    if (statut) {
      query += ` AND statut = $${paramIdx++}`;
      params.push(statut);
    }
    if (categorie) {
      query += ` AND categorie = $${paramIdx++}`;
      params.push(categorie);
    }
    if (vague) {
      query += ` AND vague = $${paramIdx++}`;
      params.push(parseInt(vague));
    }
    if (search) {
      query += ` AND (nom ILIKE $${paramIdx} OR contact_nom ILIKE $${paramIdx} OR produit_principal ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY priorite ASC, updated_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, partners: result.rows });
  } catch (err) {
    console.error('[partners] GET /', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/partners/stats — Statistiques
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = await pool.query(
      `SELECT statut, COUNT(*) as count FROM partners WHERE user_id = $1 GROUP BY statut`,
      [userId]
    );
    const stats = {};
    result.rows.forEach(r => { stats[r.statut] = parseInt(r.count); });
    res.json({
      success: true,
      total: Object.values(stats).reduce((a,b) => a+b, 0),
      codes_ouverts: stats.Code_ouvert || 0,
      en_cours: (stats.A_contacter || 0) + (stats.Contacte || 0) + (stats.Dossier_envoye || 0) + (stats.En_analyse || 0),
      refus: stats.Refuse || 0,
      par_statut: stats
    });
  } catch (err) {
    console.error('[partners] GET /stats', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/partners — Créer un partenaire
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, priorite, vague, notes } = req.body;

    if (!nom) {
      return res.status(400).json({ success: false, error: 'Le nom du partenaire est requis' });
    }

    const result = await pool.query(
      `INSERT INTO partners (user_id, nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, priorite, vague, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userId, nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, priorite || 2, vague || 1, notes]
    );

    res.status(201).json({ success: true, partner: result.rows[0] });
  } catch (err) {
    console.error('[partners] POST /', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PUT /api/partners/:id — Mettre à jour
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const { nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, code_courtage, commission, extranet_url, extranet_login, statut, documents_envoyes, notes, priorite, vague, volume_potentiel, date_contact, date_relance } = req.body;

    const result = await pool.query(
      `UPDATE partners SET
        nom = COALESCE($1, nom),
        categorie = COALESCE($2, categorie),
        type_partenaire = COALESCE($3, type_partenaire),
        contact_nom = COALESCE($4, contact_nom),
        contact_email = COALESCE($5, contact_email),
        contact_telephone = COALESCE($6, contact_telephone),
        produit_principal = COALESCE($7, produit_principal),
        code_courtage = COALESCE($8, code_courtage),
        commission = COALESCE($9, commission),
        extranet_url = COALESCE($10, extranet_url),
        extranet_login = COALESCE($11, extranet_login),
        statut = COALESCE($12, statut),
        documents_envoyes = COALESCE($13, documents_envoyes),
        notes = COALESCE($14, notes),
        priorite = COALESCE($15, priorite),
        vague = COALESCE($16, vague),
        volume_potentiel = COALESCE($17, volume_potentiel),
        date_contact = COALESCE($18, date_contact),
        date_relance = COALESCE($19, date_relance),
        updated_at = NOW()
       WHERE id = $20 AND user_id = $21 RETURNING *`,
      [nom, categorie, type_partenaire, contact_nom, contact_email, contact_telephone, produit_principal, code_courtage, commission, extranet_url, extranet_login, statut, Array.isArray(documents_envoyes) ? documents_envoyes : null, notes, priorite, vague, volume_potentiel, date_contact, date_relance, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Partenaire non trouvé' });
    }
    res.json({ success: true, partner: result.rows[0] });
  } catch (err) {
    console.error('[partners] PUT /:id', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /api/partners/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const result = await pool.query('DELETE FROM partners WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Partenaire non trouvé' });
    }
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error('[partners] DELETE /:id', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// PATCH /api/partners/:id/statut — Changement rapide de statut
router.patch('/:id/statut', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const { statut } = req.body;
    if (!statut) return res.status(400).json({ success: false, error: 'Statut requis' });

    const result = await pool.query(
      'UPDATE partners SET statut = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [statut, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Partenaire non trouvé' });
    }
    res.json({ success: true, partner: result.rows[0] });
  } catch (err) {
    console.error('[partners] PATCH /:id/statut', err.message);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
