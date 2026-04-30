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

module.exports = router;
