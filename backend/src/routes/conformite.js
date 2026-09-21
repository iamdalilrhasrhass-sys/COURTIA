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
const { messagePublic } = require('../lib/erreursPubliques')
const porteeCabinet = require('../lib/porteeCabinet')

router.use(verifyToken)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE = CABINET (et non « mes lignes de conformité »)
//
// POURQUOI : la conformité (DDA, KYC, mandats) est un dossier DU CABINET,
// adossé à un client du cabinet. Tant que ces tables étaient lues et écrites sur
// `user_id = moi`, un collaborateur voyait une conformité VIDE — 0 checklist,
// 0 KYC, 0 mandat — alors que `total_clients` annonçait le portefeuille complet :
// le taux de couverture affiché (dda.conforme / clients) était donc faux.
//
// COMMENT : ni `dda_checklists`, ni `kyc_records`, ni `mandats` ne portent de
// colonne `cabinet_id` (vérifié dans `information_schema` / migrations). Le
// cabinet d'une de ces lignes est celui de son propriétaire (`user_id`), résolu
// dans `cabinet_members` — la règle de rattachement de la migration 113. La
// DÉCISION de portée reste dans `lib/porteeCabinet` (seule autorité) ; seule la
// colonne « cabinet » du fragment change de forme, faute de colonne dédiée.
// Sans cabinet, le fragment retombe sur `colonne = $n` : comportement
// historique strictement inchangé pour les cabinets mono-utilisateur.
// ─────────────────────────────────────────────────────────────────────────────

/** Fragment de portée pour une table métier sans `cabinet_id` (propriétaire = `user_id`). */
function filtreProprietaire(portee, { alias, colonne = 'user_id', depart = 1, ecriture = false } = {}) {
  const proprietaire = `${alias}.${colonne}`
  return porteeCabinet.fragment(portee, {
    cabinet: `(SELECT cm.cabinet_id FROM cabinet_members cm
                WHERE cm.user_id = ${proprietaire}
                  AND cm.removed_at IS NULL
                  AND cm.cabinet_id = ANY($${depart}::uuid[])
                LIMIT 1)`,
    proprietaire,
    depart,
    ecriture,
  })
}

