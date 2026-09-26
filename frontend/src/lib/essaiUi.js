/**
 * essaiUi.js — ce que l'interface montre de l'essai, à partir du STATUT SERVEUR.
 *
 * Une seule source de vérité : `/api/billing/status` (calculé côté serveur sur
 * `users.subscription_status` + `users.trial_ends_at`). Le frontend ne calcule
 * jamais « il reste X jours » lui-même : il affiche `jours_restants`, et la
 * modale de fin d'essai se déclenche sur `trial_state`, pas sur une date locale.
 */

export const JOURS_ESSAI = 7

/** Décide de l'affichage (bandeau + paywall) à partir du statut serveur. */
export function decisionEssai(statut) {
  if (!statut || typeof statut !== 'object') {
    return { etat: 'inconnu', bandeau: null, paywall: null }
  }

  const etat = statut.trial_state
    || (statut.status === 'trialing' ? 'TRIAL_ACTIVE'
      : statut.status === 'trial_expired' ? 'TRIAL_EXPIRED'
        : statut.status === 'active' ? 'SUBSCRIPTION_ACTIVE' : 'NOT_STARTED')

  if (etat === 'TRIAL_ACTIVE') {
    const jours = Number.isFinite(Number(statut.jours_restants)) ? Number(statut.jours_restants) : null
    return {
      etat,
      bandeau: {
        titre: 'Essai gratuit',
        texte: jours === null
          ? 'Essai en cours.'
          : `${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}`,
        urgence: jours !== null && jours <= 2,
      },
      paywall: null,
    }
  }

  if (etat === 'TRIAL_EXPIRED') {
    return {
      etat,
      bandeau: null,
      paywall: {
        titre: 'Votre essai COURTIARK de 7 jours est terminé.',
        message: "Vos clients, contrats, documents et tâches sont conservés et restent consultables. Choisissez un abonnement pour reprendre les modifications.",
        ctaPrincipal: 'Choisir mon abonnement',
        ctaSecondaire: 'Contacter COURTIARK',
        finEssai: statut.trial_end_at || null,
      },
    }
  }

  // Abonnement actif (ou essai Stripe) : aucun paywall.
  return { etat, bandeau: null, paywall: null }
}

/**
 * Prix affichés dans la modale — ils viennent du serveur (`/api/billing/plans`),
 * jamais d'une constante recopiée. Sans données de prix, on n'affiche RIEN de
 * chiffré plutôt qu'un tarif non sourcé.
 */
export function lignesTarifs(reponsePlans) {
  const plans = Array.isArray(reponsePlans?.plans) ? reponsePlans.plans : []
  return plans
    .filter((p) => p && p.code && p.display_price_ht)
    .map((p) => ({
      code: p.code,
      nom: p.name || p.code,
      prix: p.display_price_ht,
      detail: p.display_price_ttc || null,
      surDevis: p.price === null || p.code === 'cabinet',
    }))
}

/** Le paiement en ligne est-il réellement disponible ? (sinon : état honnête) */
export function paiementDisponible(reponsePlans) {
  return Boolean(reponsePlans?.stripe_configuration?.checkout_ready)
}
