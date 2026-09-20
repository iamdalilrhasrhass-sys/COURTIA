/**
 * SEC-016 — Après un changement de mot de passe, les jetons émis AVANT ce
 * changement doivent être refusés (401) : sans cela, un mot de passe volé puis
 * réinitialisé laissait l'attaquant connecté jusqu'à l'expiration du jeton.
 * Les comptes dont `password_changed_at` est NULL ne sont pas impactés.
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
  pool.query.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('sessionRevokedByPasswordChange — fonction pure', () => {
  it('révoque un jeton émis avant le changement de mot de passe', () => {
    expect(auth.sessionRevokedByPasswordChange({ iat: 1000 }, new Date(2000 * 1000))).toBe(true);
  });

  it('ne révoque pas un compte jamais réinitialisé (password_changed_at NULL)', () => {
    expect(auth.sessionRevokedByPasswordChange({ iat: 1000 }, null)).toBe(false);
    expect(auth.sessionRevokedByPasswordChange({ iat: 1000 }, undefined)).toBe(false);
  });

  it('ne révoque pas un jeton émis après le changement', () => {
    expect(auth.sessionRevokedByPasswordChange({ iat: 5000 }, new Date(2000 * 1000))).toBe(false);
  });

  it('tolère la même seconde que le changement (jeton du login qui suit)', () => {
    const change = new Date(3000 * 1000);
    expect(auth.sessionRevokedByPasswordChange({ iat: 3000 }, change)).toBe(false);
  });
});

describe('verifyToken — révocation de session effective', () => {
  it('middleware/auth.js : 401 pour un jeton antérieur au changement de mot de passe', async () => {
    const token = jeton();
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: minutes(1) }] });
    jest.setSystemTime(minutes(5));

    const { req, res, next } = fauxEchanges(token);
    await auth.verifyToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('middleware/authMiddleware.js (celui monté par server.js) : 401 sur le même cas', async () => {
    const token = jeton();
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: minutes(1) }] });
    jest.setSystemTime(minutes(5));

    const { req, res, next } = fauxEchanges(token);
    await verifyTokenMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('laisse passer une session ouverte après le changement de mot de passe', async () => {
    jest.setSystemTime(minutes(5));
    const token = jeton();
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: minutes(1) }] });

    const { req, res, next } = fauxEchanges(token);
    await verifyTokenMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe(12);
  });

  it('ne touche pas aux comptes pilotes existants (password_changed_at NULL)', async () => {
    const token = jeton();
    pool.query.mockResolvedValueOnce({ rows: [{ password_changed_at: null }] });

    const { req, res, next } = fauxEchanges(token);
    await verifyTokenMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.body).toBeNull();
  });

  it('accepte un token sans authentication header ? non : 401', async () => {
    const { req, res, next } = fauxEchanges(null);
    await verifyTokenMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('refuse un jeton signé avec un autre secret', async () => {
    const token = jwt.sign({ id: 12 }, 'mauvais-secret-de-test', { expiresIn: '1h' });
    const { req, res, next } = fauxEchanges(token);
    await verifyTokenMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('503 si la vérification de révocation est indisponible (base en erreur)', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error('connexion perdue'), { code: 'ECONNREFUSED' }));
    const { req, res, next } = fauxEchanges(jeton());

    await verifyTokenMiddleware(req, res, next);

    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('reste inoffensif si la colonne n\'existe pas encore (migration non appliquée)', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error('column "password_changed_at" does not exist'), { code: '42703' }));
    const { req, res, next } = fauxEchanges(jeton());

    await verifyTokenMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
