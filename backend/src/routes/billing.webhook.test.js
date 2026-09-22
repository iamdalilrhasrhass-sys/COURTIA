/**
 * billing.webhook.test.js — LE WEBHOOK STRIPE, EXERCÉ POUR DE VRAI (FR et CH).
 *
 * POURQUOI CE FICHIER EXISTE (audit Stripe du 22/09/2026) : la chaîne
 * « paiement -> confirmation -> base -> droits » n'avait AUCUN test de bout en
 * bout. Les tests existants couvraient la configuration (stripeService), les
 * plans (planService, billing.checkout-plans) et l'idempotence isolée
 * (billingWebhookService) — jamais le webhook lui-même, avec une vraie signature
 * et un vrai routeur. Un défaut de cette branche signifiait : un cabinet paie et
 * n'obtient rien, ou obtient des droits qui ne correspondent pas à son achat.
 *
 * CE QUI EST PROUVÉ ICI, avec la base simulée (aucun accès réseau, aucun
 * paiement réel) :
 *   1. SUISSE : un abonnement `independant` reste `independant` — il ne devient
 *      JAMAIS `starter` (défaut P1 corrigé le même jour).
 *   2. SUISSE : un abonnement SANS nos métadonnées est rattaché quand même, par
 *      l'identifiant de prix (les grilles FR et CH ont des prix distincts) et par
 *      le propriétaire du cabinet — jamais par un plan deviné.
 *   3. FRANCE : `checkout.session.completed` écrit l'abonnement, l'association
 *      client Stripe <-> cabinet et les droits, sans que la page de succès soit
 *      visitée (le webhook est la seule autorité).
 *   4. Événement REJOUÉ : l'idempotence rend « idempotent: true » sans réécrire.
 *   5. Événement EN RETARD : il n'écrase pas un état plus récent.
 *   6. Événement INCONNU : il est acquitté et enregistré, sans écriture métier.
 *   7. SIGNATURE : invalide ou absente => refus 400, aucune écriture.
 *
 * Les secrets utilisés sont des valeurs FACTICES locales (« dummy »), jamais une
 * clé réelle : ce test ne dépend d'aucun accès Stripe.
 */
process.env.BILLING_MODE = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_local_only';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy_local_only';
process.env.STRIPE_STARTER_PRICE_ID_TEST = 'price_test_starter';
process.env.STRIPE_PRO_PRICE_ID_TEST = 'price_test_pro';
process.env.STRIPE_INDEPENDANT_PRICE_ID_TEST = 'price_test_independant';
process.env.STRIPE_CABINET_CH_PRICE_ID_TEST = 'price_test_cabinet_ch';
process.env.FRONTEND_URL = 'https://app.courtiark.fr';

const crypto = require('crypto');

jest.mock('../db', () => ({ query: jest.fn() }));

const pool = require('../db');
const stripeService = require('../services/stripeService');

const ORG_ID = 77;
const USER_ID = 42;
const CUSTOMER_ID = 'cus_audit_test';
const SUB_ID = 'sub_audit_test';
const PRIX_CH = 'price_test_independant';
const PRIX_FR = 'price_test_pro';

