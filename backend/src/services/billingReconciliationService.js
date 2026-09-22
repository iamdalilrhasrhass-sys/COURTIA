/**
 * billingReconciliationService.js — RÉCONCILIER STRIPE ET LA BASE COURTIA.
 *
 * POURQUOI CE SERVICE EXISTE (risque mesuré le 22/09/2026, confirmé par
 * l'analyse TypeSafe) : le webhook était le SEUL chemin d'écriture de l'état
 * d'abonnement. Un webhook perdu (base indisponible au mauvais moment, échec
 * définitif après les tentatives de Stripe) laissait un cabinet payant SANS
 * droits, ou un cabinet résilié AVEC droits, sans aucun moyen de le savoir.
 *
 * PROPRIÉTÉS TENUES :
 *  - Stripe reste la source de vérité : ce service recopie l'état Stripe, il ne
 *    l'invente jamais. Un abonnement dont le plan n'est PAS identifiable est
 *    signalé, pas deviné.
 *  - Idempotent : réexécuter la réconciliation sur un état déjà correct n'écrit
 *    rien de plus (comparaison avant écriture par `billingSubscriptionState`).
 *  - Non destructif : aucun abonnement, aucune facture, aucune donnée client
 *    n'est supprimé. Une ligne en base absente de Stripe est SIGNALÉE.
 *  - Observable : chaque exécution rend un rapport chiffré, et le rapport est
 *    conservé (table `billing_reconciliation_runs`) quand elle existe.
 *  - Compatible FR + CH : le plan est repris des métadonnées, sinon déduit du
 *    price ID — les grilles FR et CH ont des price IDs distincts, la déduction
 *    n'est donc jamais ambiguë.
 *  - Testable : le client Stripe et la fonction de requête sont injectés.
 */
const logger = require('../lib/logger');
const etatAbonnement = require('./billingSubscriptionState');

/** Liste TOUS les abonnements d'un client Stripe (pagination explicite). */
async function listerAbonnementsClient(stripe, customerId) {
  const abonnements = [];
  let startingAfter = null;
  for (let page = 0; page < 20; page += 1) {
    const reponse = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    const data = reponse?.data || [];
    abonnements.push(...data);
    if (!reponse?.has_more || data.length === 0) break;
    startingAfter = data[data.length - 1]?.id || null;
    if (!startingAfter) break;
  }
  return abonnements;
}

/**
 * Code de plan d'un abonnement Stripe : les métadonnées d'abord (posées par
 * notre Checkout), puis le price ID (les tarifs FR et CH sont distincts, donc
 * sans ambiguïté). Sinon `null` — et on ne devine pas.
 */
function codePlanDepuisAbonnement(abonnement, prixVersPlan) {
  const metadonnee = abonnement?.metadata?.plan_code || abonnement?.metadata?.plan || null;
  if (metadonnee) return String(metadonnee).trim().toLowerCase();
  const prix = (abonnement?.items?.data || []).map((item) => item?.price?.id).filter(Boolean);
  for (const priceId of prix) {
    const code = prixVersPlan?.get ? prixVersPlan.get(priceId) : null;
    if (code) return code;
  }
  return null;
}

/**
 * Réconcilie la base avec Stripe pour un cabinet donné.
 * Rend `{ organisation_id, abonnements_stripe, appliques, deja_a_jour, ignores, orphelins_base, erreur }`.
 */
