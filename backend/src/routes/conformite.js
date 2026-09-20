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
 *   GET    /api/conformite/export-acpr              → registre de conformité (JSON)
 *   GET    /api/conformite/export-registre          → même export, nom du marché
 *
 * VOCABULAIRE RÉGLEMENTAIRE = PAYS DU CABINET (Red Team P2 #6, 20/09/2026)
 * L'écran d'un cabinet SUISSE affichait « Export ACPR » dans son chapeau et sur
 * son bouton principal. L'ACPR n'a aucune compétence en Suisse : l'écran
 * annonçait une obligation française inexistante. Les libellés viennent
 * désormais de `services/referentielConformite` (FINMA pour la Suisse, ACPR
 * pour la France) et sont servis par l'API, pour qu'un seul endroit les décide.
 *
 * CE N'EST PAS UNE TRADUCTION : la route et le contenu changent de marché.
 * Un cabinet suisse n'obtient ni les sources ACPR/ORIAS, ni la mention « pour
 * exigences ACPR / DDA ». Aucune obligation suisse n'est inventée pour autant :
 * l'export reste le registre de conformité du cabinet, nommé comme tel.
 */
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')
const pool = require('../db')
const referentielConformite = require('../services/referentielConformite')

router.use(verifyToken)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

/**
 * Libellés de conformité du CABINET de l'appelant : FINMA pour un cabinet
 * suisse, ACPR pour un cabinet français. Le marché est résolu par la règle
 * unique du produit (`lib/marcheCabinet`, via `referentielConformite`) : tous
 * les membres d'un même cabinet voient le même vocabulaire, et une donnée
 * manquante fait retomber sur la France — jamais sur un référentiel étranger.
 */
async function libellesDuCabinet(req) {
  return referentielConformite.libellesDeLaRequete(req, { pool })
}

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

    // Le bloc `conformite` porte le vocabulaire du PAYS du cabinet : chapeau de
    // page, autorité de tutelle, registre et libellé/route de l'export. L'écran
    // s'en sert au lieu d'écrire « ACPR » en dur (un cabinet suisse affichait
    // une autorité française sans compétence chez lui).
    const conformite = await libellesDuCabinet(req)

    res.json({
      ok: true,
      total_clients: totalClients,
      dda: { ...dda, coverage_pct: ddaCoverage },
      kyc: { ...kyc, coverage_pct: kycCoverage },
      mandats,
      conformite,
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

    // 9 marqueurs ($1..$9) → 9 valeurs : `status` manquait dans le tableau de
    // valeurs, PostgreSQL refusait chaque insertion (« bind message supplies 8
    // parameters, but prepared statement requires 9 ») : la checklist DDA
    // répondait 500 à chaque appel.
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
    `, [userId, clientId, !!besoin_exprime, !!devoir_conseil, !!document_remis, !!informations_marche, !!fiche_synthese, notes || '', status])
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

/**
 * Export du registre de conformité, dans le vocabulaire du marché du cabinet.
 * Exposé sous deux chemins : `/export-acpr` (chemin historique, conservé pour
 * les intégrations françaises existantes) et `/export-registre` (nom neutre
 * utilisé par les cabinets suisses).
 */
router.get(['/export-acpr', '/export-registre'], async (req, res) => {
  try {
    const userId = uid(req)
    const year = Number(req.query.year || new Date().getFullYear())
    const libelles = await libellesDuCabinet(req)

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
      marche: libelles.marche,
      rapport: {
        generated_at: new Date().toISOString(),
        year,
        // Titre du document tel qu'il sera nommé pour ce cabinet : « Export
        // ACPR » en France, « Export du registre de conformité » en Suisse.
        libelle: libelles.export.libelle,
        autorite: libelles.autorite,
        courtier: { email: me.email, orias_id: me.orias_id || null, raison_sociale: me.raison_sociale || null },
        clients_total: clientsTotal[0].count,
        contracts_total: contractsTotal[0].count,
        ca_total_eur: Math.round(Number(contractsTotal[0].ca || 0)),
        dda: {
          conforme_count: ddaConforme[0].count,
          coverage_pct: clientsTotal[0].count ? Math.round((ddaConforme[0].count / clientsTotal[0].count) * 100) : 0,
        },
        // Sources et mention légale du MARCHÉ : un cabinet suisse n'obtient ni
        // l'ACPR ni l'ORIAS, dont il ne dépend pas.
        sources: libelles.export.sources,
        legal: libelles.export.legal,
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'export_failed', message: err.message })
  }
})

module.exports = router
