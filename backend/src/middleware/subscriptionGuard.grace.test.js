/**
 * subscriptionGuard.grace.test.js — L'IMPATIENT N'EST PAS UN IMPAYÉ, ET UN
 * IMPAYÉ BORNÉ NE DOIT PAS SE TRANSFORMER EN COUPURE INVISIBLE.
 *
 * POURQUOI : la garde d'écriture tolérait `past_due` sans aucune borne. On ne
 * change PAS la politique commerciale ici : sans `BILLING_GRACE_DAYS`, le
 * comportement reste identique. Ce qui est prouvé, c'est que la borne — quand une
 * durée est configurée — s'applique, et que la règle est identique à celle
 * exposée par /api/billing/status.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
// Comme en production : c'est `verifyToken` qui pose `req.user`. Un faux qui
// appellerait `next()` sans le poser ferait sortir la garde en silence (elle
// vérifie elle-même le jeton à ce niveau, `req.user` n'existant pas encore).
jest.mock('./auth', () => ({
  verifyToken: (req, _res, next) => {
    req.user = req.user || { userId: 42, id: 42 };
    next();
  },
}));

const pool = require('../db');
const { etatAcces, requireActiveSubscription } = require('./subscriptionGuard');

const USER_ID = 42;

/**
 * `requireActiveSubscription` n'est pas `async` : elle délègue à la fonction de
 * rappel de `verifyToken`. On laisse donc tourner les micro-tâches avant de lire
 * la réponse, sinon le test lirait un objet `res` encore vierge.
 */
const laisserRepondre = () => new Promise((r) => setTimeout(r, 20));

function utilisateur(statut, trialEndsAt = null) {
  pool.query.mockImplementation(async (sql) => {
    const s = String(sql);
    if (/FROM users WHERE id/.test(s)) {
      return { rows: [{ plan: 'independant', subscription_status: statut, trial_ends_at: trialEndsAt }] };
    }
    if (/FROM subscriptions s/.test(s)) {
      return { rows: [{ past_due_since: global.__impayeDepuis || null }] };
    }
    return { rows: [] };
  });
}

describe('subscriptionGuard — essai, actif, impayé borné', () => {
  const env = { ...process.env };
  beforeEach(() => { pool.query.mockReset(); global.__impayeDepuis = null; });
  afterEach(() => { process.env = { ...env }; });

  test('essai en cours : écritures autorisées ; essai expiré : refusées en lecture seule', async () => {
    utilisateur('trialing', new Date(Date.now() + 3 * 86400000).toISOString());
    expect((await etatAcces(USER_ID)).ecriture_autorisee).toBe(true);

    utilisateur('trialing', new Date(Date.now() - 86400000).toISOString());
    const expire = await etatAcces(USER_ID);
    expect(expire.ecriture_autorisee).toBe(false);
    expect(expire.raison).toBe('essai_expire');
    expect(expire.trial_state).toBe('TRIAL_EXPIRED');
  });

  test('abonnement actif : écritures autorisées', async () => {
    utilisateur('active');
    const etat = await etatAcces(USER_ID);
    expect(etat.ecriture_autorisee).toBe(true);
    expect(etat.trial_state).toBe('SUBSCRIPTION_ACTIVE');
  });

  test('impayé SANS durée de grâce configurée : toléré (comportement inchangé)', async () => {
    delete process.env.BILLING_GRACE_DAYS;
    global.__impayeDepuis = new Date(Date.now() - 90 * 86400000).toISOString();
    utilisateur('past_due');

    const etat = await etatAcces(USER_ID);
    expect(etat.ecriture_autorisee).toBe(true);
    expect(etat.raison).toBe('impaye_tolere');
    expect(etat.delai_grace_jours).toBeNull();
  });

  test('impayé avec durée de grâce dépassée : refus explicite, données conservées', async () => {
    process.env.BILLING_GRACE_DAYS = '5';
    global.__impayeDepuis = new Date(Date.now() - 10 * 86400000).toISOString();
    utilisateur('past_due');

    const etat = await etatAcces(USER_ID);
    expect(etat.ecriture_autorisee).toBe(false);
    expect(etat.raison).toBe('impaye_grace_depassee');
    expect(etat.trial_state).toBe('PAST_DUE_EXPIRED');
    expect(etat.delai_grace_jours).toBe(5);
    expect(etat.impaye_depuis).toBe(global.__impayeDepuis);
  });

  test('impayé dans le délai de grâce : toléré', async () => {
    process.env.BILLING_GRACE_DAYS = '30';
    global.__impayeDepuis = new Date(Date.now() - 10 * 86400000).toISOString();
    utilisateur('past_due');
    expect((await etatAcces(USER_ID)).ecriture_autorisee).toBe(true);
  });

  test('le refus 402 dit depuis quand le paiement échoue (jamais « fin d’essai »)', async () => {
    process.env.BILLING_GRACE_DAYS = '5';
    global.__impayeDepuis = new Date(Date.now() - 10 * 86400000).toISOString();
    utilisateur('past_due');

    // Le jeton est simulé : verifyToken laisse passer, l'identifiant vient de req.user.
    const req = { user: { userId: USER_ID, id: USER_ID }, originalUrl: '/api/clients' };
    const res = {
      statut: null,
      corps: null,
      status(code) { this.statut = code; return this; },
      json(corps) { this.corps = corps; return this; },
    };
    await requireActiveSubscription(req, res, () => { throw new Error('la garde aurait dû refuser'); });
    await laisserRepondre();

    expect(res.statut).toBe(402);
    expect(res.corps.lecture_seule).toBe(true);
    expect(res.corps.raison).toBe('impaye_grace_depassee');
    expect(res.corps.impaye_depuis).toBe(global.__impayeDepuis);
    expect(res.corps.delai_grace_jours).toBe(5);
    expect(res.corps.message).toMatch(/paiement de votre abonnement est en échec/);
    expect(res.corps.message).not.toMatch(/essai COURTIA de 7 jours est terminé/);
  });

  test('panne de base : on laisse passer (une panne ne doit pas fermer un cabinet)', async () => {
    pool.query.mockRejectedValue(new Error('base injoignable'));
    const req = { user: { userId: USER_ID, id: USER_ID }, originalUrl: '/api/clients' };
    let passe = false;
    await requireActiveSubscription(req, { status: () => ({ json: () => {} }) }, () => { passe = true; });
    await laisserRepondre();
    expect(passe).toBe(true);
  });
});
