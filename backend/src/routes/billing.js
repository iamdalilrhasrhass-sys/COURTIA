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
// ÉTAT D'ABONNEMENT : un seul point d'écriture, partagé avec la réconciliation
// (services/billingSubscriptionState.js). Sans cela, un abonnement réparé par la
// réconciliation ne donnerait pas les mêmes droits qu'un abonnement reçu par
// webhook — deux chemins, deux vérités.
const etatAbonnement = require('../services/billingSubscriptionState');
// Marché du CABINET : seule autorité (lib/marcheCabinet.js). La grille tarifaire
// et la mention fiscale d'un membre ne dépendent jamais de SA fiche personnelle.
const marcheCabinet = require('../lib/marcheCabinet');
const { messagePublic } = require('../lib/erreursPubliques')

const router = express.Router();

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
}

/**
 * Nom affichable d'un plan, pris dans le CATALOGUE (`planService`).
 * POURQUOI : cette fonction renvoyait « Cabinet » pour tout code inconnu d'elle
 * — un message produit pouvait donc nommer un plan qui n'est pas celui demandé.
 * Un code hors catalogue n'a pas de nom : on affiche le code reçu, sans
 * l'habiller d'un autre produit.
 */
function cleanPlanLabel(planCode, marche = 'FR') {
  const code = String(planCode || '');
  // Appel défensif : certains tests montent ce routeur avec planService simulé.
  const plan = typeof planService.planPourCode === 'function'
    ? (planService.planPourCode(code, marche) || planService.planPourCode(code))
    : null;
  return plan?.name || code;
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

// (l'écriture de la vue historique vit désormais dans
// services/billingSubscriptionState.js, avec le reste de l'état d'abonnement)

// NOTE (audit Stripe du 22/09/2026) : `upsertSubscriptionFromCheckout` et
// `markUserSubscription` vivaient ici, avec leur propre copie des règles
// d'écriture de l'état d'abonnement. Elles ont été SUPPRIMÉES au profit de
// `services/billingSubscriptionState.js`, utilisé par le webhook ET par la
// réconciliation : deux copies des mêmes règles finissent par diverger, et une
// correction appliquée à une seule copie laisse l'autre produire un état faux
// (droits accordés à tort, ou retirés à tort).

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

// (supprime : ecriture de l'etat d'abonnement deplacee dans
//  services/billingSubscriptionState.js — un seul point d'ecriture)
async function findOrganizationByStripeCustomer(customerId) {
  const row = await pool.query(
    'SELECT organization_id FROM customer_billing_profiles WHERE stripe_customer_id=$1 LIMIT 1',
    [customerId]
  );
  return row.rows[0]?.organization_id || null;
}

async function updateCheckoutSessionStatus(sessionId, status, payload = {}) {
  // CORRECTION 2026-09-19 (bloquant revenu) : `$1` etait utilise DEUX fois, une
  // fois affecte a la colonne `status` (varchar) et une fois compare a la chaine
  // 'completed'. PostgreSQL en deduisait deux types incompatibles et la requete
  // echouait : « inconsistent types deduced for parameter $1 ». Comme cette
  // fonction est appelee dans le traitement de checkout.session.completed, CHAQUE
  // paiement reel se terminait en erreur 500 — l'abonnement n'etait jamais
  // finalise et Stripe rejouait l'evenement en boucle. Le statut est desormais
  // passe dans un parametre distinct, sans ambiguite de type.
  await pool.query(
    `UPDATE checkout_sessions
       SET status=$1::varchar,
           completed_at=CASE WHEN $4::text = 'completed' THEN NOW() ELSE completed_at END,
           raw_payload_json=$2::jsonb
     WHERE provider_session_id=$3`,
    [status, JSON.stringify(payload), sessionId, status]
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
    // AUCUN PLAN PAR DÉFAUT ICI (audit Stripe du 22/09/2026) : le repli
    // `|| 'starter'` masquait les abonnements SANS nos métadonnées — le défaut
    // « starter » court-circuitait la déduction par le price ID, donc un cabinet
    // suisse créé depuis Stripe était écrit en « starter ». Un code de plan
    // inconnu reste inconnu : la déduction par prix, puis le refus d'écrire.
    const planCode = billingService.normalizePlanCode(metadata.plan_code || metadata.plan);
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

    // ── ÉCRITURE DE L'ÉTAT : UN SEUL CHEMIN, PARTAGÉ AVEC LA RÉCONCILIATION ──
    // Avant le 22/09/2026, cette branche écrivait elle-même l'abonnement, la vue
    // historique et les droits, avec sa propre copie des règles. La
    // réconciliation n'existant pas, personne ne pouvait corriger un état perdu.
    let abonnementStripe = null;
    if (subscriptionId) {
      try {
        abonnementStripe = await stripeService.retrieveSubscription(subscriptionId);
      } catch (_err) {
        // Le webhook reste traité avec l'état minimal porté par la session :
        // échouer ici ferait rejouer Stripe sans jamais rien écrire.
        abonnementStripe = null;
      }
    }

    // Plan souscrit : métadonnées d'abord (posées par NOTRE checkout), puis le
    // price ID — les grilles FR et CH ont des price IDs distincts, la déduction
    // n'est donc jamais ambiguë. Sans plan identifiable, on n'écrit rien.
    const codeSouscrit = planCode
      || (abonnementStripe ? etatAbonnement.normaliserAbonnement(abonnementStripe).plan_code_metadata : null)
      || stripeService.getPlanCodePourPriceId(abonnementStripe?.items?.data?.[0]?.price?.id);

    if (!subscriptionId) {
      logger.warn({ session_id: session.id, organization_id: organizationId },
        'checkout.session.completed sans abonnement Stripe — état non écrit (paiement unique ?)');
    } else if (!codeSouscrit) {
      logger.warn({ session_id: session.id, subscription_id: subscriptionId, organization_id: organizationId },
        'checkout.session.completed sans plan identifiable — état non écrit (aucun plan deviné)');
    } else {
      await etatAbonnement.appliquerEtatAbonnement({
        query: (sql, params) => pool.query(sql, params),
        getPlanId: (c) => billingService.getPlanId(c),
        organizationId,
        planCode: codeSouscrit,
        userId,
        abonnement: abonnementStripe
          ? { ...abonnementStripe, customer: customerId, metadata: { ...(abonnementStripe.metadata || {}), plan_code: codeSouscrit } }
          : {
            id: subscriptionId,
            status: 'active',
            customer: customerId,
            metadata: { ...metadata, plan_code: codeSouscrit },
          },
        eventCreatedAt: new Date((event.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        eventId: event.id,
      });
    }

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

    return;
  }

  if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
    const sub = data;
    const metadata = sub.metadata || {};
    const userId = Number(metadata.user_id || 0) || null;
    let organizationId = Number(metadata.organization_id || 0) || null;
    // AUCUN PLAN PAR DÉFAUT ICI (audit Stripe du 22/09/2026) : le repli
    // `|| 'starter'` masquait les abonnements SANS nos métadonnées — le défaut
    // « starter » court-circuitait la déduction par le price ID, donc un cabinet
    // suisse créé depuis Stripe était écrit en « starter ». Un code de plan
    // inconnu reste inconnu : la déduction par prix, puis le refus d'écrire.
    const planCode = billingService.normalizePlanCode(metadata.plan_code || metadata.plan);
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

    // MÊME CHEMIN D'ÉCRITURE que le webhook de paiement et que la réconciliation.
    // Plan : métadonnées d'abord, puis le price ID (déduction non ambiguë, les
    // grilles FR et CH ayant des price IDs distincts) ; sinon on n'écrit RIEN.
    const codeAbonnement = planCode
      || sub.metadata?.plan_code
      || sub.metadata?.plan
      || stripeService.getPlanCodePourPriceId(sub.items?.data?.[0]?.price?.id);

    if (!codeAbonnement) {
      logger.warn(
        { subscription_id: providerSubscriptionId, organization_id: organizationId, type },
        'abonnement Stripe sans plan identifiable — état non écrit (aucun plan deviné)'
      );
      return;
    }

    await etatAbonnement.appliquerEtatAbonnement({
      query: (sql, params) => pool.query(sql, params),
      getPlanId: (c) => billingService.getPlanId(c),
      organizationId,
      planCode: codeAbonnement,
      userId,
      abonnement: {
        ...sub,
        customer: customerId,
        metadata: { ...(sub.metadata || {}), plan_code: codeAbonnement },
      },
      eventCreatedAt: new Date((event.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      eventId: event.id,
    });

    return;
  }

  if (type === 'invoice.paid' || type === 'invoice.payment_failed') {
    const invoice = data;
    const customerId = invoice.customer || null;
    let organizationId = customerId ? await findOrganizationByStripeCustomer(customerId) : null;

    // CORRECTION 2026-09-19 : cette branche resolvait l'organisation UNIQUEMENT
    // par le client Stripe et sortait en SILENCE sinon. Un paiement recu pouvait
    // donc ne laisser aucune trace (aucune facture, aucun statut, aucun
    // avertissement). On retombe sur l'utilisateur des metadonnees, et on
    // journalise franchement l'echec.
    if (!organizationId) {
      const userId = Number(invoice.subscription_details?.metadata?.user_id || 0) || null;
      if (userId) {
        const org = await billingService.getOrCreateOrganization(userId);
        organizationId = org?.id || null;
      }
    }
    if (!organizationId) {
      logger.warn({ event_type: type, invoice_id: invoice.id, customer: customerId },
        'stripe invoice: organisation introuvable — facture NON enregistree');
      return;
    }

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

    // Statut porté par la FACTURE, avec la même protection contre les événements
    // en retard que le reste du webhook : une facture rejouée par Stripe ne doit
    // pas repasser en « past_due » un abonnement déjà régularisé.
    if (invoice.subscription) {
      const resultatFacture = await etatAbonnement.appliquerStatutFacture({
        query: (sql, params) => pool.query(sql, params),
        providerSubscriptionId: invoice.subscription,
        statut: type === 'invoice.paid' ? 'active' : 'past_due',
        eventCreatedAt: new Date((event.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        eventId: event.id,
      });
      if (!resultatFacture.applied) {
        logger.info({ invoice_id: invoice.id, raison: resultatFacture.reason },
          'facture Stripe : état d\'abonnement inchangé');
      }
    }

  }
}

/**
 * Marché du CABINET appelant (lib/marcheCabinet.js), sans rendre la route
 * obligatoirement authentifiée : si un jeton valide est présent, on lit le
 * marché du cabinet de l'utilisateur ; sinon on reste sur la grille par défaut
 * (euros). Un visiteur anonyme ne voit donc rien changer.
 *
 * POURQUOI CE PASSAGE PAR LE HELPER (défaut P0 du 20/09/2026) : cette fonction
 * lisait `broker_profiles.pays` de la PERSONNE connectée. Le propriétaire d'un
 * cabinet suisse recevait donc « 199 CHF HT / mois, TVA suisse (8,1 %) » et son
 * commercial du même cabinet « Starter 89 € HT / mois, TVA 20 % » — une
 * fiscalité française servie à une entreprise suisse. Le marché appartient au
 * cabinet : `marcheDuCabinet` est la seule autorité.
 */
async function marcheDepuisRequete(req) {
  try {
    const entete = req.headers.authorization || '';
    if (!entete.startsWith('Bearer ')) return 'FR';
    const { getJwtSecret } = require('../utils/jwtSecret');
    const jwt = require('jsonwebtoken');
    const decode = jwt.verify(entete.slice(7), getJwtSecret());
    const userId = decode.id || decode.userId;
    if (!userId) return 'FR';
    const marche = await marcheCabinet.marcheUtilisateur(userId, { query: (sql, params) => pool.query(sql, params) });
    return marche.marche;
  } catch (_) {
    return 'FR';
  }
}

router.get('/plans', async (req, res) => {
  try {
    await billingService.ensureBillingFoundation();
    const marche = await marcheDepuisRequete(req);
    const plans = billingService.getPlans(marche);
    return res.json({
      success: true,
      market: marche,
      billing_mode: stripeService.getBillingMode(),
      trial_days: billingService.TRIAL_DAYS,
      fiscal_label: plans[0]?.fiscal_label || billingService.FISCAL_LABEL,
      // La disponibilité du paiement se lit sur la grille du MÊME marché que les
      // prix affichés : un cabinet suisse n'attend pas STRIPE_PRICE_STARTER.
      stripe_configuration: stripeService.getConfigurationStatus(marche),
      plans,
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
      return res.status(400).json({ success: false, error: 'consent_required', message: messagePublic(err, { statut: 400 }) });
    }
    return res.status(500).json({ success: false, error: 'legal_acceptance_failed' });
  }
});

async function createCheckoutSessionHandler(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });

    await billingService.ensureBillingFoundation();

    // ── LES CODES ACCEPTÉS SONT EXACTEMENT CEUX SERVIS PAR /api/billing/plans ──
    // DÉFAUT P1 MESURÉ (21/09/2026, 4e passe adverse) : cette route validait sur
    // une liste recopiée `['starter','pro','cabinet']` (grille euros) alors que
    // `/api/billing/plans` sert au cabinet suisse `independant`, `cabinet_ch` et
    // `cabinet_ch_sur_devis` (199/349 CHF HT). Les trois codes étaient refusés en
    // 400 `invalid_plan` : un cabinet suisse ne pouvait souscrire AUCUN de ses
    // plans. La validation vient désormais du MÊME catalogue (planService), pour
    // le marché réel du cabinet — plus de liste à tenir en double.
    const marche = await marcheDepuisRequete(req);
    const planDemande = req.body?.plan_code || req.body?.plan;
    const planCode = billingService.normalizePlanCode(planDemande, marche);

    if (!planCode) {
      // La liste annoncée est celle que sert RÉELLEMENT /api/billing/plans pour
      // ce cabinet (même service), jamais une liste recopiée ici.
      let disponibles = [];
      try {
        disponibles = (billingService.getPlans(marche) || []).map((p) => p.code);
      } catch (_) {
        disponibles = [];
      }
      return res.status(400).json({
        success: false,
        error: 'invalid_plan',
        plan_recu: planDemande === undefined || planDemande === null ? null : String(planDemande),
        plans_disponibles: disponibles,
        message: planDemande
          ? `Le plan « ${String(planDemande)} » n'existe pas pour votre cabinet. Plans disponibles : ${disponibles.join(', ')}.`
          : `Aucun plan n'a été transmis. Plans disponibles : ${disponibles.join(', ')}.`,
      });
    }

    // « Sur devis » (aucun prix à encaisser) : c'est un contact commercial, pas
    // un checkout. La règle vient du CATALOGUE (prix non renseigné) et non d'une
    // liste de codes recopiée : la grille suisse a son propre code sur devis.
    const planCatalogue = (typeof billingService.planPourMarche === 'function'
      ? billingService.planPourMarche(planCode, marche)
      : null)
      || (typeof planService.planPourCode === 'function' ? planService.planPourCode(planCode) : null);
    if (!planCatalogue || planCatalogue.price == null) {
      return res.status(409).json({
        success: false,
        error: 'cabinet_contact_required',
        contact_required: true,
        plan_code: planCode,
        message: `L’offre ${cleanPlanLabel(planCode, marche)} est sur devis. Merci de demander un contact commercial.`,
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
      const configuration = stripeService.getConfigurationStatus(marche);
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
        // Le plan EXISTE (il est servi à l'écran) : ce qui manque est son price
        // ID Stripe, et on le nomme au lieu de laisser croire à un plan inconnu.
        message: `Price ID Stripe manquant pour le plan ${cleanPlanLabel(planCode, marche)}.`,
        plan_code: planCode,
        stripe_configuration: stripeService.getConfigurationStatus(marche),
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
    // Le marché et la mention fiscale viennent du CABINET (jamais de la fiche du
    // collaborateur connecté) : deux membres d'un même cabinet ne peuvent pas
    // recevoir deux fiscalités différentes sur le même écran.
    const marche = await marcheDepuisRequete(req);
    const plans = billingService.getPlans(marche);
    return res.json({
      success: true,
      market: marche,
      billing_mode: stripeService.getBillingMode(),
      fiscal_label: plans[0]?.fiscal_label || billingService.FISCAL_LABEL,
      // La disponibilité du paiement se lit sur la grille du MÊME marché que les
      // prix affichés : un cabinet suisse n'attend pas STRIPE_PRICE_STARTER.
      stripe_configuration: stripeService.getConfigurationStatus(marche),
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
    const marche = await marcheDepuisRequete(req);
    const plans = billingService.getPlans(marche);
    return res.json({
      success: true,
      market: marche,
      fiscal_label: plans[0]?.fiscal_label || billingService.FISCAL_LABEL,
      subscription: status,
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'billing_status_unavailable' });
  }
});

async function createPortalSessionHandler(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
    await billingService.ensureBillingFoundation();
    const marche = await marcheDepuisRequete(req);

    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'stripe_configuration_required',
        message: 'Configuration Stripe requise côté backend avant d’ouvrir le portail client.',
        stripe_configuration: stripeService.getConfigurationStatus(marche),
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
    const marche = await marcheDepuisRequete(req);

    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'stripe_configuration_required',
        message: 'Configuration Stripe requise côté backend avant de gérer l’abonnement.',
        stripe_configuration: stripeService.getConfigurationStatus(marche),
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
    // ────────────────────────────────────────────────────────────────────────
    // 503 « SECRET NON CONFIGURÉ » ET NON 200 « REÇU »
    // (correction du 20/09/2026 — troisième QA adverse, défaut D3-07)
    //
    // DÉFAUT MESURÉ : sans `STRIPE_WEBHOOK_SECRET`, les quatre chemins de
    // webhook répondaient 200 {"received":true,"note":"stripe_not_configured"}
    // sans RIEN traiter — y compris avec une signature absente, invalide, ou le
    // jeton d'un compte en lecture seule. C'est un « succès » pour une opération
    // qui n'a pas eu lieu : Stripe ne réessaiera pas, et un humain qui appelle
    // la route croit que l'événement a été enregistré.
    //
    // RÈGLE TENUE (identique aux autres webhooks du produit — WhatsApp,
    // messagerie entrante, signatures) : tant que le secret n'est pas
    // configuré, le point d'entrée est FERMÉ et le dit : 503
    // `secret_non_configure`, message produit, aucun traitement, aucune
    // écriture. Le code reste dans les journaux du serveur, jamais dans le corps.
    // ────────────────────────────────────────────────────────────────────────
    if (!stripeService.isConfigured()) {
      return res.status(503).json({
        error: 'secret_non_configure',
        code: 'stripe_webhook_secret',
        message:
          'Le webhook de facturation est fermé : la clé de signature Stripe '
          + "(STRIPE_WEBHOOK_SECRET) n'est pas configurée sur ce serveur. "
          + "Aucun événement n'a été traité.",
      });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'missing_signature' });

    let event;
    try {
      event = stripeService.constructWebhookEvent(req.rawBody, signature);
    } catch (sigErr) {
      return res.status(400).json({ error: 'invalid_signature' });
    }

    // CORRECTION 2026-09-19 : l'evenement etait marque « traite » AVANT d'etre
    // traite. Si handleStripeEvent echouait ensuite, la ligne payment_events
    // restait ecrite et les renvois de Stripe recevaient « idempotent: true » :
    // un client ayant REELLEMENT paye pouvait ne jamais voir son abonnement
    // active, sans aucun moyen de rattrapage. On verifie donc d'abord si
    // l'evenement a deja ete traite, on fait le travail, et on l'enregistre
    // seulement EN CAS DE SUCCES. En cas d'echec : 500, Stripe reessaie.
    const dejaTraite = await pool.query(
      'SELECT 1 FROM payment_events WHERE event_id = $1 LIMIT 1',
      [event.id]
    );
    if (dejaTraite.rows.length > 0) {
      return res.status(200).json({ received: true, idempotent: true });
    }

    await handleStripeEvent(event);
    await insertStripePaymentEventIfNew(pool, event, null, null);

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
  } catch (err) {
    // Erreur de TRAITEMENT (et non signature invalide) : on repond 500 pour que
    // Stripe reessaie, et on n'inscrit rien au journal d'evenements.
    logger.error({ error: err.message, stack: err.stack?.split('\n')[1] },
      'stripe webhook: traitement en echec — Stripe doit reessayer');
    return res.status(500).json({ error: 'webhook_processing_failed' });
  }
}

router.post('/webhook', stripeWebhookHandler);
router.post('/stripe-webhook', stripeWebhookHandler);

module.exports = router;
