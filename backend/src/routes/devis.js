/**
 * Module Devis — LOT 6
 * Gestion des devis (quote_requests) avec intelligence artificielle ARK
 * 
 * Routes:
 * - GET    /api/devis                        Liste des devis du courtier
 * - GET    /api/devis/:id                    Détails d'un devis + résultats
 * - POST   /api/devis                        Créer un nouveau devis
 * - PUT    /api/devis/:id                    Modifier un devis
 * - DELETE /api/devis/:id                    Supprimer un devis
 * - POST   /api/devis/:id/ai-prepare         ARK prépare checklist + questions
 * - POST   /api/devis/:id/ai-recommendation  ARK compare et recommande
 * - POST   /api/devis/:id/generate-proposal  ARK génère proposition client
 */

const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const pool = require('../db')
const { callArkStructured } = require('../services/arkEngine')
const logger = require('../lib/logger')
const { buildDevisPdf, buildPdfPath, shortId } = require('../services/devisPdfService')
const {
  scheduleRelancesForDevis,
  cancelPendingRelancesForDevis,
} = require('../services/devisRelanceService')
const { sendCommercialEmail } = require('../services/emailService')
const {
  SOURCES_REELLES,
  MESSAGE_OFFRES_SIMULEES,
  validerOffresPourClient,
} = require('../lib/donneesReelles')
const porteeCabinet = require('../lib/porteeCabinet')

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE DES DEVIS : LE CABINET
//
// POURQUOI : `quote_requests.broker_id` / `devis_wizard.user_id` étaient
// comparés à l'utilisateur connecté. Un collaborateur du cabinet voyait donc
// 0 devis, et surtout ne pouvait ni ouvrir ni relancer le dossier d'un
// collègue — alors qu'il répond au téléphone pour lui. La portée passe par
// `cabinet_id` (migration 113) ; `broker_id` / `user_id` restent le CRÉATEUR
// du devis (affectation commerciale). Un utilisateur sans cabinet garde
// exactement son ancien périmètre.
// ─────────────────────────────────────────────────────────────────────────────

/** Portée SQL des devis v1 (`quote_requests`, propriétaire = broker_id). */
function filtreDevis(portee, { depart = 1, ecriture = false, alias = 'qr' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.broker_id`,
    depart,
    ecriture,
  })
}

/** Portée SQL des devis guidés (`devis_wizard`, propriétaire = user_id). */
function filtreWizard(portee, { depart = 1, ecriture = false, alias = 'd' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.user_id`,
    depart,
    ecriture,
  })
}

/**
 * Coercition d'une valeur en paramètre jsonb VALIDE.
 *
 * POURQUOI : `POST /api/devis` (route v1) passait `criteria` tel quel à la
 * colonne `quote_requests.normalized_data` (jsonb). Un appelant qui envoie du
 * texte libre (« Paris ») ou une liste de compagnies en chaîne
 * (« AXA,Allianz ») recevait 500 `invalid input syntax for type json` : le
 * diagnostic parlait de SQL, pas de la donnée envoyée. On n'invente aucune
 * structure : un objet/tableau est sérialisé, une chaîne qui EST du JSON est
 * conservée telle quelle, une chaîne qui n'en est pas devient une chaîne JSON
 * (la valeur saisie reste intacte).
 */
function versParametreJsonb(valeur, defaut) {
  if (valeur === undefined || valeur === null) return JSON.stringify(defaut)
  if (typeof valeur === 'string') {
    const texte = valeur.trim()
    if (!texte) return JSON.stringify(defaut)
    try { JSON.parse(texte); return texte } catch (_) { return JSON.stringify(texte) }
  }
  try { return JSON.stringify(valeur) } catch (_) { return JSON.stringify(defaut) }
}

async function ensureWizardSchema() {
  try { await pool.query(`SELECT 1 FROM devis_wizard LIMIT 1`); return true }
  catch (_) { return false }
}

async function loadCabinetMeta(userId) {
  // Identité RÉELLE du cabinet. Avant ce correctif, cette fonction renvoyait
  // `orias: '12345678'` et `rcpro: '1234'` ÉCRITS EN DUR : ces faux numéros de
  // registre partaient ensuite dans les devis et documents remis au client
  // final — un cabinet suisse voyait donc imprimé sur sa proposition un numéro
  // ORIAS français inventé. On ne renvoie désormais que ce qui est réellement
  // renseigné dans le profil du cabinet (aucune valeur par défaut inventée).
  try {
    const { rows } = await pool.query(
      `SELECT u.email, u.first_name, u.last_name, u.phone,
              bp.cabinet, bp.registre_type, bp.registre_numero, bp.uid, bp.orias,
              bp.ville, bp.code_postal, bp.pays, bp.langue, bp.telephone
         FROM users u
         LEFT JOIN broker_profiles bp ON bp.user_id = u.id
        WHERE u.id = $1 LIMIT 1`, [userId]
    )
    const r = rows[0] || {}
    const name = r.cabinet
      || ((r.first_name || r.last_name) ? `Cabinet ${r.first_name || ''} ${r.last_name || ''}`.trim() : 'COURTIA')
    return {
      name,
      // Champs d'identification réglementaire : vides s'ils ne sont pas saisis.
      registreType: r.registre_type || null,
      registreNumero: r.registre_numero || null,
      uid: r.uid || null,
      orias: r.orias || null,
      ville: r.ville || null,
      codePostal: r.code_postal || null,
      pays: r.pays || null,
      devise: (r.pays || '').toUpperCase() === 'CH' ? 'CHF' : 'EUR',
      email: r.email || null,
      phone: r.telephone || r.phone || null,
    }
  } catch (_) {
    return { name: 'COURTIA', registreType: null, registreNumero: null, uid: null,
             orias: null, ville: null, codePostal: null, pays: null, devise: 'EUR' }
  }
}

