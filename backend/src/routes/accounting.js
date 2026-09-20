/**
 * Routes Comptabilité / FEC
 * LOT 22 — Export comptable format DGFIP
 *
 * ════════════════════════════════════════════════════════════════════════════
 * L'EXPORT COMPTABLE EST UN ARTEFACT FRANÇAIS — IL EST RÉSERVÉ AU MARCHÉ FR
 * ════════════════════════════════════════════════════════════════════════════
 * POURQUOI (défaut P1 CH-017, mesuré le 20/09/2026 sur un cabinet suisse)
 * `GET /api/accounting/fec` répondait 200 AVEC l'en-tête FEC
 * (`JournalCode|JournalLib|EcritureNum|…|Idevise`) à un cabinet établi en
 * Suisse. Or le FEC (« fichier des écritures comptables ») est un format
 * NORMÉ PAR L'ADMINISTRATION FISCALE FRANÇAISE (DGFiP) : il n'a aucune
 * existence en Suisse, aucun logiciel comptable suisse ne l'attend, et servir
 * un fichier vide portant cette en-tête laisse croire que l'export est correct.
 * C'est un faux succès : l'écran affiche « export généré », le cabinet dépose
 * un fichier qui n'a aucune valeur chez lui.
 *
 * CORRECTIF RETENU : REFUSER PROPREMENT plutôt qu'inventer.
 * La route répond 501 (non implémenté) avec un message PRODUIT : elle dit que
 * l'export comptable est un format français, qu'aucun export équivalent n'est
 * disponible pour ce cabinet, et que rien n'a été produit. Nous n'inventons
 * AUCUN équivalent suisse (aucun format « FEC suisse » n'est validé) : une
 * fonctionnalité qui n'existe pas doit se voir, pas se simuler.
 * Le marché français garde EXACTEMENT son comportement : 200 + fichier FEC.
 *
 * La même règle s'applique à `POST /generate-from-commissions`, qui écrit des
 * écritures dans le PLAN COMPTABLE FRANÇAIS (journaux VE/…, comptes 411/701) :
 * générer ces écritures pour un cabinet suisse produirait un grand livre faux.
 */

const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/authMiddleware')
const fecService = require('../services/fecService')
const marcheCabinet = require('../lib/marcheCabinet')

router.use(verifyToken)

/** Marché du CABINET appelant (jamais celui de la personne connectée). */
async function marcheDuCabinetAppelant(req, res) {
  const pool = req.app.locals.pool
  const userId = req.user.id || req.user.userId
  const verdict = await marcheCabinet.marcheUtilisateur(userId, (sql, params) => pool.query(sql, params))
  const marche = (verdict && verdict.marche) || 'FR'
  if (marche === 'FR') return 'FR'

  // Message PRODUIT : il nomme le format, dit pourquoi il ne s'applique pas, et
  // affirme qu'aucun fichier n'a été produit (aucun « export généré » mensonger).
  res.status(501).json({
    error: 'export_comptable_indisponible_marche',
    marche,
    format: 'FEC',
    message:
      "L'export comptable COURTIA est le FEC (fichier des écritures comptables), "
      + "un format de l'administration fiscale française. Il ne s'applique pas à un "
      + "cabinet établi hors de France et aucun export équivalent n'est disponible "
      + "pour votre marché : aucun fichier n'a été généré.",
    alternative:
      "Vos commissions restent exportables depuis l'écran Commissions.",
  })
  return null
}

/**
 * Génère et télécharge le fichier FEC
 */