async function reconcilierCabinet({ stripe, query, getPlanId, prixVersPlan, organizationId, stripeCustomerId }) {
  const rapport = {
    organization_id: organizationId,
    stripe_customer_id_present: !!stripeCustomerId,
    abonnements_stripe: 0,
    appliques: 0,
    deja_a_jour: 0,
    plan_non_identifie: [],
    orphelins_base: [],
    erreur: null,
  };
  if (!stripeCustomerId) {
    rapport.erreur = 'cabinet_sans_client_stripe';
    return rapport;
  }

  let abonnements = [];
  try {
    abonnements = await listerAbonnementsClient(stripe, stripeCustomerId);
  } catch (err) {
    rapport.erreur = `stripe_injoignable: ${err?.message || 'erreur inconnue'}`;
    return rapport;
  }
  rapport.abonnements_stripe = abonnements.length;

  for (const abonnement of abonnements) {
    const code = codePlanDepuisAbonnement(abonnement, prixVersPlan);
    if (!code) {
      rapport.plan_non_identifie.push({
        subscription_id: abonnement.id,
        status: abonnement.status || null,
        prix: (abonnement.items?.data || []).map((item) => item?.price?.id).filter(Boolean),
      });
      continue;
    }

    // IDEMPOTENCE : on compare l'état DÉSIRÉ à l'état STOCKÉ avant d'écrire. Sans
    // cette comparaison, une réconciliation réexécutée réécrivait la même chose
    // (et un horodatage identique ne prouve rien : Stripe date à la seconde, deux
    // événements différents peuvent porter la même).
    if (await etatDejaConforme({ query, getPlanId, organizationId, planCode: code, abonnement })) {
      rapport.deja_a_jour += 1;
      continue;
    }

    const resultat = await etatAbonnement.appliquerEtatAbonnement({
      query,
      getPlanId,
      organizationId,
      planCode: code,
      abonnement,
      eventCreatedAt: etatAbonnement.isoDepuisSecondes(abonnement.updated) || new Date().toISOString(),
      eventId: null,
    });
    if (resultat.applied) rapport.appliques += 1;
    else if (resultat.reason === 'evenement_en_retard') rapport.deja_a_jour += 1;
    else rapport.plan_non_identifie.push({ subscription_id: abonnement.id, raison: resultat.reason });
  }

  // Lignes en base que Stripe ne connaît pas pour ce client : SIGNALÉES, jamais
  // supprimées (elles peuvent venir d'un autre client Stripe mal rattaché, d'un
  // abonnement migré, ou d'un incident — c'est à l'exploitant de trancher).
  try {
    const enBase = await query(
      `SELECT provider_subscription_id, status FROM subscriptions
        WHERE organization_id=$1 AND provider='stripe' AND provider_subscription_id IS NOT NULL`,
      [organizationId]
    );
    const idsStripe = new Set(abonnements.map((a) => a.id));
    rapport.orphelins_base = (enBase.rows || [])
      .filter((ligne) => !idsStripe.has(ligne.provider_subscription_id))
      .map((ligne) => ({ provider_subscription_id: ligne.provider_subscription_id, status: ligne.status }));
  } catch (err) {
    rapport.erreur = `lecture_base: ${err?.message || 'erreur inconnue'}`;
  }

  return rapport;
}

/**
 * L'état stocké correspond-il DÉJÀ à l'état Stripe ? (comparaison de valeurs, pas
 * d'horodatage — Stripe date à la seconde et deux états différents peuvent porter
 * la même date). Sert à rendre la réconciliation réellement idempotente.
 */
async function etatDejaConforme({ query, getPlanId, organizationId, planCode, abonnement }) {
  const existante = await query(
    `SELECT id, organization_id, plan_id, status, trial_end_at, current_period_end, cancel_at_period_end
       FROM subscriptions WHERE provider_subscription_id=$1 LIMIT 1`,
    [abonnement.id]
  );
  const ligne = existante.rows[0];
  if (!ligne) return false;

  const planIdAttendu = await getPlanId(planCode);
  const memeDate = (a, b) => {
    const da = a ? new Date(a).getTime() : null;
    const db = b ? new Date(b).getTime() : null;
    return da === db;
  };
  return (
    Number(ligne.organization_id) === Number(organizationId)
    && Number(ligne.plan_id || 0) === Number(planIdAttendu || 0)
    && String(ligne.status || '') === String(abonnement.status || '')
    && memeDate(ligne.current_period_end, etatAbonnement.isoDepuisSecondes(abonnement.current_period_end))
    && memeDate(ligne.trial_end_at, etatAbonnement.isoDepuisSecondes(abonnement.trial_end))
    && !!ligne.cancel_at_period_end === !!abonnement.cancel_at_period_end
  );
}

