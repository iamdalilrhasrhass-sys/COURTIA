/**
 * subscriptionGuardPending.test.js — un compte INVITÉ n'est pas un essai expiré.
 *
 * Avant cette règle, un compte en attente d'activation tombait dans la branche
 * « statut inconnu » et recevait le message « votre essai de 7 jours est
 * terminé » alors que l'essai n'avait jamais commencé. Le cabinet lisait une
 * information fausse sur son propre compte.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('./auth', () => ({ verifyToken: (req, res, next) => next() }));

const pool = require('../db');
const { etatAcces } = require('./subscriptionGuard');

describe('garde d’abonnement : essai non commencé', () => {
  beforeEach(() => jest.clearAllMocks());

  test('compte invité : écriture refusée, essai NON expiré, aucune date de fin', async () => {
    pool.query.mockResolvedValue({
      rows: [{ plan: 'trial', subscription_status: 'pending_activation', trial_ends_at: null }],
    });
    const etat = await etatAcces(3);
    expect(etat.ecriture_autorisee).toBe(false);
    expect(etat.raison).toBe('activation_requise');
    expect(etat.trial_state).toBe('TRIAL_PENDING');
    expect(etat.trial_end_at).toBeNull();
  });

  test('essai réellement en cours : écriture autorisée', async () => {
    pool.query.mockResolvedValue({
      rows: [{
        plan: 'trial',
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() + 3 * 86400000).toISOString(),
      }],
    });
    const etat = await etatAcces(3);
    expect(etat.ecriture_autorisee).toBe(true);
    expect(etat.trial_state).toBe('TRIAL_ACTIVE');
  });

  test('essai terminé : écriture refusée avec l’état TRIAL_EXPIRED', async () => {
    pool.query.mockResolvedValue({
      rows: [{
        plan: 'trial',
        subscription_status: 'trialing',
        trial_ends_at: new Date(Date.now() - 3600_000).toISOString(),
      }],
    });
    const etat = await etatAcces(3);
    expect(etat.ecriture_autorisee).toBe(false);
    expect(etat.trial_state).toBe('TRIAL_EXPIRED');
  });
});