async function loadClient(portee, clientId) {
  if (!clientId) return null
  try {
    // Repli SANS filtre de cabinet supprimé : il permettait à un cabinet de
    // lire l'identité (nom, société, e-mail, téléphone, adresse) du client d'un
    // AUTRE cabinet en passant son identifiant dans le corps de la requête.
    // La portée est désormais celle du CABINET de l'appelant.
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'clients.cabinet_id',
      proprietaire: 'clients.courtier_id',
      depart: 2,
    })
    const { rows } = await pool.query(
      `SELECT id, first_name, last_name, company_name, email, phone, address, city, postal_code
       FROM clients WHERE id = $1 AND ${f.sql} LIMIT 1`,
      [clientId, ...f.params]
    ).catch(() => ({ rows: [] }))
    return rows[0] || null
  } catch (_) {
    return null
  }
}

// =============================================================================
// SCHEMAS JSON pour les réponses ARK
// =============================================================================

const SCHEMA_PREPARE = {
  type: 'object',
  properties: {
    checklist_documents: {
      type: 'array',
      items: { type: 'object', properties: { document: { type: 'string' }, obligatoire: { type: 'boolean' }, raison: { type: 'string' } } }
    },
    questions_client: {
      type: 'array',
      items: { type: 'object', properties: { question: { type: 'string' }, importance: { type: 'string' }, contexte: { type: 'string' } } }
    },
    points_attention: { type: 'array', items: { type: 'string' } },
    estimation_delai_jours: { type: 'number' },
    conseil_approche: { type: 'string' }
  },
  required: ['checklist_documents', 'questions_client']
}

const SCHEMA_RECOMMENDATION = {
  type: 'object',
  properties: {
    recommandation_principale: {
      type: 'object',
      properties: {
        provider_code: { type: 'string' },
        provider_name: { type: 'string' },
        prime_annuelle: { type: 'number' },
        score_global: { type: 'number' },
        raisons: { type: 'array', items: { type: 'string' } }
      }
    },
    alternatives: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          provider_code: { type: 'string' },
          provider_name: { type: 'string' },
          prime_annuelle: { type: 'number' },
          avantage: { type: 'string' },
          inconvenient: { type: 'string' }
        }
      }
    },
    analyse_comparative: { type: 'string' },
    argumentaire_client: { type: 'string' },
    risques_non_couverts: { type: 'array', items: { type: 'string' } }
  },
  required: ['recommandation_principale', 'argumentaire_client']
}

const SCHEMA_PROPOSAL = {
  type: 'object',
  properties: {
    titre: { type: 'string' },
    introduction_personnalisee: { type: 'string' },
    resume_besoins: { type: 'string' },
    solution_proposee: {
      type: 'object',
      properties: {
        compagnie: { type: 'string' },
        produit: { type: 'string' },
        garanties_principales: { type: 'array', items: { type: 'string' } },
        prime_mensuelle: { type: 'number' },
        prime_annuelle: { type: 'number' }
      }
    },
    avantages_cles: { type: 'array', items: { type: 'string' } },
    prochaines_etapes: { type: 'array', items: { type: 'string' } },
    conclusion: { type: 'string' },
    validite_jours: { type: 'number' }
  },
  required: ['titre', 'solution_proposee', 'conclusion']
}

// =============================================================================
// GET /api/devis — Liste des devis
// =============================================================================