/** Base simulée minimale : les écritures sont enregistrées, pas interprétées. */
function creerBase() {
  const etat = {
    appels: [],
    events: new Set(),
    clients: { [CUSTOMER_ID]: ORG_ID },
    proprietaires: { [ORG_ID]: USER_ID },
    abonnements: new Map(),
    ecrituresUtilisateurs: [],
    ecrituresVueHistorique: [],
    prochainId: 500,
  };

  const query = jest.fn(async (sql, params = []) => {
    const s = String(sql);
    etat.appels.push({ sql: s, params });

    if (/^\s*(CREATE|ALTER|COMMENT|DROP)/i.test(s)) return { rows: [] };

    // ── idempotence ──────────────────────────────────────────────────────────
    if (/SELECT 1 FROM payment_events/.test(s)) {
      return { rows: etat.events.has(params[0]) ? [{ '?column?': 1 }] : [] };
    }
    if (/INSERT INTO payment_events/.test(s)) {
      const id = params[0]; // `event_id` est le premier paramètre de l'INSERT
      if (etat.events.has(id)) return { rows: [] };
      etat.events.add(id);
      return { rows: [{ id: 1 }] };
    }

    // ── rattachements ────────────────────────────────────────────────────────
    if (/FROM customer_billing_profiles WHERE stripe_customer_id/.test(s)) {
      const org = etat.clients[params[0]];
      return { rows: org ? [{ organization_id: org }] : [] };
    }
    if (/SELECT \* FROM organization_profiles WHERE owner_user_id/.test(s)) {
      const org = Number(params[0]) === USER_ID ? ORG_ID : null;
      return { rows: org ? [{ id: org, owner_user_id: USER_ID }] : [] };
    }
    if (/SELECT owner_user_id FROM organization_profiles WHERE id=/.test(s)) {
      const uid = etat.proprietaires[Number(params[0])];
      return { rows: uid ? [{ owner_user_id: uid }] : [] };
    }
    if (/SELECT op\.owner_user_id/.test(s)) {
      const uid = etat.proprietaires[Number(params[0])];
      return { rows: uid ? [{ owner_user_id: uid, cabinet_id: null }] : [] };
    }
    if (/FROM billing_plans WHERE code=/.test(s)) {
      return { rows: [{ id: { starter: 1, pro: 2, cabinet: 3, independant: 76, cabinet_ch: 77 }[params[0]] || null }] };
    }
    if (/SELECT email, first_name FROM users WHERE id=/.test(s)) {
      return { rows: [{ email: 'cabinet@exemple.test', first_name: 'Cabinet' }] };
    }

    // ── abonnements ──────────────────────────────────────────────────────────
    if (/SELECT id, status, last_event_created_at, past_due_since FROM subscriptions WHERE provider_subscription_id=/.test(s)) {
      const ligne = etat.abonnements.get(params[0]);
      return { rows: ligne ? [ligne] : [] };
    }
    if (/INSERT INTO subscriptions/.test(s)) {
      const ligne = {
        id: etat.prochainId++,
        provider_subscription_id: params[2],
        status: params[3],
        last_event_created_at: params[10] || null,
        past_due_since: params[9] || null,
        params,
      };
      etat.abonnements.set(params[2], ligne);
      return { rows: [{ id: ligne.id }] };
    }
    if (/UPDATE subscriptions/.test(s)) {
      const ligne = [...etat.abonnements.values()].find((l) => l.id === params[params.length - 1]);
      if (ligne) {
        ligne.status = params[2];
        ligne.last_event_created_at = params[10] || ligne.last_event_created_at;
        ligne.derniereMaj = params;
      }
      return { rows: [] };
    }
    if (/INSERT INTO billing_subscriptions/.test(s)) {
      etat.ecrituresVueHistorique.push(params);
      return { rows: [] };
    }
    if (/UPDATE users/.test(s)) {
      etat.ecrituresUtilisateurs.push(params);
      return { rows: [] };
    }

    // ── documents et factures (hors périmètre de ce test) ────────────────────
    return { rows: [] };
  });

  return { etat, query };
}

let base;
let serveur;
let origine;

function signature(corps, secret = process.env.STRIPE_WEBHOOK_SECRET, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${corps}`).digest('hex')}`;
}

async function envoyerWebhook(corps, enteteSignature) {
  const reponse = await fetch(`${origine}/api/billing/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(enteteSignature ? { 'stripe-signature': enteteSignature } : {}),
    },
    body: corps,
  });
  return { statut: reponse.status, corps: await reponse.json() };
}

const secondes = (iso) => Math.floor(new Date(iso).getTime() / 1000);

beforeAll(async () => {
  const express = require('express');
  const router = require('./billing');
  const app = express();
  app.locals.pool = pool;
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
  app.use('/api/billing', router);
  await new Promise((resolve) => { serveur = app.listen(0, '127.0.0.1', resolve); });
  origine = `http://127.0.0.1:${serveur.address().port}`;
});

afterAll(async () => {
  if (serveur) await new Promise((r) => serveur.close(r));
});

