/**
 * authCodes.test.js — codes de réponse d'authentification (RFC 7235).
 *
 * POURQUOI : un jeton absent, expiré ou signé avec un autre secret ne prouve
 * AUCUNE authentification : la réponse doit être 401. L'API répondait 403
 * (« Token invalide ou expiré ») sur GET /api/auth/me — un 403 signifie
 * « authentifié mais interdit » et laissait croire au client que sa session
 * était ouverte (défaut relevé en production le 20/09/2026).
 *
 * Y sont aussi vérifiées les DEUX marques de révocation : le changement de mot
 * de passe (migration 110) et la déconnexion (migration 116,
 * `users.sessions_revoked_at`).
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-only-signing-fixture-not-a-deployed-secret' }));

const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('./auth');
const verifyTokenMiddleware = require('./authMiddleware');

const SECRET = 'qa-only-signing-fixture-not-a-deployed-secret';
const T0 = new Date('2026-09-20T10:00:00.000Z');
const minutes = (n) => new Date(T0.getTime() + n * 60 * 1000);

function jeton(options = { expiresIn: '7d' }) {
  return jwt.sign({ id: 12, email: 'qa@example.invalid' }, SECRET, options);
}

function fauxEchanges(token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: T0 });
  // La détection « colonne absente » est mémorisée par module : on la remet à
  // zéro pour que l'ordre des tests ne change pas leur verdict.
  auth.reinitialiserCacheColonnes();
  pool.query.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('jeton absent ou invalide = NON AUTHENTIFIÉ = 401', () => {
  it('aucun en-tête d’autorisation → 401', async () => {
    const { req, res, next } = fauxEchanges(null);
    await auth.verifyToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('jeton invalide → 401 (et non 403 : rien n’est authentifié)', async () => {
    const { req, res, next } = fauxEchanges('jeton.invalide.xxx.yyy');
    await auth.verifyToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('jeton signé avec un autre secret → 401', async () => {
    const { req, res, next } = fauxEchanges(jwt.sign({ id: 12 }, 'un-autre-secret', { expiresIn: '1h' }));
    await auth.verifyToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('jeton expiré → 401', async () => {
    const { req, res, next } = fauxEchanges(jeton({ expiresIn: '-1s' }));
    await auth.verifyToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('révocation par déconnexion (users.sessions_revoked_at)', () => {
  it('un jeton émis AVANT la déconnexion → 401 SessionRevoked', async () => {
    const token = jeton();
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: null, sessions_revoked_at: minutes(1) }] });
    jest.setSystemTime(minutes(5));

    const { req, res, next } = fauxEchanges(token);
    await auth.verifyToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('SessionRevoked');
    expect(next).not.toHaveBeenCalled();
  });

  it('un jeton émis APRÈS la déconnexion passe (session rouverte)', async () => {
    // Session rouverte APRÈS la déconnexion : jeton signé à T+5 min, marque de
    // déconnexion à T+1 min.
    jest.setSystemTime(minutes(5));
    const token = jeton();
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: null, sessions_revoked_at: minutes(1) }] });
    jest.setSystemTime(minutes(6));

    const { req, res, next } = fauxEchanges(token);
    await auth.verifyToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('aucune déconnexion ni changement de mot de passe → session intacte', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: null, sessions_revoked_at: null }] });
    const { req, res, next } = fauxEchanges(jeton());
    await auth.verifyToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('le changement de mot de passe reste appliqué quand la déconnexion n’a jamais eu lieu', async () => {
    // `sessions_revoked_at` absente de la ligne (NULL) : seule la marque du
    // changement de mot de passe décide. Le jeton est émis AVANT le changement.
    const token = jeton();
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: minutes(1) }] });
    jest.setSystemTime(minutes(5));

    const { req, res, next } = fauxEchanges(token);
    await auth.verifyToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('jeton valide et aucune marque → la session passe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: null }] });

    const { req, res, next } = fauxEchanges(jeton());
    await auth.verifyToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sessionRevokedByLogout : fonction pure, même règle que le mot de passe', () => {
    expect(auth.sessionRevokedByLogout({ iat: 1000 }, new Date(2000 * 1000))).toBe(true);
    expect(auth.sessionRevokedByLogout({ iat: 5000 }, new Date(2000 * 1000))).toBe(false);
    expect(auth.sessionRevokedByLogout({ iat: 1000 }, null)).toBe(false);
  });

  it('middleware/authMiddleware.js (monté par server.js) : même verdict 401', async () => {
    const token = jeton();
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: null, sessions_revoked_at: minutes(1) }] });
    jest.setSystemTime(minutes(5));

    const { req, res, next } = fauxEchanges(token);
    await verifyTokenMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('schéma sans les colonnes de révocation : filet de sécurité, la session passe', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(
      new Error('column "password_changed_at" does not exist'), { code: '42703' }
    ));
    const { req, res, next } = fauxEchanges(jeton());
    await auth.verifyToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