router.get('/', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const { status, client_id, product_type, limit = 50, offset = 0 } = req.query

    const f = filtreDevis(portee, { depart: 1 })
    let sql = `
      SELECT 
        qr.id, qr.client_id, qr.product_type, qr.normalized_data,
        qr.target_providers, qr.status, qr.created_at, qr.submitted_at,
        qr.metadata,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.company_name AS client_company,
        (SELECT COUNT(*) FROM quote_results WHERE request_id = qr.id) AS results_count,
        (SELECT MIN(premium_annual) FROM quote_results WHERE request_id = qr.id AND status = 'received') AS best_price
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE ${f.sql}
    `
    const params = [...f.params]
    let paramIndex = f.suivant

    if (status) {
      sql += ` AND qr.status = $${paramIndex++}`
      params.push(status)
    }
    if (client_id) {
      sql += ` AND qr.client_id = $${paramIndex++}`
      params.push(parseInt(client_id, 10))
    }
    if (product_type) {
      sql += ` AND qr.product_type = $${paramIndex++}`
      params.push(product_type)
    }

    sql += ` ORDER BY qr.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parseInt(limit, 10), parseInt(offset, 10))

    const result = await pool.query(sql, params)

    // Stats globales — MÊME portée que la liste : des statistiques calculées
    // sur un autre périmètre que la liste affichée sont un mensonge.
    const fStats = filtreDevis(portee, { depart: 1, alias: 'quote_requests' })
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'draft') AS drafts,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted
      FROM quote_requests WHERE ${fStats.sql}
    `, [...fStats.params])

    res.json({
      devis: result.rows.map(row => ({
        id: row.id,
        client_id: row.client_id,
        client_name: row.client_company || `${row.client_first_name || ''} ${row.client_last_name || ''}`.trim(),
        product_type: row.product_type,
        status: row.status,
        created_at: row.created_at,
        submitted_at: row.submitted_at,
        results_count: parseInt(row.results_count, 10) || 0,
        best_price: row.best_price ? parseFloat(row.best_price) : null,
        normalized_data: row.normalized_data,
        metadata: row.metadata || {}
      })),
      stats: statsResult.rows[0],
      pagination: { limit: parseInt(limit, 10), offset: parseInt(offset, 10) }
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/devis error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// GET /api/devis/:id — Détails d'un devis
// =============================================================================

router.get('/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const devisId = parseInt(req.params.id, 10)
    const f = filtreDevis(portee, { depart: 2 })

    const result = await pool.query(`
      SELECT 
        qr.*,
        c.first_name AS client_first_name, c.last_name AS client_last_name,
        c.email AS client_email, c.phone AS client_phone,
        c.company_name AS client_company, c.type AS client_type
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND ${f.sql}
    `, [devisId, ...f.params])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const devis = result.rows[0]

    // Récupérer les résultats des fournisseurs
    const resultsRes = await pool.query(`
      SELECT 
        qrs.*, ip.name AS provider_name, ip.logo_url
      FROM quote_results qrs
      LEFT JOIN insurance_providers ip ON qrs.provider_id = ip.id
      WHERE qrs.request_id = $1
      ORDER BY qrs.premium_annual ASC NULLS LAST
    `, [devisId])

    res.json({
      devis: {
        id: devis.id,
        client_id: devis.client_id,
        client: {
          name: devis.client_company || `${devis.client_first_name || ''} ${devis.client_last_name || ''}`.trim(),
          email: devis.client_email,
          phone: devis.client_phone,
          type: devis.client_type
        },
        product_type: devis.product_type,
        normalized_data: devis.normalized_data,
        target_providers: devis.target_providers,
        status: devis.status,
        metadata: devis.metadata || {},
        created_at: devis.created_at,
        submitted_at: devis.submitted_at
      },
      results: resultsRes.rows.map(r => ({
        id: r.id,
        provider_code: r.provider_code,
        provider_name: r.provider_name,
        logo_url: r.logo_url,
        premium_annual: r.premium_annual ? parseFloat(r.premium_annual) : null,
        coverage_summary: r.coverage_summary,
        status: r.status,
        source: r.source,
        received_at: r.received_at
      }))
    })
  } catch (err) {
    logger.error({ error: err.message }, 'GET /api/devis/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/devis — Créer un devis
// =============================================================================

router.post('/', async (req, res) => {
  try {
    // Validation AVANT tout accès base : on refuse une requête incomplète sans
    // ouvrir de connexion (et sans résoudre de portée).
    const { client_id, product_type, criteria, target_providers } = req.body

    if (!product_type) {
      return res.status(400).json({ error: 'product_type requis' })
    }

    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const brokerId = portee.userId || uid(req)
    if (porteeCabinet.refuserEcriture(portee, res, 'créer un devis')) return

    const result = await pool.query(`
      INSERT INTO quote_requests (broker_id, cabinet_id, client_id, product_type, normalized_data, target_providers, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'draft')
      RETURNING *
    `, [
      brokerId,
      porteeCabinet.cabinetPourCreation(portee),
      client_id || null, product_type,
      versParametreJsonb(criteria, {}), versParametreJsonb(target_providers, null),
    ])

    logger.info({ brokerId, devisId: result.rows[0].id }, 'Devis created')

    res.status(201).json({
      success: true,
      devis: result.rows[0]
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/devis error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// PUT /api/devis/:id — Modifier un devis
// =============================================================================

router.put('/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier un devis')) return
    const devisId = parseInt(req.params.id, 10)
    const { status, criteria, target_providers, metadata } = req.body

    // Vérifier que le devis appartient AU CABINET de l'appelant (404 sinon).
    const fPortee = filtreDevis(portee, { depart: 2, ecriture: true })
    const check = await pool.query(
      `SELECT id FROM quote_requests WHERE id = $1 AND ${fPortee.sql}`,
      [devisId, ...fPortee.params]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const updates = []
    const params = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
      if (status === 'submitted') {
        updates.push(`submitted_at = NOW()`)
      }
    }
    if (criteria !== undefined) {
      updates.push(`normalized_data = $${paramIndex++}`)
      params.push(criteria)
    }
    if (target_providers !== undefined) {
      updates.push(`target_providers = $${paramIndex++}`)
      params.push(target_providers)
    }
    if (metadata !== undefined) {
      updates.push(`metadata = COALESCE(metadata, '{}') || $${paramIndex++}`)
      params.push(metadata)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' })
    }

    // La portée est REJOUÉE à l'écriture (et non supposée acquise par le SELECT
    // précédent) : la clause d'écriture est la garantie, pas la vérification.
    const fEcriture = filtreDevis(portee, { depart: paramIndex + 1, ecriture: true })
    const indexId = paramIndex
    paramIndex = fEcriture.suivant
    params.push(devisId, ...fEcriture.params)
    const result = await pool.query(`
      UPDATE quote_requests qr SET ${updates.join(', ')}
      WHERE id = $${indexId} AND ${fEcriture.sql}
      RETURNING *
    `, params)

    res.json({ success: true, devis: result.rows[0] })
  } catch (err) {
    logger.error({ error: err.message }, 'PUT /api/devis/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// DELETE /api/devis/:id — Supprimer un devis
// =============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserSuppression(portee, res)) return
    const devisId = parseInt(req.params.id, 10)
    const f = filtreDevis(portee, { depart: 2, ecriture: true })

    const result = await pool.query(
      `DELETE FROM quote_requests qr WHERE id = $1 AND ${f.sql} RETURNING id`,
      [devisId, ...f.params]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    res.json({ success: true, deleted_id: devisId })
  } catch (err) {
    logger.error({ error: err.message }, 'DELETE /api/devis/:id error')
    res.status(500).json({ error: 'Erreur serveur', details: err.message })
  }
})

// =============================================================================
// POST /api/devis/:id/ai-prepare — ARK prépare le dossier
// =============================================================================

router.post('/:id/ai-prepare', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const brokerId = portee.userId || uid(req)
    const devisId = parseInt(req.params.id, 10)
    const fDevis = filtreDevis(portee, { depart: 2 })

    // Récupérer le devis avec infos client
    const devisRes = await pool.query(`
      SELECT qr.*, c.first_name, c.last_name, c.company_name, c.type AS client_type,
             c.siret, c.city
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND ${fDevis.sql}
    `, [devisId, ...fDevis.params])

    if (devisRes.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const devis = devisRes.rows[0]
    const clientName = devis.company_name || `${devis.first_name || ''} ${devis.last_name || ''}`.trim()

    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois préparer un dossier de souscription pour un devis.
Fournis une checklist de documents nécessaires et les questions pertinentes à poser au client.
Sois précis et adapté au type de produit demandé.`,
      user: `Prépare le dossier pour ce devis:
- Client: ${clientName} (${devis.client_type || 'particulier'})
- Produit: ${devis.product_type}
- Critères: ${JSON.stringify(devis.normalized_data)}
${devis.siret ? `- SIRET: ${devis.siret}` : ''}
${devis.city ? `- Ville: ${devis.city}` : ''}

Génère la checklist documents et les questions client.`,
      schema: SCHEMA_PREPARE,
      context: { product_type: devis.product_type, client_type: devis.client_type },
      userId: brokerId,
      clientId: devis.client_id,
      route: 'devis-ai-prepare'
    })

    // Sauvegarder dans metadata
    await pool.query(`
      UPDATE quote_requests 
      SET metadata = COALESCE(metadata, '{}') || $1
      WHERE id = $2
    `, [{ ai_preparation: arkResponse.structured, ai_prepared_at: new Date().toISOString() }, devisId])

    res.json({
      success: true,
      preparation: arkResponse.structured,
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/devis/:id/ai-prepare error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

// =============================================================================
// POST /api/devis/:id/ai-recommendation — ARK recommande un fournisseur
// =============================================================================

router.post('/:id/ai-recommendation', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const brokerId = portee.userId || uid(req)
    const devisId = parseInt(req.params.id, 10)
    const fDevis = filtreDevis(portee, { depart: 2 })

    // Récupérer le devis + résultats
    const devisRes = await pool.query(`
      SELECT qr.*, c.first_name, c.last_name, c.company_name, c.type AS client_type
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND ${fDevis.sql}
    `, [devisId, ...fDevis.params])

    if (devisRes.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const devis = devisRes.rows[0]

    // Résultats des fournisseurs
    const resultsRes = await pool.query(`
      SELECT qrs.*, ip.name AS provider_name
      FROM quote_results qrs
      LEFT JOIN insurance_providers ip ON qrs.provider_id = ip.id
      WHERE qrs.request_id = $1 AND qrs.status = 'received'
    `, [devisId])

    if (resultsRes.rows.length === 0) {
      return res.status(400).json({ error: 'Aucun résultat de fournisseur disponible pour la comparaison' })
    }

    const clientName = devis.company_name || `${devis.first_name || ''} ${devis.last_name || ''}`.trim()

    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois comparer les offres reçues et recommander la meilleure solution au courtier.
Prends en compte le rapport qualité/prix, les garanties et le profil du client.
Fournis un argumentaire de vente clair.`,
      user: `Compare ces offres pour le devis ${devis.product_type}:
Client: ${clientName} (${devis.client_type || 'particulier'})
Critères: ${JSON.stringify(devis.normalized_data)}

Offres reçues:
${resultsRes.rows.map((r, i) => `${i + 1}. ${r.provider_name || r.provider_code}: ${r.premium_annual}€/an
   Garanties: ${JSON.stringify(r.coverage_summary || {})}`).join('\n')}

Recommande la meilleure offre avec argumentaire.`,
      schema: SCHEMA_RECOMMENDATION,
      context: { product_type: devis.product_type, offers_count: resultsRes.rows.length },
      userId: brokerId,
      clientId: devis.client_id,
      route: 'devis-ai-recommendation'
    })

    // Sauvegarder dans metadata
    await pool.query(`
      UPDATE quote_requests 
      SET metadata = COALESCE(metadata, '{}') || $1
      WHERE id = $2
    `, [{ ai_recommendation: arkResponse.structured, ai_recommended_at: new Date().toISOString() }, devisId])

    res.json({
      success: true,
      recommendation: arkResponse.structured,
      offers_analyzed: resultsRes.rows.length,
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/devis/:id/ai-recommendation error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

// =============================================================================
// POST /api/devis/:id/generate-proposal — ARK génère proposition client
// =============================================================================

router.post('/:id/generate-proposal', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const brokerId = portee.userId || uid(req)
    const devisId = parseInt(req.params.id, 10)
    const { provider_code } = req.body // Optionnel: forcer un provider
    const fDevis = filtreDevis(portee, { depart: 2 })

    // Récupérer le devis avec client
    const devisRes = await pool.query(`
      SELECT qr.*, c.first_name, c.last_name, c.company_name, c.type AS client_type,
             c.email, c.city
      FROM quote_requests qr
      LEFT JOIN clients c ON qr.client_id = c.id
      WHERE qr.id = $1 AND ${fDevis.sql}
    `, [devisId, ...fDevis.params])

    if (devisRes.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    const devis = devisRes.rows[0]

    // Récupérer le meilleur résultat ou le provider spécifié
    let resultQuery = `
      SELECT qrs.*, ip.name AS provider_name
      FROM quote_results qrs
      LEFT JOIN insurance_providers ip ON qrs.provider_id = ip.id
      WHERE qrs.request_id = $1 AND qrs.status = 'received'
    `
    const resultParams = [devisId]

    if (provider_code) {
      resultQuery += ' AND qrs.provider_code = $2'
      resultParams.push(provider_code)
    } else {
      resultQuery += ' ORDER BY qrs.premium_annual ASC LIMIT 1'
    }

    const resultRes = await pool.query(resultQuery, resultParams)

    if (resultRes.rows.length === 0) {
      return res.status(400).json({ error: 'Aucune offre disponible pour générer la proposition' })
    }

    const bestOffer = resultRes.rows[0]
    const clientName = devis.company_name || `${devis.first_name || ''} ${devis.last_name || ''}`.trim()

    const arkResponse = await callArkStructured({
      system: `Tu es ARK, assistant IA expert en assurance pour courtiers.
Tu dois générer une proposition commerciale professionnelle et personnalisée pour le client.
Le document doit être clair, convaincant et prêt à être envoyé.
Utilise un ton professionnel mais chaleureux.`,
      user: `Génère une proposition commerciale pour:
Client: ${clientName}
${devis.email ? `Email: ${devis.email}` : ''}
${devis.city ? `Ville: ${devis.city}` : ''}
Type: ${devis.client_type || 'particulier'}
Produit: ${devis.product_type}
Besoins: ${JSON.stringify(devis.normalized_data)}

Offre sélectionnée:
- Compagnie: ${bestOffer.provider_name || bestOffer.provider_code}
- Prime annuelle: ${bestOffer.premium_annual}€
- Garanties: ${JSON.stringify(bestOffer.coverage_summary || {})}`,
      schema: SCHEMA_PROPOSAL,
      context: { product_type: devis.product_type, provider: bestOffer.provider_name },
      userId: brokerId,
      clientId: devis.client_id,
      route: 'devis-generate-proposal'
    })

    // Sauvegarder dans metadata
    await pool.query(`
      UPDATE quote_requests 
      SET metadata = COALESCE(metadata, '{}') || $1
      WHERE id = $2
    `, [{ ai_proposal: arkResponse.structured, ai_proposal_at: new Date().toISOString(), selected_provider: bestOffer.provider_code }, devisId])

    res.json({
      success: true,
      proposal: arkResponse.structured,
      selected_offer: {
        provider_code: bestOffer.provider_code,
        provider_name: bestOffer.provider_name,
        premium_annual: parseFloat(bestOffer.premium_annual)
      },
      usage: arkResponse.usage,
      model: arkResponse.model
    })
  } catch (err) {
    logger.error({ error: err.message }, 'POST /api/devis/:id/generate-proposal error')
    res.status(500).json({ error: 'Erreur ARK', details: err.message })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// F3 — DEVIS WIZARD 1-CLICK + PDF AURORA PREMIUM + RELANCES J+3 / J+7 / J+14
// ═════════════════════════════════════════════════════════════════════════════

// ─── POST /api/devis/wizard/init — Sauvegarde brouillon (étape 1)
router.post('/wizard/init', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'créer un devis')) return
    const ok = await ensureWizardSchema()
    if (!ok) return res.status(503).json({ error: 'schema_missing' })

    const { client_id, product, preset = 'confort', garanties = {}, date_effet = null } = req.body || {}
    if (!product) return res.status(400).json({ error: 'product_required' })

    const client = await loadClient(portee, client_id)
    const clientName = client
      ? (client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim())
      : null
    const cabinet = await loadCabinetMeta(userId)
    const reference = shortId('DV')

    const { rows } = await pool.query(`
      INSERT INTO devis_wizard
        (user_id, client_id, product, preset, garanties, status, reference,
         client_email_cache, client_name_cache, cabinet_name_cache, validity_days, cabinet_id)
      VALUES ($1, $2, $3, $4, $5::jsonb, 'draft', $6, $7, $8, $9, 30, $10)
      RETURNING *
    `, [
      userId, client_id || null, product, preset,
      JSON.stringify({ ...garanties, date_effet }),
      reference,
      client?.email || null,
      clientName,
      cabinet.name,
      porteeCabinet.cabinetPourCreation(portee),
    ])

    await pool.query(
      `INSERT INTO devis_activity (devis_id, user_id, event, payload)
       VALUES ($1, $2, 'wizard_init', $3::jsonb)`,
      [rows[0].id, userId, JSON.stringify({ product, preset })]
    ).catch(() => {})

    res.json({ ok: true, devis: rows[0] })
  } catch (err) {
    logger.error({ err: err.message }, 'devis wizard init')
    res.status(500).json({ error: 'wizard_init_failed', message: err.message })
  }
})

// ─── POST /api/devis/wizard/finalize — Génère PDF + crée devis prêts à envoyer
router.post('/wizard/finalize', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'finaliser un devis')) return
    const ok = await ensureWizardSchema()
    if (!ok) return res.status(503).json({ error: 'schema_missing' })

    const { devis_id, offers = [], ark_summary = '' } = req.body || {}
    if (!devis_id) return res.status(400).json({ error: 'devis_id_required' })
    if (!Array.isArray(offers) || offers.length === 0)
      return res.status(400).json({ error: 'no_offers_selected' })

    // Une offre sans provenance réelle est une offre SIMULÉE. Elle ne doit ni
    // devenir un PDF ni partir par e-mail à un client : le document porterait
    // des primes, des garanties et des notations qui n'ont jamais été obtenues
    // auprès d'un assureur. On refuse donc la finalisation en nommant les
    // offres fautives, plutôt que de produire un faux devis.
    const verdictOffres = validerOffresPourClient(offers)
    if (!verdictOffres.ok) {
      return res.status(400).json({
        error: 'simulated_offers_refused',
        message: MESSAGE_OFFRES_SIMULEES,
        offres_refusees: verdictOffres.fournisseurs_refuses,
        sources_acceptees: SOURCES_REELLES,
      })
    }

    const { rows: existing } = await pool.query(
      `SELECT * FROM devis_wizard WHERE id = $1 AND ${filtreWizard(portee, { depart: 2, ecriture: true }).sql}`,
      [devis_id, ...filtreWizard(portee, { depart: 2, ecriture: true }).params]
    )
    if (!existing[0]) return res.status(404).json({ error: 'devis_not_found' })
    const devis = existing[0]

    const client = await loadClient(portee, devis.client_id)
    const cabinet = await loadCabinetMeta(userId)

    const clientName = devis.client_name_cache || (client
      ? (client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim())
      : 'Client')
    const clientPayload = {
      name: clientName,
      email: client?.email || devis.client_email_cache || '',
      phone: client?.phone || '',
      address: client ? [client.address, client.postal_code, client.city].filter(Boolean).join(' ') : '',
    }

    const pdfPath = buildPdfPath(userId, devis_id)
    await buildDevisPdf({
      cabinet,
      client: clientPayload,
      devis: {
        reference: devis.reference,
        product: devis.product,
        preset: devis.preset,
        validity_days: devis.validity_days || 30,
        ark_summary,
      },
      offers,
      outputPath: pdfPath,
    })

    const totalCents = Math.round((offers[0]?.prime_annuelle_eur || 0) * 100)
    await pool.query(`
      UPDATE devis_wizard d
      SET selected_providers = $1::jsonb,
          pdf_path = $2,
          total_premium_cents = $3,
          ark_summary = $4,
          status = CASE WHEN status = 'draft' THEN 'ready' ELSE status END,
          updated_at = NOW(),
          expires_at = NOW() + INTERVAL '30 days'
      WHERE id = $5 AND ${filtreWizard(portee, { depart: 6, ecriture: true }).sql}
    `, [JSON.stringify(offers), pdfPath, totalCents, ark_summary, devis_id, ...filtreWizard(portee, { depart: 6, ecriture: true }).params])

    await pool.query(
      `INSERT INTO devis_activity (devis_id, user_id, event, payload)
       VALUES ($1, $2, 'wizard_finalize', $3::jsonb)`,
      [devis_id, userId, JSON.stringify({ offers_count: offers.length })]
    ).catch(() => {})

    res.json({
      ok: true,
      devis_id,
      reference: devis.reference,
      pdf_url: `/api/devis/${devis_id}/pdf`,
      preview_url: `/api/devis/${devis_id}/pdf?inline=1`,
    })
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'devis wizard finalize')
    res.status(500).json({ error: 'wizard_finalize_failed', message: err.message })
  }
})

// ─── GET /api/devis/:id/pdf — stream PDF brandé (téléchargement / inline)
router.get('/:id/pdf', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const devisId = parseInt(req.params.id, 10)
    const fDevis = filtreWizard(portee, { depart: 2 })
    const { rows } = await pool.query(
      `SELECT pdf_path, reference FROM devis_wizard WHERE id = $1 AND ${fDevis.sql}`,
      [devisId, ...fDevis.params]
    )
    if (!rows[0] || !rows[0].pdf_path) return res.status(404).json({ error: 'pdf_missing' })
    if (!fs.existsSync(rows[0].pdf_path)) return res.status(404).json({ error: 'pdf_file_missing' })

    const inline = req.query.inline === '1'
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${rows[0].reference || 'devis-' + devisId}.pdf"`)
    fs.createReadStream(rows[0].pdf_path).pipe(res)
  } catch (err) {
    logger.error({ err: err.message }, 'devis pdf stream')
    res.status(500).json({ error: 'pdf_stream_failed' })
  }
})