beforeEach(() => {
  const creee = creerBase();
  base = creee.etat;
  pool.query.mockImplementation(creee.query);
});

describe('webhook Stripe : le paiement produit les bons droits (FR et CH)', () => {
  test('SUISSE : un abonnement « independant » reste independant (jamais starter)', async () => {
    const evenement = {
      id: 'evt_ch_1',
      type: 'customer.subscription.updated',
      created: 1790000000,
      data: {
        object: {
          id: SUB_ID,
          status: 'active',
          customer: CUSTOMER_ID,
          metadata: { user_id: String(USER_ID), organization_id: String(ORG_ID), plan_code: 'independant' },
          trial_start: null,
          trial_end: null,
          current_period_start: 1789990000,
          current_period_end: 1792590000,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: PRIX_CH } }] },
        },
      },
    };
    const corps = JSON.stringify(evenement);
    const reponse = await envoyerWebhook(corps, signature(corps));

    expect(reponse.statut).toBe(200);
    expect(reponse.corps).toMatchObject({ received: true });

    const abonnement = base.abonnements.get(SUB_ID);
    expect(abonnement).toBeDefined();
    expect(abonnement.status).toBe('active');

    const ecriture = base.ecrituresUtilisateurs.at(-1);
    expect(ecriture).toBeDefined();
    expect(ecriture[0]).toBe('independant');   // users.plan
    expect(ecriture[0]).not.toBe('starter');   // le défaut P1 corrigé
    expect(ecriture[1]).toBe('active');        // users.subscription_status
    expect(ecriture.at(-1)).toBe(USER_ID);     // le bon compte est crédité
    expect(base.events.has('evt_ch_1')).toBe(true);
  });

  test('SUISSE : abonnement SANS métadonnées -> rattaché par le prix et par le propriétaire du cabinet', async () => {
    const evenement = {
      id: 'evt_ch_sans_meta',
      type: 'customer.subscription.updated',
      created: 1790000100,
      data: {
        object: {
          id: 'sub_sans_meta',
          status: 'active',
          customer: CUSTOMER_ID,
          metadata: {},                      // aucun user_id, aucun plan_code
          items: { data: [{ price: { id: PRIX_CH } }] },
          current_period_end: 1792590000,
          cancel_at_period_end: false,
        },
      },
    };
    const corps = JSON.stringify(evenement);
    const reponse = await envoyerWebhook(corps, signature(corps));

    expect(reponse.statut).toBe(200);
    const ecriture = base.ecrituresUtilisateurs.at(-1);
    expect(ecriture[0]).toBe('independant');  // déduit du price ID, jamais deviné
    expect(ecriture.at(-1)).toBe(USER_ID);    // propriétaire du cabinet (seul rattachement non ambigu)
  });

  test('FRANCE : checkout.session.completed écrit abonnement, association client et droits SANS visite de la page de succès', async () => {
    jest.spyOn(stripeService, 'retrieveSubscription').mockResolvedValue({
      id: 'sub_fr_1',
      status: 'trialing',
      customer: CUSTOMER_ID,
      metadata: { plan_code: 'pro' },
      trial_start: 1790000000,
      trial_end: 1790600000,
      current_period_start: 1790000000,
      current_period_end: 1790600000,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: PRIX_FR } }] },
    });

    const evenement = {
      id: 'evt_fr_checkout',
      type: 'checkout.session.completed',
      created: 1790000200,
      data: {
        object: {
          id: 'cs_test_fr',
          subscription: 'sub_fr_1',
          customer: CUSTOMER_ID,
          metadata: { user_id: String(USER_ID), organization_id: String(ORG_ID), plan_code: 'pro' },
        },
      },
    };
    const corps = JSON.stringify(evenement);
    const reponse = await envoyerWebhook(corps, signature(corps));

    expect(reponse.statut).toBe(200);
    expect(base.abonnements.get('sub_fr_1')).toBeDefined();
    const ecriture = base.ecrituresUtilisateurs.at(-1);
    expect(ecriture[0]).toBe('pro');
    expect(ecriture[1]).toBe('trialing');
    // L'association client Stripe <-> cabinet est écrite dans le même passage.
    expect(base.appels.some((a) => /INSERT INTO customer_billing_profiles/.test(a.sql))).toBe(true);
    // Aucune requête vers une page de succès n'est intervenue : le webhook seul a suffi.
    expect(ecriture).toBeDefined();

    stripeService.retrieveSubscription.mockRestore();
  });

  test('Événement REJOUÉ : idempotent, aucune seconde écriture', async () => {
    const evenement = {
      id: 'evt_doublon',
      type: 'customer.subscription.updated',
      created: 1790000300,
      data: {
        object: {
          id: 'sub_doublon',
          status: 'active',
          customer: CUSTOMER_ID,
          metadata: { plan_code: 'independant' },
          items: { data: [{ price: { id: PRIX_CH } }] },
          cancel_at_period_end: false,
        },
      },
    };
    const corps = JSON.stringify(evenement);
    const premiere = await envoyerWebhook(corps, signature(corps));
    const ecrituresApresPremiere = base.ecrituresUtilisateurs.length;

    const seconde = await envoyerWebhook(corps, signature(corps));

    expect(premiere.statut).toBe(200);
    expect(seconde.statut).toBe(200);
    expect(seconde.corps).toMatchObject({ received: true, idempotent: true });
    expect(base.ecrituresUtilisateurs.length).toBe(ecrituresApresPremiere);
  });

  test('Événement EN RETARD : il n’écrase pas un état plus récent', async () => {
    // La base porte déjà un état PLUS RÉCENT (période suivante déjà appliquée).
    base.abonnements.set('sub_retard', {
      id: 900,
      provider_subscription_id: 'sub_retard',
      status: 'active',
      last_event_created_at: new Date('2030-01-01T00:00:00.000Z'),
      past_due_since: null,
    });

    const evenement = {
      id: 'evt_en_retard',
      type: 'customer.subscription.deleted',   // une résiliation ANCIENNE
      created: 1780000000,                     // bien avant l'état en base
      data: {
        object: {
          id: 'sub_retard',
          status: 'canceled',
          customer: CUSTOMER_ID,
          metadata: { plan_code: 'independant' },
          items: { data: [{ price: { id: PRIX_CH } }] },
          cancel_at_period_end: false,
        },
      },
    };
    const corps = JSON.stringify(evenement);
    const reponse = await envoyerWebhook(corps, signature(corps));

    expect(reponse.statut).toBe(200);
    // Ni l'abonnement ni les droits n'ont changé.
    expect(base.abonnements.get('sub_retard').status).toBe('active');
    expect(base.ecrituresUtilisateurs.length).toBe(0);
  });

  test('Événement INCONNU : acquitté et enregistré, aucune écriture métier', async () => {
    const evenement = {
      id: 'evt_inconnu',
      type: 'customer.created',
      created: 1790000400,
      data: { object: { id: CUSTOMER_ID } },
    };
    const corps = JSON.stringify(evenement);
    const reponse = await envoyerWebhook(corps, signature(corps));

    expect(reponse.statut).toBe(200);
    expect(reponse.corps).toMatchObject({ received: true });
    expect(base.abonnements.size).toBe(0);
    expect(base.ecrituresUtilisateurs.length).toBe(0);
    expect(base.events.has('evt_inconnu')).toBe(true);
  });

  test('SIGNATURE invalide et signature absente : refus, aucune écriture', async () => {
    const evenement = {
      id: 'evt_signature',
      type: 'customer.subscription.updated',
      created: 1790000500,
      data: { object: { id: 'sub_signature', status: 'active', customer: CUSTOMER_ID, metadata: { plan_code: 'pro' } } },
    };
    const corps = JSON.stringify(evenement);

    const invalide = await envoyerWebhook(corps, signature(corps, 'mauvais_secret'));
    expect(invalide.statut).toBe(400);
    expect(invalide.corps.error).toBe('invalid_signature');

    const absente = await envoyerWebhook(corps, undefined);
    expect(absente.statut).toBe(400);
    expect(absente.corps.error).toBe('missing_signature');

    expect(base.abonnements.size).toBe(0);
    expect(base.ecrituresUtilisateurs.length).toBe(0);
  });
});
