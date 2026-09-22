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
const billingConfig = require('../services/billingConfig')

// Statuts qui autorisent l'écriture. `past_due` est toléré : une carte refusée
// ne doit pas couper l'accès du jour au lendemain sans passer par le portail.
// DEPUIS L'AUDIT STRIPE DU 22/09/2026, cette tolérance est BORNÉE si — et
// seulement si — une durée commerciale est configurée (`BILLING_GRACE_DAYS`).
// Sans valeur configurée, le comportement reste celui d'avant (aucune coupure) :
// on n'invente pas une durée à la place du commerce, mais la date de début
// d'impayé est désormais stockée, donc la borne est applicable à tout moment.
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
  // Compte INVITÉ mais pas encore activé (invitation d'essai) : l'essai n'a pas
  // commencé, il ne peut donc pas être « expiré ». On refuse les écritures avec
  // une raison distincte, pour ne jamais annoncer au cabinet une fin d'essai
  // qui n'a pas eu lieu.
  if (u.subscription_status === 'pending_activation') {
    return {
      ecriture_autorisee: false,
      raison: 'activation_requise',
      trial_state: 'TRIAL_PENDING',
      trial_end_at: null,
    }
  }
  // IMPAYÉ : toléré, mais borné si une durée de grâce est configurée. La date de
  // début d'impayé vit dans `subscriptions.past_due_since` (écrite par le
  // webhook ET par la réconciliation) ; elle est lue ici pour la MÊME règle que
  // celle exposée par /api/billing/status.
  if (u.subscription_status === 'past_due') {
    const jours = billingConfig.graceDays()
    let depuis = null
    try {
      const { rows: impayes } = await pool.query(
        `SELECT s.past_due_since
           FROM subscriptions s
           JOIN organization_profiles op ON op.id = s.organization_id
          WHERE op.owner_user_id = $1 AND s.status = 'past_due'
          ORDER BY s.updated_at DESC, s.id DESC
          LIMIT 1`,
        [userId]
      )
      depuis = impayes[0]?.past_due_since || null
    } catch (e) {
      logger.warn({ err: e.message, user_id: userId }, '[subscriptionGuard] date d\'impayé indisponible — grâce non applicable')
      depuis = null
    }
    const delaiDepasse = billingConfig.graceExcedee(depuis, { jours })
    if (delaiDepasse) {
      return {
        ecriture_autorisee: false,
        raison: 'impaye_grace_depassee',
        trial_state: 'PAST_DUE_EXPIRED',
        trial_end_at: null,
        impaye_depuis: depuis ? new Date(depuis).toISOString() : null,
        delai_grace_jours: jours,
      }
    }
    return {
      ecriture_autorisee: true,
      raison: depuis ? 'impaye_tolere' : 'abonnement_actif',
      trial_state: 'SUBSCRIPTION_ACTIVE',
      trial_end_at: null,
      impaye_depuis: depuis ? new Date(depuis).toISOString() : null,
      delai_grace_jours: jours,
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
        // Champs d'impayé (audit Stripe du 22/09/2026) : l'écran peut dire DEPUIS
        // QUAND le paiement est en échec au lieu d'annoncer une fin d'essai qui
        // n'a pas eu lieu.
        impaye_depuis: etat.impaye_depuis || null,
        delai_grace_jours: etat.delai_grace_jours ?? null,
        message:
          etat.raison === 'activation_requise'
            ? "Votre accès n'est pas encore activé : ouvrez le lien d'invitation reçu pour choisir votre mot de passe, puis votre essai COURTIA de 7 jours démarrera à ce moment-là. Vos données restent consultables."
            : (etat.raison === 'impaye_grace_depassee'
              ? "Le paiement de votre abonnement est en échec depuis plus longtemps que le délai toléré. Vos données sont conservées et restent consultables : régularisez le moyen de paiement depuis votre espace facturation pour reprendre les modifications."
              : "Votre essai COURTIA de 7 jours est terminé. Vos données sont conservées et restent consultables : choisissez un abonnement pour reprendre les modifications."),
      })
    } catch (e) {
      // Défaut sûr : panne de base => on laisse passer (les autres gardes font pareil).
      logger.warn({ err: e.message, route: req.originalUrl }, '[subscriptionGuard] vérification impossible — écriture laissée passer')
      return next()
    }
  })
}

module.exports = { etatAcces, requireActiveSubscription, STATUTS_AUTORISES }