// ─── POST /api/devis/:id/send — Envoie au client + déclenche relances
router.post('/:id/send', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'envoyer un devis')) return
    const devisId = parseInt(req.params.id, 10)
    const fDevis = filtreWizard(portee, { depart: 2, ecriture: true })
    const { rows } = await pool.query(
      `SELECT * FROM devis_wizard WHERE id = $1 AND ${fDevis.sql}`,
      [devisId, ...fDevis.params]
    )
    if (!rows[0]) return res.status(404).json({ error: 'devis_not_found' })
    const d = rows[0]

    const email = (req.body?.email_to || d.client_email_cache || '').trim()
    if (!email) return res.status(400).json({ error: 'no_client_email' })

    const subject = req.body?.subject ||
      `Votre proposition ${d.product} — ${d.cabinet_name_cache || 'COURTIA'}`
    const message = req.body?.message ||
      `Bonjour,\n\nVeuillez trouver ci-joint la proposition que je vous avais préparée.\nN'hésitez pas à me contacter pour toute question.\n\n— ${d.cabinet_name_cache || 'COURTIA'}`

    const pdfLink = `${process.env.FRONTEND_URL || 'https://app.courtiark.fr'}/devis/${devisId}`
    const html = `
      <div style="font-family:Inter,Arial;color:#1F2937;max-width:600px;margin:0 auto">
        <div style="background:#050510;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:#FFF;margin:0;font-size:22px">${d.cabinet_name_cache || 'COURTIA'}</h1>
          <p style="color:#A78BFA;margin:4px 0 0;font-size:12px">Proposition d'assurance — ${d.cabinet_name_cache || 'votre courtier'}</p>
        </div>
        <div style="background:#FFF;padding:24px;border:1px solid #E5E7EB;border-radius:0 0 12px 12px">
          <p>${message.replace(/\n/g, '<br>')}</p>
          <p style="margin:24px 0">
            <a href="${pdfLink}" style="background:#5B4DF5;color:#FFF;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Consulter & signer ma proposition</a>
          </p>
          <p style="color:#6B7280;font-size:12px">Référence : ${d.reference || 'DV-' + devisId}</p>
          <p style="color:#6B7280;font-size:12px">Validité ${d.validity_days || 30} jours · ORIAS 12345678</p>
        </div>
      </div>
    `
    /* Un devis ne part QUE si l'e-mail est réellement parti.
       Avant : l'échec d'envoi était seulement journalisé, puis le devis était
       marqué `status='sent'` — un état métier faux (mesuré : avec RESEND_API_KEY
       absente, sendEmail renvoie {success:false, skipped:true} sans exception,
       le devis était donc « envoyé » alors qu'aucun message n'existait).
       Passage par sendCommercialEmail : un devis est un message commercial,
       le client doit pouvoir répondre. */
    const envoi = await sendCommercialEmail({ to: email, subject, html })
    if (!envoi || !envoi.success) {
      logger.warn({ devisId, error: envoi && envoi.error }, 'devis send email failed')
      return res.status(502).json({
        error: 'email_not_sent',
        message: "Le devis n'a pas été envoyé : l'e-mail n'est pas parti. Le devis reste en brouillon.",
        detail: envoi && envoi.error ? envoi.error : 'send_failed',
        provider: envoi && envoi.provider ? envoi.provider : 'none',
      })
    }

    await pool.query(
      `UPDATE devis_wizard d
         SET status = 'sent', sent_at = NOW(), client_email_cache = $1, updated_at = NOW()
       WHERE id = $2 AND ${filtreWizard(portee, { depart: 3, ecriture: true }).sql}`,
      [email, devisId, ...filtreWizard(portee, { depart: 3, ecriture: true }).params]
    )

    // Annule les anciennes relances, replanifie
    await cancelPendingRelancesForDevis(devisId)
    await scheduleRelancesForDevis(devisId)

    await pool.query(
      `INSERT INTO devis_activity (devis_id, user_id, event, payload)
       VALUES ($1, $2, 'sent', $3::jsonb)`,
      [devisId, userId, JSON.stringify({ to: email })]
    ).catch(() => {})

    res.json({ ok: true, sent_to: email, relances_planifiees: ['J+3', 'J+7', 'J+14'] })
  } catch (err) {
    logger.error({ err: err.message }, 'devis send')
    res.status(500).json({ error: 'send_failed', message: err.message })
  }
})

