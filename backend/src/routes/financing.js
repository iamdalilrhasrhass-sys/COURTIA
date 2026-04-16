/**
 * financing.js — Routes /api/financing/*
 *
 * POST /iobsp/submit              → Soumet une attestation IOBSP
 * GET  /iobsp/status              → Statut de l'attestation IOBSP
 * GET  /iobsp/decisions/history   → Historique des décisions
 * POST /capitia/checkout          → Crée une session Stripe Checkout pour l'add-on CAPITIA
 * POST /capitia/cancel            → Annule l'add-on CAPITIA
 */

const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const { submitAttestation, getAttestationStatus } = require('../services/iobspService');
const pool = require('../db');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://courtia.vercel.app';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/financing/iobsp/submit
// Soumet une attestation IOBSP pour validation.
// Body : { file_url, orias_number, category, additional_info }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/iobsp/submit', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { file_url, orias_number, category, additional_info } = req.body;

    if (!file_url) {
      return res.status(400).json({ error: 'file_url est requis' });
    }
    if (!orias_number) {
      return res.status(400).json({ error: 'orias_number est requis' });
    }

    const result = await submitAttestation(userId, {
      fileUrl: file_url,
      oriasNumber: orias_number,
      category,
      additionalInfo: additional_info,
    });

    return res.status(201).json({
      message: 'Attestation soumise avec succès. Délai de traitement : 48h ouvrées.',
      ...result,
    });

  } catch (err) {
    if (err.status === 400 || err.status === 409) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('POST /api/financing/iobsp/submit error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/financing/iobsp/status
// Retourne le statut de l'attestation IOBSP de l'utilisateur connecté.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/iobsp/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const result = await getAttestationStatus(userId);
    return res.json(result);
  } catch (err) {
    console.error('GET /api/financing/iobsp/status error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/financing/iobsp/decisions/history
// Retourne l'historique des décisions sur les fichiers IOBSP de l'utilisateur.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/iobsp/decisions/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const result = await pool.query(
      `SELECT ff.file_type, ff.file_name, ff.uploaded_at, ff.reviewed, ff.reviewed_at, ff.review_notes,
              u.first_name || ' ' || u.last_name AS reviewed_by
       FROM financing_files ff
       LEFT JOIN users u ON ff.reviewed_by = u.id
       WHERE ff.user_id = $1
       ORDER BY ff.uploaded_at DESC`,
      [userId]
    );

    return res.json({ history: result.rows });
  } catch (err) {
    console.error('GET /api/financing/iobsp/decisions/history error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/financing/capitia/checkout
// Crée une session Stripe Checkout pour souscrire à l'add-on CAPITIA.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/capitia/checkout', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    if (!process.env.STRIPE_PRICE_CAPITIA) {
      return res.status(503).json({
        error: 'CAPITIA checkout non configuré (STRIPE_PRICE_CAPITIA manquant)',
      });
    }

    const userResult = await pool.query('SELECT email FROM users WHERE id=$1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const user = userResult.rows[0];

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe non configuré (STRIPE_SECRET_KEY manquant)' });
    }
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: process.env.STRIPE_PRICE_CAPITIA, quantity: 1 }],
      metadata: { type: 'capitia_addon', user_id: String(userId) },
      success_url: FRONTEND_URL + '/capitia?addon=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url:  FRONTEND_URL + '/capitia?addon=cancelled',
    });

    return res.json({ url: session.url, sessionId: session.id });

  } catch (err) {
    console.error('POST /api/financing/capitia/checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/financing/capitia/cancel
// Annule l'abonnement add-on CAPITIA de l'utilisateur.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/capitia/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const subResult = await pool.query(
      'SELECT financing_addon_subscription_id FROM users WHERE id=$1',
      [userId]
    );

    if (
      subResult.rows.length === 0 ||
      !subResult.rows[0].financing_addon_subscription_id
    ) {
      return res.status(404).json({ error: 'Aucun add-on CAPITIA actif à annuler' });
    }

    const row = subResult.rows[0];

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Stripe non configuré (STRIPE_SECRET_KEY manquant)' });
    }
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    await stripe.subscriptions.cancel(row.financing_addon_subscription_id);

    await pool.query(
      `UPDATE users
       SET financing_addon_active=FALSE,
           financing_addon_subscription_id=NULL,
           financing_addon_started_at=NULL
       WHERE id=$1`,
      [userId]
    );

    return res.json({
      message: 'Add-on CAPITIA annulé. Votre accès reste actif jusqu\'à la fin de la période en cours.',
    });

  } catch (err) {
    console.error('POST /api/financing/capitia/cancel error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