/**
 * Réconciliation complète : tous les cabinets disposant d'un client Stripe.
 * `dryRun` n'est pas nécessaire : la fonction n'écrit que l'état Stripe réel.
 */
async function reconcilierTous({ stripe, query, getPlanId, prixVersPlan, maintenant = new Date(), limite = 500, journaliser = null } = {}) {
  const debut = new Date();
  const rapport = {
    demarre_le: debut.toISOString(),
    termine_le: null,
    duree_ms: null,
    cabinets_examines: 0,
    cabinets_avec_client_stripe: 0,
    abonnements_stripe: 0,
    appliques: 0,
    deja_a_jour: 0,
    plan_non_identifie: 0,
    orphelins_base: 0,
    erreurs: [],
    details: [],
  };

  const { rows } = await query(
    `SELECT organization_id, stripe_customer_id
       FROM customer_billing_profiles
      WHERE stripe_customer_id IS NOT NULL
      ORDER BY organization_id ASC
      LIMIT $1`,
    [limite]
  );
  rapport.cabinets_examines = (rows || []).length;

  for (const ligne of rows || []) {
    try {
      const detail = await reconcilierCabinet({
        stripe,
        query,
        getPlanId,
        prixVersPlan,
        organizationId: ligne.organization_id,
        stripeCustomerId: ligne.stripe_customer_id,
      });
      rapport.cabinets_avec_client_stripe += detail.stripe_customer_id_present ? 1 : 0;
      rapport.abonnements_stripe += detail.abonnements_stripe;
      rapport.appliques += detail.appliques;
      rapport.deja_a_jour += detail.deja_a_jour;
      rapport.plan_non_identifie += detail.plan_non_identifie.length;
      rapport.orphelins_base += detail.orphelins_base.length;
      if (detail.erreur) rapport.erreurs.push({ organization_id: ligne.organization_id, erreur: detail.erreur });
      if (detail.appliques || detail.plan_non_identifie.length || detail.orphelins_base.length || detail.erreur) {
        rapport.details.push(detail);
      }
    } catch (err) {
      // Une erreur sur un cabinet ne doit JAMAIS interrompre les autres.
      rapport.erreurs.push({ organization_id: ligne.organization_id, erreur: err?.message || 'erreur inconnue' });
    }
  }

  const fin = new Date();
  rapport.termine_le = fin.toISOString();
  rapport.duree_ms = fin.getTime() - debut.getTime();

  if (typeof journaliser === 'function') {
    journaliser({
      cabinets: rapport.cabinets_examines,
      abonnements: rapport.abonnements_stripe,
      corriges: rapport.appliques,
      a_jour: rapport.deja_a_jour,
      erreurs: rapport.erreurs.length,
    }, '[billing] réconciliation Stripe -> base terminée');
  }

  try {
    await query(
      `INSERT INTO billing_reconciliation_runs (
        started_at, finished_at, mode, clients_examines, abonnements_examines, corrections, erreurs, report_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        rapport.demarre_le, rapport.termine_le, 'manuel',
        rapport.cabinets_examines, rapport.abonnements_stripe, rapport.appliques,
        rapport.erreurs.length, JSON.stringify(rapport),
      ]
    );
  } catch (err) {
    // Table absente (base non migrée) : la réconciliation a quand même eu lieu.
    if (err?.code !== '42P01') {
      logger.warn({ error: err.message }, '[billing] rapport de réconciliation non conservé');
    }
  }

  return rapport;
}

module.exports = { listerAbonnementsClient, codePlanDepuisAbonnement, reconcilierCabinet, reconcilierTous };
