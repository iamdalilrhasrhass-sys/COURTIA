const express = require('express');
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const SK = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://courtia.vercel.app';
let stripe = null;
try {
  if (SK) {
    const Stripe = require('stripe');
    stripe = new Stripe(SK, { apiVersion: '2024-06-20' });
  }
} catch (e) {
  console.warn('[stripe] init failed:', e.message);
}

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

// CHECKOUT (protégé)
router.post('/checkout', verifyToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' });
  try {
    const { plan } = req.body;
    const priceId = PRICE_IDS[plan];
    if (!priceId) return res.status(400).json({ error: 'invalid_plan' });

    const user = (await pool.query(
      'SELECT id, email, first_name, stripe_customer_id FROM users WHERE id=$1',
      [req.user.id || req.user.userId]
    )).rows[0];
    if (!user) return res.status(401).json({ error: 'user_not_found' });

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const c = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name || ''}`.trim() || undefined,
        metadata: { user_id: String(user.id) }
      });
      customerId = c.id;
      await pool.query('UPDATE users SET stripe_customer_id=$1 WHERE id=$2', [customerId, user.id]);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/billing?status=cancel`,
      allow_promotion_codes: true,
      subscription_data: { metadata: { user_id: String(user.id), plan } },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe checkout]', err.message);
    res.status(500).json({ error: 'checkout_failed', detail: err.message });
  }
});

// Plans
router.get('/plans', async (req, res) => {
  res.json({
    starter: { name: 'Starter', price: 89, price_id: !!process.env.STRIPE_PRICE_STARTER },
    pro: { name: 'Pro', price: 159, price_id: !!process.env.STRIPE_PRICE_PRO },
    premium: { name: 'Premium', price: null, price_id: null },
  });
});

// ==================== WEBHOOK STRIPE (public — vérifié par signature) ====================

router.post('/webhook', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' });

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    console.error('[stripe webhook] missing signature or secret');
    return res.status(400).json({ error: 'missing_signature' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err.message);
    return res.status(400).json({ error: 'invalid_signature' });
  }

  console.log(`[stripe webhook] ${event.type} — id=${event.id}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan || 'starter';

        if (!userId) {
          console.error('[stripe webhook] no user_id in session metadata');
          return res.status(400).json({ error: 'missing_user_id' });
        }

        // Récupère l'abonnement Stripe pour obtenir la date de fin
        let periodEnd = null;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }

        await pool.query(`
          UPDATE users SET
            plan = $1,
            subscription_status = 'active',
            stripe_subscription_id = $2,
            current_period_end = $3,
            updated_at = NOW()
          WHERE id = $4
        `, [plan, session.subscription, periodEnd, userId]);

        console.log(`[stripe webhook] ✅ User ${userId} → plan=${plan}, subscription=${session.subscription}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        if (!subscriptionId) break;

        // Met à jour la date de fin d'abonnement
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Récupère le plan depuis les metadata de l'abonnement ou du price
        const plan = subscription.metadata?.plan || 'starter';

        await pool.query(`
          UPDATE users SET
            subscription_status = 'active',
            current_period_end = $1,
            plan = $2,
            updated_at = NOW()
          WHERE stripe_subscription_id = $3
        `, [periodEnd, plan, subscriptionId]);

        console.log(`[stripe webhook] ✅ Invoice paid — sub=${subscriptionId}, period_end=${periodEnd}`);
        break;
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object;
        const subId = failedInvoice.subscription;

        if (subId) {
          await pool.query(`
            UPDATE users SET
              subscription_status = 'past_due',
              updated_at = NOW()
            WHERE stripe_subscription_id = $1
          `, [subId]);
          console.log(`[stripe webhook] ⚠️ Payment failed — sub=${subId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status; // active, past_due, canceled, unpaid, trialing
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        const plan = sub.metadata?.plan || 'starter';

        if (status === 'active' || status === 'trialing') {
          await pool.query(`
            UPDATE users SET
              subscription_status = $1,
              current_period_end = $2,
              plan = $3,
              updated_at = NOW()
            WHERE stripe_subscription_id = $4
          `, [status, periodEnd, plan, sub.id]);
        } else if (status === 'canceled' || status === 'unpaid') {
          await pool.query(`
            UPDATE users SET
              subscription_status = $1,
              plan = 'trial',
              updated_at = NOW()
            WHERE stripe_subscription_id = $2
          `, [status, sub.id]);
        }
        console.log(`[stripe webhook] 🔄 Subscription ${sub.id} → status=${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object;
        await pool.query(`
          UPDATE users SET
            plan = 'trial',
            subscription_status = 'canceled',
            stripe_subscription_id = NULL,
            current_period_end = NULL,
            updated_at = NOW()
          WHERE stripe_subscription_id = $1
        `, [deletedSub.id]);
        console.log(`[stripe webhook] 🗑️ Subscription deleted — ${deletedSub.id}`);
        break;
      }

      default:
        console.log(`[stripe webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] handler error:', err.message);
    res.status(500).json({ error: 'webhook_handler_error', detail: err.message });
  }
});

// ==================== STATUS ABONNEMENT (protégé) ====================

router.get('/status', verifyToken, async (req, res) => {
  try {
    const user = (await pool.query(`
      SELECT plan, subscription_status, stripe_customer_id, stripe_subscription_id,
             current_period_end, trial_ends_at, updated_at
      FROM users WHERE id = $1
    `, [req.user.id || req.user.userId])).rows[0];

    if (!user) return res.status(401).json({ error: 'user_not_found' });

    res.json({
      plan: user.plan,
      status: user.subscription_status,
      period_end: user.current_period_end,
      trial_ends: user.trial_ends_at,
      has_subscription: !!user.stripe_subscription_id,
      updated_at: user.updated_at,
    });
  } catch (err) {
    console.error('[stripe status]', err.message);
    res.status(500).json({ error: 'status_error', detail: err.message });
  }
});

// ==================== PORTAIL DE GESTION (protégé) ====================

router.post('/portal', verifyToken, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'stripe_not_configured' });
  try {
    const user = (await pool.query(`
      SELECT id, email, first_name, stripe_customer_id
      FROM users WHERE id = $1
    `, [req.user.id || req.user.userId])).rows[0];

    if (!user) return res.status(401).json({ error: 'user_not_found' });

    // Crée un customer Stripe si pas encore
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const c = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name || ''}`.trim() || undefined,
        metadata: { user_id: String(user.id) }
      });
      customerId = c.id;
      await pool.query('UPDATE users SET stripe_customer_id=$1 WHERE id=$2', [customerId, user.id]);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${FRONTEND_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe portal]', err.message);
    res.status(500).json({ error: 'portal_failed', detail: err.message });
  }
});

module.exports = router;
