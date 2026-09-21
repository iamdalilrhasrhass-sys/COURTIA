/**
 * billing.checkout-plans.test.js — LES CODES DE PLAN SERVIX PAR L'API SONT
 * EXACTEMENT CEUX QUE LE CHECKOUT ACCEPTE.
 *
 * DÉFAUT P1 MESURÉ EN PRODUCTION (21/09/2026, 4e passe adverse) :
 *   GET  /api/billing/plans (cabinet pays=CH)
 *        → codes `independant`, `cabinet_ch`, `cabinet_ch_sur_devis`
 *          (CHF, 199 / 349 CHF HT, TVA suisse 8,1 %)
 *   POST /api/billing/create-checkout-session {"plan":"independant"} → 400 invalid_plan
 *   idem `cabinet_ch` et `cabinet_ch_sur_devis`
 *   Les seuls codes acceptés étaient `starter` / `pro` / `cabinet` (grille euros).
 *   Conséquence : un cabinet suisse ne pouvait souscrire AUCUN de ses plans, même
 *   une fois Stripe configuré — la grille affichée était une grille morte.
 *
 * Ce fichier exerce les VRAIS services (planService, billingService,
 * stripeService) avec la base simulée : ce qui est annoncé par /plans doit
 * traverser la validation du checkout. Stripe n'est pas configuré dans cet
 * environnement de test : le checkout s'arrête donc à 503
 * `stripe_configuration_required` — c'est-à-dire APRÈS la validation du plan.
 * Un 400 `invalid_plan` sur un code servi est précisément la régression gardée.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 140, userId: 140, role: 'owner' }; next(); },
  isSessionRevoked: async () => ({ revoked: false }),
}));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'secret-de-test' }));
jest.mock('../lib/marcheCabinet', () => ({
  marcheUtilisateur: jest.fn(async () => ({ marche: mockMarcheCourant, source: 'test' })),
}));
jest.mock('../services/analyticsService', () => ({ trackEvent: jest.fn(async () => ({})) }));
jest.mock('../services/legalAcceptanceService', () => ({
  getLatestAcceptance: jest.fn(async () => null),
  recordLegalAcceptance: jest.fn(async () => ({})),
}));

// Le marché du cabinet appelant, piloté par le test (le mock jest doit lire une
// variable préfixée `mock`).
let mockMarcheCourant = 'CH';

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = require('./billing');

const ID_ORG = 42;

describe('billing : les codes servis par /plans sont acceptés par le checkout', () => {
  let server;
  let origin;
  const requetes = [];

  beforeAll(async () => {
    const app = express();
    app.locals.pool = pool;
    app.use(express.json());
    app.use('/api/billing', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    requetes.length = 0;
    pool.query.mockReset();
    pool.query.mockImplementation(async (sql) => {
      requetes.push({ sql: String(sql) });
      if (/FROM organization_profiles/.test(sql)) return { rows: [{ id: ID_ORG, owner_user_id: 140 }] };
      if (/FROM legal_acceptances/.test(sql)) return { rows: [{ id: 5 }] };
      return { rows: [] };
    });
  });

  const jeton = () => jwt.sign({ id: 140, userId: 140, role: 'owner' }, 'secret-de-test');

  const appels = async (chemin, options = {}) => {
    const res = await fetch(`${origin}${chemin}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${jeton()}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return { statut: res.status, corps: await res.json() };
  };

  const plans = async () => (await appels('/api/billing/plans')).corps.plans.map((p) => p.code);
  const checkout = (corps) => appels('/api/billing/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ legal_acceptance_id: 5, ...corps }),
  });

  test('cabinet suisse : la grille CHF servie est intacte (199 / 349 CHF HT)', async () => {
    mockMarcheCourant = 'CH';
    const { statut, corps } = await appels('/api/billing/plans');

    expect(statut).toBe(200);
    expect(corps.market).toBe('CH');
    expect(corps.plans.map((p) => p.code)).toEqual(['independant', 'cabinet_ch', 'cabinet_ch_sur_devis']);
    expect(corps.plans.find((p) => p.code === 'independant')).toMatchObject({
      price: 199, currency: 'CHF', display_price_ht: '199 CHF HT / mois',
    });
    expect(corps.plans.find((p) => p.code === 'cabinet_ch')).toMatchObject({
      price: 349, currency: 'CHF', display_price_ht: '349 CHF HT / mois',
    });
    expect(JSON.stringify(corps.plans)).not.toMatch(/€|TVA 20 %/);
  });

  test('chaque code de plan SERVI franchit la validation du checkout (jamais invalid_plan)', async () => {
    mockMarcheCourant = 'CH';
    const servis = await plans();
    expect(servis).toContain('independant');

    for (const code of servis) {
      const { statut, corps } = await checkout({ plan: code });
      // La grille suisse n'est pas payable dans cet environnement (aucun price
      // ID Stripe configuré) : le refus attendu est une CONFIGURATION manquante
      // ou un contact commercial — jamais « ce plan n'existe pas ».
      expect({ code, statut }).toEqual({ code, statut: code === 'cabinet_ch_sur_devis' ? 409 : 503 });
      expect({ code, erreur: corps.error }).toEqual({
        code,
        erreur: code === 'cabinet_ch_sur_devis' ? 'cabinet_contact_required' : 'stripe_configuration_required',
      });
    }
  });

  test('cabinet suisse : les trois codes mesurés par la Red Team ne répondent plus 400', async () => {
    mockMarcheCourant = 'CH';
    for (const code of ['independant', 'cabinet_ch', 'cabinet_ch_sur_devis']) {
      const { statut, corps } = await checkout({ plan: code });
      expect({ code, statut, erreur: corps.error }).not.toEqual({ code, statut: 400, erreur: 'invalid_plan' });
      expect(statut).toBeGreaterThanOrEqual(200);
    }
  });

  test('cabinet français : grille et codes euros INCHANGÉS', async () => {
    mockMarcheCourant = 'FR';
    expect(await plans()).toEqual(['starter', 'pro', 'cabinet']);

    expect((await checkout({ plan: 'pro' })).statut).toBe(503);      // accepté, Stripe à configurer
    expect((await checkout({ plan: 'cabinet' })).statut).toBe(409);  // sur devis → contact
  });

  test('un code hors catalogue reste refusé en 400 avec un message produit', async () => {
    mockMarcheCourant = 'CH';
    const { statut, corps } = await checkout({ plan: 'enterprise' });

    expect(statut).toBe(400);
    expect(corps.error).toBe('invalid_plan');
    expect(corps.plans_disponibles).toEqual(['independant', 'cabinet_ch', 'cabinet_ch_sur_devis']);
    expect(String(corps.message)).toMatch(/n'existe pas pour votre cabinet/);
    // Aucun terme technique dans le message produit.
    expect(JSON.stringify(corps)).not.toMatch(/invalid input syntax|integer|NaN|SQL/);
  });

  test('un code de l’AUTRE grille n’est pas servi au cabinet : il est refusé (400)', async () => {
    mockMarcheCourant = 'CH';
    expect((await checkout({ plan: 'starter' })).statut).toBe(400);
    mockMarcheCourant = 'FR';
    expect((await checkout({ plan: 'independant' })).statut).toBe(400);
  });

  test('aucun plan transmis : refus produit, jamais une erreur serveur', async () => {
    mockMarcheCourant = 'FR';
    const { statut, corps } = await checkout({});
    expect(statut).toBe(400);
    expect(corps.error).toBe('invalid_plan');
    expect(String(corps.message)).toMatch(/Aucun plan/);
  });
});
