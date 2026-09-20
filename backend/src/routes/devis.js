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
// Règle UNIQUE des montants : refus explicite à l'écriture (non numérique,
// négatif, au-delà du plafond) — partagée avec les contrats (lib/montants.js).
const { montantOuNull, erreurMontant } = require('../lib/montants')

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

// ─────────────────────────────────────────────────────────────────────────────
// DEUX FAMILLES DE DEVIS, UNE SEULE LISTE
//
// POURQUOI : l'assistant de devis écrit dans `devis_wizard` (devis « guidé »),
// alors que GET /api/devis ne lisait que `quote_requests` (devis v1). Un devis
// créé par l'assistant n'apparaissait donc JAMAIS dans la liste des devis de
// l'application (défaut reproduit en production : réf. DV-P92F76 présente dans
// `devis_wizard`, GET /api/devis → {"devis":[],"stats":{"total":"0"}}), et sa
// suppression répondait 404 « Devis non trouvé » alors que la ligne existait.
// On expose donc les DEUX familles dans la même liste, chaque élément portant
// `source` (« wizard » ou « v1 ») : l'application peut les distinguer, mais
// aucune ne disparaît. `id` reste l'identifiant de la famille concernée, comme
// le fait déjà POST /api/devis/:id/relance.
// ─────────────────────────────────────────────────────────────────────────────

/** Élément de liste pour un devis guidé (`devis_wizard`), au format v1. */
function mapDevisWizardVersListe(r = {}) {
  return {
    id: r.id,
    client_id: r.client_id,
    client_name: r.client_name_cache || r.company_name
      || `${r.first_name || ''} ${r.last_name || ''}`.trim() || null,
    product_type: r.product,
    status: r.status,
    created_at: r.created_at,
    submitted_at: r.sent_at,
    results_count: 0,
    best_price: null,
    normalized_data: r.garanties || {},
    metadata: {
      source: 'devis_wizard',
      reference: r.reference || null,
      total_premium_eur: r.total_premium_cents != null ? Math.round(r.total_premium_cents / 100) : null,
      expires_at: r.expires_at || null,
    },
    source: 'wizard',
    reference: r.reference || null,
  }
}

/**
 * Détail d'un devis GUIDÉ (`devis_wizard`), au format « devis » de la v1.
 * Renvoie `null` si la portée ne le voit pas (jamais 403 : un devis hors
 * cabinet est INEXISTANT pour l'appelant).
 */
async function chargerDevisWizardParId(portee, devisId) {
  const ok = await ensureWizardSchema()
  if (!ok) return null
  const f = filtreWizard(portee, { depart: 2, alias: 'd' })
  const { rows } = await pool.query(
    `SELECT d.*, c.first_name, c.last_name, c.company_name, c.email AS c_email, c.phone AS c_phone
       FROM devis_wizard d
       LEFT JOIN clients c ON c.id = d.client_id
      WHERE d.id = $1 AND ${f.sql}
      LIMIT 1`,
    [devisId, ...f.params]
  )
  const d = rows[0]
  if (!d) return null
  return {
    id: d.id,
    client_id: d.client_id,
    client: {
      name: d.client_name_cache || d.company_name || `${d.first_name || ''} ${d.last_name || ''}`.trim(),
      email: d.c_email || d.client_email_cache || null,
      phone: d.c_phone || null,
      type: null,
    },
    product_type: d.product,
    normalized_data: d.garanties || {},
    target_providers: [],
    status: d.status,
    metadata: {
      source: 'devis_wizard',
      reference: d.reference || null,
      total_premium_eur: d.total_premium_cents != null ? Math.round(d.total_premium_cents / 100) : null,
      ark_summary: d.ark_summary || null,
      expires_at: d.expires_at || null,
    },
    created_at: d.created_at,
    submitted_at: d.sent_at,
    source: 'wizard',
    reference: d.reference || null,
    // Offres réellement enregistrées par l'assistant (aucune n'est fabriquée).
    offres: Array.isArray(d.selected_providers) ? d.selected_providers : [],
  }
}

