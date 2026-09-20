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
    // Jamais de 501 « non implémenté » nu (P2 « D2-11 ») : la deuxième QA adverse
    // relève qu'un 501 sur un point d'entrée du produit compte comme une erreur
    // serveur. Le relevé indisponible répond 403 « fonctionnalité non souscrite »,
    // avec le message du produit — jamais un message d'infrastructure.
    const nonSouscrit = err.code === 'fonctionnalite_non_souscrite'
    res.status(nonSouscrit ? 403 : (err.statut || 500)).json({
      error: err.code || 'statement_failed',
      ...(nonSouscrit ? { fonctionnalite: err.fonctionnalite || 'releve_commissions_pdf' } : {}),
      message: nonSouscrit
        ? err.message
        : 'Le relevé de commissions est momentanément indisponible. Réessayez dans quelques instants.',
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
async function chercherBaremeCabinet(pool, user, compagnie, produit, portee = null) {
  const userId = user?.id || user?.userId || null
  // Cabinet de la PORTÉE (lib/porteeCabinet) : un barème saisi par un collègue
  // du même cabinet est un taux du cabinet. On retombe sur la colonne du profil
  // si la portée n'a pas été transmise.
  const cabinetId = portee?.cabinetId || user?.cabinetId || user?.cabinet_id || null
  if (!pool || (!userId && !cabinetId)) return null
  try {
    // Clause construite explicitement : `(cabinet_id = NULL OR …)` ne filtrerait
    // rien du tout (piège classique du NULL en SQL).
    const conditions = []
    const params = [compagnie, produit]
    if (cabinetId) { params.push(cabinetId); conditions.push(`cabinet_id = $${params.length}`) }
    if (userId) { params.push(userId); conditions.push(`user_id = $${params.length}`) }
    const { rows } = await pool.query(
      `SELECT rate_percent, rate_recurring_percent, user_id, cabinet_id
         FROM commission_baremes
        WHERE is_active = true AND compagnie = $1 AND produit = $2
          AND (${conditions.join(' OR ')})
        ORDER BY rate_percent DESC
        LIMIT 1`,
      params
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
    const portee = await porteeDe(req)
    const userId = req.user?.id || req.user?.userId || null
    const cabinetId = portee?.cabinetId || null

    // ─────────────────────────────────────────────────────────────────────────
    // P3 — L'API NE PRÉSENTE PAS DES BARÈMES D'EXEMPLE COMME CEUX DU CABINET
    // (mesuré le 20/09/2026 : 80 lignes servies à un cabinet qui n'en avait aucun)
    //
    // DÉFAUT : la route ne servait QUE les lignes de portée plateforme
    // (`user_id IS NULL AND cabinet_id IS NULL`) — le catalogue d'exemple livré
    // avec le produit, nommant huit assureurs qui n'existent pas (Oria, Novalia,
    // Solenys, Atlas, Aurora, Serenis, Helios, Nivalis) — et JAMAIS les barèmes
    // du cabinet, après avoir été lus pourtant dans la même table. Les 80 lignes
    // partaient avec `source: 'exemple_a_configurer'` mais sans aucune marque par
    // ligne : un client d'API ne pouvait pas distinguer un taux du cabinet d'un
    // taux inventé.
    //
    // CORRECTIF : deux blocs EXPLICITEMENT séparés —
    //   • les barèmes DU CABINET (`cabinet_id`/`user_id` de la portée), `exemple: false` ;
    //   • le catalogue d'exemple, TOUJOURS marqué `exemple: true` ligne par ligne.
    // Aucun barème d'exemple n'est utilisé pour un calcul : `/calculator` n'accepte
    // un taux d'exemple que si l'appelant le demande (`exemple: true`), et
    // `chercherBaremeCabinet` ne lit que les lignes du cabinet.
    // ─────────────────────────────────────────────────────────────────────────
    let baremesCabinet = []
    try {
      const conditions = []
      const params = []
      if (cabinetId) { params.push(cabinetId); conditions.push(`cabinet_id = $${params.length}`) }
      if (userId) { params.push(userId); conditions.push(`user_id = $${params.length}`) }
      if (conditions.length > 0) {
        const r = await pool.query(
          `SELECT compagnie, produit, rate_percent, rate_recurring_percent
             FROM commission_baremes
            WHERE is_active = true AND (${conditions.join(' OR ')})
            ORDER BY compagnie, produit`,
          params
        )
        baremesCabinet = (r.rows || []).map((ligne) => ({ ...ligne, exemple: false }))
      }
    } catch (_) {
      baremesCabinet = []
    }

    let exemples = []
    try {
      const r = await pool.query(
        `SELECT compagnie, produit, rate_percent, rate_recurring_percent
           FROM commission_baremes
           WHERE is_active = true AND user_id IS NULL AND cabinet_id IS NULL
           ORDER BY compagnie, produit`
      )
      exemples = r.rows || []
    } catch (_) {
      exemples = []
    }
    if (exemples.length === 0) {
      exemples = Object.entries(BAREMES_EXEMPLE).flatMap(([compagnie, produits]) =>
        Object.entries(produits).map(([produit, rate]) => ({
          compagnie,
          produit,
          rate_percent: rate,
          rate_recurring_percent: Number((rate * 0.6).toFixed(1)),
        }))
      )
    }
    const exemplesMarques = exemples.map((ligne) => ({ ...ligne, exemple: true, calculable: false }))

    // `data` ne contient QUE les barèmes du cabinet (les seuls calculables) ;
    // le catalogue d'exemple part dans `exemples`, marqué ligne par ligne. Un
    // client d'API ne peut donc plus prendre un taux d'exemple pour un taux du
    // cabinet, et l'écran `/commissions/calculator` (qui n'utilise `data` que
    // lorsque `source === 'cabinet'`) reste exactement sur la même règle.
    const message = baremesCabinet.length === 0
      ? "Aucun barème de commission n'est enregistré pour votre cabinet. Les lignes de `exemples` sont des "
        + "BARÈMES D'EXEMPLE (compagnies et taux qui ne proviennent d'aucun barème réel) : elles ne sont "
        + 'jamais appliquées à un calcul. Saisissez vos propres taux pour que les calculs correspondent '
        + 'à vos conventions.'
      : "`data` contient les barèmes enregistrés pour votre cabinet. Les lignes de `exemples` (marquées "
        + "`exemple: true`) proviennent du catalogue d'exemple COURTIA et ne sont jamais appliquées à un calcul."

    res.json({
      data: baremesCabinet,
      total: baremesCabinet.length,
      total_cabinet: baremesCabinet.length,
      exemples: exemplesMarques,
      total_exemple: exemplesMarques.length,
      source: baremesCabinet.length > 0 ? 'cabinet' : 'exemple_a_configurer',
      message,
    })
  } catch (err) {
    // Aucun message d'infrastructure dans la réponse.
    res.status(500).json({
      error: 'baremes_indisponibles',
      message: 'Les barèmes de commission sont momentanément indisponibles. Réessayez dans quelques instants.',
    })
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
    // Portée cabinet : un barème saisi par un collègue du même cabinet est un
    // taux du cabinet (même autorité que partout ailleurs, lib/porteeCabinet).
    const portee = await porteeDe(req)

    const baremeCabinet = await chercherBaremeCabinet(pool, req.user, compagnie, produit, portee)
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
    res.status(500).json({
      error: 'calcul_commission_indisponible',
      message: 'Le calcul de commission est momentanément indisponible. Aucun montant n’a été produit.',
    })
  }
})

module.exports = {
  router,
  saveCommissionForContract,
  chercherBaremeCabinet,
  chercherRegleCabinet,
}
