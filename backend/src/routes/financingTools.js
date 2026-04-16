/**
 * financingTools.js — Routes /api/financing/tools/*
 *
 * Toutes les routes nécessitent verifyToken + iobspGuard (accès CAPITIA validé).
 *
 * GET  /simulators     → Liste des simulateurs disponibles
 * POST /simulate       → Calcul mensualité crédit
 * GET  /partners       → Liste des partenaires bancaires
 * POST /leads          → Création d'un lead financement
 */

const express    = require('express');
const router     = express.Router();
const { verifyToken } = require('../middleware/auth');
const iobspGuard = require('../middleware/iobspGuard');
const pool       = require('../db');

const PARTNERS = [
  { id: 1, name: 'BNP Paribas',       specialite: 'Immobilier + Consommation',   taux_min: 3.20, taux_max: 4.80, delai_reponse: '48h', logo_color: '#009966' },
  { id: 2, name: 'Crédit Agricole',   specialite: 'Immobilier rural + Pro',       taux_min: 3.10, taux_max: 4.60, delai_reponse: '72h', logo_color: '#007643' },
  { id: 3, name: 'Banque Populaire',  specialite: 'Regroupement + Pro',           taux_min: 3.30, taux_max: 5.10, delai_reponse: '48h', logo_color: '#E2001A' },
  { id: 4, name: 'LCL',               specialite: 'Consommation + Immobilier',    taux_min: 3.40, taux_max: 5.20, delai_reponse: '24h', logo_color: '#003189' },
  { id: 5, name: 'Société Générale',  specialite: 'Immobilier + Rachat crédit',   taux_min: 3.25, taux_max: 4.90, delai_reponse: '48h', logo_color: '#E60028' },
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /simulators
// Retourne la liste des simulateurs de crédit disponibles.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/simulators', verifyToken, iobspGuard, (req, res) => {
  return res.json([
    {
      id: 'immo',
      type: 'immo',
      name: 'Prêt Immobilier',
      description: 'Simulateur crédit immobilier avec assurance emprunteur incluse',
    },
    {
      id: 'conso',
      type: 'conso',
      name: 'Prêt Consommation',
      description: 'Crédit à la consommation jusqu\'à 75 000€',
    },
    {
      id: 'regroupement',
      type: 'regroupement',
      name: 'Regroupement de Crédits',
      description: 'Réduisez vos mensualités en regroupant vos crédits',
    },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /simulate
// Calcule la mensualité, coût total et coût du crédit.
// Body : { type, capital, taux_nominal, duree_mois }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/simulate', verifyToken, iobspGuard, (req, res) => {
  const { type, capital, taux_nominal, duree_mois } = req.body;

  if (!capital || capital <= 0) {
    return res.status(400).json({ error: 'capital doit être supérieur à 0' });
  }
  if (taux_nominal === undefined || taux_nominal === null || taux_nominal < 0) {
    return res.status(400).json({ error: 'taux_nominal doit être >= 0' });
  }
  if (!duree_mois || duree_mois <= 0 || !Number.isInteger(Number(duree_mois))) {
    return res.status(400).json({ error: 'duree_mois doit être un entier supérieur à 0' });
  }

  const i = taux_nominal / 12 / 100;
  const mensualite = i === 0
    ? capital / duree_mois
    : capital * (i * Math.pow(1 + i, duree_mois)) / (Math.pow(1 + i, duree_mois) - 1);

  const cout_total  = mensualite * duree_mois;
  const cout_credit = cout_total - capital;
  const taeg_approx = taux_nominal * 1.15;

  return res.json({
    mensualite:   Math.round(mensualite * 100) / 100,
    cout_total:   Math.round(cout_total),
    cout_credit:  Math.round(cout_credit),
    taux_nominal,
    taeg_approx:  Math.round(taeg_approx * 100) / 100,
    duree_mois,
    capital,
    type,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /partners
// Retourne la liste des partenaires bancaires disponibles.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/partners', verifyToken, iobspGuard, (req, res) => {
  return res.json({ partners: PARTNERS });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /leads
// Crée un lead financement vers un partenaire bancaire.
// Body : { client_id, partner_id, amount, duration_months, notes }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/leads', verifyToken, iobspGuard, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { client_id, partner_id, amount, duration_months, notes } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id est requis' });
    }
    if (!partner_id) {
      return res.status(400).json({ error: 'partner_id est requis' });
    }
    const amountNum   = parseFloat(amount);
    const durationNum = parseInt(duration_months, 10);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'amount doit être un nombre supérieur à 0' });
    }
    if (!duration_months || isNaN(durationNum) || durationNum <= 0) {
      return res.status(400).json({ error: 'duration_months doit être un entier supérieur à 0' });
    }

    // Vérifier que le client appartient au courtier
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id=$1 AND courtier_id=$2',
      [client_id, userId]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé ou accès non autorisé' });
    }

    // Vérifier que le partenaire existe
    const partner = PARTNERS.find(p => p.id === parseInt(partner_id, 10));
    if (!partner) {
      return res.status(404).json({ error: 'Partenaire non trouvé' });
    }

    const result = await pool.query(
      `INSERT INTO financing_requests
         (user_id, client_id, request_type, amount, duration_months, bank_partner, notes, status, created_at, updated_at)
       VALUES ($1, $2, 'lead', $3, $4, $5, $6, 'submitted', NOW(), NOW())
       RETURNING id, status, created_at`,
      [userId, client_id, amountNum, durationNum, partner.name, notes || null]
    );

    const row = result.rows[0];

    return res.status(201).json({
      id:               row.id,
      status:           'submitted',
      partner_name:     partner.name,
      amount:           amountNum,
      duration_months:  durationNum,
      created_at:       row.created_at,
    });

  } catch (err) {
    console.error('POST /api/financing/tools/leads error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