router.get('/fec', async (req, res) => {
  try {
    if (!(await marcheDuCabinetAppelant(req, res))) return
    const userId = req.user.id || req.user.userId
    const { start, end, year } = req.query

    let startDate, endDate

    if (year) {
      // Export année complète
      startDate = new Date(parseInt(year, 10), 0, 1)
      endDate = new Date(parseInt(year, 10), 11, 31)
    } else if (start && end) {
      startDate = new Date(start)
      endDate = new Date(end)
    } else {
      // Par défaut : année en cours
      const now = new Date()
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    }

    const fec = await fecService.generateFEC(req.app.locals.pool, userId, startDate, endDate)

    // Headers pour téléchargement
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${fec.filename}"`)
    res.send(fec.content)
  } catch (err) {
    console.error('[FEC] Erreur génération:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * Résumé comptable annuel
 */
router.get('/summary/:year', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const year = parseInt(req.params.year, 10) || new Date().getFullYear()

    const summary = await fecService.getAccountingSummary(req.app.locals.pool, userId, year)
    res.json(summary)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Bilan simplifié
 */
router.get('/balance/:year', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const year = parseInt(req.params.year, 10) || new Date().getFullYear()

    const balance = await fecService.getBalance(req.app.locals.pool, userId, year)
    res.json(balance)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Génère les écritures comptables depuis les commissions
 * (plan comptable FRANÇAIS : réservé au marché FR — voir l'en-tête du fichier)
 */
router.post('/generate-from-commissions', async (req, res) => {
  try {
    if (!(await marcheDuCabinetAppelant(req, res))) return
    const userId = req.user.id || req.user.userId
    const { startDate, endDate } = req.body

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate et endDate requis' })
    }

    const result = await fecService.generateEntriesFromCommissions(
      req.app.locals.pool,
      userId,
      new Date(startDate),
      new Date(endDate)
    )

    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Liste les écritures comptables
 */
router.get('/entries', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    const { year, month, journal, limit = 100, offset = 0 } = req.query

    let query = `
      SELECT * FROM accounting_entries
      WHERE user_id = $1
    `
    const params = [userId]

    if (year) {
      params.push(parseInt(year, 10))
      query += ` AND EXTRACT(YEAR FROM ecriture_date) = $${params.length}`
    }

    if (month) {
      params.push(parseInt(month, 10))
      query += ` AND EXTRACT(MONTH FROM ecriture_date) = $${params.length}`
    }

    if (journal) {
      params.push(journal)
      query += ` AND journal_code = $${params.length}`
    }

    query += ` ORDER BY ecriture_date DESC, ecriture_num DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit, 10), parseInt(offset, 10))

    const result = await req.app.locals.pool.query(query, params)

    res.json({ 
      data: result.rows.map(r => ({
        ...r,
        // Noms NEUTRES (devise non affirmée) en plus des noms historiques
        // `*_eur` : un cabinet suisse lit des montants en CHF sous un nom qui
        // n'affirme pas l'euro. Valeurs identiques, aucune conversion.
        debit: fecService.centsToEuros ? fecService.centsToEuros(r.debit_cents) : r.debit_cents / 100,
        credit: fecService.centsToEuros ? fecService.centsToEuros(r.credit_cents) : r.credit_cents / 100,
        debit_eur: fecService.centsToEuros ? fecService.centsToEuros(r.debit_cents) : r.debit_cents / 100,
        credit_eur: fecService.centsToEuros ? fecService.centsToEuros(r.credit_cents) : r.credit_cents / 100
      })),
      total: result.rows.length 
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Ajoute une écriture comptable manuelle
 */
router.post('/entries', async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId
    // Saisie MANUELLE : une écriture sans débit ni crédit est refusée (400).
    const entry = await fecService.createAccountingEntry(req.app.locals.pool, userId, req.body, { exigerMontant: true })
    res.status(201).json(entry)
  } catch (err) {
    // POURQUOI CE MAPPAGE (Red Team P1 #4, mesuré le 20/09/2026)
    // Cette route répondait 500 avec le message BRUT de PostgreSQL
    // (« invalid input syntax for type integer: "NaN" ») pour un champ mal
    // saisi. Une entrée invalide est un 400 : le message produit par les
    // validateurs dit quel champ corriger, et aucun nom de colonne, de type ou
    // de contrainte interne n'est transmis à l'appelant.
    const statut = err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500
    res.status(statut).json({
      error: err.code || 'accounting_entry_failed',
      message: statut === 400
        ? err.message
        : "Impossible d'enregistrer cette écriture pour le moment.",
      ...(err.champ ? { champs: [err.champ] } : {}),
    })
  }
})

module.exports = router