/** Devis guidés visibles par la portée, filtrés comme la liste v1. */
async function listerDevisWizard(portee, { status, client_id, product_type, limit = 50 } = {}) {
  const ok = await ensureWizardSchema()
  if (!ok) return []
  const f = filtreWizard(portee, { depart: 1, alias: 'd' })
  const clauses = [f.sql]
  const params = [...f.params]
  if (status) { params.push(String(status)); clauses.push(`d.status = $${params.length}`) }
  if (client_id) { params.push(parseInt(client_id, 10)); clauses.push(`d.client_id = $${params.length}`) }
  if (product_type) { params.push(String(product_type)); clauses.push(`d.product = $${params.length}`) }
  params.push(parseInt(limit, 10) || 50)
  const { rows } = await pool.query(
    `SELECT d.id, d.client_id, d.product, d.status, d.garanties, d.reference,
            d.total_premium_cents, d.client_name_cache, d.client_email_cache,
            d.created_at, d.sent_at, d.expires_at,
            c.first_name, c.last_name, c.company_name
       FROM devis_wizard d
       LEFT JOIN clients c ON c.id = d.client_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY d.created_at DESC
      LIMIT $${params.length}`,
    params
  )
  return rows.map(mapDevisWizardVersListe)
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

/**
 * Identifiant de registre RÉEL du cabinet, pour les messages destinés au client.
 *
 * POURQUOI CETTE FONCTION : l'e-mail de devis se terminait par
 * « Validité 30 jours · ORIAS 12345678 » — un numéro ÉCRIT EN DUR, donc faux,
 * dans un message envoyé au client final (le PDF avait été corrigé, pas
 * l'e-mail). On n'imprime que ce qui est réellement renseigné : le numéro ORIAS
 * du cabinet (`cabinets.orias_number`), sinon celui du profil du courtier
 * (`broker_profiles.orias`). Si rien n'est renseigné, la mention disparaît —
 * on n'invente jamais un numéro de registre.
 */
async function chargerRegistreReel(devisWizard = {}) {
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(NULLIF(c.orias_number, ''), NULLIF(bp.orias, '')) AS registre
         FROM users u
         LEFT JOIN broker_profiles bp ON bp.user_id = u.id
         LEFT JOIN cabinets c ON c.id = $2::uuid
        WHERE u.id = $1
        LIMIT 1`,
      [devisWizard.user_id || null, devisWizard.cabinet_id || null]
    )
    return (rows[0] && rows[0].registre) || null
  } catch (_) {
    return null
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

    // Devis guidés (assistant) : même portée, mêmes filtres, ajoutés à la liste.
    const devisWizard = await listerDevisWizard(portee, { status, client_id, product_type, limit })
    const devisV1 = result.rows.map(row => ({
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
      metadata: row.metadata || {},
      source: 'v1',
      reference: null,
    }))

    // Une seule liste, du plus récent au plus ancien. `total` compte ce qui est
    // RÉELLEMENT renvoyé (un « total » à 0 devant une liste non vide est un
    // mensonge) ; le détail par famille reste disponible.
    const devis = [...devisV1, ...devisWizard]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, parseInt(limit, 10) || 50)

    const statsV1 = statsResult.rows[0] || {}

    res.json({
      devis,
      stats: {
        total: devis.length,
        total_v1: parseInt(statsV1.total, 10) || 0,
        total_wizard: devisWizard.length,
        // Répartition v1 (inchangée)
        drafts: statsV1.drafts,
        submitted: statsV1.submitted,
        completed: statsV1.completed,
        accepted: statsV1.accepted,
        // Répartition des devis guidés, sur les éléments listés
        wizard_draft: devisWizard.filter(d => d.status === 'draft' || d.status === 'ready').length,
        wizard_sent: devisWizard.filter(d => d.status === 'sent' || d.status === 'opened').length,
        wizard_signed: devisWizard.filter(d => d.status === 'signed').length,
      },
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
      // Devis GUIDÉ (assistant) : sa table est `devis_wizard`, pas
      // `quote_requests`. Un devis créé par l'assistant doit s'ouvrir comme les
      // autres — sinon l'écran de détail répondrait 404 pour un devis qui existe.
      const wizard = await chargerDevisWizardParId(portee, devisId)
      if (!wizard) return res.status(404).json({ error: 'Devis non trouvé' })
      return res.json({ devis: wizard, results: [] })
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
      // Alias `qr` OBLIGATOIRE : la portée cabinet s'écrit `qr.cabinet_id` /
      // `qr.broker_id`. Sans alias, PostgreSQL répondait
      // « missing FROM-clause entry for table "qr" » (500) — la modification d'un
      // devis était donc impossible pour TOUS les cabinets.
      `SELECT id FROM quote_requests qr WHERE id = $1 AND ${fPortee.sql}`,
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
    if (!Number.isFinite(devisId) || devisId <= 0) {
      return res.status(400).json({ error: 'invalid_devis_id', message: 'Identifiant de devis invalide.' })
    }
    // `?source=wizard|v1` : permet de lever l'ambiguïté quand un même entier
    // existe dans les DEUX tables. Sans indication, on suit l'ordre de la liste
    // (devis guidé d'abord, comme POST /api/devis/:id/relance), puis on
    // supprime RÉELLEMENT la ligne — sinon 404.
    const sourceDemandee = String(req.query?.source || '').toLowerCase()

    if (sourceDemandee !== 'v1') {
      // Devis guidé de l'assistant : `devis_relances` et `devis_activity` sont en
      // ON DELETE CASCADE, la suppression emporte donc aussi ses relances.
      const fWizard = filtreWizard(portee, { depart: 2, ecriture: true })
      const wizard = await pool.query(
        `DELETE FROM devis_wizard d WHERE d.id = $1 AND ${fWizard.sql} RETURNING id, reference`,
        [devisId, ...fWizard.params]
      ).catch((err) => {
        if (String(err.message || '').includes('does not exist')) return { rows: [], rowCount: 0 }
        throw err
      })
      if (wizard.rowCount) {
        return res.json({ success: true, deleted_id: devisId, source: 'wizard', reference: wizard.rows[0].reference || null })
      }
    }

    const f = filtreDevis(portee, { depart: 2, ecriture: true })
    const result = await pool.query(
      `DELETE FROM quote_requests qr WHERE id = $1 AND ${f.sql} RETURNING id`,
      [devisId, ...f.params]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' })
    }

    // Les relances planifiées d'un devis supprimé n'ont plus d'objet : on les
    // annule (même règle que l'annulation d'un devis guidé).
    await cancelPendingRelancesForDevis(devisId).catch(() => {})

    res.json({ success: true, deleted_id: devisId, source: 'v1' })
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

    // MONTANTS DU DEVIS : même règle que les contrats (lib/montants.js).
    // POURQUOI : `total_premium_cents` était calculé par
    // `Math.round(offers[0].prime_annuelle_eur * 100)` sans contrôle. Une offre
    // à `-2000` faisait DIMINUER le total de primes du cockpit, une offre à
    // `'abc'` produisait `NaN` (donc une écriture en échec ou un total faux),
    // et une offre à `99999999999999` rendait les KPI absurdes. On refuse la
    // finalisation en nommant l'offre fautive : le devis reste en brouillon.
    for (const [index, offre] of offers.entries()) {
      const montantOffre = offre?.prime_annuelle_eur ?? offre?.premium_annual ?? offre?.total_premium_eur
      // Un montant ABSENT reste absent (le devis n'aura pas de total de prime :
      // « non mesuré » ≠ « zéro ») ; seul un montant FOURNI est validé.
      const verdictMontant = montantOuNull(montantOffre)
      if (!verdictMontant.ok) {
        return res.status(400).json({
          ...erreurMontant('prime_annuelle_eur', verdictMontant),
          offre: { index, fournisseur: offre?.fournisseur || offre?.provider || offre?.libelle || null },
        })
      }
      // Le montant retenu est celui qui a été VALIDÉ (arrondi au centime) : la
      // même valeur entre dans le total, dans le PDF et dans le devis.
      if (verdictMontant.valeur !== null && offre && typeof offre === 'object') {
        offre.prime_annuelle_eur = verdictMontant.valeur
      }
    }

    const { rows: existing } = await pool.query(
      // Alias `d` : la portée cabinet (`d.cabinet_id` / `d.user_id`) l'exige.
      // Sans alias, la finalisation répondait 500
      // « missing FROM-clause entry for table "d" ».
      `SELECT * FROM devis_wizard d WHERE id = $1 AND ${filtreWizard(portee, { depart: 2, ecriture: true }).sql}`,
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
      // Alias `d` exigé par la portée cabinet (d.cabinet_id / d.user_id).
      `SELECT pdf_path, reference FROM devis_wizard d WHERE id = $1 AND ${fDevis.sql}`,
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
      // Alias `d` exigé par la portée cabinet (d.cabinet_id / d.user_id) : sans
      // lui, l'envoi du devis répondait 500 « missing FROM-clause entry for
      // table "d" » — aucun devis guidé ne pouvait donc partir par e-mail.
      `SELECT * FROM devis_wizard d WHERE id = $1 AND ${fDevis.sql}`,
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
    // Registre réel du cabinet — plus JAMAIS de numéro inventé dans un message
    // client (la version précédente imprimait « ORIAS 12345678 » en dur).
    const registreReel = await chargerRegistreReel(d)
    // Le numéro affiché est une donnée saisie par le cabinet : on la neutralise
    // pour l'HTML (aucune balise ne peut être injectée dans l'e-mail).
    const registreAffiche = registreReel ? String(registreReel).replace(/[^\w\s.-]/g, '').trim() : ''
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
          <p style="color:#6B7280;font-size:12px">Validité ${d.validity_days || 30} jours${registreAffiche ? ` · ORIAS ${registreAffiche}` : ''}</p>
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

    // Aperçu SANS envoi (`{"dry_run": true}`) : permet de vérifier le message
    // RÉELLEMENT produit (contenu, identité du cabinet, registre imprimé) sans
    // envoyer d'e-mail à un client et sans mentir sur l'état du devis : rien
    // n'est envoyé, le statut et `sent_at` restent inchangés.
    if (req.body?.dry_run === true || req.body?.apercu === true) {
      return res.json({
        ok: false,
        dry_run: true,
        envoye: false,
        destinataire: email,
        subject,
        html,
        registre_imprime: registreAffiche || null,
        message: "Aperçu : aucun e-mail n'a été envoyé et le devis n'a pas changé de statut.",
      })
    }

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
      // Alias `d` exigé par la portée cabinet (d.cabinet_id / d.user_id).
      `SELECT id, status, client_id FROM devis_wizard d WHERE id = $1 AND ${fWizard.sql}`,
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

// ─── POST /api/devis/:id/sign — marque signé ────────────────────────────────
//
// POURQUOI CETTE ROUTE A ÉTÉ RÉÉCRITE (Red Team P1 #1, mesuré en production
// le 20/09/2026)
// `POST /api/devis/8/sign {}` répondait HTTP 200 `{"ok":true}` alors que RIEN
// n'était signé : `quote_requests.status` restait 'draft', son `metadata`
// restait `{}` et `signature_requests` ne comptait aucune ligne. La cause : la
// route n'écrivait que dans `devis_wizard`, sans regarder le nombre de lignes
// réellement touchées, puis annonçait un succès inconditionnel. Le courtier
// croyait son devis signé ; la base disait le contraire.
//
// LA RÈGLE ICI : un succès n'est renvoyé QUE si une ligne a réellement changé
// d'état (vérifié par `RETURNING`, donc lu DANS la transaction d'écriture). Si
// le devis n'existe pas pour ce cabinet — ni devis guidé, ni devis v1 —, la
// réponse est un 404 explicite qui dit qu'aucune signature n'a été enregistrée.
router.post('/:id/sign', async (req, res) => {
  const userId = uid(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'signer un devis')) return

    const devisId = parseInt(req.params.id, 10)
    // Un identifiant qui n'est pas un entier ne peut désigner aucun devis : la
    // base n'est même pas interrogée (sinon PostgreSQL répondrait 500
    // « invalid input syntax for type integer »).
    if (!Number.isFinite(devisId) || devisId <= 0) {
      return res.status(404).json({
        error: 'devis_not_found',
        message: "Aucune signature n'a été enregistrée : cet identifiant de devis n'existe pas.",
      })
    }

    // ── 1. Devis GUIDÉ (`devis_wizard`) ─────────────────────────────────────
    const fSign = filtreWizard(portee, { depart: 2, ecriture: true })
    const wizard = await pool.query(
      `UPDATE devis_wizard d SET status = 'signed', signed_at = COALESCE(d.signed_at, NOW()), updated_at = NOW()
       WHERE d.id = $1 AND ${fSign.sql}
       RETURNING d.id, d.status, d.signed_at`,
      [devisId, ...fSign.params]
    )
    if (wizard.rows[0] && wizard.rows[0].status === 'signed') {
      await cancelPendingRelancesForDevis(devisId)
      await pool.query(
        `INSERT INTO devis_activity (devis_id, user_id, event, payload)
         VALUES ($1, $2, 'signed', '{}'::jsonb)`, [devisId, userId]
      ).catch(() => {})
      // La signature est PROUVÉE par la ligne renvoyée par l'UPDATE : le corps
      // de la réponse dit exactement ce qui a été écrit, pas ce qu'on espérait.
      return res.json({
        ok: true,
        devis_type: 'wizard',
        signature: {
          devis_id: wizard.rows[0].id,
          status: wizard.rows[0].status,
          signed_at: wizard.rows[0].signed_at,
        },
      })
    }

    // ── 2. Devis v1 (`quote_requests`) ──────────────────────────────────────
    // `metadata` porte désormais l'horodatage et l'auteur de la signature : un
    // devis v1 n'a pas de colonne `signed_at`, et un statut seul ne dit pas QUI
    // a signé. `suivant` vient du fragment de portée : l'index du paramètre
    // laissé libre, quel que soit le mode (cabinet ou mono-utilisateur).
    const fV1 = filtreDevis(portee, { depart: 2, ecriture: true })
    const v1 = await pool.query(
      `UPDATE quote_requests qr
          SET status = 'signed',
              metadata = COALESCE(qr.metadata, '{}'::jsonb)
                         || jsonb_build_object('signed_at', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
                                               'signed_by', $${fV1.suivant}::int),
              submitted_at = COALESCE(qr.submitted_at, NOW())
        WHERE qr.id = $1 AND ${fV1.sql}
        RETURNING qr.id, qr.status, qr.metadata`,
      [devisId, ...fV1.params, userId]
    )
    if (v1.rows[0] && v1.rows[0].status === 'signed') {
      return res.json({
        ok: true,
        devis_type: 'v1',
        signature: {
          devis_id: v1.rows[0].id,
          status: v1.rows[0].status,
          signed_at: (v1.rows[0].metadata || {}).signed_at || null,
        },
      })
    }

    // ── 3. Rien n'a été signé : on le dit, sans jamais un « ok » ────────────
    return res.status(404).json({
      error: 'devis_not_found',
      message: "Aucune signature n'a été enregistrée : ce devis n'existe pas dans votre cabinet (ni devis guidé, ni devis v1).",
    })
  } catch (err) {
    logger.error({ err: err.message }, 'devis signature')
    res.status(500).json({ error: 'sign_failed', message: 'La signature n’a pas pu être enregistrée.' })
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
      // Alias `d` exigé par la portée cabinet (d.cabinet_id / d.user_id).
      `SELECT * FROM devis_wizard d WHERE id = $1 AND ${fSrc.sql}`, [devisId, ...fSrc.params]
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
    if (!Number.isFinite(devisId) || devisId <= 0) {
      return res.status(400).json({ error: 'invalid_devis_id', message: 'Identifiant de devis invalide.' })
    }
    const fAnnule = filtreWizard(portee, { depart: 2, ecriture: true })
    // `RETURNING` + contrôle de `rowCount` : l'ancienne version renvoyait
    // `{ok:true}` même quand l'UPDATE ne touchait AUCUNE ligne (défaut reproduit
    // en production : POST /api/devis/15/cancel depuis un autre cabinet → 200
    // alors que rien n'avait changé). Un devis hors cabinet est INEXISTANT :
    // réponse 404, jamais un succès.
    const maj = await pool.query(
      `UPDATE devis_wizard d SET status = 'refused', updated_at = NOW()
       WHERE id = $1 AND ${fAnnule.sql} RETURNING id, reference, status`,
      [devisId, ...fAnnule.params]
    )
    if (!maj.rowCount) {
      return res.status(404).json({
        error: 'devis_not_found',
        message: 'Devis introuvable pour ce cabinet : aucune annulation effectuée.',
      })
    }
    await cancelPendingRelancesForDevis(devisId)
    res.json({ ok: true, cancelled_id: devisId, status: 'refused', reference: maj.rows[0].reference || null })
  } catch (err) {
    res.status(500).json({ error: 'cancel_failed' })
  }
})

module.exports = router
