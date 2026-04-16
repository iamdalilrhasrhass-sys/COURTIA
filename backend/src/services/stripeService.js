/**
 * stripeService.js — Stripe v22 (SDK officiel)
 *
 * Remplace le stub factice de la v2.
 * Toutes les fonctions sont préfixées d'un log console pour faciliter
 * le debug en phase de test (avant mise en prod live).
 *
 * Idempotence :
 *   handleWebhookEvent → INSERT INTO payment_events … ON CONFLICT DO NOTHING
 *   Si Stripe rejoue un événement déjà traité, il est ignoré silencieusement.
 *
 * Adaptations DB :
 *   users.id          = identifiant du courtier
 *   users.courtier_id N'EXISTE PAS sur users — users.id est la clé primaire
 *   clients.courtier_id = FK vers users.id (utilisé dans les autres services)
 */

const pool = require('../db');

// Initialisation du client Stripe (lazy : ne plante pas si la clé est absente au démarrage)
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('[stripeService] STRIPE_SECRET_KEY manquante dans les variables d\'env');
  }
  const Stripe = require('stripe');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// ─── Détecte si une subscription Stripe concerne l'add-on CAPITIA ───────────
/** Détecte si une subscription Stripe concerne l'add-on CAPITIA. */
function isCapitiaAddon(subscription) {
  if (!process.env.STRIPE_PRICE_CAPITIA) return false;
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  return priceId === process.env.STRIPE_PRICE_CAPITIA;
}

// ─── Mapping plan interne → price_id Stripe ──────────────────────────────────
function getPriceId(plan) {
  const map = {
    start: process.env.STRIPE_PRICE_START,
    pro:   process.env.STRIPE_PRICE_PRO,
    elite: process.env.STRIPE_PRICE_ELITE,
  };
  const priceId = map[plan];
  if (!priceId) {
    throw new Error(`[stripeService] STRIPE_PRICE_${plan.toUpperCase()} manquant dans les variables d'env`);
  }
  return priceId;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKOUT & PORTAIL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée une session Stripe Checkout pour un abonnement.
 * Retourne l'URL vers laquelle rediriger le frontend.
 *
 * @param {number} userId   ID de l'utilisateur dans users
 * @param {'start'|'pro'|'elite'} plan
 * @returns {Promise<{ url: string, sessionId: string }>}
 */
async function createCheckoutSession(userId, plan) {
  const stripe = getStripe();

  // Récupérer ou créer le customer Stripe
  const userResult = await pool.query(
    'SELECT id, email, first_name, last_name, stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );
  if (userResult.rows.length === 0) throw new Error('Utilisateur non trouvé');
  const user = userResult.rows[0];

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name:  `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      metadata: { courtia_user_id: String(userId) },
    });
    customerId = customer.id;
    await pool.query(
      'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
      [customerId, userId]
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer:    customerId,
    mode:        'subscription',
    line_items:  [{ price: getPriceId(plan), quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL || 'https://courtia.vercel.app'}/billing?success=1&plan=${plan}`,
    cancel_url:  `${process.env.FRONTEND_URL || 'https://courtia.vercel.app'}/billing?cancelled=1`,
    metadata: {
      courtia_user_id: String(userId),
      plan,
    },
    subscription_data: {
      metadata: { courtia_user_id: String(userId), plan },
    },
  });

  console.log(`[Stripe] Checkout session créée — user ${userId} — plan ${plan} — ${session.id}`);
  return { url: session.url, sessionId: session.id };
}

/**
 * Crée une session portail client Stripe (gestion abonnement, CB, factures).
 * Retourne l'URL vers laquelle rediriger le frontend.
 *
 * @param {number} userId
 * @returns {Promise<{ url: string }>}
 */
