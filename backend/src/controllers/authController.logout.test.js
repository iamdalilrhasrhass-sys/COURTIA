/**
 * authController.logout.test.js — la déconnexion est VRAIMENT enregistrée.
 *
 * POURQUOI : aucune route de déconnexion n'existait ; le jeton restait accepté
 * jusqu'à son expiration (7 jours) même après une déconnexion. La marque
 * `users.sessions_revoked_at` (migration 116) est le mécanisme déjà en place
 * pour le changement de mot de passe : même comparaison, aucun stockage de
 * jetons révoqués.
 *
 * Portées testées :
 *   - défaut        : marque = `iat` de la session appelante (les sessions
 *                     ouvertes AVANT celle-ci sont fermées ; la session
 *                     appelante reste utilisable jusqu'à l'expiration de son
 *                     jeton — le client l'efface) ;
 *   - toutes_les_sessions = true : marque = maintenant, session appelante
 *                     comprise ;
 *   - la marque ne recule JAMAIS ;
 *   - migration 116 absente : refus explicite (503), jamais un faux succès.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../models/User', () => ({}));
jest.mock('../services/analyticsService', () => ({ trackEvent: jest.fn() }));
jest.mock('../services/emailService', () => ({ sendEmail: jest.fn() }));
jest.mock('../services/adminNotifier', () => ({ notifierAdminSansBloquer: jest.fn() }));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-only-signing-fixture-not-a-deployed-secret' }));

const pool = require('../db');
const authController = require('./authController');

const IAT = 1789000000; // 2026-09-08T…Z (antérieur à l'exécution des tests)

function fauxEchanges({ user = { id: 44, userId: 44, iat: IAT }, corps = {}, query = {} } = {}) {
  const req = { user, body: corps, query };
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return { req, res };
}

beforeEach(() => {
  jest.clearAllMocks();
  pool.query.mockResolvedValue({ rows: [{ sessions_revoked_at: new Date(IAT * 1000) }], rowCount: 1 });
});

describe('POST /api/auth/logout', () => {
  it('répond 200 et enregistre la marque côté serveur', async () => {
    const { req, res } = fauxEchanges();
    await authController.logout(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.revocation_serveur).toBe(true);
    expect(res.body.deconnexion).toBe('sessions_anterieures');

    const maj = pool.query.mock.calls[0];
    expect(String(maj[0])).toContain('UPDATE users');
    expect(String(maj[0])).toContain('sessions_revoked_at = $2');
    expect(maj[1][0]).toBe(44);
    // La marque est l'instant d'émission de la session appelante.
    expect(new Date(maj[1][1]).getTime()).toBe(IAT * 1000);
  });

  it('la marque ne peut pas RECULER (un vieux jeton ne rouvre pas les sessions fermées)', async () => {
    const { req, res } = fauxEchanges();
    await authController.logout(req, res);
    expect(String(pool.query.mock.calls[0][0])).toContain('sessions_revoked_at IS NULL OR sessions_revoked_at < $2');
  });

  it('toutes_les_sessions=true : marque = maintenant (session appelante comprise)', async () => {
    const avant = Date.now();
    const { req, res } = fauxEchanges({ corps: { toutes_les_sessions: true } });
    await authController.logout(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.deconnexion).toBe('toutes_les_sessions');
    const marque = new Date(pool.query.mock.calls[0][1][1]).getTime();
    expect(marque).toBeGreaterThanOrEqual(avant);
    expect(marque).toBeGreaterThan(IAT * 1000);
  });

  it('un appelant non identifié → 401 (jamais un faux succès)', async () => {
    const { req, res } = fauxEchanges({ user: {} });
    await authController.logout(req, res);
    expect(res.statusCode).toBe(401);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('migration 116 non appliquée → 503 explicite (la session n’est PAS révoquée)', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(
      new Error('column "sessions_revoked_at" does not exist'), { code: '42703' }
    ));
    const { req, res } = fauxEchanges();
    await authController.logout(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body.error).toBe('revocation_indisponible');
    expect(res.body.message).toMatch(/reste valide jusqu'à son expiration/);
  });

  it('marque déjà plus récente : aucune écriture, mais la réponse dit l’état réel', async () => {
    const marqueEnBase = new Date(1800000000 * 1000);
    pool.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })                       // UPDATE sans effet
      .mockResolvedValueOnce({ rows: [{ sessions_revoked_at: marqueEnBase }] }); // relecture
    const { req, res } = fauxEchanges();
    await authController.logout(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.ecriture_effectuee).toBe(false);
    expect(new Date(res.body.sessions_revoked_at).getTime()).toBe(marqueEnBase.getTime());
  });
});
