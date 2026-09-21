/**
 * ARK Predictive Intelligence — Routes
 *  POST /api/ark/churn-predict     → scan churn complet
 *  GET  /api/ark/cross-sell/matrix → matrice opportunités
 *  GET  /api/ark/renewals/optimize → optimiseur renouvellement
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CONTRAT DE `GET /api/ark/renewals/optimize` — L'ÉCHÉANCE DÉDUITE EST NOMMÉE
 * (défaut P3 IA-031, corrigé le 21/09/2026)
 *
 * Chaque entrée de `renewals[]` porte une échéance qui vient, soit du DOSSIER,
 * soit d'un CALCUL de COURTIA (`quote_data.created_at` + 12 mois). Les deux ne
 * doivent jamais être confondues à l'écran :
 *
 *   • `echeance_est_deduite` (booléen, NOM CANONIQUE)
 *       `true`  → la date servie est une ESTIMATION calculée par COURTIA : le
 *                 dossier ne portait aucune échéance. À afficher comme
 *                 « échéance estimée (déduite de la date de création) », jamais
 *                 comme une date nue.
 *       `false` → la date servie est celle du dossier (`quote_data.date_echeance`).
 *   • `echeance_source` : source lisible de la date servie
 *       `'quote_data.date_echeance'` ou `'derivee_creation_plus_12_mois'`.
 *   • `echeance_estimee` : ALIAS HISTORIQUE de `echeance_est_deduite` (même
 *       valeur, conservé pour les appelants existants).
 *   • `data_source.echeance` : libellé technique conservé pour compatibilité.
 *
 * À `true`, la date n'en reste pas moins utile (elle donne un ordre de grandeur) :
 * elle n'est simplement jamais présentée comme une date réelle du dossier.
 * ───────────────────────────────────────────────────────────────────────────
 */
const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth')
const intel = require('../services/arkIntelligenceService')
const logger = require('../lib/logger')
const { messagePublic } = require('../lib/erreursPubliques')

router.use(verifyToken)

function uid(req) { return Number(req.user?.userId || req.user?.id || 0) }

router.post('/churn-predict', async (req, res) => {
  try {
    const userId = uid(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const data = await intel.computeChurnForUser(userId)
    res.json({ ok: true, ...data })
  } catch (err) {
    logger?.error?.('[ark/churn-predict]', err)
    res.status(500).json({ error: 'churn_predict_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

router.get('/cross-sell/matrix', async (req, res) => {
  try {
    const userId = uid(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const data = await intel.computeCrossSellMatrix(userId)
    res.json({ ok: true, ...data })
  } catch (err) {
    logger?.error?.('[ark/cross-sell]', err)
    res.status(500).json({ error: 'cross_sell_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

router.get('/renewals/optimize', async (req, res) => {
  try {
    const userId = uid(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const data = await intel.computeRenewalOptimizations(userId)
    res.json({ ok: true, ...data })
  } catch (err) {
    logger?.error?.('[ark/renewals]', err)
    res.status(500).json({ error: 'renewals_failed', message: messagePublic(err, { statut: 500 }) })
  }
})

// Quick read-only fetch (latest cached)
router.get('/churn-predict/latest', async (req, res) => {
  try {
    const userId = uid(req)
    const pool = require('../db')
    const { rows } = await pool.query(`
      SELECT s.*, c.first_name, c.last_name, c.city
      FROM ark_churn_scores s
      JOIN clients c ON c.id = s.client_id
      WHERE s.user_id = $1 AND s.expires_at > NOW()
      ORDER BY s.score DESC LIMIT 20
    `, [userId])
    res.json({ ok: true, top_risks: rows })
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed' })
  }
})

module.exports = router
