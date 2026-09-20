/**
 * SEC-006 — GET /api/beta/stats était monté sans authentification et renvoyait
 * la liste des inscrits (e-mails + cabinets). La route exige désormais un jeton
 * administrateur et ne renvoie que des compteurs agrégés.
 */

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-only-signing-fixture-not-a-deployed-secret' }));

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = require('./beta');

const SECRET = 'qa-only-signing-fixture-not-a-deployed-secret';

function jeton(role) {
  return jwt.sign({ id: 1, email: 'qa@example.invalid', role }, SECRET, { expiresIn: '1h' });
}

/**
 * Ligne `users` du porteur du jeton : le compte EXISTE, sans marque de
 * révocation. Depuis la fermeture du défaut D3-08 (troisième QA adverse), un
 * jeton dont le compte est introuvable est refusé 401 — ce banc teste la garde
 * d'administration, il lui faut donc un compte réel.
 */
const LIGNE_SESSION = { password_changed_at: null, sessions_revoked_at: null };
function repondreSession(sql) {
  return /FROM users/.test(String(sql)) ? { rows: [LIGNE_SESSION] } : null;
}

describe('GET /api/beta/stats — administration uniquement (SEC-006)', () => {
  let server;
  let origin;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Réponses par défaut : compte existant, agrégats vides.
    pool.query.mockImplementation(async (sql) => repondreSession(sql) || { rows: [] });
  });

  const appeler = (token, options = {}) => fetch(`${origin}/stats`, {
    ...options,
    headers: token ? { authorization: `Bearer ${token}` } : {}
  });

  it('refuse une requête anonyme', async () => {
    const res = await appeler(null);
    expect(res.status).toBe(401);
  });

  it('refuse un utilisateur authentifié non administrateur', async () => {
    const res = await appeler(jeton('broker'));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('admin_required');
  });

  it('sert des compteurs agrégés à un administrateur, sans aucune adresse e-mail', async () => {
    pool.query.mockImplementation(async (sql) => {
      const session = repondreSession(sql);
      if (session) return session;
      if (/COUNT\(\*\) FROM beta_signups/.test(sql)) return { rows: [{ count: '12' }] };
      if (/by_portfolio_size|GROUP BY portfolio_size/.test(sql)) {
        return { rows: [{ portfolio_size: '10-50', count: '7' }] };
      }
      return { rows: [{ day: '2026-09-20', count: '3' }] };
    });

    const res = await appeler(jeton('admin'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(12);
    expect(body.by_portfolio_size).toEqual([{ portfolio_size: '10-50', count: '7' }]);
    expect(body).not.toHaveProperty('recent');
    expect(JSON.stringify(body)).not.toContain('@');
    expect(JSON.stringify(body)).not.toContain('cabinet_name');
  });

  it('accepte aussi les rôles super_admin et owner', async () => {
    pool.query.mockImplementation(async (sql) => {
      const session = repondreSession(sql);
      if (session) return session;
      if (/COUNT\(\*\) FROM beta_signups/.test(sql)) return { rows: [{ count: '0' }] };
      return { rows: [] };
    });

    for (const role of ['super_admin', 'owner']) {
      const res = await appeler(jeton(role));
      expect(res.status).toBe(200);
    }
  });
});
