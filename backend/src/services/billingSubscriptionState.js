/**
 * billingSubscriptionState.js — L'ÉTAT D'ABONNEMENT ÉCRIT EN BASE, EN UN SEUL ENDROIT.
 *
 * POURQUOI CE FICHIER : l'état de facturation d'un cabinet était écrit par le
 * webhook Stripe, seul. Deux conséquences mesurées le 22/09/2026 :
 *   1. aucun autre chemin ne pouvait corriger la base (pas de réconciliation) ;
 *   2. un abonnement créé ou modifié HORS de notre Checkout (métadonnées absentes)
 *      n'était rattaché à personne : la branche sortait en silence, sans erreur,
 *      et le cabinet restait invisible côté COURTIA.
 *
 * Ce module est le point d'écriture UNIQUE, utilisé par le webhook ET par la
 * réconciliation. Les deux chemins partagent donc les mêmes règles : un
 * abonnement réparé par la réconciliation donne EXACTEMENT les mêmes droits
 * qu'un abonnement reçu par webhook.
 *
 * RÈGLES TENUES ICI :
 *  - Stripe est la source de vérité de l'état de facturation ; ce module recopie
 *    cet état, il ne l'invente jamais (un plan non identifiable est REFUSÉ, pas
 *    deviné).
 *  - Événement en retard : un événement plus ancien que le dernier état appliqué
 *    n'écrase rien (les webhooks arrivent dans le désordre, Stripe rejoue).
 *  - Non destructif : jamais de suppression d'abonnement ni de données client.
 *  - Un code de plan suisse (`independant`, `cabinet_ch`) est un plan légitime :
 *    il est écrit tel quel dans `users.plan` (la résolution des fonctions se fait
 *    dans les deux catalogues, cf. `planService.planParCode`).
 */
const logger = require('../lib/logger');

/** Codes du plan acceptés par la vue historique `billing_subscriptions` (CHECK SQL). */
const CODES_VUE_HISTORIQUE = new Set(['starter', 'pro', 'cabinet', 'premium']);

function isoDepuisSecondes(secondes) {
  if (secondes === null || secondes === undefined || secondes === '') return null;
  const nombre = Number(secondes);
  if (!Number.isFinite(nombre) || nombre <= 0) return null;
  return new Date(nombre * 1000).toISOString();
}

/** Normalise un abonnement Stripe (ou une ligne reconstruite) en objet simple. */
function normaliserAbonnement(source = {}) {
  return {
    id: source.id || null,
    status: source.status || null,
    customer: typeof source.customer === 'string' ? source.customer : (source.customer?.id || null),
    metadata: source.metadata || {},
    trial_start: source.trial_start ?? null,
    trial_end: source.trial_end ?? null,
    current_period_start: source.current_period_start ?? null,
    current_period_end: source.current_period_end ?? null,
    cancel_at_period_end: !!source.cancel_at_period_end,
    prix_ids: (source.items?.data || [])
      .map((item) => item?.price?.id)
      .filter(Boolean),
    plan_code_metadata: source.metadata?.plan_code || source.metadata?.plan || null,
    user_id_metadata: Number(source.metadata?.user_id || 0) || null,
    organization_id_metadata: Number(source.metadata?.organization_id || 0) || null,
  };
}

/** Contexte du cabinet propriétaire : utilisateur propriétaire + cabinet. */
async function contexteCabinet(query, organizationId) {
  const result = await query(
    `SELECT op.owner_user_id,
            cm.cabinet_id
       FROM organization_profiles op
       LEFT JOIN cabinet_members cm
         ON cm.user_id = op.owner_user_id
        AND cm.removed_at IS NULL
       WHERE op.id=$1
       ORDER BY CASE WHEN cm.role='owner' THEN 0 ELSE 1 END, cm.created_at ASC
       LIMIT 1`,
    [organizationId]
  );
  return result.rows[0] || { owner_user_id: null, cabinet_id: null };
}

/**
 * Utilisateur à créditer quand les métadonnées de l'abonnement sont absentes :
 * le PROPRIÉTAIRE du cabinet. C'est le seul rattachement non ambigu possible —
 * on ne devine jamais un collaborateur.
 */
