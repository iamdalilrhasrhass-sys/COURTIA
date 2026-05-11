const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/beta/register — Inscription beta privee
router.post('/register', async (req, res) => {
  try {
    const { email, cabinet_name, orias, portfolio_size, source, notes } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'email_invalid', message: 'Email requis et valide' });
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM beta_signups WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'email_exists', message: 'Cet email est deja inscrit' });
    }

    const result = await pool.query(
      `INSERT INTO beta_signups (email, cabinet_name, orias, portfolio_size, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, cabinet_name, orias, portfolio_size, created_at`,
      [
        email.toLowerCase().trim(),
        cabinet_name || null,
        orias || null,
        portfolio_size || null,
        source || 'landing',
        notes || null
      ]
    );

    // Send confirmation email (optional, uses existing email service)
    try {
      const { sendEmail } = require('../services/emailService');
      await sendEmail({
        to: email,
        subject: 'Bienvenue dans la beta privee COURTIA',
        html: `<h1>Merci pour votre inscription!</h1><p>Vous etes sur la liste d attente pour la beta privee de COURTIA.</p><p>Nous vous contacterons des qu une place se libere.</p><p>L equipe COURTIA</p>`
      });
    } catch (emailErr) {
      console.warn('Beta signup email failed:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Inscription reussie',
      signup: result.rows[0]
    });
  } catch (err) {
    console.error('POST /api/beta/register error:', err.message);
    res.status(500).json({ error: 'signup_failed', message: err.message });
  }
});

// GET /api/beta/stats — Stats inscriptions (admin only)
router.get('/stats', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM beta_signups');
    const bySize = await pool.query(
      `SELECT portfolio_size, COUNT(*) as count FROM beta_signups GROUP BY portfolio_size ORDER BY count DESC`
    );
    const recent = await pool.query(
      `SELECT id, email, cabinet_name, created_at FROM beta_signups ORDER BY created_at DESC LIMIT 10`
    );

    res.json({
      total: parseInt(total.rows[0].count),
      by_portfolio_size: bySize.rows,
      recent: recent.rows
    });
  } catch (err) {
    console.error('GET /api/beta/stats error:', err.message);
    res.status(500).json({ error: 'stats_failed', message: err.message });
  }
});

module.exports = router;
