const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const planService = require('../services/planService');
const billingService = require('../services/billingService');
const stripeService = require('../services/stripeService');
const { trackEvent } = require('../services/analyticsService');
const legalAcceptanceService = require('../services/legalAcceptanceService');
const emailService = require('../services/emailService');
const logger = require('../lib/logger');
const { insertStripePaymentEventIfNew } = require('../services/billingWebhookService');

const router = express.Router();

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
}

function cleanPlanLabel(planCode) {
  if (planCode === 'pro') return 'Pro';
  if (planCode === 'cabinet') return 'Cabinet';
  if (planCode === 'starter') return 'Starter';
  return 'Premium';
}

function isMissingOptionalTableError(err) {
  return err?.code === '42P01';
}

async function resolveBillingOwnerContext(organizationId) {
  const result = await pool.query(
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

async function upsertBillingSubscriptionRecord({
  organizationId,
  planCode,
  status,
  stripeCustomerId,
  stripeSubscriptionId,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}) {
  try {
    const context = await resolveBillingOwnerContext(organizationId);
    await pool.query(
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
        organizationId,
        context.cabinet_id || null,
        context.owner_user_id || null,
        stripeCustomerId || null,
        stripeSubscriptionId || null,
        planCode,
        status,
        currentPeriodEnd || null,
        !!cancelAtPeriodEnd,
      ]
    );
  } catch (err) {
    if (!isMissingOptionalTableError(err)) {
      logger.warn({ error: err.message, organization_id: organizationId }, 'billing_subscriptions sync skipped');
    }
  }
}

async function upsertBillingInvoiceRecord({ organizationId, invoice, status }) {
  try {
    const context = await resolveBillingOwnerContext(organizationId);
    await pool.query(
      `INSERT INTO billing_invoices (
        id, organization_id, cabinet_id, user_id, amount_due_cents, amount_paid_cents,
        currency, status, hosted_invoice_url, pdf_url, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      ON CONFLICT (id) DO UPDATE SET
        amount_due_cents = EXCLUDED.amount_due_cents,
        amount_paid_cents = EXCLUDED.amount_paid_cents,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        hosted_invoice_url = EXCLUDED.hosted_invoice_url,
        pdf_url = EXCLUDED.pdf_url`,
      [
        invoice.id,
        organizationId,
        context.cabinet_id || null,
        context.owner_user_id || null,
        invoice.amount_due || 0,
        invoice.amount_paid || 0,
        invoice.currency || 'eur',
        status,
        invoice.hosted_invoice_url || null,
        invoice.invoice_pdf || null,
      ]
    );
  } catch (err) {
    if (!isMissingOptionalTableError(err)) {
      logger.warn({ error: err.message, organization_id: organizationId, invoice_id: invoice.id }, 'billing_invoices sync skipped');
    }
  }
}

async function findAcceptanceId({ organizationId, userId, planCode, explicitAcceptanceId }) {
  if (explicitAcceptanceId) {
    const check = await pool.query(
      `SELECT id FROM legal_acceptances
       WHERE id=$1 AND organization_id=$2 AND user_id=$3
       LIMIT 1`,
      [explicitAcceptanceId, organizationId, userId]
    );
    return check.rows[0]?.id || null;
  }
  const latest = await legalAcceptanceService.getLatestAcceptance(organizationId, userId, planCode);
  return latest?.legal_acceptance_id || null;
}

async function getOrCreateStripeCustomerForUser({ userId, organizationId }) {
  const userRes = await pool.query(
    'SELECT id, email, first_name, last_name FROM users WHERE id=$1 LIMIT 1',
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) {
    const err = new Error('user_not_found');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const customerRes = await pool.query(
    `SELECT id, stripe_customer_id
       FROM customer_billing_profiles
      WHERE organization_id=$1
      LIMIT 1`,
    [organizationId]
  );
  const existingCustomerId = customerRes.rows[0]?.stripe_customer_id || null;

  const customerId = await stripeService.createOrReuseCustomer({
    existingCustomerId,
    email: user.email,
    name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    metadata: {
      user_id: String(user.id),
      organization_id: String(organizationId),
      billing_mode: stripeService.getBillingMode(),
    },
  });

  if (!customerRes.rows[0]) {
    await pool.query(
      `INSERT INTO customer_billing_profiles (
        organization_id, stripe_customer_id, tax_mode, vat_applicable, vat_label, seller_status_snapshot, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [
        organizationId,
        customerId,
        process.env.BILLING_TAX_MODE || 'configurable',
        null,
        process.env.BILLING_VAT_LABEL || billingService.FISCAL_LABEL,
        process.env.BILLING_SELLER_STATUS || 'micro-entreprise_to_confirm',
      ]
    );
  } else if (!existingCustomerId || existingCustomerId !== customerId) {
    await pool.query(
      'UPDATE customer_billing_profiles SET stripe_customer_id=$1, updated_at=NOW() WHERE id=$2',
      [customerId, customerRes.rows[0].id]
    );
  }

  return { customerId, user };
}

async function upsertSubscriptionFromCheckout({
  organizationId,
  planCode,
  providerSubscriptionId,
  status,
  trialStartAt,
  trialEndAt,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}) {
  const planId = await billingService.getPlanId(planCode);

  const existing = await pool.query(
    'SELECT id FROM subscriptions WHERE provider_subscription_id=$1 LIMIT 1',
    [providerSubscriptionId]
  );

  if (!existing.rows[0]) {
    const inserted = await pool.query(
      `INSERT INTO subscriptions (
        organization_id, plan_id, provider, provider_subscription_id, status,
        trial_start_at, trial_end_at, current_period_start, current_period_end, cancel_at_period_end,
        created_at, updated_at
      ) VALUES ($1,$2,'stripe',$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
      RETURNING id`,
      [
        organizationId,
        planId,
        providerSubscriptionId,
        status,
        trialStartAt,
        trialEndAt,
        currentPeriodStart,
        currentPeriodEnd,
        !!cancelAtPeriodEnd,
      ]
    );
    return inserted.rows[0].id;
  }

  await pool.query(
    `UPDATE subscriptions
       SET organization_id=$1, plan_id=$2, status=$3,
           trial_start_at=$4, trial_end_at=$5,
           current_period_start=$6, current_period_end=$7,
           cancel_at_period_end=$8, updated_at=NOW()
     WHERE id=$9`,
    [
      organizationId,
      planId,
      status,
      trialStartAt,
      trialEndAt,
      currentPeriodStart,
      currentPeriodEnd,
      !!cancelAtPeriodEnd,
      existing.rows[0].id,
    ]
  );
  return existing.rows[0].id;
}

async function markUserSubscription({ userId, planCode, status, stripeCustomerId, stripeSubscriptionId, trialEndAt, currentPeriodEnd }) {
  await pool.query(
    `UPDATE users
       SET plan=$1,
           subscription_status=$2,
           stripe_customer_id=COALESCE($3, stripe_customer_id),
           stripe_subscription_id=COALESCE($4, stripe_subscription_id),
           trial_ends_at=COALESCE($5, trial_ends_at),
           current_period_end=COALESCE($6, current_period_end),
           updated_at=NOW()
     WHERE id=$7`,
    [planCode, status, stripeCustomerId || null, stripeSubscriptionId || null, trialEndAt || null, currentPeriodEnd || null, userId]
  );
}

async function findOrganizationByStripeCustomer(customerId) {
  const row = await pool.query(
    'SELECT organization_id FROM customer_billing_profiles WHERE stripe_customer_id=$1 LIMIT 1',
    [customerId]
  );
  return row.rows[0]?.organization_id || null;
}

async function updateCheckoutSessionStatus(sessionId, status, payload = {}) {
  await pool.query(
    `UPDATE checkout_sessions
       SET status=$1, completed_at=CASE WHEN $1='completed' THEN NOW() ELSE completed_at END,
           raw_payload_json=$2::jsonb
     WHERE provider_session_id=$3`,
    [status, JSON.stringify(payload), sessionId]
  );
}

async function handleStripeEvent(event) {
  const type = event.type;
  const data = event.data?.object || {};

  if (type === 'checkout.session.completed') {
    const session = data;
    const metadata = session.metadata || {};
    const userId = Number(metadata.user_id || 0) || null;
    let organizationId = Number(metadata.organization_id || 0) || null;
    const planCode = billingService.normalizePlanCode(metadata.plan_code || metadata.plan) || 'starter';
    const subscriptionId = session.subscription || null;
    const customerId = session.customer || null;

    if (!organizationId && customerId) {
      organizationId = await findOrganizationByStripeCustomer(customerId);
    }
    if (!organizationId && userId) {
      const org = await billingService.getOrCreateOrganization(userId);
      organizationId = org.id;
    }
    if (!organizationId) return;

    let trialStartAt = null;
    let trialEndAt = null;
    let currentPeriodStart = null;
    let currentPeriodEnd = null;
    let subStatus = 'active';
    let cancelAtPeriodEnd = false;

    if (subscriptionId) {
      try {
        const sub = await stripeService.retrieveSubscription(subscriptionId);
        trialStartAt = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;
        trialEndAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        currentPeriodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
        currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        subStatus = sub.status || 'active';
        cancelAtPeriodEnd = !!sub.cancel_at_period_end;
      } catch (err) {
        // fallback sans blocage
      }
    }

    const subRowId = await upsertSubscriptionFromCheckout({
      organizationId,
      planCode,
      providerSubscriptionId: subscriptionId,
      status: subStatus,
      trialStartAt,
      trialEndAt,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    });

    await updateCheckoutSessionStatus(session.id, 'completed', session);

    if (customerId) {
      await pool.query(
        `INSERT INTO customer_billing_profiles (
          organization_id, stripe_customer_id, tax_mode, vat_applicable, vat_label, seller_status_snapshot, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
        ON CONFLICT (organization_id) DO UPDATE SET
          stripe_customer_id=EXCLUDED.stripe_customer_id,
          updated_at=NOW()`,
        [
          organizationId,
          customerId,
          process.env.BILLING_TAX_MODE || 'configurable',
          null,
          process.env.BILLING_VAT_LABEL || billingService.FISCAL_LABEL,
          process.env.BILLING_SELLER_STATUS || 'micro-entreprise_to_confirm',
        ]
      );
    }

    await upsertBillingSubscriptionRecord({
      organizationId,
      planCode,
      status: subStatus,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    });

    if (userId) {
      await markUserSubscription({
        userId,
        planCode,
        status: subStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        trialEndAt,
        currentPeriodEnd,
      });
    }

    return;
  }

  if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const sub = data;
    const metadata = sub.metadata || {};
    const userId = Number(metadata.user_id || 0) || null;
    let organizationId = Number(metadata.organization_id || 0) || null;
    const planCode = billingService.normalizePlanCode(metadata.plan_code || metadata.plan) || 'starter';
    const providerSubscriptionId = sub.id;
    const customerId = sub.customer || null;

    if (!organizationId && customerId) {
      organizationId = await findOrganizationByStripeCustomer(customerId);
    }
    if (!organizationId && userId) {
      const org = await billingService.getOrCreateOrganization(userId);
      organizationId = org.id;
    }
    if (!organizationId) return;

    const trialStartAt = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;
    const trialEndAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
    const currentPeriodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
    const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
    const subStatus = sub.status || (type === 'customer.subscription.deleted' ? 'canceled' : 'active');

    const subRowId = await upsertSubscriptionFromCheckout({
      organizationId,
      planCode,
      providerSubscriptionId,
      status: subStatus,
      trialStartAt,
      trialEndAt,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    });

    await upsertBillingSubscriptionRecord({
      organizationId,
      planCode,
      status: subStatus,
      stripeCustomerId: customerId || null,
      stripeSubscriptionId: providerSubscriptionId,
      currentPeriodEnd,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    });

    if (userId) {
      await markUserSubscription({
        userId,
        planCode,
        status: subStatus,
        stripeCustomerId: customerId || null,
        stripeSubscriptionId: providerSubscriptionId,
        trialEndAt,
        currentPeriodEnd,
      });
    }

    return;
  }

  if (type === 'invoice.paid' || type === 'invoice.payment_failed') {
    const invoice = data;
    const customerId = invoice.customer || null;
    const organizationId = customerId ? await findOrganizationByStripeCustomer(customerId) : null;
    if (!organizationId) return;

    const subRow = invoice.subscription
      ? await pool.query('SELECT id FROM subscriptions WHERE provider_subscription_id=$1 LIMIT 1', [invoice.subscription])
      : { rows: [] };
    const subRowId = subRow.rows[0]?.id || null;

    await pool.query(
      `INSERT INTO invoices (
        organization_id, provider_invoice_id, status, amount_cents, currency, invoice_url, paid_at, due_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT (provider_invoice_id) DO UPDATE SET
        status=EXCLUDED.status,
        amount_cents=EXCLUDED.amount_cents,
        currency=EXCLUDED.currency,
        invoice_url=EXCLUDED.invoice_url,
        paid_at=EXCLUDED.paid_at,
        due_at=EXCLUDED.due_at`,
      [
        organizationId,
        invoice.id,
        invoice.status || (type === 'invoice.paid' ? 'paid' : 'payment_failed'),
        invoice.amount_paid || invoice.amount_due || 0,
        invoice.currency || 'eur',
        invoice.hosted_invoice_url || null,
        type === 'invoice.paid' ? new Date().toISOString() : null,
        invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      ]
    );

    await upsertBillingInvoiceRecord({
      organizationId,
      invoice,
      status: invoice.status || (type === 'invoice.paid' ? 'paid' : 'payment_failed'),
    });

    if (subRowId) {
      const nextStatus = type === 'invoice.paid' ? 'active' : 'past_due';
      await pool.query(
        'UPDATE subscriptions SET status=$1, updated_at=NOW() WHERE id=$2',
        [nextStatus, subRowId]
      );
    }

  }
}

router.get('/plans', async (_req, res) => {
  try {
    await billingService.ensureBillingFoundation();
    return res.json({
      success: true,
      billing_mode: stripeService.getBillingMode(),
      trial_days: billingService.TRIAL_DAYS,
      fiscal_label: billingService.FISCAL_LABEL,
      stripe_configuration: stripeService.getConfigurationStatus(),
      plans: billingService.getPlans(),
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'plans_unavailable' });
  }
});

router.post('/onboarding', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    await billingService.ensureBillingFoundation();
    const org = await billingService.upsertOrganizationProfile(userId, req.body || {});
    return res.json({ success: true, organization: org });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'onboarding_save_failed' });
  }
});

router.post('/legal-acceptance', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    await billingService.ensureBillingFoundation();
    const org = await billingService.getOrCreateOrganization(userId);
    const planCode = billingService.normalizePlanCode(req.body?.plan_code) || 'pro';

    const result = await legalAcceptanceService.recordLegalAcceptance({
      organizationId: org.id,
      userId,
      payload: req.body || {},
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
      planCode,
    });

    return res.json({ success: true, ...result, organization_id: org.id });
  } catch (err) {
    if (err.code === 'CONSENT_REQUIRED') {
      return res.status(400).json({ success: false, error: 'consent_required', message: err.message });
    }
    return res.status(500).json({ success: false, error: 'legal_acceptance_failed' });
  }
});

async function createCheckoutSessionHandler(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });

    await billingService.ensureBillingFoundation();

    const planCode = billingService.normalizePlanCode(req.body?.plan_code || req.body?.plan);
    if (!planCode) {
      return res.status(400).json({ success: false, error: 'invalid_plan' });
    }
    if (planCode === 'premium') {
      return res.status(409).json({
        success: false,
        error: 'premium_contact_required',
        contact_required: true,
        message: 'L’offre Premium est sur devis. Merci de demander un contact commercial.',
      });
    }

    const org = await billingService.getOrCreateOrganization(userId);
    const acceptanceId = await findAcceptanceId({
      organizationId: org.id,
      userId,
      planCode,
      explicitAcceptanceId: req.body?.legal_acceptance_id || null,
    });
    if (!acceptanceId) {
      return res.status(400).json({
        success: false,
        error: 'legal_acceptance_required',
        message: 'Vous devez accepter les documents et consentements avant de continuer.',
      });
    }

    if (!stripeService.isConfigured()) {
      const configuration = stripeService.getConfigurationStatus();
      return res.status(503).json({
        success: false,
        error: 'stripe_configuration_required',
        message: 'Configuration Stripe requise côté backend avant de lancer un checkout.',
        stripe_configuration: configuration,
      });
    }

    const priceId = stripeService.getPriceId(planCode);
    if (!priceId) {
      return res.status(503).json({
        success: false,
        error: 'stripe_price_configuration_required',
        message: `Price ID Stripe manquant pour le plan ${cleanPlanLabel(planCode)}.`,
        stripe_configuration: stripeService.getConfigurationStatus(),
      });
    }

    const { customerId } = await getOrCreateStripeCustomerForUser({ userId, organizationId: org.id });
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.courtiark.fr';
    const successUrl = `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/billing/cancel`;

    const session = await stripeService.createSubscriptionCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      trialDays: billingService.TRIAL_DAYS,
      metadata: {
        user_id: String(userId),
        organization_id: String(org.id),
        plan_code: planCode,
        legal_acceptance_id: String(acceptanceId),
        billing_mode: stripeService.getBillingMode(),
      },
    });

    const planId = await billingService.getPlanId(planCode);
    await pool.query(
      `INSERT INTO checkout_sessions (
        organization_id, plan_id, provider_session_id, status, created_at, raw_payload_json
      ) VALUES ($1,$2,$3,'created',NOW(),$4::jsonb)
      ON CONFLICT (provider_session_id) DO UPDATE SET raw_payload_json=EXCLUDED.raw_payload_json`,
      [org.id, planId, session.id, JSON.stringify({ id: session.id, url: session.url })]
    );

    await trackEvent({
      userId,
      organizationId: org.id,
      event: 'billing_checkout_started',
      properties: { plan_code: planCode, billing_mode: stripeService.getBillingMode() },
    }).catch(() => {});

    return res.json({
      success: true,
      checkout_url: session.url,
      url: session.url,
      session_id: session.id,
      trial_days: billingService.TRIAL_DAYS,
      billing_mode: stripeService.getBillingMode(),
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'checkout_session_failed' });
  }
}

router.post('/create-checkout-session', verifyToken, createCheckoutSessionHandler);
router.post('/checkout-session', verifyToken, createCheckoutSessionHandler);
router.post('/checkout', verifyToken, createCheckoutSessionHandler);

router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
    const status = await billingService.getBillingStatus(userId);
    return res.json({
      success: true,
      billing_mode: stripeService.getBillingMode(),
      fiscal_label: billingService.FISCAL_LABEL,
      stripe_configuration: stripeService.getConfigurationStatus(),
      status,
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'billing_status_unavailable' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
    const status = await billingService.getBillingStatus(userId);
    return res.json({ success: true, subscription: status });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'billing_status_unavailable' });
  }
});

async function createPortalSessionHandler(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
    await billingService.ensureBillingFoundation();

    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'stripe_configuration_required',
        message: 'Configuration Stripe requise côté backend avant d’ouvrir le portail client.',
        stripe_configuration: stripeService.getConfigurationStatus(),
      });
    }

    const org = await billingService.getOrCreateOrganization(userId);
    const { customerId } = await getOrCreateStripeCustomerForUser({ userId, organizationId: org.id });

    const returnUrl = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL || `${process.env.FRONTEND_URL || 'https://app.courtiark.fr'}/billing`;
    const portal = await stripeService.createPortalSession({ customerId, returnUrl });
    return res.json({ success: true, url: portal.url });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'portal_session_failed' });
  }
}

router.post('/create-portal-session', verifyToken, createPortalSessionHandler);
router.post('/portal-session', verifyToken, createPortalSessionHandler);
router.post('/portal', verifyToken, createPortalSessionHandler);

router.post('/cancel-trial', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });

    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'stripe_configuration_required',
        message: 'Configuration Stripe requise côté backend avant de gérer l’abonnement.',
        stripe_configuration: stripeService.getConfigurationStatus(),
      });
    }

    const org = await billingService.getOrCreateOrganization(userId);
    const profile = await pool.query(
      'SELECT stripe_customer_id FROM customer_billing_profiles WHERE organization_id=$1 LIMIT 1',
      [org.id]
    );
    const customerId = profile.rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'no_active_trial',
        message: 'Aucun essai actif à annuler.',
      });
    }

    const returnUrl = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL || `${process.env.FRONTEND_URL || 'https://app.courtiark.fr'}/billing`;
    const portal = await stripeService.createPortalSession({ customerId, returnUrl });
    return res.json({
      success: true,
      action: 'redirect_to_portal',
      url: portal.url,
      message: 'Annulation à effectuer via le portail Stripe sécurisé.',
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'cancel_trial_failed' });
  }
});

async function stripeWebhookHandler(req, res) {
  try {
    await billingService.ensureBillingFoundation();
    if (!stripeService.isConfigured()) {
      return res.status(200).json({ received: true, note: 'stripe_not_configured' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'missing_signature' });

    const event = stripeService.constructWebhookEvent(req.rawBody, signature);
    const newEvent = await insertStripePaymentEventIfNew(pool, event, null, null);
    if (!newEvent) {
      return res.status(200).json({ received: true, idempotent: true });
    }

    await handleStripeEvent(event);

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const metadata = session.metadata || {};
      const userId = Number(metadata.user_id || 0) || null;
      const planCode = metadata.plan_code || metadata.plan || null;
      try {
        const emailTo = (await pool.query('SELECT email, first_name FROM users WHERE id=$1', [userId])).rows[0];
        if (emailTo && planCode) {
          await emailService.sendBillingEmail('trial_activated_j0', {
            to: emailTo.email,
            firstName: emailTo.first_name || '',
            planName: cleanPlanLabel(planCode),
            trialDays: billingService.TRIAL_DAYS,
          });
        }
      } catch (_emailErr) {
        // non bloquant — l'event est déjà persisté
      }
    }

    return res.json({ received: true });
  } catch (_err) {
    return res.status(400).json({ error: 'invalid_webhook' });
  }
}

router.post('/webhook', stripeWebhookHandler);
router.post('/stripe-webhook', stripeWebhookHandler);

module.exports = router;
