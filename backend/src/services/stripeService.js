let stripeClient = null;

const { normalizeMarket } = require('./marketService');

function getBillingMode() {
  return (process.env.BILLING_MODE || 'test').toLowerCase();
}

function getStripeSecretKey() {
  const mode = getBillingMode();
  if (mode === 'test') {
    return process.env.STRIPE_SECRET_KEY_TEST || null;
  }
  return process.env.STRIPE_SECRET_KEY || null;
}

function getWebhookSecret() {
  const mode = getBillingMode();
  if (mode === 'test') {
    return process.env.STRIPE_WEBHOOK_SECRET_TEST || null;
  }
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

function getPriceId(planCode, market = 'FR') {
  const mode = getBillingMode();
  const plan = String(planCode || '').toLowerCase();
  const normalizedMarket = normalizeMarket(market);
  if (plan === 'premium') return null;

  if (mode === 'test') {
    if (normalizedMarket === 'CH') {
      if (plan === 'starter') return process.env.STRIPE_CH_STARTER_PRICE_ID_TEST || null;
      if (plan === 'pro') return process.env.STRIPE_CH_PRO_PRICE_ID_TEST || null;
      return null;
    }
    if (plan === 'starter') return process.env.STRIPE_STARTER_PRICE_ID_TEST || null;
    if (plan === 'pro') return process.env.STRIPE_PRO_PRICE_ID_TEST || null;
    return null;
  }

  if (normalizedMarket === 'CH') {
    if (plan === 'starter') return process.env.STRIPE_CH_PRICE_STARTER || process.env.STRIPE_CH_STARTER_PRICE_ID || null;
    if (plan === 'pro') return process.env.STRIPE_CH_PRICE_PRO || process.env.STRIPE_CH_PRO_PRICE_ID || null;
    return null;
  }

  if (plan === 'starter') return process.env.STRIPE_PRICE_STARTER || null;
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO || null;
  return null;
}

function isConfigured() {
  const key = getStripeSecretKey();
  return !!key;
}

function getStripeClient() {
  if (!isConfigured()) {
    throw new Error('stripe_not_configured');
  }
  if (stripeClient) return stripeClient;

  const Stripe = require('stripe');
  stripeClient = new Stripe(getStripeSecretKey(), { apiVersion: '2024-06-20' });
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

function buildSubscriptionCheckoutParams({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata = {},
  trialDays = 7,
  market = 'FR',
  setupAmountCents = 0,
  setupLabel = 'Frais d’inscription',
  currency = 'EUR',
}) {
  const normalizedMarket = normalizeMarket(market);
  const normalizedCurrency = String(currency || (normalizedMarket === 'CH' ? 'CHF' : 'EUR')).toLowerCase();
  const lineItems = [{ price: priceId, quantity: 1 }];

  if (normalizedMarket === 'CH' && Number(setupAmountCents) > 0) {
    lineItems.push({
      price_data: {
        currency: normalizedCurrency,
        unit_amount: Number(setupAmountCents),
        tax_behavior: 'exclusive',
        product_data: {
          name: setupLabel,
        },
      },
      quantity: 1,
    });
  }

  const subscriptionData = {
    metadata: {
      ...metadata,
      market: normalizedMarket,
    },
  };
  if (Number(trialDays) > 0) {
    subscriptionData.trial_period_days = Number(trialDays);
  }

  return {
    mode: 'subscription',
    customer: customerId,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    automatic_tax: {
      enabled: normalizedMarket === 'CH',
    },
    tax_id_collection: {
      enabled: normalizedMarket === 'CH',
    },
    metadata: {
      ...metadata,
      market: normalizedMarket,
    },
    subscription_data: subscriptionData,
  };
}

async function createSubscriptionCheckoutSession(options) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.create(buildSubscriptionCheckoutParams(options));
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
  getStripeClient,
  buildSubscriptionCheckoutParams,
  createOrReuseCustomer,
  createSubscriptionCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
  retrieveSubscription,
};
