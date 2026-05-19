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

function getPriceId(planCode) {
  const mode = getBillingMode();
  const plan = String(planCode || '').toLowerCase();
  if (plan === 'premium' || plan === 'cabinet') return null;

  if (mode === 'test') {
    if (plan === 'starter') return process.env.STRIPE_STARTER_PRICE_ID_TEST || process.env.STRIPE_PRICE_STARTER || null;
    if (plan === 'pro') return process.env.STRIPE_PRO_PRICE_ID_TEST || process.env.STRIPE_PRICE_PRO || null;
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

function getConfigurationStatus() {
  const missing = [];
  const mode = getBillingMode();
  const secretKey = getStripeSecretKey();
  const webhookSecret = getWebhookSecret();
  const requiredPricePlans = ['starter', 'pro'];

  if (!secretKey) missing.push('STRIPE_SECRET_KEY');
  for (const plan of requiredPricePlans) {
    if (!getPriceId(plan)) {
      missing.push(`STRIPE_PRICE_${plan.toUpperCase()}`);
    }
  }
  if (!webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');

  return {
    mode,
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
};
