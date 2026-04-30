// Stripe webhook handler — raw body
const Stripe = require('stripe');
const pool = require('../db');
const express = require('express');
const router = express.Router();

const SK = process.env.STRIPE_SECRET_KEY;
const WS = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = SK ? new Stripe(SK, { apiVersion: '2024-06-20' }) : null;

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !WS) {
    return res.status(200).json({ received: true, note: 'stripe_not_configured' });
  }
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WS);
  } catch (e) {
    console.error('[stripe webhook] sig fail', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        const userId = s.metadata?.user_id;
        const plan = s.metadata?.plan;
        if (userId) {
          await pool.query(
            `UPDATE users SET plan=$1, subscription_status='active', stripe_subscription_id=$2 WHERE id=$3`,
            [plan, s.subscription, userId]
          );
          console.log(`[stripe] user ${userId} subscribed to ${plan}`);
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
          await pool.query(`UPDATE users SET subscription_status='canceled', plan='trial' WHERE id=$1`, [userId]);
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
    console.error('[stripe webhook] handler', e);
    res.status(500).json({ error: 'handler_failed' });
  }
});

module.exports = router;
