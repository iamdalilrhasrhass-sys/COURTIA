/**
 * subscriptionGuard.js — fin d'essai : lecture conservée, écriture suspendue.
 *
 * RÈGLE BUSINESS (validée par Dalil le 20/09/2026) : l'essai COURTIA dure
 * 7 jours. À l'expiration, AUCUNE donnée du cabinet n'est supprimée (clients,
 * contrats, documents, tâches, pipeline restent en base et restent lisibles) ;
 * seules les ÉCRITURES métier sont refusées, avec un code explicite
 * `trial_expired`, jusqu'à la souscription.
 *
 * POURQUOI CE FICHIER : le frontend ne doit jamais décider seul si un essai est
 * terminé (il le faisait avec sa propre date, donc deux vérités pour un même
 * compte). L'état vient de `users.subscription_status` + `users.trial_ends_at`,
 * et la décision est prise ici, côté serveur.
 *
 * DÉFAUT SÛR : si la base est injoignable, on LAISSE PASSER (comportement
 * actuel des autres gardes) — une panne d'infrastructure ne doit pas se
 * transformer en blocage commercial des deux cabinets en essai.
 */
const pool = require('../db')
const logger = require('../lib/logger')
const { verifyToken } = require('./auth')

// Statuts qui autorisent l'écriture. `past_due` est toléré : une carte refusée
// ne doit pas couper l'accès du jour au lendemain sans passer par le portail.
const STATUTS_AUTORISES = new Set(['active', 'trialing', 'past_due'])

async function etatAcces(userId) {
  if (!userId) return { ecriture_autorisee: false, raison: 'utilisateur_inconnu' }
  const { rows } = await pool.query(
    'SELECT plan, subscription_status, trial_ends_at FROM users WHERE id = $1',
    [userId]
  )
  const u = rows[0]
  if (!u) return { ecriture_autorisee: false, raison: 'utilisateur_inconnu' }

  const fin = u.trial_ends_at ? new Date(u.trial_ends_at) : null
  const finValide = fin && !Number.isNaN(fin.getTime()) ? fin : null

  if (u.subscription_status === 'trialing') {
    const actif = finValide !== null && finValide.getTime() > Date.now()
    return {
      ecriture_autorisee: actif,
      raison: actif ? 'essai_actif' : 'essai_expire',
      trial_state: actif ? 'TRIAL_ACTIVE' : 'TRIAL_EXPIRED',
      trial_end_at: finValide ? finValide.toISOString() : null,
    }
  }
  if (STATUTS_AUTORISES.has(u.subscription_status)) {
    return { ecriture_autorisee: true, raison: 'abonnement_actif', trial_state: 'SUBSCRIPTION_ACTIVE', trial_end_at: null }
  }
  return {
    ecriture_autorisee: false,
    raison: u.subscription_status || 'abonnement_inactif',
    trial_state: 'TRIAL_EXPIRED',
    trial_end_at: finValide ? finValide.toISOString() : null,
  }
}

/**
 * Middleware d'écriture. À monter AVANT les routeurs, sur les préfixes métier :
 * il vérifie lui-même le jeton (req.user n'existe pas encore à ce niveau).
 */
function requireActiveSubscription(req, res, next) {
  verifyToken(req, res, async (err) => {
    if (err || !req.user) return // verifyToken a déjà répondu (401)
    const userId = req.user.userId || req.user.id
    try {
      const etat = await etatAcces(userId)
      if (etat.ecriture_autorisee) {
        req.accesAbonnement = etat
        return next()
      }
      return res.status(402).json({
        error: 'trial_expired',
        trial_state: etat.trial_state,
        trial_end_at: etat.trial_end_at,
        raison: etat.raison,
        lecture_seule: true,
        message:
          "Votre essai COURTIA de 7 jours est terminé. Vos données sont conservées et restent consultables : choisissez un abonnement pour reprendre les modifications.",
      })
    } catch (e) {
      // Défaut sûr : panne de base => on laisse passer (les autres gardes font pareil).
      logger.warn({ err: e.message, route: req.originalUrl }, '[subscriptionGuard] vérification impossible — écriture laissée passer')
      return next()
    }
  })
}

module.exports = { etatAcces, requireActiveSubscription, STATUTS_AUTORISES }
