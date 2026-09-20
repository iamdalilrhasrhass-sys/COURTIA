/**
 * Routes Reporting Avancé — LOT 20
 * Dashboard analytics personnalisable + exports CSV/PDF
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES INDICATEURS DE CE ÉCRAN NE SONT PLUS RECALCULÉS ICI
 *
 * POURQUOI (relevé du 20/09/2026, cabinet d'audit suisse) : ce fichier lisait la
 * table `contracts` — jamais alimentée par l'application — et comptait les DEVIS
 * dans `quotes` alors qu'ils vivent dans `devis_wizard`. Résultat : l'écran
 * Reporting annonçait « Prime annuelle totale 0 » et « 0 contrat » sur un cabinet
 * qui avait 2 contrats actifs (2 340,50 CHF) et 3 clients. Les requêtes viennent
 * désormais du bloc unique de définitions de `dashboard.js`
 * (`require('./dashboard').kpi`), partagé avec /api/dashboard/*, /api/analytics/*
 * et l'agrégat « prime par client » de /api/clients : le même concept donne le
 * même chiffre partout, et une définition ne peut plus dériver sur un seul écran.
 *
 * DÉFINITIONS (détaillées en tête de dashboard.js)
 *  • DEUX NOTIONS de contrat, nommées explicitement (arbitrage du 20/09/2026) :
 *    `kpis.contracts.total` = toutes les lignes de `quotes` de nature contrat
 *    (résilié/expiré/suspendu/annulé compris), `kpis.contracts.actifs` = celles
 *    au statut 'actif'/'active'. Un devis v1 resté dans `quotes` (statut
 *    'envoye'/'brouillon') n'est ni l'un ni l'autre : c'est un DEVIS.
 *  • devis = `devis_wizard` + les devis v1 restés dans `quotes`.
 *  • prime d'un contrat = colonne `prime_annuelle`, sinon quote_data->>'prime_annuelle',
 *    sinon `premium`/`amount` ; prime d'un devis = total_premium_cents / 100.
 *  • moyenne/taux sans dénominateur ⇒ `null` (pas de mesure), jamais 0 ni une
 *    valeur de repli inventée (l'ancien score ARK « par défaut 75 »).
 *
 * CLÉ `quotes` DES RÉPONSES — DÉPRÉCIÉE, PAS SUPPRIMÉE (arbitrage du 20/09/2026)
 * POURQUOI : `kpis.quotes` a toujours contenu des DEVIS, jamais des contrats. Le
 * nom disait « contrats », la valeur disait « devis » : l'écran Reporting en
 * tirait son « Taux de conversion devis », et la recette de cohérence ne pouvait
 * pas savoir quoi comparer (elle attendait des contrats, lisait des devis).
 * Décision : les devis sont exposés sous `kpis.devis` (nom juste) ; `kpis.quotes`
 * reste un ALIAS du MÊME objet pendant une version, annoncé comme déprécié dans
 * la réponse (`deprecations`) et par les en-têtes HTTP `Deprecation`/`Warning`.
 * Aucun écran ne peut lire deux chiffres différents sous les deux noms : c'est
 * le même objet, sérialisé une fois.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const { captureException } = require('../sentry')
const PDFDocument = require('pdfkit')
const porteeCabinet = require('../lib/porteeCabinet')
const devise = require('../lib/devise')
// Marché du cabinet : seule autorité pour devise et référentiel réglementaire.
const marcheCabinet = require('../lib/marcheCabinet')
const { kpi } = require('./dashboard')

// Un client est rattaché au cabinet par `courtier_id` (colonne réellement
// écrite par la création de client) ET/OU par `cabinet_id` (migration 113), et
// `user_id` reste la colonne historique de certains comptes. La portée vient de
// lib/porteeCabinet.js, la seule à faire autorité (même règle que /api/clients).

/** Devise du cabinet (CHF en Suisse, EUR sinon) — un montant ne porte jamais la
 * devise du développeur.
 *
 * POURQUOI lib/marcheCabinet.js : cette fonction lisait `cabinets.country` sans
 * repli et retombait sur l'euro dès que la colonne était vide — sur un cabinet
 * suisse créé avant la complétion de sa fiche, le cockpit affichait donc des
 * euros. Le helper résout le cabinet, puis son référent, puis (uniquement pour
 * un compte sans cabinet) le profil de la personne. */
