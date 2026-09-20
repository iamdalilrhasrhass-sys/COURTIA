const express = require('express')
const {
  upsertCommission,
  listCommissions,
  importCommissionsCsv,
  getCommissionStats,
} = require('../services/commissionService')
const { requireCabinetFeature } = require('../middleware/cabinetAccess')
const porteeCabinet = require('../lib/porteeCabinet')

const router = express.Router()

router.use(requireCabinetFeature('v1_commissions'))

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE DES COMMISSIONS : LE CABINET
//
// POURQUOI : les commissions étaient lues et écrites avec
// `commissions.user_id = utilisateur`. Un associé ne voyait donc que SES
// commissions, jamais celles du cabinet — et ne pouvait pas rattraper la
// commission oubliée d'un collègue. La portée est résolue une fois par requête
// (lib/porteeCabinet) et transmise au service ; `user_id` /
// `apporteur_user_id` restent l'ATTRIBUTION commerciale de chaque commission.
// ─────────────────────────────────────────────────────────────────────────────

/** Portée de la requête (mémoïsée). */
const porteeDe = (req) => porteeCabinet.resoudrePortee(req.app.locals.pool || require('../db'), req)

async function saveCommissionForContract(req, res) {
  try {
    const portee = await porteeDe(req)
    if (porteeCabinet.refuserEcriture(portee, res, 'enregistrer une commission')) return
    const row = await upsertCommission(req.app.locals.pool, req.user, req.params.id, req.body, portee)
    res.status(201).json(row)
  } catch (err) {
    const status = err.statusCode || (err.message === 'invalid_period' || err.message === 'insurer_required' ? 400 : 500)
    res.status(status).json({
      error: err.message || 'commission_save_failed',
      message: status === 404
        ? 'Contrat introuvable ou non rattaché à votre cabinet.'
        : 'Impossible d’enregistrer cette commission.',
    })
  }
}

router.get('/', async (req, res) => {
  try {
    const portee = await porteeDe(req)
    const rows = await listCommissions(req.app.locals.pool, req.user, req.query, portee)
    // DEVISE DU CABINET (P1 CH-013) : `GET /api/commissions` servait des montants
    // sous les seuls noms `expected_amount_eur` / `received_amount_eur`, y
    // compris à un cabinet suisse. Le nom du champ affirmait une devise fausse,
    // et rien dans la réponse ne permettait à un écran de savoir laquelle
    // afficher. La réponse porte donc la devise RÉELLE du cabinet
    // (lib/marcheCabinet) en plus des noms neutres `expected_amount` /
    // `received_amount` présents sur chaque ligne. Les noms historiques sont
    // CONSERVÉS : des écrans les lisent encore, et la valeur n'est pas convertie
    // — seule la devise affichée change.
    const devise = rows.find((ligne) => ligne.devise)?.devise || null
    res.json({ data: rows, total: rows.length, ...(devise ? { devise } : {}) })
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'commissions_unavailable',
      message: 'Impossible de charger les commissions pour le moment.',
    })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const portee = await porteeDe(req)
    const stats = await getCommissionStats(req.app.locals.pool, req.user, req.query, portee)
    res.json(stats)
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'commission_stats_unavailable',
      message: 'Impossible de calculer les statistiques commissions.',
    })
  }
})

router.post('/import', async (req, res) => {
  try {
    const portee = await porteeDe(req)
    if (porteeCabinet.refuserEcriture(portee, res, 'importer des commissions')) return
    const csv = req.body?.csv || req.body?.content || ''
    if (!csv) {
      return res.status(400).json({ error: 'csv_required', message: 'Ajoutez un contenu CSV à importer.' })
    }
    const report = await importCommissionsCsv(req.app.locals.pool, req.user, csv, portee)

    // ─────────────────────────────────────────────────────────────────────────
    // LE CODE HTTP DIT LA VÉRITÉ (Red Team P1 #2, mesuré le 20/09/2026)
    // L'import répondait 201 `{total:1, imported:0}` : le courtier lisait un
    // succès alors que sa base n'avait rien reçu. Un import qui n'importe AUCUNE
    // ligne est un échec (422, l'entrée est comprise mais inexploitable) et le
    // message dit exactement quoi corriger, ligne par ligne.
    // ─────────────────────────────────────────────────────────────────────────
    if (!report.imported) {
      const premier = report.errors[0] || {}
      return res.status(422).json({
        ...report,
        error: 'import_aucune_ligne',
        message: report.total === 0
          ? "Aucune ligne exploitable dans le fichier : la première ligne doit contenir les en-têtes (contract_ref, insurer, period, expected_amount)."
          : `Aucune commission n'a été importée sur ${report.total} ligne(s) lue(s). `
            + (premier.line ? `Ligne ${premier.line} : ${premier.error}` : 'Corrigez le fichier puis réessayez.'),
      })
    }

    res.status(201).json(report)
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message || 'commission_import_failed',
      message: 'Import commissions impossible pour le moment.',
    })
  }
})