async function createPortalSession(userId) {
  const stripe = getStripe();

  const userResult = await pool.query(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );
  const customerId = userResult.rows[0]?.stripe_customer_id;
  if (!customerId) {
    throw new Error('Aucun compte Stripe associé à cet utilisateur. Abonnez-vous d\'abord.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${process.env.FRONTEND_URL || 'https://courtia.vercel.app'}/billing`,
  });

  console.log(`[Stripe] Portal session créée — user ${userId}`);
  return { url: session.url };
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK HANDLER — point d'entrée unique
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Traite un événement Stripe vérifié.
 * Idempotent : un event déjà traité est ignoré (ON CONFLICT DO NOTHING).
 *
 * @param {object} event  Objet event Stripe (déjà vérifié par constructEvent)
 */
async function handleWebhookEvent(event) {
  // 1. Insérer dans payment_events pour l'historique + idempotence
  const inserted = await pool.query(
    `INSERT INTO payment_events
       (stripe_event_id, event_type, raw_payload, processed_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id`,
    [event.id, event.type, JSON.stringify(event)]
  );

  // Si 0 lignes insérées → event déjà traité → ignorer silencieusement
  if (inserted.rows.length === 0) {
    console.log(`[Stripe Webhook] Event ${event.id} déjà traité — ignoré`);
    return;
  }

  console.log(`[Stripe Webhook] Traitement event ${event.type} — ${event.id}`);

  switch (event.type) {
    case 'invoice.payment_failed':
      await handlePaymentFailed(event);
      break;

    case 'invoice.payment_succeeded':
    case 'invoice.paid':
      await handlePaymentSuccess(event);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event);
      break;

    case 'checkout.session.completed':
      await handleCheckoutCompleted(event);
      break;

    default:
      console.log(`[Stripe Webhook] Event ${event.type} ignoré (non géré)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLERS INTERNES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paiement échoué :
 *  - 1er échec → grace_period 7 jours + email relance n°1
 *  - 2e/3e échec → incrémente attempts + email de relance
 *  - 4e+ échec → ne fait plus rien (dunningWorker suspendra à échéance)
 */
async function handlePaymentFailed(event) {
  const invoice    = event.data.object;
  const customerId = invoice.customer;

  const userResult = await pool.query(
    'SELECT id, email, first_name FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );
  if (userResult.rows.length === 0) {
    console.warn(`[Stripe] Paiement échoué pour customer ${customerId} — aucun user trouvé`);
    return;
  }
  const user = userResult.rows[0];

  // Mettre à jour montant dans payment_events
  await pool.query(
    `UPDATE payment_events
     SET user_id = $1, amount = $2, status = 'failed', failure_reason = $3
     WHERE stripe_event_id = $4`,
    [user.id, (invoice.amount_due || 0) / 100, invoice.failure_message || null, event.id]
  );

  // Chercher un dunning ouvert (resolved_at IS NULL)
  const existing = await pool.query(
    `SELECT id, attempts FROM payment_dunning
     WHERE user_id = $1 AND resolved_at IS NULL
     ORDER BY failed_at DESC LIMIT 1`,
    [user.id]
  );

  if (existing.rows.length === 0) {
    // Premier échec → démarrer la période de grâce 7 jours
    const graceUntil = new Date();
    graceUntil.setDate(graceUntil.getDate() + 7);

    await pool.query(
      `UPDATE users
       SET subscription_status = 'grace_period',
           grace_period_until  = $1
       WHERE id = $2`,
      [graceUntil, user.id]
    );

    await pool.query(
      `INSERT INTO payment_dunning
         (user_id, stripe_invoice_id, failed_at, attempts, last_email_sent_at)
       VALUES ($1, $2, NOW(), 1, NOW())`,
      [user.id, invoice.id]
    );

    await sendDunningEmail({
      to:        user.email,
      firstName: user.first_name,
      attempt:   1,
      graceUntil,
      invoiceUrl: invoice.hosted_invoice_url || null,
    });

  } else {
    const dunning = existing.rows[0];
    if (dunning.attempts < 3) {
      await pool.query(
        `UPDATE payment_dunning
         SET attempts = attempts + 1, last_email_sent_at = NOW()
         WHERE id = $1`,
        [dunning.id]
      );
      await sendDunningEmail({
        to:        user.email,
        firstName: user.first_name,
        attempt:   dunning.attempts + 1,
        graceUntil: null,
        invoiceUrl: invoice.hosted_invoice_url || null,
      });
    } else {
      console.log(`[Dunning] User ${user.id} — 3 relances déjà envoyées, suspension à venir via cron`);
    }
  }
}

/**
 * Paiement réussi :
 *  - Remet subscription_status = 'active'
 *  - Efface grace_period_until et suspended_at
 *  - Clôture le dunning en cours
 */
async function handlePaymentSuccess(event) {
  const invoice    = event.data.object;
  const customerId = invoice.customer;

  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );
  if (userResult.rows.length === 0) return;
  const user = userResult.rows[0];

  await pool.query(
    `UPDATE users
     SET subscription_status = 'active',
         grace_period_until  = NULL,
         suspended_at        = NULL,
         suspended_reason    = NULL
     WHERE id = $1`,
    [user.id]
  );

  // Mettre à jour payment_events
  await pool.query(
    `UPDATE payment_events
     SET user_id = $1, amount = $2, status = 'succeeded'
     WHERE stripe_event_id = $3`,
    [user.id, (invoice.amount_paid || 0) / 100, event.id]
  );

  // Clôturer le dunning ouvert si présent
  await pool.query(
    `UPDATE payment_dunning
     SET resolved_at = NOW(), resolved_status = 'paid'
     WHERE user_id = $1 AND resolved_at IS NULL`,
    [user.id]
  );

  console.log(`[Stripe] Paiement OK — user ${user.id} remis à 'active'`);
}

/**
 * Abonnement annulé (par le client depuis le portail, ou Stripe après échecs) :
 *  - subscription_status = 'cancelled'
 */
async function handleSubscriptionCancelled(event) {
  const subscription = event.data.object;
  const customerId   = subscription.customer;

  // CAPITIA : désactivation sur suppression subscription
  if (isCapitiaAddon(subscription)) {
    await pool.query(
      `UPDATE users
       SET financing_addon_active          = FALSE,
           financing_addon_subscription_id = NULL,
           financing_addon_started_at      = NULL
       WHERE financing_addon_subscription_id = $1`,
      [subscription.id]
    );
    console.log(`[CAPITIA] Add-on désactivé — subscription ${subscription.id}`);
    return;
  }

  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );
  if (userResult.rows.length === 0) return;
  const user = userResult.rows[0];

  await pool.query(
    `UPDATE users
     SET subscription_status = 'cancelled',
         stripe_subscription_id = NULL
     WHERE id = $1`,
    [user.id]
  );

  console.log(`[Stripe] Abonnement annulé — user ${user.id}`);
}

/**
 * Abonnement mis à jour (changement de plan via portail Stripe) :
 *  - Met à jour subscription_plan selon le price_id de la nouvelle ligne
 */
async function handleSubscriptionUpdated(event) {
  const subscription = event.data.object;
  const customerId   = subscription.customer;
  const priceId      = subscription.items?.data?.[0]?.price?.id;

  if (!priceId) return;

  // Déterminer le plan à partir du price_id
  const priceMap = {
    [process.env.STRIPE_PRICE_START]: 'start',
    [process.env.STRIPE_PRICE_PRO]:   'pro',
    [process.env.STRIPE_PRICE_ELITE]: 'elite',
  };
  const newPlan = priceMap[priceId];

  // CAPITIA add-on : sync statut selon subscription status
  if (isCapitiaAddon(subscription)) {
    const active = ['active', 'trialing'].includes(subscription.status);
    await pool.query(
      `UPDATE users
       SET financing_addon_active          = $1,
           financing_addon_subscription_id = CASE WHEN $1 THEN $2 ELSE NULL END,
           financing_addon_started_at      = CASE WHEN $1 THEN COALESCE(financing_addon_started_at, NOW()) ELSE NULL END
       WHERE financing_addon_subscription_id = $2`,
      [active, subscription.id]
    );
    console.log(`[CAPITIA] Statut sync — subscription ${subscription.id} → ${active ? 'actif' : 'inactif'}`);
    return;
  }

  if (!newPlan) {
    console.warn(`[Stripe] price_id ${priceId} non reconnu — plan non mis à jour`);
    return;
  }

  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );
  if (userResult.rows.length === 0) return;
  const user = userResult.rows[0];

  await pool.query(
    `UPDATE users
     SET subscription_plan   = $1,
         stripe_subscription_id = $2,
         subscription_status = 'active'
     WHERE id = $3`,
    [newPlan, subscription.id, user.id]
  );

  // Invalider le cache plan_limits pour que le changement soit immédiat
  try {
    const { invalidatePlanLimitsCache } = require('./planService');
    invalidatePlanLimitsCache();
  } catch (e) { /* ignore */ }

  console.log(`[Stripe] Plan mis à jour — user ${user.id} → ${newPlan}`);
}

/**
 * Checkout complété : active l'abonnement côté COURTIA.
 * Stripe enverra aussi un invoice.paid, mais on gère ici le cas
 * où le customer vient de s'abonner pour la 1ère fois.
 */
async function handleCheckoutCompleted(event) {
  const session    = event.data.object;
  const customerId = session.customer;
  const subId      = session.subscription;

  if (!customerId) return;

  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );
  if (userResult.rows.length === 0) return;
  const user = userResult.rows[0];

  // ⚠️  CAPITIA : détecter EN PREMIER avant tout UPDATE subscription_plan.
  //    Si le checkout concerne l'add-on CAPITIA, ne jamais toucher subscription_plan
  //    (sinon on rétrograde un utilisateur Pro/Elite à 'start').
  if (subId) {
    try {
      const stripe       = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subId);
      if (isCapitiaAddon(subscription)) {
        await pool.query(
          `UPDATE users
           SET financing_addon_active          = TRUE,
               financing_addon_subscription_id = $1,
               financing_addon_started_at      = NOW()
           WHERE id = $2`,
          [subscription.id, user.id]
        );
        console.log(`[CAPITIA] Add-on activé — user ${user.id}`);
        return; // Court-circuit : ne pas mettre à jour subscription_plan
      }
    } catch (e) {
      console.warn(`[CAPITIA] Impossible de vérifier la subscription ${subId}:`, e.message);
    }
  }

  // Abonnement principal : mise à jour plan + statut
  const plan = session.metadata?.plan || 'start';
  await pool.query(
    `UPDATE users
     SET subscription_plan      = $1,
         subscription_status    = 'active',
         stripe_subscription_id = $2,
         grace_period_until     = NULL,
         trial_ends_at          = NULL
     WHERE id = $3`,
    [plan, subId, user.id]
  );

  console.log(`[Stripe] Checkout complété — user ${user.id} → plan ${plan}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL DUNNING — STUB (à brancher sur Resend / Postmark / SendGrid)
// ─────────────────────────────────────────────────────────────────────────────

const DUNNING_SUBJECTS = [
  null, // index 0 non utilisé
  'Action requise : votre paiement COURTIA a échoué',
  '⚠️ Rappel : régularisez votre abonnement COURTIA',
  '🚨 DERNIER RAPPEL avant suspension de votre compte COURTIA',
];

/**
 * Envoie (ou simule) un email de relance de paiement.
 * Signature complète pour faciliter le branchement sur une vraie API email.
 *
 * @param {{ to: string, firstName: string, attempt: number,
 *            graceUntil: Date|null, invoiceUrl: string|null }} opts
 */
async function sendDunningEmail({ to, firstName, attempt, graceUntil, invoiceUrl }) {
  const subject = DUNNING_SUBJECTS[attempt] || DUNNING_SUBJECTS[3];

  let body;
  if (attempt === 1) {
    body = `Bonjour ${firstName || 'Courtier'},\n\n`
      + `Votre paiement COURTIA n'a pas pu être débité.\n`
      + `Vous bénéficiez d'une période de grâce de 7 jours jusqu'au ${graceUntil ? graceUntil.toLocaleDateString('fr-FR') : 'N/A'}.\n`
      + (invoiceUrl ? `\nRégularisez ici : ${invoiceUrl}\n` : '')
      + `\nL'équipe COURTIA`;
  } else if (attempt === 2) {
    body = `Bonjour ${firstName || 'Courtier'},\n\n`
      + `Rappel : votre paiement COURTIA est toujours en attente.\n`
      + (invoiceUrl ? `Régularisez ici : ${invoiceUrl}\n` : '')
      + `\nSans régularisation, votre compte sera suspendu automatiquement.\n`
      + `\nL'équipe COURTIA`;
  } else {
    body = `Bonjour ${firstName || 'Courtier'},\n\n`
      + `DERNIER RAPPEL : votre compte COURTIA sera suspendu dans moins de 24h.\n`
      + (invoiceUrl ? `Régularisez immédiatement : ${invoiceUrl}\n` : '')
      + `\nL'équipe COURTIA`;
  }

  // ─── TODO : remplacer ce console.log par votre API email ───
  // Exemple avec Resend :
  //   await resend.emails.send({ from: 'noreply@courtia.fr', to, subject, text: body })
  // Exemple avec SendGrid :
  //   await sgMail.send({ to, from: 'noreply@courtia.fr', subject, text: body })
  // ────────────────────────────────────────────────────────────

  console.log(`[DUNNING EMAIL] Tentative ${attempt}/3`);
  console.log(`  To      : ${to}`);
  console.log(`  Subject : ${subject}`);
  console.log(`  Body    : ${body.substring(0, 100)}...`);

  // Structure de retour prête pour le branchement
  return { to, subject, body, template: `dunning_attempt_${attempt}`, sent: false };
}

module.exports = {
  createCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
  sendDunningEmail,
};
