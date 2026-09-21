/**
 * auth.mot-de-passe-oublie.test.js — « MOT DE PASSE OUBLIÉ » NE DOIT JAMAIS
 * ANNONCER UN ENVOI QUI N'A PAS EU LIEU.
 *
 * DÉFAUT P1 MESURÉ EN PRODUCTION (21/09/2026, 4e passe adverse) :
 *   POST /api/auth/forgot-password {"email":"…"} → 200
 *   {"message":"Si un compte existe avec cet email, un lien de réinitialisation a
 *    été envoyé."}
 * alors qu'AUCUN fournisseur d'e-mail n'est configuré (`provider: "none"`,
 * `missing: [RESEND_API_KEY]`). Le jeton était bien écrit en base, mais rien ne
 * partait : le courtier attendait un e-mail qui n'existe pas.
 *
 * DEUX EXIGENCES TENUES ICI :
 *   (a) NON-ÉNUMÉRATION : la réponse est IDENTIQUE que le compte existe ou non.
 *       L'état annoncé est celui de la PLATEFORME (fournisseur d'e-mail
 *       configuré ou non), jamais celui du compte ;
 *   (b) VÉRITÉ OPÉRATIONNELLE : quand l'envoi est impossible, la réponse le dit
 *       (`email_transmis: false`, `raison: "configuration_required"`) et son
 *       message n'affirme aucun envoi.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7, role: 'broker' }; next(); },
  verifyTokenMiddleware: (req, _res, next) => { req.user = { id: 7, userId: 7, role: 'broker' }; next(); },
  isSessionRevoked: async () => ({ revoked: false }),
}));
jest.mock('../middleware/authMiddleware', () => (req, _res, next) => {
  req.user = { id: 7, userId: 7, role: 'broker' };
  next();
});
jest.mock('../middleware/rateLimit', () => {
  const passe = (_req, _res, next) => next();
  return {
    loginLimiter: passe,
    meLimiter: passe,
    forgotPasswordLimiter: passe,
    resetPasswordLimiter: passe,
    refreshLimiter: passe,
    googleAuthLimiter: passe,
    apiLimiter: passe,
    healthLimiter: passe,
    arkLimiter: passe,
    getClientIp: () => '127.0.0.1',
  };
});
jest.mock('../models/User', () => ({
  findByEmail: jest.fn(),
  setResetToken: jest.fn(),
}));
jest.mock('../services/emailService', () => ({
  getEmailStatus: jest.fn(),
  sendEmail: jest.fn(),
}));

const express = require('express');
const pool = require('../db');
const User = require('../models/User');
const { getEmailStatus, sendEmail } = require('../services/emailService');
const router = require('./auth');

const COMPTE_EXISTANT = 'titulaire@cabinet.test';
const COMPTE_INCONNU = 'inconnu@cabinet.test';
const MESSAGE_GENERIQUE = 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.';

describe('POST /api/auth/forgot-password — aucun faux succès d’envoi', () => {
  let server;
  let origin;
  let fournisseurConfigure;

  beforeAll(async () => {
    const app = express();
    app.locals.pool = pool;
    app.use(express.json());
    app.use('/api/auth', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    fournisseurConfigure = false;
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [] });
    User.findByEmail.mockReset();
    User.setResetToken.mockReset();
    User.setResetToken.mockResolvedValue({ id: 7, email: COMPTE_EXISTANT });
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({ success: true, provider: 'resend', id: 'msg_1' });
    getEmailStatus.mockImplementation(() => (fournisseurConfigure
      ? { configured: true, provider: 'resend', missing: [], status: 'configured' }
      : { configured: false, provider: 'none', missing: ['RESEND_API_KEY'], status: 'configuration_required' }));
  });

  const demander = async (email) => {
    const res = await fetch(`${origin}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return { statut: res.status, corps: await res.json() };
  };

  test('aucun fournisseur configuré : la réponse dit qu’AUCUN e-mail n’est parti', async () => {
    User.findByEmail.mockResolvedValue({ id: 7, email: COMPTE_EXISTANT });
    const { statut, corps } = await demander(COMPTE_EXISTANT);

    expect(statut).toBe(200);
    expect(corps.email_transmis).toBe(false);
    expect(corps.raison).toBe('configuration_required');
    // Le message n'affirme aucun envoi et ne promet pas un lien reçu.
    expect(String(corps.message)).not.toMatch(/envoyé|été envoy|est parti|vient de partir/i);
    expect(String(corps.message)).toMatch(/n'est pas configuré/);
    // Rien n'est transmis… et rien n'est laissé en attente : aucun jeton orphelin.
    expect(sendEmail).not.toHaveBeenCalled();
    expect(User.setResetToken).not.toHaveBeenCalled();
  });

  test('non-énumération : réponse STRICTEMENT identique pour un compte existant et inconnu', async () => {
    User.findByEmail.mockResolvedValue({ id: 7, email: COMPTE_EXISTANT });
    const avecCompte = await demander(COMPTE_EXISTANT);

    User.findByEmail.mockResolvedValue(null);
    const sansCompte = await demander(COMPTE_INCONNU);

    expect(avecCompte.statut).toBe(sansCompte.statut);
    expect(avecCompte.corps).toEqual(sansCompte.corps);
    expect(User.setResetToken).not.toHaveBeenCalled();
  });

  test('fournisseur configuré : l’e-mail part réellement et la réponse reste générique', async () => {
    fournisseurConfigure = true;
    User.findByEmail.mockResolvedValue({ id: 7, email: COMPTE_EXISTANT });

    const { statut, corps } = await demander(COMPTE_EXISTANT);

    expect(statut).toBe(200);
    expect(corps.message).toBe(MESSAGE_GENERIQUE);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(User.setResetToken).toHaveBeenCalledTimes(1);
    const envoi = sendEmail.mock.calls[0][0];
    expect(envoi.to).toBe(COMPTE_EXISTANT);
    // Le lien du gabarit porte bien le jeton généré (aucun jeton dans la réponse).
    expect(String(envoi.html)).toMatch(/\/reset-password\?token=[a-f0-9]{64}/);
    expect(JSON.stringify(corps)).not.toMatch(/[a-f0-9]{64}/);
  });

  test('non-énumération (fournisseur configuré) : même corps pour un compte inconnu', async () => {
    fournisseurConfigure = true;
    User.findByEmail.mockResolvedValue({ id: 7, email: COMPTE_EXISTANT });
    const avecCompte = await demander(COMPTE_EXISTANT);

    User.findByEmail.mockResolvedValue(null);
    const sansCompte = await demander(COMPTE_INCONNU);

    expect(avecCompte.corps).toEqual(sansCompte.corps);
    expect(sansCompte.corps.message).toBe(MESSAGE_GENERIQUE);
    expect(sendEmail).toHaveBeenCalledTimes(1); // un seul envoi : le compte réel
  });

  test('envoi refusé par le fournisseur : le jeton est retiré, la réponse reste générique', async () => {
    fournisseurConfigure = true;
    User.findByEmail.mockResolvedValue({ id: 7, email: COMPTE_EXISTANT });
    sendEmail.mockResolvedValue({ success: false, error: 'send_failed', raison: 'send_failed', provider: 'resend' });

    const { statut, corps } = await demander(COMPTE_EXISTANT);

    expect(statut).toBe(200);
    expect(corps.message).toBe(MESSAGE_GENERIQUE);
    // Le jeton n'a été transmis à personne : il ne reste pas valable une heure.
    const nettoyage = pool.query.mock.calls.find(([sql]) => /password_reset_token = NULL/.test(String(sql)));
    expect(nettoyage).toBeTruthy();
  });

  test('un fournisseur en panne ne révèle pas l’existence du compte', async () => {
    fournisseurConfigure = true;
    sendEmail.mockResolvedValue({ success: false, error: 'send_failed', raison: 'send_failed', provider: 'resend' });

    User.findByEmail.mockResolvedValue({ id: 7, email: COMPTE_EXISTANT });
    const avecCompte = await demander(COMPTE_EXISTANT);

    User.findByEmail.mockResolvedValue(null);
    const sansCompte = await demander(COMPTE_INCONNU);

    expect(avecCompte.corps).toEqual(sansCompte.corps);
  });
});
