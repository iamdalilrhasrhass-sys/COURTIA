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

// CORRECTION 2026-09-19 : ce routeur est monte sur '/api' (server.js:435) et
// appliquait verifyToken a TOUT ce qui passe par ce prefixe. Consequence mesuree :
// toute requete /api/* non traitee plus haut renvoyait 401 « Token manquant » au
// lieu d'un 404 — c'est ainsi que GET /api/sales/leads (lecture des leads dans le
// produit) echouait en 401, et tout routeur public monte APRES cette ligne etait
// rendu inatteignable. La garde ne couvre plus que les routes qui appartiennent
// reellement a ce routeur.
const PREFIXES_PROTEGES = [/^\/objectifs(\/|$)/, /^\/commissions(\/|$)/]
router.use((req, res, next) =>
  PREFIXES_PROTEGES.some((motif) => motif.test(req.path)) ? verifyToken(req, res, next) : next()
)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

// ─── Objectifs ───────────────────────────────────────────────────────
router.get('/objectifs/current', async (req, res) => {
  try {
    const userId = uid(req)
    const year = new Date().getFullYear()

    const { rows } = await pool.query(`
      SELECT * FROM objectifs WHERE user_id = $1 AND year = $2
    `, [userId, year])

    // Aucun objectif enregistré ⇒ on n'en invente pas. Avant, une ligne
    // fictive (120 000 € de CA, 60 clients, 80 contrats, 36 000 € de
    // commissions) était servie comme les objectifs du cabinet : la barre de
    // progression comparait donc le réel à des cibles qui n'avaient jamais été
    // fixées. On renvoie des cibles nulles et `objectif_defini: false`.
    const obj = rows[0] || null
    const objectifDefini = Boolean(obj)
    const cible = (valeur) => (objectifDefini ? Number(valeur || 0) : null)
    const pourcentage = (actuel, cibleValeur) =>
      (cibleValeur && Number(cibleValeur) > 0 ? Math.round((Number(actuel || 0) / Number(cibleValeur)) * 100) : 0)

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
      objectif_defini: objectifDefini,
      ...(objectifDefini ? {} : {
        message: "Aucun objectif n'est enregistré pour cette année. Définissez vos cibles : rien n'est affiché par défaut.",
      }),
      progression: {
        ca: {
          current_cents: Number(p.ca_cents || 0),
          target_cents: cible(obj?.ca_target_cents),
          pct: pourcentage(p.ca_cents, obj?.ca_target_cents),
        },
        new_clients: {
          current: Number(p.new_clients || 0),
          target: objectifDefini ? Number(obj?.new_clients_target || 0) : null,
          pct: pourcentage(p.new_clients, obj?.new_clients_target),
        },
        new_contracts: {
          current: Number(p.new_contracts || 0),
          target: objectifDefini ? Number(obj?.new_contracts_target || 0) : null,
          pct: pourcentage(p.new_contracts, obj?.new_contracts_target),
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

    // Les KPI se calculent sur les commissions RÉELLEMENT enregistrées (table
    // `commissions`). Avant, chaque ligne valait prime × 12 % codé en dur, avec
    // une prime par défaut de 600 € inventée quand le contrat n'en avait pas :
    // l'écran affichait donc des commissions qui n'existaient nulle part.
    const montant = (alias) => `COALESCE(NULLIF(${alias}.received_amount_cents, 0), ${alias}.expected_amount_cents, 0)`

    const { rows: byProduct } = await pool.query(`
      SELECT
        COALESCE(NULLIF(q.quote_data->>'produit', ''), NULLIF(q.quote_data->>'type_contrat', ''), 'Non renseigné') AS product,
        COUNT(*) AS count,
        SUM(${montant('co')})::numeric / 100 AS commission_eur
      FROM commissions co
      LEFT JOIN quotes q ON q.id = co.contract_id
      WHERE co.user_id = $1 AND co.period_year = $2
      GROUP BY product
      ORDER BY commission_eur DESC
    `, [userId, year]).catch(() => ({ rows: [] }))

    const { rows: byCompany } = await pool.query(`
      SELECT
        COALESCE(NULLIF(co.insurer, ''), 'Non renseigné') AS provider,
        COUNT(*) AS count,
        SUM(${montant('co')})::numeric / 100 AS commission_eur
      FROM commissions co
      WHERE co.user_id = $1 AND co.period_year = $2
      GROUP BY provider
      ORDER BY commission_eur DESC
    `, [userId, year]).catch(() => ({ rows: [] }))

    const { rows: byMonth } = await pool.query(`
      SELECT
        TO_CHAR(MAKE_DATE(co.period_year, co.period_month, 1), 'YYYY-MM') AS month,
        COUNT(*) AS count,
        SUM(${montant('co')})::numeric / 100 AS commission_eur
      FROM commissions co
      WHERE co.user_id = $1 AND co.period_year = $2
      GROUP BY month
      ORDER BY month ASC
    `, [userId, year]).catch(() => ({ rows: [] }))

    const total = byProduct.reduce((s, r) => s + Number(r.commission_eur || 0), 0)
    const nbLignes = byProduct.reduce((s, r) => s + Number(r.count || 0), 0)

    res.json({
      ok: true, year,
      source: 'commissions',
      has_data: nbLignes > 0,
      ...(nbLignes === 0
        ? { message: 'Aucune commission enregistrée pour cette année : rien à afficher.' }
        : {}),
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