// ─── POST /api/devis/:id/relance — force une relance maintenant
router.post('/:id/relance', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const devisId = parseInt(req.params.id, 10)
    if (!Number.isFinite(devisId) || devisId <= 0) {
      return res.status(400).json({ error: 'invalid_devis_id', message: 'Identifiant de devis invalide.' })
    }
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'relancer un devis')) return
    // Modèles connus uniquement : `template_key` est un varchar(40) et un
    // modèle inconnu ne produit jamais de message.
    const templates = ['J3', 'J7', 'J14']
    const template = templates.includes(req.body?.template) ? req.body.template : 'J7'

    // DEUX FAMILLES DE DEVIS COEXISTENT, elles n'ont pas la même table :
    //   v2 → devis_wizard  (devis_relances.devis_id référence devis_wizard.id)
    //   v1 → quote_requests (lue par GET /api/devis, donc la liste « Devis »
    //        de l'application et le bouton Relancer de DevisDetail)
    // Avant ce correctif, l'identifiant v1 était écrit dans devis_relances :
    // violation de clé étrangère → 500 `relance_failed` à chaque clic, sans
    // qu'aucune relance n'existe. On route maintenant chaque famille vers sa
    // table, et un identifiant inconnu répond 404 au lieu de 500.
    const fWizard = filtreWizard(portee, { depart: 2, ecriture: true })
    const wizard = await pool.query(
      `SELECT id, status, client_id FROM devis_wizard WHERE id = $1 AND ${fWizard.sql}`,
      [devisId, ...fWizard.params]
    )
    if (wizard.rows[0]) {
      await pool.query(`
        INSERT INTO devis_relances (devis_id, scheduled_at, channel, template_key, status)
        VALUES ($1, NOW(), 'email', $2, 'scheduled')
      `, [devisId, template])

      // Tick immédiat
      const { processDueRelances } = require('../services/devisRelanceService')
      const r = await processDueRelances()
      return res.json({ ok: true, devis_type: 'wizard', template, ...r })
    }

    const fV1 = filtreDevis(portee, { depart: 2, ecriture: true })
    const v1 = await pool.query(
      `SELECT qr.id, qr.client_id, qr.product_type, c.email AS client_email,
              CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, '')) AS client_name
         FROM quote_requests qr
         LEFT JOIN clients c ON c.id = qr.client_id
        WHERE qr.id = $1 AND ${fV1.sql}`,
      [devisId, ...fV1.params]
    )
    const devisV1 = v1.rows[0]
    if (devisV1) {
      const relance = await pool.query(`
        INSERT INTO relances (client_id, quote_request_id, type, channel, priority, subject, scheduled_at, ai_generated, metadata, cabinet_id)
        VALUES ($1, $2, 'devis_relance', 'email', 'high', $3, NOW(), false, $4::jsonb, $5)
        RETURNING id, client_id, quote_request_id, type, channel, status, scheduled_at
      `, [
        devisV1.client_id,
        devisV1.id,
        `Relance devis ${devisV1.product_type || ''}`.trim(),
        JSON.stringify({ template, origine: 'devis_relance_forcee', devis_v1_id: devisV1.id }),
        porteeCabinet.cabinetPourCreation(portee),
      ])

      // Envoi immédiat réel : le statut écrit dit ce qui s'est RÉELLEMENT passé.
      let envoye = false
      let raison = null
      if (devisV1.client_email) {
        const { sendCommercialEmail } = require('../services/emailService')
        const envoi = await sendCommercialEmail({
          to: devisV1.client_email,
          subject: `Votre devis ${devisV1.product_type || ''} — un point rapide`.trim(),
          html: `<p>Bonjour ${devisV1.client_name.trim()},</p><p>Je reviens vers vous au sujet de votre devis ${devisV1.product_type || ''}.</p>`,
        })
        envoye = !!(envoi && envoi.success)
        raison = envoi && envoi.error ? envoi.error : (envoi && envoi.skipped ? 'email_non_configure' : null)
      } else {
        raison = 'client_sans_email'
      }

      if (envoye) {
        await pool.query(`UPDATE relances SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`, [relance.rows[0].id])
      }

      return res.json({
        ok: true,
        devis_type: 'v1',
        template,
        relance: { ...relance.rows[0], status: envoye ? 'sent' : 'pending' },
        envoye,
        raison: envoye ? null : raison,
        message: envoye
          ? 'Relance envoyée au client.'
          : "Relance enregistrée mais NON envoyée (voir « raison ») — rien n'est simulé.",
      })
    }

    return res.status(404).json({
      error: 'devis_not_found',
      message: 'Devis introuvable pour ce cabinet (ni devis guidé, ni devis v1).',
    })
  } catch (err) {
    logger.error({ err: err.message }, 'devis relance force')
    res.status(500).json({ error: 'relance_failed', message: err.message })
  }
})

