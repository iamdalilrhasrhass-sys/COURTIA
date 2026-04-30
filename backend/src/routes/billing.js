/**
 * billing.js — Routes de facturation Stripe-ready
 * Toutes les routes sont protégées par verifyToken
 * Fonctionne sans clés Stripe (retourne des mocks propres)
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const planService = require('../services/planService');

// Tentative d'initialisation Stripe
const SK = process.env.STRIPE_SECRET_KEY;
let stripe = null;
try {
  if (SK) {
    const Stripe = require('stripe');
    stripe = new Stripe(SK, { apiVersion: '2024-06-20' });
    console.log('[billing] Stripe initialisé');
  } else {
    console.log('[billing] Stripe non configuré — mode mock');
  }
} catch (e) {
  console.warn('[billing] Erreur init Stripe:', e.message);
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://courtia.vercel.app';

/**
 * GET /api/billing/plans
 * Retourne la liste des plans sans secrets Stripe
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = planService.getAllPlans();
    res.json({ success: true, plans });
  } catch (err) {
    console.error('[billing] GET /plans error:', err.message);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des plans' });
  }
});

/**
 * GET /api/billing/me
 * Retourne les informations d'abonnement de l'utilisateur connecté
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const planInfo = await planService.getUserPlanInfo(userId);
    const usage = await planService.getUsageWithLimits(userId);

    res.json({
      success: true,
      subscription: {
        plan: planInfo.plan,
        plan_name: planInfo.plan_name,
        price: planInfo.price,
        status: planInfo.subscription_status,
        on_trial: planInfo.on_trial,
        trial_ends_at: planInfo.trial_ends_at,
        features: planInfo.features,
        limits: planInfo.limits,
        usage,
      },
      stripe_configured: !!stripe,
    });
  } catch (err) {
    console.error('[billing] GET /me error:', err.message);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération de l\'abonnement' });
  }
});

/**
 * GET /api/billing/usage
 * Retourne les quotas d'utilisation
 */
router.get('/usage', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const usage = await planService.getUsageWithLimits(userId);
    res.json({ success: true, usage });
  } catch (err) {
    console.error('[billing] GET /usage error:', err.message);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des quotas' });
  }
});

/**
 * POST /api/billing/create-checkout-session
 * Crée une session Checkout Stripe (ou retourne un mock)
 */
router.post('/create-checkout-session', verifyToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['starter', 'pro', 'premium'];

    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ success: false, error: 'Plan invalide' });
    }

    // Si Stripe n'est pas configuré, retourner un mock propre
    if (!stripe) {
      return res.json({
        success: true,
        mock: true,
        message: 'Stripe non configuré — simulation de redirection',
        redirect_url: `${FRONTEND_URL}/billing?status=success&plan=${plan}&mock=true`,
      });
    }

    const userId = req.user.id || req.user.userId;
    const userResult = await pool.query(
      'SELECT id, email, first_name, stripe_customer_id FROM users WHERE id=$1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ success: false, error: 'Utilisateur non trouvé' });

    // Récupérer le price ID Stripe depuis planService
    const planData = planService.getPlan(plan);
    const priceId = planData ? planData.stripe_price_id : null;
    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Aucun price ID Stripe configuré pour ce plan' });
    }

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.first_name || undefined,
        metadata: { user_id: String(user.id) },
      });
      customerId = customer.id;
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

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('[billing] create-checkout-session error:', err.message);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de la session de paiement' });
  }
});

/**
 * POST /api/billing/create-portal-session
 * Crée un portail de gestion d'abonnement Stripe (ou mock)
 */
router.post('/create-portal-session', verifyToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.json({
        success: true,
        mock: true,
        message: 'Stripe non configuré — simulation de portail',
        redirect_url: `${FRONTEND_URL}/billing`,
      });
    }

    const userId = req.user.id || req.user.userId;
    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id=$1',
      [userId]
    );
    const user = userResult.rows[0];
    if (!user || !user.stripe_customer_id) {
      return res.status(400).json({ success: false, error: 'Aucun abonnement Stripe actif' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${FRONTEND_URL}/billing`,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error('[billing] create-portal-session error:', err.message);
    res.status(500).json({ success: false, error: 'Erreur lors de la création du portail' });
  }
});

/**
 * POST /api/billing/webhook
 * Endpoint webhook Stripe (body brut)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const WS = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !WS) {
    return res.status(200).json({ received: true, note: 'stripe_not_configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WS);
  } catch (e) {
    console.error('[billing webhook] signature échouée:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        if (userId && plan) {
          await pool.query(
            `UPDATE users SET plan=$1, subscription_status='active', stripe_subscription_id=$2 WHERE id=$3`,
            [plan, session.subscription, userId]
          );
          console.log(`[billing webhook] user ${userId} subscribed to ${plan}`);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await pool.query(
            `UPDATE users SET subscription_status=$1, current_period_end=to_timestamp($2) WHERE id=$3`,
            [sub.status, sub.current_period_end, userId]
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await pool.query(
            `UPDATE users SET subscription_status='canceled', plan='starter' WHERE id=$1`,
            [userId]
          );
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        const userId = inv.subscription_details?.metadata?.user_id;
        if (userId) {
          await pool.query(`UPDATE users SET subscription_status='past_due' WHERE id=$1`, [userId]);
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('[billing webhook] handler error:', e);
    res.status(500).json({ error: 'handler_failed' });
  }
});

module.exports = router;