router.post('/contracts/:id', saveCommissionForContract)

// LOT 22 — Commissions Auto + Rapprochement
const commissionsAutoService = require('../services/commissionsAutoService')

// Liste des règles de commission
router.get('/rules', async (req, res) => {
  try {
    const rules = await commissionsAutoService.listRules(req.app.locals.pool, req.user.id || req.user.userId)
    res.json({ data: rules, total: rules.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Créer/modifier une règle
router.post('/rules', async (req, res) => {
  try {
    const rule = await commissionsAutoService.upsertRule(req.app.locals.pool, req.user.id || req.user.userId, req.body)
    res.status(201).json(rule)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Calcul automatique pour un contrat
router.post('/calculate/:contractId', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { period } = req.body

    if (!period) {
      return res.status(400).json({ error: 'period requis (ex: "2026-05" ou { year: 2026, month: 5 })' })
    }

    // Portée cabinet : le contrat d'un collègue du même cabinet est légitime.
    const portee = await porteeDe(req)
    if (porteeCabinet.refuserEcriture(portee, res, 'calculer une commission')) return

    const result = await commissionsAutoService.calculateCommission(
      req.app.locals.pool,
      userId,
      parseInt(req.params.contractId, 10),
      period,
      portee
    )
    res.json(result)
  } catch (err) {
    res.status(err.message === 'Contrat introuvable' ? 404 : 500).json({ error: err.message })
  }
})

// Calcul batch pour une période
router.post('/calculate-period', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { period } = req.body

    if (!period) {
      return res.status(400).json({ error: 'period requis' })
    }

    const result = await commissionsAutoService.calculatePeriodCommissions(
      req.app.locals.pool,
      userId,
      period
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Rapprochement mensuel
router.get('/reconcile/:year/:month', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const year = parseInt(req.params.year, 10)
    const month = parseInt(req.params.month, 10)

    const result = await commissionsAutoService.reconcileMonth(
      req.app.locals.pool,
      userId,
      year,
      month
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Générer relevé PDF
router.get('/statement/:year/:month/pdf', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const year = parseInt(req.params.year, 10)
    const month = parseInt(req.params.month, 10)

    const result = await commissionsAutoService.generateStatement(
      req.app.locals.pool,
      userId,
      year,
      month
    )

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.pdf)
  } catch (err) {
    console.error('[Commissions PDF] Erreur:', err.message)
    const statut = err.statut || (err.code === 'statement_pdf_unavailable' ? 501 : 500)
    res.status(statut).json({
      error: err.code || 'statement_failed',
      message: statut === 501
        ? err.message
        : 'Le relevé de commissions est momentanément indisponible.',
    })
  }
})

// ─── LOT VIBE — Barèmes commissions (catalogue compagnies) ─────────────────
//
// Le catalogue ci-dessous est un catalogue d'EXEMPLE (8 « compagnies » qui
// n'existent pas sur le marché, avec des taux qui ne proviennent d'aucun barème
// réel). Il est conservé UNIQUEMENT comme aide à la saisie : il est étiqueté
// comme exemple partout où il est servi, et n'est plus utilisé pour produire un
// montant de commission présenté comme réel (voir /calculator et
// services/commissionTaux.js — « aucun taux arbitraire caché »).
const {
  BAREMES_EXEMPLE,
  MESSAGE_BAREME_REQUIS,
  resoudreTauxCommission,
  calculerCommission,
} = require('../services/commissionTaux')

/**
 * Cherche un barème RÉELLEMENT configuré par le cabinet (commission_baremes).
 * Les lignes de portée plateforme (user_id et cabinet_id NULL) sont le
 * catalogue d'exemple : elles ne comptent jamais comme un taux du cabinet.
 */
async function chercherBaremeCabinet(pool, user, compagnie, produit) {
  const userId = user?.id || user?.userId || null
  const cabinetId = user?.cabinetId || user?.cabinet_id || null
  if (!pool || (!userId && !cabinetId)) return null
  try {
    const { rows } = await pool.query(
      `SELECT rate_percent, rate_recurring_percent, user_id, cabinet_id
         FROM commission_baremes
        WHERE is_active = true AND compagnie = $1 AND produit = $2
          AND (($3::int IS NOT NULL AND user_id = $3) OR ($4::int IS NOT NULL AND cabinet_id = $4))
        ORDER BY rate_percent DESC
        LIMIT 1`,
      [compagnie, produit, userId, cabinetId]
    )
    return rows[0] || null
  } catch (_) {
    return null
  }
}

/** Cherche une règle de commission configurée par le cabinet (commission_rules). */
async function chercherRegleCabinet(pool, userId, compagnie, produit) {
  if (!pool || !userId) return null
  try {
    const { rows } = await pool.query(
      `SELECT rate_percent FROM commission_rules
        WHERE user_id = $1 AND is_active = true
          AND (product_type IS NULL OR product_type = $2)
          AND (company IS NULL OR company ILIKE $3)
        ORDER BY (product_type IS NOT NULL AND company IS NOT NULL) DESC, created_at DESC
        LIMIT 1`,
      [userId, produit, `%${compagnie}%`]
    )
    return rows[0] || null
  } catch (_) {
    return null
  }
}

router.get('/baremes', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    let rows = []
    try {
      const r = await pool.query(
        `SELECT compagnie, produit, rate_percent, rate_recurring_percent
         FROM commission_baremes
         WHERE is_active = true AND user_id IS NULL AND cabinet_id IS NULL
         ORDER BY compagnie, produit`
      )
      rows = r.rows || []
    } catch (_) {
      rows = []
    }

    // Les lignes « plateforme » (user_id et cabinet_id NULL) proviennent du
    // catalogue d'EXEMPLE livré avec le produit (compagnies et taux qui ne
    // correspondent à aucun barème réel). Elles sont servies, mais étiquetées :
    // un cabinet doit savoir que ces taux ne sont pas les siens.
    let source = rows.length ? 'exemple_plateforme_a_configurer' : 'cabinet'
    if (!rows.length) {
      rows = Object.entries(BAREMES_EXEMPLE).flatMap(([compagnie, produits]) =>
        Object.entries(produits).map(([produit, rate]) => ({
          compagnie,
          produit,
          rate_percent: rate,
          rate_recurring_percent: Number((rate * 0.6).toFixed(1)),
        }))
      )
      source = 'exemple_a_configurer'
    }

    res.json({
      data: rows,
      total: rows.length,
      source,
      ...(source === 'exemple_a_configurer' || source === 'exemple_plateforme_a_configurer'
        ? {
            message:
              "Barèmes d'exemple, à remplacer par ceux de votre cabinet : ces compagnies et ces taux "
              + "ne proviennent d'aucun barème réel. Saisissez vos propres taux pour que les calculs "
              + 'correspondent à vos conventions.',
          }
        : {}),
    })
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'Impossible de récupérer les barèmes.' })
  }
})

router.post('/calculator', async (req, res) => {
  try {
    const { compagnie, produit, prime_annuelle, recurrence, exemple } = req.body || {}
    if (!compagnie || !produit) {
      return res.status(400).json({ error: 'compagnie_produit_required' })
    }
    const pool = req.app.locals.pool
    const userId = req.user?.id || req.user?.userId || null

    const baremeCabinet = await chercherBaremeCabinet(pool, req.user, compagnie, produit)
    const regleCabinet = baremeCabinet ? null : await chercherRegleCabinet(pool, userId, compagnie, produit)

    // Un taux d'exemple n'est appliqué QUE si l'appelant le demande
    // explicitement (`exemple: true`) : sinon un simple calcul « pour voir »
    // produisait un montant à partir d'un taux inventé.
    const taux = resoudreTauxCommission({
      baremeCabinet,
      regleCabinet,
      compagnie,
      produit,
      exempleDemande: exemple === true,
    })

    if (!taux) {
      return res.status(409).json({
        error: 'bareme_requis',
        message: MESSAGE_BAREME_REQUIS,
        compagnie,
        produit,
        exemple_disponible: Boolean(BAREMES_EXEMPLE[compagnie]?.[produit]),
      })
    }

    const montants = calculerCommission({
      prime_annuelle,
      rate_percent: taux.rate_percent,
      recurrent: recurrence === 'recurring',
    })

    if (!montants) {
      return res.status(409).json({
        error: 'bareme_requis',
        message: MESSAGE_BAREME_REQUIS,
        compagnie,
        produit,
      })
    }

    res.json({
      compagnie,
      produit,
      source: taux.source,
      ...(taux.source === 'exemple'
        ? {
            message:
              "Calcul d'EXEMPLE : le taux appliqué est un taux d'exemple COURTIA, "
              + 'il ne correspond à aucune convention de votre cabinet.',
          }
        : {}),
      ...montants,
      prime_annuelle: Number(prime_annuelle || 0),
    })
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'Impossible de calculer cette commission.' })
  }
})

module.exports = {
  router,
  saveCommissionForContract,
  chercherBaremeCabinet,
  chercherRegleCabinet,
}