// ─── POST /api/devis/:id/sign — marque signé
router.post('/:id/sign', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'signer un devis')) return
    const devisId = parseInt(req.params.id, 10)
    const fSign = filtreWizard(portee, { depart: 2, ecriture: true })
    await pool.query(
      `UPDATE devis_wizard d SET status = 'signed', signed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND ${fSign.sql}`, [devisId, ...fSign.params]
    )
    await cancelPendingRelancesForDevis(devisId)
    await pool.query(
      `INSERT INTO devis_activity (devis_id, user_id, event, payload)
       VALUES ($1, $2, 'signed', '{}'::jsonb)`, [devisId, userId]
    ).catch(() => {})
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'sign_failed', message: err.message })
  }
})

// ─── GET /api/devis/wizard/list — Liste wizard devis (séparé de quote_requests)
router.get('/wizard/list', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const ok = await ensureWizardSchema()
    if (!ok) return res.json({ items: [], stats: { total: 0, sent: 0, signed: 0, refused: 0 } })

    const { status } = req.query
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const fListe = filtreWizard(portee, { depart: 1, alias: 'd' })
    let sql = `
      SELECT d.*, c.first_name, c.last_name, c.company_name, c.email AS c_email
      FROM devis_wizard d
      LEFT JOIN clients c ON c.id = d.client_id
      WHERE ${fListe.sql}
    `
    const params = [...fListe.params]
    if (status && status !== 'all') {
      sql += ` AND d.status = $${fListe.suivant}`
      params.push(status)
    }
    sql += ` ORDER BY d.created_at DESC LIMIT 200`

    const { rows } = await pool.query(sql, params)
    const items = rows.map(r => ({
      id: r.id,
      reference: r.reference,
      product: r.product,
      preset: r.preset,
      status: r.status,
      total_premium_eur: Math.round((r.total_premium_cents || 0) / 100),
      providers: r.selected_providers || [],
      client_name: r.client_name_cache || r.company_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '—',
      client_email: r.c_email || r.client_email_cache,
      sent_at: r.sent_at,
      signed_at: r.signed_at,
      created_at: r.created_at,
      expires_at: r.expires_at,
    }))
    const stats = {
      total: items.length,
      draft: items.filter(i => i.status === 'draft' || i.status === 'ready').length,
      sent: items.filter(i => i.status === 'sent' || i.status === 'opened').length,
      signed: items.filter(i => i.status === 'signed').length,
      refused: items.filter(i => i.status === 'refused').length,
      expired: items.filter(i => i.status === 'expired').length,
    }
    res.json({ items, stats })
  } catch (err) {
    logger.error({ err: err.message }, 'devis wizard list')
    res.status(500).json({ error: 'list_failed' })
  }
})