async function utilisateurDuCabinet(query, organizationId) {
  const result = await query(
    'SELECT owner_user_id FROM organization_profiles WHERE id=$1 LIMIT 1',
    [organizationId]
  );
  const id = Number(result.rows[0]?.owner_user_id || 0) || null;
  return id;
}

async function organisationDuClientStripe(query, customerId) {
  if (!customerId) return null;
  const result = await query(
    'SELECT organization_id FROM customer_billing_profiles WHERE stripe_customer_id=$1 LIMIT 1',
    [customerId]
  );
  return Number(result.rows[0]?.organization_id || 0) || null;
}

/**
 * Écrit (ou met à jour) la ligne d'abonnement d'un cabinet.
 * Rend `{ id, applied, reason }` : `applied: false` avec une raison explicite
 * quand l'état reçu est plus ancien que celui déjà appliqué.
 */
async function upsertAbonnement({
  query,
  organizationId,
  planId,
  planCode,
  providerSubscriptionId,
  statut,
  trialStartAt = null,
  trialEndAt = null,
  currentPeriodStart = null,
  currentPeriodEnd = null,
  cancelAtPeriodEnd = false,
  eventCreatedAt = null,
  eventId = null,
}) {
  const existante = await query(
    'SELECT id, status, last_event_created_at, past_due_since FROM subscriptions WHERE provider_subscription_id=$1 LIMIT 1',
    [providerSubscriptionId]
  );
  const ligne = existante.rows[0] || null;

  if (ligne && eventCreatedAt) {
    const dejaApplique = ligne.last_event_created_at ? new Date(ligne.last_event_created_at).getTime() : null;
    const recu = new Date(eventCreatedAt).getTime();
    if (dejaApplique !== null && Number.isFinite(recu) && recu < dejaApplique) {
      return { id: ligne.id, applied: false, reason: 'evenement_en_retard' };
    }
  }

  // `past_due_since` : date de DÉBUT de l'impayé, posée une seule fois et
  // effacée dès que l'abonnement repasse actif. C'est cette date qui rend un
  // délai de grâce calculable (billingConfig.graceExcedee).
  const statutInactif = statut === 'past_due';
  const sortDeImpaye = statut === 'active' || statut === 'trialing';

  if (!ligne) {
    const inserted = await query(
      `INSERT INTO subscriptions (
        organization_id, plan_id, provider, provider_subscription_id, status,
        trial_start_at, trial_end_at, current_period_start, current_period_end, cancel_at_period_end,
        past_due_since, last_event_created_at, last_event_id, created_at, updated_at
      ) VALUES ($1,$2,'stripe',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
      RETURNING id`,
      [
        organizationId, planId, providerSubscriptionId, statut,
        trialStartAt, trialEndAt, currentPeriodStart, currentPeriodEnd, !!cancelAtPeriodEnd,
        statutInactif ? new Date().toISOString() : null, eventCreatedAt, eventId,
      ]
    );
    return { id: inserted.rows[0]?.id || null, applied: true, reason: 'cree' };
  }

  await query(
    `UPDATE subscriptions
        SET organization_id=$1,
            plan_id=$2,
            status=$3,
            trial_start_at=COALESCE($4, trial_start_at),
            trial_end_at=COALESCE($5, trial_end_at),
            current_period_start=COALESCE($6, current_period_start),
            current_period_end=COALESCE($7, current_period_end),
            cancel_at_period_end=$8,
            past_due_since = CASE
              WHEN $9::text = 'past_due' THEN COALESCE(past_due_since, NOW())
              WHEN $10::boolean THEN NULL
              ELSE past_due_since
            END,
            last_event_created_at = CASE
              WHEN $11::timestamptz IS NULL THEN last_event_created_at
              WHEN last_event_created_at IS NULL THEN $11::timestamptz
              WHEN $11::timestamptz > last_event_created_at THEN $11::timestamptz
              ELSE last_event_created_at
            END,
            last_event_id = COALESCE($12, last_event_id),
            updated_at=NOW()
      WHERE id=$13`,
    [
      organizationId, planId, statut, trialStartAt, trialEndAt, currentPeriodStart, currentPeriodEnd,
      !!cancelAtPeriodEnd, statut, sortDeImpaye, eventCreatedAt, eventId, ligne.id,
    ]
  );
  return { id: ligne.id, applied: true, reason: 'mis_a_jour' };
}

