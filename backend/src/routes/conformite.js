/**
 * LOT F6 — Conformité courtage (DDA, KYC, mandats, audit logs)
 * Endpoints :
 *   GET    /api/conformite/dashboard                → vue d'ensemble conformité
 *   GET    /api/conformite/dda/checklist/:client_id → checklist DDA d'un client
 *   POST   /api/conformite/dda/checklist/:client_id → maj checklist DDA
 *   GET    /api/conformite/kyc/:client_id           → fiche KYC client
 *   POST   /api/conformite/kyc/verify               → soumission vérification KYC
 *   GET    /api/conformite/mandats                  → liste mandats actifs
 *   GET    /api/conformite/audit-logs               → logs audit (lecture)
 *   GET    /api/conformite/export-acpr              → rapport annuel ACPR (JSON)
 */
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')
const pool = require('../db')

router.use(verifyToken)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

router.get('/dashboard', async (req, res) => {
  try {
    const userId = uid(req)

    const [{ rows: ddaStats }, { rows: kycStats }, { rows: mandatStats }] = await Promise.all([
      pool.query(`
        SELECT status, COUNT(*)::int AS count FROM dda_checklists
        WHERE user_id = $1 GROUP BY status
      `, [userId]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT status, COUNT(*)::int AS count FROM kyc_records
        WHERE user_id = $1 GROUP BY status
      `, [userId]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT status, COUNT(*)::int AS count FROM mandats
        WHERE user_id = $1 GROUP BY status
      `, [userId]).catch(() => ({ rows: [] })),
    ])

    const { rows: clientsTotal } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM clients WHERE courtier_id = $1`, [userId]
    ).catch(() => ({ rows: [{ total: 0 }] }))

    const dda = { conforme: 0, pending: 0, incomplete: 0 }
    ddaStats.forEach(s => { dda[s.status] = s.count })
    const kyc = { verified: 0, pending: 0, rejected: 0 }
    kycStats.forEach(s => { kyc[s.status] = s.count })
    const mandats = { active: 0, expired: 0, revoked: 0 }
    mandatStats.forEach(s => { mandats[s.status] = s.count })

    const totalClients = clientsTotal[0].total
    const ddaCoverage = totalClients ? Math.round(((dda.conforme || 0) / totalClients) * 100) : 0
    const kycCoverage = totalClients ? Math.round(((kyc.verified || 0) / totalClients) * 100) : 0

    res.json({
      ok: true,
      total_clients: totalClients,
      dda: { ...dda, coverage_pct: ddaCoverage },
      kyc: { ...kyc, coverage_pct: kycCoverage },
      mandats,
    })
  } catch (err) {
    res.status(500).json({ error: 'dashboard_failed', message: err.message })
  }
})

router.get('/dda/checklist/:client_id', async (req, res) => {
  try {
    const userId = uid(req)
    const clientId = Number(req.params.client_id)
    const { rows } = await pool.query(`
      SELECT * FROM dda_checklists WHERE user_id = $1 AND client_id = $2
    `, [userId, clientId])
    res.json({ ok: true, checklist: rows[0] || {
      besoin_exprime: false, devoir_conseil: false, document_remis: false,
      informations_marche: false, fiche_synthese: false, status: 'pending',
    } })
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: err.message })
  }
})

router.post('/dda/checklist/:client_id', async (req, res) => {
  try {
    const userId = uid(req)
    const clientId = Number(req.params.client_id)
    const { besoin_exprime, devoir_conseil, document_remis, informations_marche, fiche_synthese, notes } = req.body || {}

    const allOk = besoin_exprime && devoir_conseil && document_remis && informations_marche && fiche_synthese
    const status = allOk ? 'conforme' : (besoin_exprime || devoir_conseil) ? 'incomplete' : 'pending'

    const { rows } = await pool.query(`
      INSERT INTO dda_checklists (user_id, client_id, besoin_exprime, devoir_conseil, document_remis, informations_marche, fiche_synthese, notes, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (user_id, client_id) DO UPDATE
      SET besoin_exprime = EXCLUDED.besoin_exprime,
          devoir_conseil = EXCLUDED.devoir_conseil,
          document_remis = EXCLUDED.document_remis,
          informations_marche = EXCLUDED.informations_marche,
          fiche_synthese = EXCLUDED.fiche_synthese,
          notes = EXCLUDED.notes,
          status = EXCLUDED.status,
          updated_at = NOW()
      RETURNING *
    `, [userId, clientId, !!besoin_exprime, !!devoir_conseil, !!document_remis, !!informations_marche, !!fiche_synthese, notes || ''])
    res.json({ ok: true, checklist: rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'update_failed', message: err.message })
  }
})

router.get('/kyc/:client_id', async (req, res) => {
  try {
    const userId = uid(req)
    const clientId = Number(req.params.client_id)
    const { rows } = await pool.query(`
      SELECT * FROM kyc_records WHERE user_id = $1 AND client_id = $2
    `, [userId, clientId])
    res.json({ ok: true, kyc: rows[0] || null })
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: err.message })
  }
})

router.post('/kyc/verify', async (req, res) => {
  try {
    const userId = uid(req)
    const { client_id, identity_document_type, identity_document_number, identity_verified, address_verified, pep, sanction_check, document_path } = req.body || {}
    if (!client_id) return res.status(400).json({ error: 'missing_client_id' })
    const status = identity_verified && address_verified ? 'verified' : 'pending'
    const { rows } = await pool.query(`
      INSERT INTO kyc_records (user_id, client_id, identity_document_type, identity_document_number, identity_verified, address_verified, pep, sanction_check, document_path, status, verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $10 = 'verified' THEN NOW() END)
      ON CONFLICT (user_id, client_id) DO UPDATE
      SET identity_document_type = EXCLUDED.identity_document_type,
          identity_document_number = EXCLUDED.identity_document_number,
          identity_verified = EXCLUDED.identity_verified,
          address_verified = EXCLUDED.address_verified,
          pep = EXCLUDED.pep,
          sanction_check = EXCLUDED.sanction_check,
          document_path = COALESCE(EXCLUDED.document_path, kyc_records.document_path),
          status = EXCLUDED.status,
          verified_at = CASE WHEN EXCLUDED.status = 'verified' THEN NOW() ELSE kyc_records.verified_at END
      RETURNING *
    `, [userId, client_id, identity_document_type, identity_document_number, !!identity_verified, !!address_verified, !!pep, !!sanction_check, document_path || null, status])
    res.json({ ok: true, kyc: rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'verify_failed', message: err.message })
  }
})

router.get('/mandats', async (req, res) => {
  try {
    const userId = uid(req)
    const { rows } = await pool.query(`
      SELECT m.*, c.first_name, c.last_name FROM mandats m
      JOIN clients c ON c.id = m.client_id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC LIMIT 200
    `, [userId])
    res.json({ ok: true, mandats: rows })
  } catch (err) {
    res.status(500).json({ error: 'list_failed', message: err.message })
  }
})

router.get('/audit-logs', async (req, res) => {
  try {
    const userId = uid(req)
    const { rows } = await pool.query(`
      SELECT * FROM audit_logs
      WHERE actor_id = $1 OR target_user_id = $1
      ORDER BY created_at DESC LIMIT 200
    `, [userId]).catch(() => ({ rows: [] }))
    res.json({ ok: true, logs: rows })
  } catch (err) {
    res.status(500).json({ error: 'audit_failed', message: err.message })
  }
})

router.get('/export-acpr', async (req, res) => {
  try {
    const userId = uid(req)
    const year = Number(req.query.year || new Date().getFullYear())

    const { rows: meRows } = await pool.query(`SELECT id, email, orias_id, raison_sociale FROM users WHERE id = $1`, [userId]).catch(() => ({ rows: [] }))
    const me = meRows[0] || { email: 'n/a' }

    const { rows: ddaConforme } = await pool.query(`
      SELECT COUNT(*)::int AS count FROM dda_checklists WHERE user_id = $1 AND status = 'conforme'
    `, [userId]).catch(() => ({ rows: [{ count: 0 }] }))

    const { rows: clientsTotal } = await pool.query(`
      SELECT COUNT(*)::int AS count FROM clients WHERE courtier_id = $1
    `, [userId]).catch(() => ({ rows: [{ count: 0 }] }))

    const { rows: contractsTotal } = await pool.query(`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(lifetime_value),0)::numeric AS ca FROM clients WHERE courtier_id = $1
    `, [userId]).catch(() => ({ rows: [{ count: 0, ca: 0 }] }))

    res.json({
      ok: true,
      rapport: {
        generated_at: new Date().toISOString(),
        year,
        courtier: { email: me.email, orias_id: me.orias_id || null, raison_sociale: me.raison_sociale || null },
        clients_total: clientsTotal[0].count,
        contracts_total: contractsTotal[0].count,
        ca_total_eur: Math.round(Number(contractsTotal[0].ca || 0)),
        dda: {
          conforme_count: ddaConforme[0].count,
          coverage_pct: clientsTotal[0].count ? Math.round((ddaConforme[0].count / clientsTotal[0].count) * 100) : 0,
        },
        sources: { acpr: 'https://acpr.banque-france.fr', orias: 'https://www.orias.fr' },
        legal: 'Document généré pour exigences ACPR / DDA — usage interne courtier.',
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'export_failed', message: err.message })
  }
})

module.exports = router
