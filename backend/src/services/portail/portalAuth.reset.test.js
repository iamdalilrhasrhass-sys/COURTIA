/**
 * SEC-002 — La demande publique de réinitialisation du portail client ne doit
 * JAMAIS renvoyer le jeton (ni le lien), et sa réponse doit être identique que
 * le compte existe ou non (pas d'énumération de comptes).
 */

jest.mock('../../db', () => ({ query: jest.fn() }));
jest.mock('../emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ ok: true }),
  // Un fournisseur CONFIGURÉ est le cas de ces tests : ils portent sur la
  // non-énumération des comptes, pas sur l'absence de fournisseur (qui a son
  // propre test plus bas, ajouté après la 4e passe adverse).
  getEmailStatus: jest.fn(() => ({ status: 'configured', provider: 'test' })),
}));

const crypto = require('crypto');
const pool = require('../../db');
const portalAuth = require('./portalAuth');

const ATTENDU = {
  success: true,
  message: 'Si ce compte existe, un lien de réinitialisation a été envoyé',
  email_transmis: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockResolvedValue({ rows: [] });
});

describe('portalAuth.requestReset — SEC-002', () => {
  it('ne renvoie ni jeton ni lien quand le compte existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 7, email: 'client@example.invalid', status: 'active' }] });

    const resultat = await portalAuth.requestReset('Client@Example.invalid');

    expect(resultat).toEqual(ATTENDU);
    expect(resultat).not.toHaveProperty('resetToken');
    expect(resultat).not.toHaveProperty('resetLink');
    expect(JSON.stringify(resultat)).not.toMatch(/token|resetLink|reset-password/);
  });

  it('renvoie EXACTEMENT la même réponse quand le compte n\'existe pas', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const inexistant = await portalAuth.requestReset('inconnu@example.invalid');

    pool.query.mockResolvedValueOnce({ rows: [{ id: 7, email: 'client@example.invalid' }] });
    const existant = await portalAuth.requestReset('client@example.invalid');

    expect(inexistant).toEqual(existant);
    expect(JSON.stringify(inexistant)).toBe(JSON.stringify(existant));
  });

  it('génère bien un jeton (stocké haché, jamais en clair) malgré la réponse vide', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 7, email: 'client@example.invalid' }] });

    await portalAuth.requestReset('client@example.invalid');

    const update = pool.query.mock.calls.find(([sql]) => /UPDATE client_portal_accounts/.test(sql));
    expect(update).toBeDefined();
    const tokenStocke = update[1][0];
    expect(tokenStocke).toMatch(/^[a-f0-9]{64}$/); // empreinte sha256, pas un jeton utilisable
  });

  it('aucune écriture n\'est faite pour un compte inexistant', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await portalAuth.requestReset('inconnu@example.invalid');
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toMatch(/SELECT/);
  });

  it('sans fournisseur d’e-mail : réponse honnête, aucun jeton écrit, aucune promesse d’envoi', async () => {
    // Défaut RT4-04 de la 4e passe adverse : la route annonçait « un lien a été
    // envoyé » alors qu'aucun fournisseur n'est configuré en production.
    const emailService = require('../emailService');
    emailService.getEmailStatus.mockReturnValue({ status: 'configuration_required', provider: 'none' });
    const envoi = emailService.sendEmail;

    const resultat = await portalAuth.requestReset('client@example.invalid');

    expect(resultat.email_transmis).toBe(false);
    expect(resultat.raison).toBe('configuration_required');
    expect(resultat.message).not.toMatch(/envoyé/i);
    expect(envoi).not.toHaveBeenCalled();
    // Aucune écriture de jeton : pas de lien valable une heure sans destinataire.
    expect(pool.query.mock.calls.some(([sql]) => /UPDATE client_portal_accounts/i.test(String(sql)))).toBe(false);
  });

  it('le chemin INTERNE courtier (requestResetForBroker) est le seul à exposer un jeton', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 7, email: 'client@example.invalid', broker_id: 3 }] });

    const interne = await portalAuth.requestResetForBroker('client@example.invalid', 3);

    expect(interne.success).toBe(true);
    expect(typeof interne.resetToken).toBe('string');
    expect(interne.resetToken).toHaveLength(64);

    const update = pool.query.mock.calls.find(([sql]) => /UPDATE client_portal_accounts/.test(sql));
    expect(update[1][0]).toBe(portalAuth.hashResetToken(interne.resetToken));
    expect(update[1][0]).not.toBe(interne.resetToken);
  });

  it('requestResetForBroker est borné au cabinet du courtier', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const resultat = await portalAuth.requestResetForBroker('autre-cabinet@example.invalid', 3);
    expect(resultat).toEqual({ success: false, error: 'account_not_found' });
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toMatch(/broker_id = \$2/);
  });

  it('resetPassword vérifie l\'empreinte du jeton présenté, pas le jeton brut', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await expect(portalAuth.resetPassword('jeton-en-clair', 'motdepasse1')).rejects.toThrow(/Token invalide/);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/WHERE reset_token = \$1/);
    expect(params[0]).toBe(crypto.createHash('sha256').update('jeton-en-clair').digest('hex'));
  });
});