/** Vue historique `billing_subscriptions` (son CHECK SQL ne connaît que les codes FR). */
async function upsertVueHistorique({ query, organizationId, planCode, statut, stripeCustomerId, stripeSubscriptionId, currentPeriodEnd, cancelAtPeriodEnd }) {
  if (!CODES_VUE_HISTORIQUE.has(String(planCode))) {
    // Un code de la grille suisse violerait le CHECK de cette table LEGACY (jamais
    // lue par le produit). On l'écrit dans le rapport au lieu de laisser un échec
    // silencieux avalé par un try/catch.
    return { ecrite: false, raison: 'code_hors_vue_historique' };
  }
  try {
    const contexte = await contexteCabinet(query, organizationId);
    await query(
      `INSERT INTO billing_subscriptions (
        organization_id, cabinet_id, user_id, stripe_customer_id, stripe_subscription_id,
        plan, status, current_period_end, cancel_at_period_end, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      ON CONFLICT (organization_id) DO UPDATE SET
        cabinet_id = EXCLUDED.cabinet_id,
        user_id = EXCLUDED.user_id,
        stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, billing_subscriptions.stripe_customer_id),
        stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, billing_subscriptions.stripe_subscription_id),
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW()`,
      [
        organizationId, contexte.cabinet_id || null, contexte.owner_user_id || null,
        stripeCustomerId || null, stripeSubscriptionId || null, planCode, statut,
        currentPeriodEnd || null, !!cancelAtPeriodEnd,
      ]
    );
    return { ecrite: true };
  } catch (err) {
    if (err?.code !== '42P01') {
      logger.warn({ error: err.message, organization_id: organizationId }, '[billing] vue historique non synchronisée');
    }
    return { ecrite: false, raison: err?.code === '42P01' ? 'table_absente' : 'erreur' };
  }
}

/**
 * CŒUR : applique un abonnement Stripe à la base COURTIA (abonnement + vue
 * historique + droits de l'utilisateur). Utilisé par le webhook ET par la
 * réconciliation — c'est ce qui garantit qu'ils ne peuvent pas diverger.
 */
