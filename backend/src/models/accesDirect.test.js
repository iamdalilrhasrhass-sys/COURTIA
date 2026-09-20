/**
 * accesDirect.test.js — garde-fou du modèle d'accès client (décision du
 * 20/09/2026) : le cabinet n'a plus à activer son compte, il se connecte
 * immédiatement avec un mot de passe initial TEMPORAIRE.
 *
 * CE QUI EST VÉRIFIÉ, ET POURQUOI
 *  - `definirAccesDirect` ouvre l'essai TOUT DE SUITE (trialing + dates) : la
 *    règle « 7 jours à partir de l'activation » n'a plus d'objet, puisqu'il n'y a
 *    plus d'activation ;
 *  - le mot de passe est haché (jamais stocké en clair) et `must_change_password`
 *    passe à vrai ;
 *  - `changerMotDePasse` exige l'ancien mot de passe, refuse un mot de passe
 *    identique, remplace le hachage et lève le caractère temporaire — c'est ce
 *    qui rend l'ancien mot de passe inopérant.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
const bcrypt = require('bcryptjs');
const pool = require('../db');
const User = require('./User');

describe('accès direct : mot de passe initial temporaire', () => {
  beforeEach(() => jest.clearAllMocks());

  test('le mot de passe est haché et jamais écrit en clair', async () => {
    pool.query.mockResolvedValue({
      rows: [{
        id: 11,
        email: 'fyakoubi@centuryfinance.ch',
        trial_started_at: '2026-09-20T11:00:00.000Z',
        trial_ends_at: '2026-09-27T11:00:00.000Z',
        trial_days: 7,
      }],
    });

    await User.definirAccesDirect(11, 'CenturyFinance', { jours: 7 });

    const [sql, params] = pool.query.mock.calls[0];
    const hachage = params[0];
    expect(hachage).not.toBe('CenturyFinance');
    expect(hachage.startsWith('$2')).toBe(true); // bcrypt
    expect(await bcrypt.compare('CenturyFinance', hachage)).toBe(true);
    expect(sql).toContain('must_change_password = TRUE');
    expect(sql).toContain('password_reset_token = NULL'); // plus de lien d'activation
    expect(params[1]).toBe(11);
  });

  test("l'essai court dès la création, sans activation à attendre", async () => {
    pool.query.mockResolvedValue({
      rows: [{
        id: 14,
        email: 'a.prodomo@spondeo-assurances.ch',
        trial_started_at: '2026-09-20T11:00:00.000Z',
        trial_ends_at: '2026-09-27T11:00:00.000Z',
        trial_days: 7,
      }],
    });

    const acces = await User.definirAccesDirect(14, 'Spondeo', { jours: 7 });

    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain("subscription_status = 'trialing'");
    expect(sql).toContain('trial_started_at = NOW()');
    expect(sql).toContain("trial_ends_at = NOW() + ($3::int || ' days')::interval");
    expect(sql).not.toContain('pending_activation');
    expect(acces.jours).toBe(7);
    expect(acces.debut).toBeTruthy();
    expect(acces.fin).toBeTruthy();
  });

  test('la durée retombe sur BILLING_TRIAL_DAYS si elle est absente', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, trial_days: 7 }] });
    await User.definirAccesDirect(1, 'Xyz', {});
    expect(pool.query.mock.calls[0][1][2]).toBe(String(Number(process.env.BILLING_TRIAL_DAYS || 7)));
  });
});

describe('changement de mot de passe par le titulaire', () => {
  beforeEach(() => jest.clearAllMocks());

  test("refuse un mot de passe actuel incorrect et n'écrit rien", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 11, password_hash: await bcrypt.hash('CenturyFinance', 10) }],
    });

    const resultat = await User.changerMotDePasse(11, 'MauvaisMotDePasse', 'NouveauMotDePasse');

    expect(resultat).toEqual({ ok: false, raison: 'mot_de_passe_actuel_invalide' });
    expect(pool.query).toHaveBeenCalledTimes(1); // aucune écriture
  });

  test('refuse un nouveau mot de passe identique à l actuel', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 14, password_hash: await bcrypt.hash('Spondeo', 10) }],
    });

    const resultat = await User.changerMotDePasse(14, 'Spondeo', 'Spondeo');

    expect(resultat).toEqual({ ok: false, raison: 'mot_de_passe_identique' });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("remplace le hachage et lève le caractère temporaire : l'ancien mot de passe meurt", async () => {
    const ancien = await bcrypt.hash('CenturyFinance', 10);
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 11, password_hash: ancien }] })
      .mockResolvedValueOnce({ rows: [] });

    const resultat = await User.changerMotDePasse(11, 'CenturyFinance', 'NouveauSecret2026');

    expect(resultat).toEqual({ ok: true });
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('password_hash = $1');
    expect(sql).toContain('must_change_password = FALSE');
    expect(sql).toContain('password_changed_at = NOW()');

    const nouveauHachage = params[0];
    expect(nouveauHachage).not.toBe(ancien);
    expect(await bcrypt.compare('NouveauSecret2026', nouveauHachage)).toBe(true);
    expect(await bcrypt.compare('CenturyFinance', nouveauHachage)).toBe(false);
  });

  test('compte introuvable : refus explicite, aucune écriture', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const resultat = await User.changerMotDePasse(999, 'a', 'b');
    expect(resultat).toEqual({ ok: false, raison: 'compte_introuvable' });
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
