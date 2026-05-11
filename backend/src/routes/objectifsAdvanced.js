/**
 * LOT F5 — Objectifs & Commissions gamifiés
 * Endpoints :
 *   GET  /api/objectifs/current        → objectif annuel courant + progression
 *   POST /api/objectifs/set            → définir/maj objectif annuel
 *   GET  /api/commissions/dashboard    → décomposition commissions (par courtier/compagnie/produit/mois)
 *   GET  /api/objectifs/ranking        → ranking équipe avec badges gamification
 */
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')
const pool = require('../db')

router.use(verifyToken)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

// ─── Objectifs ───────────────────────────────────────────────────────
router.get('/objectifs/current', async (req, res) => {
  try {
    const userId = uid(req)
    const year = new Date().getFullYear()

    const { rows } = await pool.query(`
      SELECT * FROM objectifs WHERE user_id = $1 AND year = $2
    `, [userId, year])

    const obj = rows[0] || {
      year, ca_target_cents: 12000000, new_clients_target: 60,
      new_contracts_target: 80, commissions_target_cents: 3600000,
    }

    // Calcule progression réelle
    const { rows: progress } = await pool.query(`
      SELECT
        COALESCE((SELECT COUNT(*) FROM clients WHERE courtier_id = $1 AND created_at >= $2), 0) AS new_clients,
        COALESCE((SELECT COUNT(*) FROM quotes WHERE client_id IN (SELECT id FROM clients WHERE courtier_id = $1) AND created_at >= $2), 0) AS new_contracts,
        COALESCE((SELECT SUM(lifetime_value)*100 FROM clients WHERE courtier_id = $1), 0)::bigint AS ca_cents
    `, [userId, `${year}-01-01`])

    const p = progress[0] || {}
    return res.json({
      ok: true,
      objectif: obj,
      progression: {
        ca: {
          current_cents: Number(p.ca_cents || 0),
          target_cents: Number(obj.ca_target_cents || 0),
          pct: obj.ca_target_cents ? Math.round((Number(p.ca_cents || 0) / Number(obj.ca_target_cents)) * 100) : 0,
        },
        new_clients: {
          current: Number(p.new_clients || 0),
          target: Number(obj.new_clients_target || 0),
          pct: obj.new_clients_target ? Math.round((Number(p.new_clients || 0) / Number(obj.new_clients_target)) * 100) : 0,
        },
        new_contracts: {
          current: Number(p.new_contracts || 0),
          target: Number(obj.new_contracts_target || 0),
          pct: obj.new_contracts_target ? Math.round((Number(p.new_contracts || 0) / Number(obj.new_contracts_target)) * 100) : 0,
        },
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'objectifs_failed', message: err.message })
  }
})

router.post('/objectifs/set', async (req, res) => {
  try {
    const userId = uid(req)
    const year = req.body.year || new Date().getFullYear()
    const { ca_target_cents = 0, new_clients_target = 0, new_contracts_target = 0, commissions_target_cents = 0 } = req.body || {}

    const { rows } = await pool.query(`
      INSERT INTO objectifs (user_id, year, ca_target_cents, new_clients_target, new_contracts_target, commissions_target_cents)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, year) DO UPDATE
      SET ca_target_cents = EXCLUDED.ca_target_cents,
          new_clients_target = EXCLUDED.new_clients_target,
          new_contracts_target = EXCLUDED.new_contracts_target,
          commissions_target_cents = EXCLUDED.commissions_target_cents,
          updated_at = NOW()
      RETURNING *
    `, [userId, year, ca_target_cents, new_clients_target, new_contracts_target, commissions_target_cents])

    res.json({ ok: true, objectif: rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'set_failed', message: err.message })
  }
})

// ─── Commissions dashboard ───────────────────────────────────────────
router.get('/commissions/dashboard', async (req, res) => {
  try {
    const userId = uid(req)
    const year = Number(req.query.year || new Date().getFullYear())

    // Décomposition par produit (depuis quote_data)
    const { rows: byProduct } = await pool.query(`
      SELECT
        COALESCE(q.quote_data->>'produit', 'Auto') AS product,
        COUNT(*) AS count,
        SUM(COALESCE((q.quote_data->>'prime_annuelle')::numeric, 600) * 0.12) AS commission_eur
      FROM quotes q
      JOIN clients c ON c.id = q.client_id
      WHERE c.courtier_id = $1 AND EXTRACT(YEAR FROM q.created_at) = $2
      GROUP BY product
      ORDER BY commission_eur DESC
    `, [userId, year]).catch(() => ({ rows: [] }))

    // Décomposition par compagnie
    const { rows: byCompany } = await pool.query(`
      SELECT
        COALESCE(q.quote_data->>'compagnie', 'Aurora') AS provider,
        COUNT(*) AS count,
        SUM(COALESCE((q.quote_data->>'prime_annuelle')::numeric, 600) * 0.12) AS commission_eur
      FROM quotes q
      JOIN clients c ON c.id = q.client_id
      WHERE c.courtier_id = $1 AND EXTRACT(YEAR FROM q.created_at) = $2
      GROUP BY provider
      ORDER BY commission_eur DESC
    `, [userId, year]).catch(() => ({ rows: [] }))

    // Décomposition par mois
    const { rows: byMonth } = await pool.query(`
      SELECT
        TO_CHAR(q.created_at, 'YYYY-MM') AS month,
        COUNT(*) AS count,
        SUM(COALESCE((q.quote_data->>'prime_annuelle')::numeric, 600) * 0.12) AS commission_eur
      FROM quotes q
      JOIN clients c ON c.id = q.client_id
      WHERE c.courtier_id = $1 AND EXTRACT(YEAR FROM q.created_at) = $2
      GROUP BY month
      ORDER BY month ASC
    `, [userId, year]).catch(() => ({ rows: [] }))

    const total = byProduct.reduce((s, r) => s + Number(r.commission_eur || 0), 0)

    res.json({
      ok: true, year,
      total_eur: Math.round(total),
      by_product: byProduct.map(r => ({ ...r, commission_eur: Math.round(Number(r.commission_eur || 0)) })),
      by_company: byCompany.map(r => ({ ...r, commission_eur: Math.round(Number(r.commission_eur || 0)) })),
      by_month: byMonth.map(r => ({ ...r, commission_eur: Math.round(Number(r.commission_eur || 0)) })),
    })
  } catch (err) {
    res.status(500).json({ error: 'commissions_failed', message: err.message })
  }
})

// ─── Ranking équipe ──────────────────────────────────────────────────
router.get('/objectifs/ranking', async (req, res) => {
  try {
    const userId = uid(req)
    // Identifier le cabinet du courtier courant
    const { rows: meRows } = await pool.query(`SELECT id, cabinet_id FROM users WHERE id = $1`, [userId]).catch(() => ({ rows: [] }))
    const cabinetId = meRows[0]?.cabinet_id

    let teamQuery = `
      SELECT u.id, u.email, u.first_name, u.last_name,
        (SELECT COUNT(*) FROM clients WHERE courtier_id = u.id) AS clients_count,
        (SELECT COUNT(*) FROM quotes q JOIN clients c ON c.id = q.client_id WHERE c.courtier_id = u.id) AS quotes_count,
        (SELECT COALESCE(SUM(lifetime_value),0)*100 FROM clients WHERE courtier_id = u.id) AS ca_cents
      FROM users u
    `
    const params = []
    if (cabinetId) { teamQuery += ` WHERE u.cabinet_id = $1`; params.push(cabinetId) }
    teamQuery += ` ORDER BY ca_cents DESC LIMIT 20`

    const { rows: team } = await pool.query(teamQuery, params).catch(() => ({ rows: [] }))

    // Badges (gamification_badges si remplie)
    const { rows: badges } = await pool.query(`
      SELECT user_id, badge_key, label, awarded_at FROM gamification_badges
      WHERE user_id = ANY($1::int[])
      ORDER BY awarded_at DESC
    `, [team.map(t => t.id)]).catch(() => ({ rows: [] }))

    const ranking = team.map((m, idx) => ({
      rank: idx + 1,
      user_id: m.id,
      name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email,
      email: m.email,
      clients_count: Number(m.clients_count || 0),
      quotes_count: Number(m.quotes_count || 0),
      ca_cents: Number(m.ca_cents || 0),
      badges: badges.filter(b => b.user_id === m.id).map(b => ({ key: b.badge_key, label: b.label })),
    }))

    res.json({ ok: true, ranking })
  } catch (err) {
    res.status(500).json({ error: 'ranking_failed', message: err.message })
  }
})

module.exports = router
