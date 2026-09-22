let stripeClient = null;
const STRIPE_API_VERSION = '2026-02-25.clover';

function getBillingMode() {
  return (process.env.BILLING_MODE || 'test').toLowerCase();
}

function getStripeSecretKey() {
  const mode = getBillingMode();
  if (mode === 'test') {
    return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY || null;
  }
  return process.env.STRIPE_SECRET_KEY || null;
}

function getWebhookSecret() {
  const mode = getBillingMode();
  if (mode === 'test') {
    return process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET || null;
  }
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

/**
 * Price ID Stripe d'un plan.
 *
 * Les noms de variables sont EXACTEMENT ceux lus par `planService` (qui peuple
 * `stripe_price_id` du catalogue affiché) : la grille suisse a ses propres prix
 * (`STRIPE_PRICE_INDEPENDANT`, `STRIPE_PRICE_CABINET_CH`) et ne peut donc plus
 * être affichée « sur devis » tout en étant facturable, ni l'inverse. Un plan
 * sans prix Stripe configuré reste sans price ID — le checkout ne peut pas
 * inventer un prix.
 */
const VARIABLES_PRIX = {
  starter: ['STRIPE_STARTER_PRICE_ID_TEST', 'STRIPE_PRICE_STARTER'],
  pro: ['STRIPE_PRO_PRICE_ID_TEST', 'STRIPE_PRICE_PRO'],
  cabinet: ['STRIPE_CABINET_PRICE_ID_TEST', 'STRIPE_PRICE_CABINET'],
  independant: ['STRIPE_INDEPENDANT_PRICE_ID_TEST', 'STRIPE_PRICE_INDEPENDANT'],
  cabinet_ch: ['STRIPE_CABINET_CH_PRICE_ID_TEST', 'STRIPE_PRICE_CABINET_CH'],
};

function getPriceId(planCode) {
  const mode = getBillingMode();
  const plan = String(planCode || '').toLowerCase();
  if (plan === 'premium') return null;

  const variables = VARIABLES_PRIX[plan];
  if (!variables) return null;
  const [variableTest, variableLive] = variables;
  if (mode === 'test') {
    return process.env[variableTest] || process.env[variableLive] || null;
  }
  return process.env[variableLive] || null;
}

function isConfigured() {
  const key = getStripeSecretKey();
  return !!key;
}

/**
 * Plans dont le PRIX STRIPE doit être configuré pour que le checkout d'un marché
 * fonctionne. La grille suisse a les siens (indépendant / cabinet) : sans cette
 * table, un cabinet suisse voyait `checkout_ready: false` à cause des variables
 * de la grille euros, et l'écran lui interdisait un paiement pourtant possible.
 * Les offres « sur devis » (aucun prix) n'y figurent pas : elles ne passent pas
 * par un checkout.
 */
const PLANS_FACTURABLES = {
  FR: ['starter', 'pro', 'cabinet'],
  CH: ['independant', 'cabinet_ch'],
};

/** Tous les codes de plan facturables, les deux grilles confondues. */
function getPlansFacturables() {
  return [...new Set([...PLANS_FACTURABLES.FR, ...PLANS_FACTURABLES.CH])];
}

/**
 * Table `price ID -> code de plan` du mode courant.
 *
 * POURQUOI : un abonnement créé ou modifié HORS de notre Checkout (tableau de
 * bord Stripe, portail client) peut ne pas porter nos métadonnées. Le prix, lui,
 * est toujours là — et les grilles FR et CH utilisent des price IDs distincts,
 * donc la déduction n'est jamais ambiguë. Aucun prix n'est inventé : seuls les
 * price IDs réellement configurés entrent dans la table.
 */
function getPrixVersPlan() {
  const table = new Map();
  for (const code of getPlansFacturables()) {
    const priceId = getPriceId(code);
    if (priceId) table.set(priceId, code);
  }
  return table;
}

function getPlanCodePourPriceId(priceId) {
  if (!priceId) return null;
  return getPrixVersPlan().get(String(priceId)) || null;
}

function getConfigurationStatus(marche = 'FR') {
  const missing = [];
  const mode = getBillingMode();
  const secretKey = getStripeSecretKey();
  const webhookSecret = getWebhookSecret();
  const marcheNormalise = String(marche).toUpperCase() === 'CH' ? 'CH' : 'FR';
  const requiredPricePlans = PLANS_FACTURABLES[marcheNormalise];

  // `missing` est renvoyé par une route PUBLIQUE (/api/billing/plans) et affiché
  // dans l'écran d'abonnement : on n'y inscrit JAMAIS le nom des variables
  // d'environnement (divulgation d'architecture inutile), seulement un libellé
  // compréhensible. Constat du 21/09/2026 : la réponse publique listait
  // STRIPE_SECRET_KEY / STRIPE_PRICE_* / STRIPE_WEBHOOK_SECRET.
  const LABELS_MANQUANTS = {
    cle_secrete: 'clé secrète du prestataire de paiement',
    webhook: 'secret de webhook de paiement',
  }
  if (!secretKey) missing.push(LABELS_MANQUANTS.cle_secrete);
  for (const plan of requiredPricePlans) {
    if (!getPriceId(plan)) {
      missing.push(`identifiant de tarif pour l'offre ${plan}`);
    }
  }
  if (!webhookSecret) missing.push(LABELS_MANQUANTS.webhook);

  return {
    mode,
    market: marcheNormalise,
    required_price_plans: requiredPricePlans,
    configured: !!secretKey,
    checkout_ready: !!secretKey && requiredPricePlans.every((plan) => !!getPriceId(plan)),
    webhook_ready: !!secretKey && !!webhookSecret,
    missing,
    api_version: STRIPE_API_VERSION,
  };
}

function getStripeClient() {
  if (!isConfigured()) {
    throw new Error('stripe_not_configured');
  }
  if (stripeClient) return stripeClient;

  const Stripe = require('stripe');
  stripeClient = new Stripe(getStripeSecretKey(), { apiVersion: STRIPE_API_VERSION });
  return stripeClient;
}

async function createOrReuseCustomer({ existingCustomerId, email, name, metadata = {} }) {
  const stripe = getStripeClient();
  if (existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(existingCustomerId);
      if (!existing?.deleted) {
        return existingCustomerId;
      }
    } catch (err) {
      const isMissingCustomer = err?.code === 'resource_missing' || err?.statusCode === 404;
      if (!isMissingCustomer) {
        throw err;
      }
    }
  }
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata,
  });
  return customer.id;
}

async function createSubscriptionCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
  trialDays = 7,
}) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata,
    subscription_data: {
      trial_period_days: trialDays,
      metadata,
    },
  });
}

async function createPortalSession({ customerId, returnUrl }) {
  const stripe = getStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

function constructWebhookEvent(rawBody, signature) {
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    throw new Error('stripe_webhook_secret_missing');
  }
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

async function retrieveSubscription(subscriptionId) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

module.exports = {
  getBillingMode,
  getStripeSecretKey,
  getWebhookSecret,
  getPriceId,
  isConfigured,
  getConfigurationStatus,
  getStripeClient,
  createOrReuseCustomer,
  createSubscriptionCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  retrieveSubscription,
  getPlansFacturables,
  getPrixVersPlan,
  getPlanCodePourPriceId,
};