/** Fragment de portée sur `clients` (ancre du tenant : `clients.cabinet_id`). */
function filtreClients(portee, { alias = 'c', depart = 1, ecriture = false } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.courtier_id`,
    depart,
    ecriture,
  })
}

/**
 * Libellés de conformité du CABINET de l'appelant : FINMA pour un cabinet
 * suisse, ACPR pour un cabinet français. Le marché est résolu par la règle
 * unique du produit (`lib/marcheCabinet`, via `referentielConformite`) : tous
 * les membres d'un même cabinet voient le même vocabulaire, et une donnée
 * manquante fait retomber sur la France — jamais sur un référentiel étranger.
 *
 * CE BLOC EST AUSSI LA SOURCE DU RÉFÉRENTIEL PRODUITS ET DES MENTIONS DE
 * PROTECTION DES DONNÉES (constat d'audit CH-039 / CH-026). Il porte :
 *   • `produits`           — familles de produits du marché (LAMal, LCA, LAA,
 *                            LPP, 3e pilier… en Suisse ; IARD, santé, auto… en
 *                            France), servies par `services/referentielProduits` ;
 *   • `protection_donnees` — nLPD / PFPDT en Suisse, RGPD / CNIL en France, avec
 *                            les éléments à documenter par le cabinet.
 * POURQUOI ICI ET PAS UNE ROUTE DE PLUS : `/conformite/dashboard` EST déjà la
 * route de lecture du référentiel de conformité de l'écran `/conformite`. Une
 * seconde route servirait la même table par un autre chemin et finirait par
 * diverger. Un consommateur qui a besoin de ce référentiel lit ce bloc.
 */
async function libellesDuCabinet(req) {
  return referentielConformite.libellesDeLaRequete(req, { pool })
}

router.get('/dashboard', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)

    // Portée CABINET sur les trois registres de conformité (tables sans
    // `cabinet_id` : cabinet du propriétaire, cf. helper ci-dessus).
    const fDda = filtreProprietaire(portee, { alias: 'd' })
    const fKyc = filtreProprietaire(portee, { alias: 'k' })
    const fMand = filtreProprietaire(portee, { alias: 'm' })

    const [{ rows: ddaStats }, { rows: kycStats }, { rows: mandatStats }] = await Promise.all([
      pool.query(`
        SELECT d.status, COUNT(*)::int AS count FROM dda_checklists d
        WHERE ${fDda.sql} GROUP BY d.status
      `, [...fDda.params]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT k.status, COUNT(*)::int AS count FROM kyc_records k
        WHERE ${fKyc.sql} GROUP BY k.status
      `, [...fKyc.params]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT m.status, COUNT(*)::int AS count FROM mandats m
        WHERE ${fMand.sql} GROUP BY m.status
      `, [...fMand.params]).catch(() => ({ rows: [] })),
    ])

    // Le portefeuille compté est celui du CABINET : sans cela, le taux de
    // couverture DDA/KYC était calculé sur le dénominateur d'un autre périmètre
    // que le numérateur (conformité du collaborateur ÷ clients du cabinet).
    const fClients = filtreClients(portee, { alias: 'c' })
    const { rows: clientsTotal } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM clients c WHERE ${fClients.sql}`, [...fClients.params]
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
    res.status(500).json({ error: 'dashboard_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

/**
 * Le client visé appartient-il au périmètre de l'appelant ?
 * POURQUOI (Red Team RT4-13, mesuré en production le 21/09/2026) :
 * `GET /api/conformite/dda/checklist/183` répondait 200 avec une checklist vide
 * alors que 183 était le client d'un AUTRE cabinet. Aucune donnée n'était
 * servie, mais la convention du produit (« on ne confirme jamais l'existence
 * d'une ressource d'un autre cabinet ») était rompue — un identifiant suffisait
 * à apprendre qu'il existe. Toute lecture de conformité KYC/DDA répond
 * désormais 404 pour un client hors périmètre.
 */
async function clientDuCabinet(pool, portee, clientId, { ecriture = false } = {}) {
  if (!Number.isFinite(clientId) || clientId <= 0) return false
  const f = filtreClients(portee, { alias: 'c', ecriture })
  const { rows } = await pool.query(
    `SELECT 1 FROM clients c WHERE c.id = $${f.suivant} AND ${f.sql}`,
    [...f.params, clientId]
  )
  return rows.length > 0
}

router.get('/dda/checklist/:client_id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const clientId = Number(req.params.client_id)
    if (!(await clientDuCabinet(pool, portee, clientId))) {
      return res.status(404).json({ error: 'client_not_found', message: 'Client introuvable dans votre cabinet' })
    }
    const f = filtreProprietaire(portee, { alias: 'd' })
    const { rows } = await pool.query(`
      SELECT d.* FROM dda_checklists d WHERE ${f.sql} AND d.client_id = $${f.suivant}
    `, [...f.params, clientId])
    // Le titre de la checklist suit le marché : « Checklist DDA (Directive
    // Distribution Assurance) » est un intitulé FRANÇAIS (transposition d'une
    // directive européenne) qui n'a pas à être affiché à un cabinet suisse, qui
    // reçoit « Checklist de conformité du cabinet » (libellé descriptif, sans
    // citer de directive ni d'autorité étrangère).
    const libelles = await libellesDuCabinet(req)
    res.json({
      ok: true,
      marche: libelles.marche,
      checklist_titre: libelles.checklist_titre,
      checklist: rows[0] || {
        besoin_exprime: false, devoir_conseil: false, document_remis: false,
        informations_marche: false, fiche_synthese: false, status: 'pending',
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

router.post('/dda/checklist/:client_id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'mettre à jour la checklist de conformité')) return
    const userId = uid(req)
    const clientId = Number(req.params.client_id)

    // Le client visé doit appartenir au CABINET (l'ancre du tenant).
    const fClient = filtreClients(portee, { alias: 'c', ecriture: true })
    const control = await pool.query(
      `SELECT c.id FROM clients c WHERE c.id = $${fClient.suivant} AND ${fClient.sql}`,
      [...fClient.params, clientId]
    )
    if (control.rows.length === 0) {
      return res.status(404).json({ error: 'client_not_found', message: 'Client introuvable dans votre cabinet' })
    }
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
    res.status(500).json({ error: 'update_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

router.get('/kyc/:client_id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const clientId = Number(req.params.client_id)
    if (!(await clientDuCabinet(pool, portee, clientId))) {
      return res.status(404).json({ error: 'client_not_found', message: 'Client introuvable dans votre cabinet' })
    }
    const f = filtreProprietaire(portee, { alias: 'k' })
    const { rows } = await pool.query(`
      SELECT k.* FROM kyc_records k WHERE ${f.sql} AND k.client_id = $${f.suivant}
    `, [...f.params, clientId])
    res.json({ ok: true, kyc: rows[0] || null })
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

router.post('/kyc/verify', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'enregistrer une vérification KYC')) return
    const userId = uid(req)
    const { client_id, identity_document_type, identity_document_number, identity_verified, address_verified, pep, sanction_check, document_path } = req.body || {}
    if (!client_id) return res.status(400).json({ error: 'missing_client_id' })

    // Le client visé doit appartenir au CABINET (l'ancre du tenant).
    const fClient = filtreClients(portee, { alias: 'c', ecriture: true })
    const control = await pool.query(
      `SELECT c.id FROM clients c WHERE c.id = $${fClient.suivant} AND ${fClient.sql}`,
      [...fClient.params, client_id]
    )
    if (control.rows.length === 0) {
      return res.status(404).json({ error: 'client_not_found', message: 'Client introuvable dans votre cabinet' })
    }
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
    res.status(500).json({ error: 'verify_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

router.get('/mandats', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const f = filtreProprietaire(portee, { alias: 'm' })
    const { rows } = await pool.query(`
      SELECT m.*, c.first_name, c.last_name FROM mandats m
      LEFT JOIN clients c ON c.id = m.client_id
      WHERE ${f.sql}
      ORDER BY m.created_at DESC LIMIT 200
    `, [...f.params])
    res.json({ ok: true, mandats: rows })
  } catch (err) {
    res.status(500).json({ error: 'list_failed', message: messagePublic(err, { statut: 500 }) })
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
    res.status(500).json({ error: 'audit_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

/**
 * Export du registre de conformité, dans le vocabulaire du marché du cabinet.
 * Exposé sous deux chemins : `/export-acpr` (chemin historique, réservé aux
 * cabinets FRANÇAIS) et `/export-registre` (nom neutre, seul chemin servi à un
 * cabinet suisse).
 *
 * CORRECTION 20/09/2026 (résidus français servis à un cabinet suisse)
 *   • un cabinet SUISSE appelant `/conformite/export-acpr` recevait un document
 *     intitulé d'après une autorité française : la réponse est maintenant 404
 *     `not_found` (cette procédure n'existe pas pour lui) avec le chemin du
 *     registre de conformité. Aucun faux succès, aucune autorité étrangère ;
 *   • le corps ne porte plus `orias_id` ni `ca_total_eur` pour un cabinet suisse
 *     (un ORIAS et un montant « eur » n'ont pas de sens chez lui) : le montant
 *     est neutre (`ca_total`) et la devise est explicite (`devise`).
 */
router.get(['/export-acpr', '/export-registre'], async (req, res) => {
  try {
    const userId = uid(req)
    const porteeExport = await porteeCabinet.resoudrePortee(pool, req)
    const year = Number(req.query.year || new Date().getFullYear())
    const libelles = await libellesDuCabinet(req)
    const suisse = libelles.marche === 'CH'

    // Une procédure française ne doit pas être servie à un cabinet suisse :
    // le chemin qui la nomme n'existe pas pour lui (404, jamais un 200 trompeur).
    if (suisse && req.path.endsWith('/export-acpr')) {
      return res.status(404).json({
        ok: false,
        error: 'not_found',
        marche: 'CH',
        message: "Cet export nommé d'après une autorité française n'existe pas pour ce cabinet. Utilisez l'export du registre de conformité.",
        route: '/conformite/export-registre',
      })
    }

    const { rows: meRows } = await pool.query(`SELECT id, email, orias_id, raison_sociale FROM users WHERE id = $1`, [userId]).catch(() => ({ rows: [] }))
    const me = meRows[0] || { email: 'n/a' }

    // Le registre exporté est celui du CABINET (cf. §PORTÉE en tête de fichier) :
    // un collaborateur exportait sinon un registre à zéro, en contradiction avec
    // l'écran de conformité qui lui montre celui du cabinet.
    const fDda = filtreProprietaire(porteeExport, { alias: 'd' })
    const { rows: ddaConforme } = await pool.query(`
      SELECT COUNT(*)::int AS count FROM dda_checklists d
       WHERE ${fDda.sql} AND d.status = 'conforme'
    `, [...fDda.params]).catch(() => ({ rows: [{ count: 0 }] }))

    const fClients = filtreClients(porteeExport, { alias: 'c' })
    const { rows: clientsTotal } = await pool.query(`
      SELECT COUNT(*)::int AS count FROM clients c WHERE ${fClients.sql}
    `, [...fClients.params]).catch(() => ({ rows: [{ count: 0 }] }))

    const { rows: contractsTotal } = await pool.query(`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(c.lifetime_value),0)::numeric AS ca FROM clients c WHERE ${fClients.sql}
    `, [...fClients.params]).catch(() => ({ rows: [{ count: 0, ca: 0 }] }))

    return res.json({
      ok: true,
      marche: libelles.marche,
      devise: libelles.marche === 'CH' ? 'CHF' : 'EUR',
      rapport: {
        generated_at: new Date().toISOString(),
        year,
        // Titre du document tel qu'il sera nommé pour ce cabinet : « Export
        // ACPR » en France, « Export du registre de conformité » en Suisse.
        libelle: libelles.export.libelle,
        autorite: libelles.autorite,
        // Un cabinet suisse n'a PAS d'ORIAS : le champ reste absent plutôt que
        // de faire apparaître un identifiant français sur son registre.
        courtier: suisse
          ? { email: me.email, raison_sociale: me.raison_sociale || null }
          : { email: me.email, orias_id: me.orias_id || null, raison_sociale: me.raison_sociale || null },
        clients_total: clientsTotal[0].count,
        contracts_total: contractsTotal[0].count,
        // Montant NEUTRE + devise : le nom « _eur » ne doit pas être servi à un
        // cabinet dont la monnaie n'est pas l'euro.
        ca_total: Math.round(Number(contractsTotal[0].ca || 0)),
        ...(suisse ? {} : { ca_total_eur: Math.round(Number(contractsTotal[0].ca || 0)) }),
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
    res.status(500).json({ error: 'export_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

module.exports = router
