/**
 * essaiActivation.test.js — garde-fou de la règle « l'essai démarre à
 * l'activation réelle » (décision du 20/09/2026).
 *
 * POURQUOI CE TEST : la version précédente posait
 * `trial_ends_at = NOW() + 7 jours` au moment de l'INVITATION. Le lien
 * d'activation valant 72 h, un cabinet qui activait son accès au bout de deux
 * jours ne disposait plus que de cinq jours d'essai : la durée annoncée n'était
 * pas la durée réelle. Ces tests figent la règle pour qu'elle ne revienne pas.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
const pool = require('../db');
const User = require('./User');

describe('essai : invitation puis activation', () => {
  beforeEach(() => jest.clearAllMocks());

  test("l'invitation n'ouvre PAS l'essai : statut en attente et aucune date de fin", async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 7, trial_days: 7 }] });
    await User.preparerInvitation(7, { cabinet: 'Cabinet Test', jours: 7 });

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/subscription_status = 'pending_activation'/);
    expect(sql).toMatch(/trial_ends_at = NULL/);
    expect(sql).toMatch(/invited_at = NOW\(\)/);
    expect(sql).toMatch(/trial_days = \$2/);
    expect(params[0]).toBe('Cabinet Test');
    expect(params[1]).toBe(7);
    expect(params[2]).toBe(7);
  });

  test("l'invitation retombe sur BILLING_TRIAL_DAYS si la durée est absente ou absurde", async () => {
    pool.query.mockResolvedValue({ rows: [{}] });
    await User.preparerInvitation(9, { cabinet: 'X', jours: 0 });
    expect(pool.query.mock.calls[0][1][1]).toBe(Number(process.env.BILLING_TRIAL_DAYS || 7));

    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [{}] });
    await User.preparerInvitation(9, { cabinet: 'X', jours: 'pas un nombre' });
    expect(pool.query.mock.calls[0][1][1]).toBe(Number(process.env.BILLING_TRIAL_DAYS || 7));
  });

  test("l'activation démarre l'essai pour exactement la durée enregistrée", async () => {
    pool.query.mockResolvedValue({
      rows: [{
        trial_started_at: '2026-09-20T10:00:00.000Z',
        trial_ends_at: '2026-09-27T10:00:00.000Z',
        trial_days: 7,
      }],
    });
    const essai = await User.demarrerEssai(12);

    const [sql, params] = pool.query.mock.calls[0];
    // La garde est dans la requête : un compte déjà en essai ou abonné ne voit
    // jamais ses dates recalculées par une activation.
    expect(sql).toMatch(/WHERE id = \$1 AND subscription_status = 'pending_activation'/);
    expect(sql).toMatch(/trial_ends_at = NOW\(\) \+ \(COALESCE\(trial_days, \$2\) \|\| ' days'\)::interval/);
    expect(params[0]).toBe(12);
    expect(essai).toEqual({
      debut: '2026-09-20T10:00:00.000Z',
      fin: '2026-09-27T10:00:00.000Z',
      jours: 7,
    });
  });

  test("une activation sans compte en attente ne renvoie aucune date (aucun effet rétroactif)", async () => {
    pool.query.mockResolvedValue({ rows: [] });
    expect(await User.demarrerEssai(12)).toBeNull();
  });
});