async function appliquerEtatAbonnement({
  query,
  getPlanId,
  organizationId,
  planCode,
  userId = null,
  abonnement,
  eventCreatedAt = null,
  eventId = null,
}) {
  const abo = normaliserAbonnement(abonnement);
  const code = planCode || abo.plan_code_metadata || null;
  if (!code) {
    // Sans code de plan identifiable, on n'écrit PAS : deviner un plan
    // reviendrait à donner des droits qui ne correspondent à aucun achat.
    return { applied: false, reason: 'plan_non_identifie', subscription_id: abo.id };
  }
  if (!abo.id) {
    return { applied: false, reason: 'abonnement_sans_identifiant', plan_code: code };
  }

  const utilisateur = userId || abo.user_id_metadata || (await utilisateurDuCabinet(query, organizationId));

  // ORDRE VOLONTAIRE : la vérification d'ancienneté de l'événement est faite
  // AVANT toute écriture (y compris sur `users`). Une écriture faite « au
  // passage » avant ce contrôle laissait un événement en retard modifier la
  // fiche du cabinet alors que l'état d'abonnement, lui, était conservé.
  const planId = await getPlanId(code);
  const resultatAbonnement = await upsertAbonnement({
    query,
    organizationId,
    planId,
    planCode: code,
    providerSubscriptionId: abo.id,
    statut: abo.status || 'inactive',
    trialStartAt: isoDepuisSecondes(abo.trial_start),
    trialEndAt: isoDepuisSecondes(abo.trial_end),
    currentPeriodStart: isoDepuisSecondes(abo.current_period_start),
    currentPeriodEnd: isoDepuisSecondes(abo.current_period_end),
    cancelAtPeriodEnd: abo.cancel_at_period_end,
    eventCreatedAt,
    eventId,
  });

  if (!resultatAbonnement.applied) {
    // Événement en retard : l'état en base est plus récent, on ne touche à RIEN
    // (ni la vue historique, ni les droits).
    return { ...resultatAbonnement, plan_code: code, user_id: utilisateur };
  }

  const vueHistorique = await upsertVueHistorique({
    query,
    organizationId,
    planCode: code,
    statut: abo.status || 'inactive',
    stripeCustomerId: abo.customer,
    stripeSubscriptionId: abo.id,
    currentPeriodEnd: isoDepuisSecondes(abo.current_period_end),
    cancelAtPeriodEnd: abo.cancel_at_period_end,
  });

  if (utilisateur) {
    await query(
      `UPDATE users
          SET plan=$1,
              subscription_status=$2,
              stripe_customer_id=COALESCE($3, stripe_customer_id),
              stripe_subscription_id=COALESCE($4, stripe_subscription_id),
              trial_ends_at=COALESCE($5, trial_ends_at),
              current_period_end=COALESCE($6, current_period_end),
              updated_at=NOW()
        WHERE id=$7`,
      [
        code, abo.status || 'inactive', abo.customer || null, abo.id,
        isoDepuisSecondes(abo.trial_end), isoDepuisSecondes(abo.current_period_end), utilisateur,
      ]
    );
  }

  return {
    applied: true,
    reason: resultatAbonnement.reason,
    subscription_id: resultatAbonnement.id,
    provider_subscription_id: abo.id,
    plan_code: code,
    statut: abo.status || 'inactive',
    user_id: utilisateur,
    vue_historique: vueHistorique,
  };
}

/**
 * Statut d'abonnement porté par un événement de FACTURE
 * (`invoice.paid` / `invoice.payment_failed`), avec la même règle d'ordre.
 */
async function appliquerStatutFacture({ query, providerSubscriptionId, statut, eventCreatedAt = null, eventId = null }) {
  if (!providerSubscriptionId) return { applied: false, reason: 'facture_sans_abonnement' };
  const existante = await query(
    'SELECT id, last_event_created_at FROM subscriptions WHERE provider_subscription_id=$1 LIMIT 1',
    [providerSubscriptionId]
  );
  const ligne = existante.rows[0];
  if (!ligne) return { applied: false, reason: 'abonnement_inconnu' };

  if (eventCreatedAt && ligne.last_event_created_at) {
    const recu = new Date(eventCreatedAt).getTime();
    const dejaApplique = new Date(ligne.last_event_created_at).getTime();
    if (Number.isFinite(recu) && recu < dejaApplique) {
      return { applied: false, reason: 'evenement_en_retard' };
    }
  }

  await query(
    `UPDATE subscriptions
        SET status=$1,
            past_due_since = CASE
              WHEN $1::text = 'past_due' THEN COALESCE(past_due_since, NOW())
              WHEN $1::text = 'active' THEN NULL
              ELSE past_due_since
            END,
            last_event_created_at = CASE
              WHEN $2::timestamptz IS NULL THEN last_event_created_at
              WHEN last_event_created_at IS NULL THEN $2::timestamptz
              WHEN $2::timestamptz > last_event_created_at THEN $2::timestamptz
              ELSE last_event_created_at
            END,
            last_event_id = COALESCE($3, last_event_id),
            updated_at=NOW()
      WHERE id=$4`,
    [statut, eventCreatedAt, eventId, ligne.id]
  );
  return { applied: true, subscription_id: ligne.id, statut };
}

module.exports = {
  normaliserAbonnement,
  isoDepuisSecondes,
  contexteCabinet,
  utilisateurDuCabinet,
  organisationDuClientStripe,
  upsertAbonnement,
  upsertVueHistorique,
  appliquerEtatAbonnement,
  appliquerStatutFacture,
  CODES_VUE_HISTORIQUE,
};
