require('dotenv').config()
const express = require('express')
const router = express.Router()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const pool = require('../db')
const verifyToken = require('../middleware/authMiddleware')

// TODO: Remplacez par vos vrais Price IDs de Stripe
const plans = {
  starter: 'price_xxxxxxxxxxxxxx_starter', // 39€/mois
  pro: 'price_xxxxxxxxxxxxxx_pro',         // 69€/mois
  elite: 'price_xxxxxxxxxxxxxx_elite'      // 129€/mois
}

// 1. Création de session de paiement Checkout (protégée)
router.post('/create-checkout-session', verifyToken, async (req, res) => {
  const { plan } = req.body
  const userId = req.user.id

  if (!plan || !plans[plan]) {
    return res.status(400).json({ error: 'Plan non valide ou manquant.' })
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://courtia.vercel.app'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: plans[plan],
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${frontendUrl}/paiement-succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/paiement-annule`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        plan: plan
      }
    })
    res.json({ url: session.url })
  } catch (err) {
    console.error('Erreur lors de la création de la session de paiement Stripe:', err.message)
    res.status(500).json({ error: 'Erreur serveur lors de la création de la session de paiement.' })
  }
})

// 2. Webhook Stripe pour gérer les événements (public)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    // req.rawBody est fourni par le middleware express.json configuré dans server.js
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret)
  } catch (err) {
    console.error(`⚠️ Erreur vérification signature webhook Stripe: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id

    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription)
      const priceId = subscription.items.data[0].price.id
      const planName = Object.keys(plans).find(key => plans[key] === priceId)

      if (userId && planName) {
        // NOTE: La table est 'users' (basé sur le cron) et non 'courtiers'
        await pool.query(
          'UPDATE users SET plan=$1, stripe_customer_id=$2, stripe_subscription_id=$3, updated_at=NOW() WHERE id=$4',
          [planName, session.customer, session.subscription, userId]
        )
        console.log(`[Stripe] ✅ L'utilisateur ${userId} est passé au plan '${planName}'.`)
        try {
          const { emailNouvelAbonnement } = require('../services/emailService')
          const customerEmail = session.customer_details?.email || session.customer_email
          await emailNouvelAbonnement({ courtierEmail: customerEmail, plan: planName })
        } catch(e) { console.error('Email notification error:', e.message) }
      } else {
        console.error(`[Stripe] 🛑 UserID (${userId}) ou plan (${planName} depuis priceId ${priceId}) non trouvé après paiement.`)
      }
    } catch (err) {
      console.error('[Stripe] 🛑 Erreur lors du traitement du webhook checkout.session.completed:', err)
      return res.status(500).json({ error: 'Erreur interne lors de la mise à jour de l\'abonnement.' })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    try {
      await pool.query('UPDATE users SET plan=$1, stripe_subscription_id=NULL, updated_at=NOW() WHERE stripe_subscription_id=$2', ['starter', subscription.id])
      console.log(`[Stripe] Subscription ${subscription.id} deleted — user downgraded to starter`)
    } catch(err) { console.error('[Stripe] Error handling subscription.deleted:', err) }
  }

  if (event.type === 'invoice.payment_failed') {
    console.error(`[Stripe] Payment failed for customer ${event.data.object.customer}`)
  }

  res.status(200).json({ received: true })
})

router.get('/subscription-status', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT plan FROM users WHERE id = $1', [req.user.id])
    res.json({ plan: result.rows[0]?.plan || 'starter', status: 'active' })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