// ─── GET /api/devis/wizard/:id — Détail wizard
router.get('/wizard/:id', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const ok = await ensureWizardSchema()
    if (!ok) return res.status(404).json({ error: 'not_found' })
    const devisId = parseInt(req.params.id, 10)
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const fDetail = filtreWizard(portee, { depart: 2, alias: 'd' })
    const { rows } = await pool.query(
      `SELECT d.*, c.first_name, c.last_name, c.company_name, c.email AS c_email, c.phone AS c_phone
       FROM devis_wizard d
       LEFT JOIN clients c ON c.id = d.client_id
       WHERE d.id = $1 AND ${fDetail.sql}`, [devisId, ...fDetail.params]
    )
    if (!rows[0]) return res.status(404).json({ error: 'not_found' })
    const d = rows[0]
    const { rows: relances } = await pool.query(
      `SELECT id, scheduled_at, sent_at, channel, template_key, status FROM devis_relances WHERE devis_id = $1 ORDER BY scheduled_at`,
      [devisId]
    )
    const { rows: activity } = await pool.query(
      `SELECT id, event, payload, created_at FROM devis_activity WHERE devis_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [devisId]
    ).catch(() => ({ rows: [] }))

    res.json({
      devis: {
        id: d.id,
        reference: d.reference,
        product: d.product,
        preset: d.preset,
        status: d.status,
        total_premium_eur: Math.round((d.total_premium_cents || 0) / 100),
        garanties: d.garanties,
        providers: d.selected_providers || [],
        ark_summary: d.ark_summary,
        client: {
          id: d.client_id,
          name: d.client_name_cache || d.company_name || `${d.first_name || ''} ${d.last_name || ''}`.trim(),
          email: d.c_email || d.client_email_cache,
          phone: d.c_phone,
        },
        sent_at: d.sent_at,
        opened_at: d.first_opened_at,
        signed_at: d.signed_at,
        expires_at: d.expires_at,
        created_at: d.created_at,
        pdf_url: d.pdf_path ? `/api/devis/${d.id}/pdf` : null,
      },
      relances,
      activity,
    })
  } catch (err) {
    logger.error({ err: err.message }, 'devis wizard detail')
    res.status(500).json({ error: 'detail_failed' })
  }
})

// ─── POST /api/devis/:id/duplicate — Duplique en brouillon
router.post('/:id/duplicate', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'dupliquer un devis')) return
    const devisId = parseInt(req.params.id, 10)
    const fSrc = filtreWizard(portee, { depart: 2, ecriture: true })
    const { rows } = await pool.query(
      `SELECT * FROM devis_wizard WHERE id = $1 AND ${fSrc.sql}`, [devisId, ...fSrc.params]
    )
    if (!rows[0]) return res.status(404).json({ error: 'not_found' })
    const src = rows[0]
    const ref = shortId('DV')
    const { rows: created } = await pool.query(`
      INSERT INTO devis_wizard
        (user_id, client_id, product, preset, garanties, selected_providers,
         status, reference, client_email_cache, client_name_cache, cabinet_name_cache, validity_days, cabinet_id)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,'draft',$7,$8,$9,$10,30,$11)
      RETURNING id, reference
    `, [
      userId, src.client_id, src.product, src.preset,
      JSON.stringify(src.garanties || {}),
      JSON.stringify(src.selected_providers || []),
      ref, src.client_email_cache, src.client_name_cache, src.cabinet_name_cache,
      porteeCabinet.cabinetPourCreation(portee),
    ])
    res.json({ ok: true, devis: created[0] })
  } catch (err) {
    res.status(500).json({ error: 'duplicate_failed', message: err.message })
  }
})

// ─── POST /api/devis/:id/cancel — annule un devis
router.post('/:id/cancel', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'annuler un devis')) return
    const devisId = parseInt(req.params.id, 10)
    const fAnnule = filtreWizard(portee, { depart: 2, ecriture: true })
    await pool.query(
      `UPDATE devis_wizard d SET status = 'refused', updated_at = NOW()
       WHERE id = $1 AND ${fAnnule.sql}`, [devisId, ...fAnnule.params]
    )
    await cancelPendingRelancesForDevis(devisId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'cancel_failed' })
  }
})

module.exports = router