async function deviseDuCabinet(pool, userId) {
  try {
    const marche = await marcheCabinet.marcheUtilisateur(userId, {
      query: (sql, params) => pool.query(sql, params),
    })
    return marche.marche
  } catch (_) {
    return 'FR'
  }
}

// GET /api/reporting/overview — KPIs globaux
router.get('/overview', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { period = '30d' } = req.query

    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30
    const portee = await porteeCabinet.resoudrePortee(pool, req)

    // Une requête par indicateur, définie UNE fois (bloc `kpi` de dashboard.js).
    const qClients = kpi.requeteClients(portee, { jours: days })
    const qContrats = kpi.requeteContrats(portee, { jours: days })
    const qDevis = kpi.requeteDevis(portee, { jours: days })
    // Les devis v1 restés dans `quotes` ('envoye'/'brouillon') sont des DEVIS :
    // ils rejoignent le compteur `devis` et ne sont jamais comptés en contrats.
    const qDevisV1 = kpi.requeteDevisV1(portee, { jours: days })
    const qTaches = kpi.requeteTaches(portee)
    const fOpp = porteeCabinet.fragment(portee, {
      cabinet: 'opportunities.cabinet_id', proprietaire: 'opportunities.user_id', depart: 1,
    })

    const [clientsRes, contractsRes, quotesRes, devisV1Res, tachesRes, oppRes, arkRes, signaturesRes] = await Promise.all([
      pool.query(qClients.sql, qClients.params),
      pool.query(qContrats.sql, qContrats.params),
      pool.query(qDevis.sql, qDevis.params),
      pool.query(qDevisV1.sql, qDevisV1.params),
      pool.query(qTaches.sql, qTaches.params),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(valeur_estimee), 0) as total_value,
          COUNT(*) FILTER (WHERE statut = 'gagne') as won
        FROM opportunities
        WHERE ${fOpp.sql}
      `, fOpp.params),
      pool.query(`
        SELECT
          COUNT(*) as total_signals,
          AVG(CASE WHEN type = 'ark_score' THEN CAST(data->>'score' AS DECIMAL) END) as avg_ark_score
        FROM ark_signals WHERE user_id = $1 AND created_at >= NOW() - $2::interval
      `, [portee.userId, `${days} days`]),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'signed') as signed
        FROM signature_requests WHERE user_id = $1
      `, [portee.userId])
    ])

    const clients = clientsRes.rows[0] || {}
    // CONTRATS et DEVIS sont assemblés par les fonctions PARTAGÉES de dashboard.js :
    // les trois écrans ne peuvent plus calculer ces nombres chacun de leur côté.
    const contrats = kpi.agregerContrats(contractsRes.rows[0])
    const devis = kpi.agregerDevis(quotesRes.rows[0], devisV1Res.rows[0])
    const taches = tachesRes.rows[0] || {}
    const opportunities = oppRes.rows[0] || {}
    const arkMetrics = arkRes.rows[0] || {}
    const signatures = signaturesRes.rows[0] || {}

    // Le bloc « devis » porte DEUX noms dans la réponse :
    //   `devis`  — le nom juste (devis_wizard + devis v1 restés dans `quotes`) ;
    //   `quotes` — alias HISTORIQUE conservé une version, parce que l'écran
    //              Reporting Avancé le lisait pour son « Taux de conversion
    //              devis ». Son nom dit « contrats » alors qu'il contient des
    //              DEVIS : c'est précisément ce qui a fait échouer la recette de
    //              cohérence. Les deux clés portent le MÊME objet — impossible
    //              d'y lire deux chiffres différents — et la dépréciation est
    //              annoncée dans la réponse (champ `deprecations`) ET par les
    //              en-têtes HTTP `Deprecation` / `Warning`.
    const blocDevis = {
      total: devis.total,
      totalValue: devis.totalValue,
      // Champ dédié : combien de devis portaient réellement un montant.
      avecMontant: devis.avecPrime,
      // Dont devis v1 restés dans `quotes` : publié pour que l'audit vérifie sans
      // relire la base que les devis ne sont pas (ou plus) comptés en contrats.
      dontV1: devis.dontV1,
      won: devis.signes,
      signed: devis.signes,
      sent: devis.envoyes,
      draft: devis.enPreparation,
      refused: devis.refuses,
      new: devis.nouveaux,
      // Aucun devis ⇒ le taux n'existe pas : null (« pas de mesure »), pas 0 %.
      conversionRate: devis.conversionRate,
    }

    // Annonce de dépréciation, lisible par un client HTTP : que remplacer, par
    // quoi, et quand la clé disparaîtra. Une clé dépréciée sans annonce est une
    // clé que personne ne peut cesser d'utiliser.
    const deprecations = [{
      champ: 'kpis.quotes',
      remplace_par: 'kpis.devis',
      depuis: '2026-09-20',
      retrait_prevu: 'version suivante (2026-10)',
      raison: "la clé `quotes` a toujours contenu des DEVIS, jamais des contrats : son nom induisait en erreur et faisait afficher un taux de conversion calculé sur la mauvaise population",
    }]

    res.set('Deprecation', 'true')
    res.set('Warning', '299 - "kpis.quotes est déprécié : utiliser kpis.devis"')

    res.json({
      period,
      deprecations,
      definitions: {
        // Les deux notions de contrat, nommées comme dans les deux autres écrans.
        'contrats.total': "toutes les lignes de `quotes` de nature contrat, résilié/expiré/suspendu/annulé compris ; un devis v1 resté dans `quotes` (statut 'envoye'/'brouillon') n'est PAS un contrat",
        'contrats.actifs': "lignes de `quotes` au statut 'actif'/'active' : contrats en cours, base de la prime du portefeuille",
        'contrats.totalValue': 'somme des primes des contrats ACTIFS (colonne prime_annuelle, sinon quote_data->>\'prime_annuelle\', sinon premium/amount)',
        'contrats.totalValueTous': 'somme des primes de TOUTES les lignes de nature contrat (résiliés compris) — audit seulement, jamais le chiffre d\'affaires',
        devis: "lignes de `devis_wizard` PLUS les devis v1 restés dans `quotes` (un devis n'est pas un contrat)",
        client: 'ligne de la table clients rattachée au cabinet (ou à l’utilisateur sans cabinet)',
      },
      kpis: {
        clients: {
          total: parseInt(clients.total, 10) || 0,
          new: parseInt(clients.nouveaux, 10) || 0,
          actifs: parseInt(clients.actifs, 10) || 0,
          prospects: parseInt(clients.prospects, 10) || 0,
        },
        contracts: {
          // LES DEUX NOTIONS (voir definitions ci-dessus).
          total: contrats.total,
          actifs: contrats.actifs,
          totalValue: contrats.primeTotale,
          totalValueTous: contrats.primeTotaleTous,
          // Champ dédié : « 0 CHF de prime » et « prime non renseignée » ne sont
          // pas la même chose — ce compteur dit combien de contrats portaient la mesure.
          contratsAvecPrime: contrats.avecPrime,
          new: contrats.nouveaux,
          expiring30d: contrats.echeances30j,
          expiring90d: contrats.echeances90j,
        },
        devis: blocDevis,
        // ALIAS DÉPRÉCIÉ — même objet, conservé une version (voir `deprecations`).
        quotes: blocDevis,
        taches: {
          total: parseInt(taches.total, 10) || 0,
          enRetard: parseInt(taches.en_retard, 10) || 0,
        },
        opportunities: {
          total: parseInt(opportunities.total, 10) || 0,
          totalValue: parseFloat(opportunities.total_value) || 0,
          won: parseInt(opportunities.won, 10) || 0,
        },
        ark: {
          totalSignals: parseInt(arkMetrics.total_signals, 10) || 0,
          // Aucun signal noté = aucune moyenne : null (l'ancien « 75 » par défaut
          // était un chiffre inventé affiché comme une mesure).
          avgScore: arkMetrics.avg_ark_score === null || arkMetrics.avg_ark_score === undefined
            ? null
            : Math.round(parseFloat(arkMetrics.avg_ark_score)),
        },
        signatures: {
          total: parseInt(signatures.total, 10) || 0,
          signed: parseInt(signatures.signed, 10) || 0,
          rate: kpi.taux(parseInt(signatures.signed, 10) || 0, parseInt(signatures.total, 10) || 0),
        },
      },
    })
  } catch (err) {
    console.error('[Reporting] overview error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/clients/evolution — Courbe de croissance clients
router.get('/clients/evolution', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { period = '30d' } = req.query

    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    // MÊME portée que le compteur de clients de /overview (cabinet, pas utilisateur) :
    // une courbe qui compte d'autres clients que le chiffre affiché à côté est un écart.
    const fCl = kpi.porteeClients(portee, { alias: 'clients' })

    const result = await pool.query(`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM clients
      WHERE ${fCl.sql} AND created_at >= NOW() - $${fCl.suivant}::interval
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `, [...fCl.params, `${days} days`])

    const cumulativeResult = await pool.query(`
      SELECT COUNT(*) as total FROM clients
      WHERE ${fCl.sql} AND created_at < NOW() - $${fCl.suivant}::interval
    `, [...fCl.params, `${days} days`])

    let cumulative = parseInt(cumulativeResult.rows[0].total, 10) || 0

    const evolution = result.rows.map(row => {
      cumulative += parseInt(row.count, 10)
      return {
        date: row.date,
        new: parseInt(row.count, 10),
        cumulative,
      }
    })

    res.json({ period, evolution })
  } catch (err) {
    console.error('[Reporting] clients evolution error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/revenue/forecast — Prévisions CA
router.get('/revenue/forecast', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const portee = await porteeCabinet.resoudrePortee(pool, req)

    // Contrats ACTIFS de `quotes` (la table `contracts` n'est jamais écrite :
    // la lire donnait un ARR de 0 alors que le portefeuille portait des primes).
    const fCl = kpi.porteeClients(portee, { alias: 'c' })

    const [currentRes, renewalsRes, oppRes] = await Promise.all([
      pool.query(`
        SELECT COALESCE(SUM(${kpi.PRIME_CONTRAT}), 0) as current_arr
        FROM quotes q
        JOIN clients c ON c.id = q.client_id
        WHERE ${fCl.sql} AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
        AND (${kpi.ECHEANCE_CONTRAT} IS NULL OR ${kpi.ECHEANCE_CONTRAT} > NOW())
      `, fCl.params),
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN ${kpi.ECHEANCE_CONTRAT} BETWEEN NOW() AND NOW() + INTERVAL '30 days' THEN ${kpi.PRIME_CONTRAT} END), 0) as next_30d,
          COALESCE(SUM(CASE WHEN ${kpi.ECHEANCE_CONTRAT} BETWEEN NOW() AND NOW() + INTERVAL '90 days' THEN ${kpi.PRIME_CONTRAT} END), 0) as next_90d
        FROM quotes q
        JOIN clients c ON c.id = q.client_id
        WHERE ${fCl.sql} AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
      `, fCl.params),
      pool.query(`
        SELECT COALESCE(SUM(valeur_estimee), 0) as pipeline_value
        FROM opportunities
        WHERE ${porteeCabinet.fragment(portee, { cabinet: 'opportunities.cabinet_id', proprietaire: 'opportunities.user_id', depart: 1 }).sql}
          AND statut IN ('nouveau', 'en_cours', 'chaud')
      `, porteeCabinet.fragment(portee, { cabinet: 'opportunities.cabinet_id', proprietaire: 'opportunities.user_id', depart: 1 }).params)
    ])

    const currentArr = parseFloat((currentRes.rows[0] || {}).current_arr) || 0
    const renewals30d = parseFloat((renewalsRes.rows[0] || {}).next_30d) || 0
    const renewals90d = parseFloat((renewalsRes.rows[0] || {}).next_90d) || 0
    const pipelineValue = parseFloat((oppRes.rows[0] || {}).pipeline_value) || 0

    res.json({
      // Base annuelle = prime annuelle des contrats actifs non échus (définition
      // unique, voir dashboard.js). `projeté` et les cibles de croissance restent
      // des PROJECTIONS : elles sont annoncées comme telles (pas une mesure).
      currentARR: currentArr,
      projectedARR: currentArr + (pipelineValue * 0.3),
      renewals: {
        next30d: renewals30d,
        next90d: renewals90d,
      },
      pipeline: {
        totalValue: pipelineValue,
        weightedValue: pipelineValue * 0.3,
      },
      growth: {
        monthlyTarget: currentArr * 1.05,
        quarterlyTarget: currentArr * 1.15,
      },
    })
  } catch (err) {
    console.error('[Reporting] revenue forecast error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/ark-performance — Métriques ARK
router.get('/ark-performance', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { period = '30d' } = req.query

    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const fCl = kpi.porteeClients(portee, { alias: 'c' })

    const [signalsRes, actionsRes, scoresRes] = await Promise.all([
      pool.query(`
        SELECT
          type,
          COUNT(*) as count
        FROM ark_signals
        WHERE user_id = $1 AND created_at >= NOW() - $2::interval
        GROUP BY type
      `, [portee.userId, `${days} days`]),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE completed = true) as completed
        FROM ark_actions
        WHERE user_id = $1 AND created_at >= NOW() - $2::interval
      `, [portee.userId, `${days} days`]),
      // Portée cabinet (l'analyse d'un portefeuille est celle du cabinet, pas
      // d'un seul commercial).
      pool.query(`
        SELECT
          AVG(c.ark_score) as avg_score,
          MIN(c.ark_score) as min_score,
          MAX(c.ark_score) as max_score,
          COUNT(*) FILTER (WHERE c.ark_score >= 80) as excellent,
          COUNT(*) FILTER (WHERE c.ark_score >= 60 AND c.ark_score < 80) as good,
          COUNT(*) FILTER (WHERE c.ark_score < 60) as needs_attention,
          COUNT(c.ark_score) as notes
        FROM clients c
        WHERE ${fCl.sql} AND c.ark_score IS NOT NULL
      `, fCl.params)
    ])

    const signalsByType = {}
    signalsRes.rows.forEach(r => { signalsByType[r.type] = parseInt(r.count, 10) })

    const actions = actionsRes.rows[0] || {}
    const scores = scoresRes.rows[0] || {}
    const nbNotes = parseInt(scores.notes, 10) || 0

    res.json({
      period,
      signals: {
        total: Object.values(signalsByType).reduce((a, b) => a + b, 0),
        byType: signalsByType,
      },
      actions: {
        total: parseInt(actions.total, 10) || 0,
        completed: parseInt(actions.completed, 10) || 0,
        completionRate: kpi.taux(parseInt(actions.completed, 10) || 0, parseInt(actions.total, 10) || 0),
      },
      scores: {
        // Aucun client noté ⇒ aucune moyenne/min/max : null (jamais « 75 » ni « 100 »).
        average: nbNotes > 0 ? Math.round(parseFloat(scores.avg_score)) : null,
        min: nbNotes > 0 ? Math.round(parseFloat(scores.min_score)) : null,
        max: nbNotes > 0 ? Math.round(parseFloat(scores.max_score)) : null,
        notes: nbNotes,
        distribution: {
          excellent: parseInt(scores.excellent, 10) || 0,
          good: parseInt(scores.good, 10) || 0,
          needsAttention: parseInt(scores.needs_attention, 10) || 0,
        },
      },
    })
  } catch (err) {
    console.error('[Reporting] ark performance error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/products — Répartition par type de produit
router.get('/products', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const fCl = kpi.porteeClients(portee, { alias: 'c' })

    // Contrats ACTIFS de `quotes` — l'ancienne version lisait `contracts`
    // (toujours vide) et n'affichait donc aucun produit.
    const result = await pool.query(`
      SELECT
        COALESCE(q.quote_data->>'type_contrat', 'autre') as product_type,
        COUNT(*) as count,
        COALESCE(SUM(${kpi.PRIME_CONTRAT}), 0) as total_premium
      FROM quotes q
      JOIN clients c ON c.id = q.client_id
      WHERE ${fCl.sql} AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
      GROUP BY q.quote_data->>'type_contrat'
      ORDER BY total_premium DESC
    `, fCl.params)

    res.json({
      products: result.rows.map(r => ({
        type: r.product_type,
        count: parseInt(r.count, 10),
        totalPremium: parseFloat(r.total_premium),
      })),
    })
  } catch (err) {
    console.error('[Reporting] products error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/export/csv — Export données CSV
router.get('/export/csv', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { type = 'clients' } = req.query
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const fCl = kpi.porteeClients(portee, { alias: 'c' })

    let data = []
    let headers = []

    if (type === 'clients') {
      // `prime_annuelle_total` = somme des primes des contrats ACTIFS du client,
      // avec la même expression de prime que partout ailleurs (kpi.PRIME_CONTRAT,
      // alias `q`). `prime_totale` reste émis sous son ancien nom.
      const result = await pool.query(`
        SELECT
          c.first_name, c.last_name, c.email, c.phone,
          c.ark_score,
          COUNT(q.id) as contracts_count,
          COALESCE(SUM(${kpi.PRIME_CONTRAT}), 0) as total_premium,
          c.created_at
        FROM clients c
        LEFT JOIN quotes q ON q.client_id = c.id AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
        WHERE ${fCl.sql}
        GROUP BY c.id
        ORDER BY c.last_name
      `, fCl.params)
      headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Score ARK', 'Contrats', 'Prime totale', 'Créé le']
      data = result.rows.map(r => [
        r.first_name, r.last_name, r.email, r.phone,
        r.ark_score, r.contracts_count, r.total_premium,
        r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''
      ])
    } else if (type === 'contracts') {
      const result = await pool.query(`
        SELECT
          c.first_name || ' ' || c.last_name as client_name,
          q.quote_data->>'numero' as numero_contrat,
          q.quote_data->>'type_contrat' as type_contrat,
          q.quote_data->>'compagnie' as compagnie,
          ${kpi.PRIME_CONTRAT} as prime_annuelle,
          NULLIF(q.quote_data->>'date_effet', '')::date as date_effet,
          ${kpi.ECHEANCE_CONTRAT} as date_echeance
        FROM quotes q
        JOIN clients c ON q.client_id = c.id
        WHERE ${fCl.sql} AND q.status IN ${kpi.STATUTS_CONTRAT_ACTIF}
        ORDER BY ${kpi.ECHEANCE_CONTRAT}
      `, fCl.params)
      headers = ['Client', 'N° Contrat', 'Type', 'Compagnie', 'Prime', 'Date effet', 'Échéance']
      data = result.rows.map(r => [
        r.client_name, r.numero_contrat, r.type_contrat, r.compagnie,
        r.prime_annuelle,
        r.date_effet ? new Date(r.date_effet).toLocaleDateString('fr-FR') : '',
        r.date_echeance ? new Date(r.date_echeance).toLocaleDateString('fr-FR') : ''
      ])
    }

    const csv = [headers.join(';'), ...data.map(row => row.join(';'))].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="export_${type}_${Date.now()}.csv"`)
    res.send('﻿' + csv)
  } catch (err) {
    console.error('[Reporting] export CSV error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/reporting/export/pdf — Rapport PDF
router.get('/export/pdf', verifyToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const portee = await porteeCabinet.resoudrePortee(pool, req)

    const qClients = kpi.requeteClients(portee, { jours: 30 })
    const qContrats = kpi.requeteContratsActifs(portee, { jours: 30 })
    const fCl = kpi.porteeClients(portee, { alias: 'c' })
    const marche = await deviseDuCabinet(pool, portee.userId)

    const [clientsRes, contractsRes, statsRes] = await Promise.all([
      pool.query(qClients.sql, qClients.params),
      pool.query(qContrats.sql, qContrats.params),
      pool.query(`SELECT ROUND(AVG(c.ark_score)::numeric)::int as avg_score, COUNT(c.ark_score) as notes FROM clients c WHERE ${fCl.sql} AND c.ark_score IS NOT NULL`, fCl.params)
    ])

    const doc = new PDFDocument({ margin: 50 })
    const buffers = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="rapport_courtia_${Date.now()}.pdf"`)
      res.send(pdf)
    })

    const nbClients = parseInt(clientsRes.rows[0].total, 10) || 0
    const nbContrats = parseInt(contractsRes.rows[0].total, 10) || 0
    const primeTotale = parseFloat(contractsRes.rows[0].prime_totale) || 0
    const nbNotes = parseInt(statsRes.rows[0].notes, 10) || 0

    doc.fontSize(24).fillColor('#6366f1').text('COURTIA', { align: 'center' })
    doc.fontSize(16).fillColor('#333').text('Rapport de Performance', { align: 'center' })
    doc.moveDown()
    doc.fontSize(10).fillColor('#666').text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' })
    doc.moveDown(2)

    doc.fontSize(14).fillColor('#6366f1').text('Synthèse du Portefeuille')
    doc.moveDown()
    doc.fontSize(12).fillColor('#333')
    doc.text(`Nombre de clients : ${nbClients}`)
    doc.text(`Nombre de contrats actifs : ${nbContrats}`)
    // Devise du cabinet (CHF en Suisse) et « — » quand aucune prime n'est
    // renseignée : un rapport ne transforme pas une absence en « 0 EUR ».
    doc.text(`Prime totale annuelle : ${nbContrats > 0 ? devise.fmtMontant(primeTotale, marche) : '—'}`)
    doc.text(`Score ARK moyen : ${nbNotes > 0 ? `${parseInt(statsRes.rows[0].avg_score, 10)} / 100 (${nbNotes} client(s) noté(s))` : '— (aucun client noté)'}`)
    doc.moveDown(2)

    doc.fontSize(10).fillColor('#999').text('Ce rapport a été généré automatiquement par COURTIA - Plateforme ARK pour courtiers en assurance.', { align: 'center' })

    doc.end()
  } catch (err) {
    console.error('[Reporting] export PDF error:', err)
    captureException(err)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
