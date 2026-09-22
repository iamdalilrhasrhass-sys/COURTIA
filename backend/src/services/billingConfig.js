/**
 * billingConfig.js — configuration de facturation, EN UN SEUL ENDROIT.
 *
 * POURQUOI CE FICHIER : les durées et les seuils qui pilotent l'accès d'un cabinet
 * étaient dispersés (durée d'essai dans `billingService`, statuts tolérés dans
 * `subscriptionGuard`, aucune notion de délai d'impayé). Un seuil recopié à deux
 * endroits finit par diverger, et une divergence de facturation se paie en accès
 * donnés à tort ou retirés à tort.
 *
 * RÈGLE : AUCUNE durée commerciale n'est inventée ici. Chaque valeur a une
 * variable d'environnement explicite, et une ABSENCE de valeur garde le
 * comportement documenté (voir `BILLING_GRACE_DAYS`).
 */

const logger = require('../lib/logger');

/** Durée de l'essai gratuit, en jours (variable historique BILLING_TRIAL_DAYS). */
function trialDays() {
  const brut = Number(process.env.BILLING_TRIAL_DAYS);
  return Number.isFinite(brut) && brut > 0 ? Math.floor(brut) : 7;
}

/**
 * Délai de grâce après un impayé (`invoice.payment_failed`).
 *
 * DÉFAUT : `null` = AUCUNE LIMITE. C'est le comportement mesuré le 22/09/2026
 * (un statut `past_due` tolérait les écritures sans borne) : tant qu'aucune durée
 * commerciale n'a été décidée, on ne l'invente pas et on ne coupe pas un cabinet
 * qui paie en retard pour une raison de carte. La valeur se règle par
 * `BILLING_GRACE_DAYS` (entier de jours, 0 = coupure immédiate possible).
 *
 * À FAIRE PAR DALIL : choisir la durée commerciale (aucune n'existe dans le
 * projet ni dans le Vault au 22/09/2026).
 */
function graceDays() {
  const brut = process.env.BILLING_GRACE_DAYS;
  if (brut === undefined || brut === null || String(brut).trim() === '') return null;
  const nombre = Number(brut);
  if (!Number.isFinite(nombre) || nombre < 0) {
    // Une valeur illisible ne doit pas se transformer en coupure d'accès : on
    // garde le comportement sans limite et on le signale.
    logger.warn({ valeur: String(brut).slice(0, 8) }, '[billing] BILLING_GRACE_DAYS illisible — délai de grâce ignoré');
    return null;
  }
  return Math.floor(nombre);
}

/** Fin du délai de grâce (Date) ou null si aucune date de départ / aucune limite. */
function graceDeadline(pastDueSince, { jours = graceDays() } = {}) {
  if (jours === null || !pastDueSince) return null;
  const debut = new Date(pastDueSince);
  if (Number.isNaN(debut.getTime())) return null;
  return new Date(debut.getTime() + jours * 86400000);
}

/** Le délai de grâce est-il dépassé ? (faux tant qu'aucune durée n'est configurée) */
function graceExcedee(pastDueSince, { maintenant = new Date(), jours = graceDays() } = {}) {
  const fin = graceDeadline(pastDueSince, { jours });
  if (!fin) return false;
  return fin.getTime() <= maintenant.getTime();
}

/**
 * Planification de la réconciliation Stripe -> base, en expression cron.
 * `null` (défaut) = AUCUNE exécution automatique : la réconciliation reste une
 * action explicite (endpoint d'administration). Une planification par défaut
 * serait une décision d'exploitation qui n'appartient pas au code.
 */
function reconciliationCron() {
  const valeur = String(process.env.BILLING_RECONCILIATION_CRON || '').trim();
  return valeur || null;
}

module.exports = { trialDays, graceDays, graceDeadline, graceExcedee, reconciliationCron };
