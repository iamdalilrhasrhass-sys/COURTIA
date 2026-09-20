/**
 * SEC-005 / SEC-010 — Les routes de rôles enterprise s'appuyaient sur
 * `req.user.cabinet_id` (revendication du jeton) et n'exigeaient aucun
 * rattachement `cabinet_members` : n'importe quel porteur d'un jeton pouvait
 * lire/modifier/supprimer les rôles et attributions de rôles d'un autre cabinet.
 * Le cabinet est désormais résolu côté serveur et ces routes sont réservées aux
 * rôles owner/admin. GET /roles reste inchangé.
 */

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'qa-only-signing-fixture-not-a-deployed-secret' }));
jest.mock('../middleware/auditLogger', () => ({ getAuditLogs: jest.fn(async () => []), logAction: jest.fn(async () => {}) }));

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = require('./enterprise');

const SECRET = 'qa-only-signing-fixture-not-a-deployed-secret';
const CABINET_MIEN = 3;
const CABINET_AUTRE = 7;

function jeton(payload = {}) {
  return jwt.sign({ id: 1, userId: 1, email: 'qa@example.invalid', role: 'broker', ...payload }, SECRET, { expiresIn: '1h' });
}

// Handlers SQL : le premier motif qui matche la requête fournit sa réponse.
let handlers = [];

describe('Routes rôles enterprise — cabinet résolu côté serveur (SEC-005 / SEC-010)', () => {
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
    handlers = [];
    pool.query.mockImplementation(async (sql, params) => {
      if (/SELECT password_changed_at/.test(sql)) return { rows: [] }; // pas de révocation
      for (const handler of handlers) {
        if (handler.match.test(sql)) return handler.result(sql, params);
      }
      return { rows: [] };
    });
  });

  const appeler = (method, path, { token, body } = {}) => fetch(`${origin}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const membreDuCabinet = (cabinetId, role) => ({
    match: /SELECT cabinet_id, role\s+FROM cabinet_members/,
    result: () => ({ rows: cabinetId ? [{ cabinet_id: cabinetId, role }] : [] })
  });

  it('GET /roles reste accessible et inchangé', async () => {
    const res = await appeler('GET', '/roles', { token: jeton() });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ roles: [] });

    const [sql, params] = pool.query.mock.calls.find(([q]) => /FROM enterprise_roles/.test(q));
    expect(sql).toMatch(/WHERE is_system = true OR cabinet_id = \$1/);
    expect(params).toEqual([null]); // comportement existant conservé
  });

  it('refuse (403) un utilisateur sans rattachement cabinet', async () => {
    handlers = [membreDuCabinet(null)];

    const res = await appeler('PUT', '/roles/9', { token: jeton(), body: { name: 'pirate' } });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('cabinet_required');
    expect(pool.query.mock.calls.some(([sql]) => /UPDATE enterprise_roles/.test(sql))).toBe(false);
  });

  it('refuse (403) un membre non owner/admin du cabinet', async () => {
    handlers = [membreDuCabinet(CABINET_MIEN, 'broker')];

    const res = await appeler('PUT', '/roles/9', { token: jeton(), body: { name: 'pirate' } });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('forbidden_role');
    expect(pool.query.mock.calls.some(([sql]) => /UPDATE enterprise_roles/.test(sql))).toBe(false);
  });

  it('un owner ne peut pas modifier le rôle d\'un AUTRE cabinet (404, aucune écriture)', async () => {
    handlers = [
      membreDuCabinet(CABINET_MIEN, 'owner'),
      { match: /SELECT \* FROM enterprise_roles WHERE id = \$1/, result: () => ({ rows: [{ id: 9, is_system: false, cabinet_id: CABINET_AUTRE, name: 'role-autre' }] }) }
    ];

    const res = await appeler('PUT', '/roles/9', { token: jeton(), body: { name: 'pirate' } });

    expect(res.status).toBe(404);
    expect(pool.query.mock.calls.some(([sql]) => /UPDATE enterprise_roles/.test(sql))).toBe(false);
    expect(pool.query.mock.calls.some(([sql]) => /DELETE FROM enterprise_roles/.test(sql))).toBe(false);
  });

  it('un owner ne peut pas supprimer le rôle d\'un AUTRE cabinet', async () => {
    handlers = [
      membreDuCabinet(CABINET_MIEN, 'owner'),
      { match: /SELECT \* FROM enterprise_roles WHERE id = \$1/, result: () => ({ rows: [{ id: 9, is_system: false, cabinet_id: CABINET_AUTRE }] }) }
    ];

    const res = await appeler('DELETE', '/roles/9', { token: jeton() });

    expect(res.status).toBe(404);
    expect(pool.query.mock.calls.some(([sql]) => /DELETE FROM enterprise_roles/.test(sql))).toBe(false);
  });

  it('les rôles système restent protégés (403)', async () => {
    handlers = [
      membreDuCabinet(CABINET_MIEN, 'owner'),
      { match: /SELECT \* FROM enterprise_roles WHERE id = \$1/, result: () => ({ rows: [{ id: 1, is_system: true, cabinet_id: CABINET_MIEN }] }) }
    ];

    const res = await appeler('PUT', '/roles/1', { token: jeton(), body: { name: 'x' } });
    expect(res.status).toBe(403);
  });

  it('POST /roles rattache le rôle au cabinet RÉSOLU, pas à la revendication du jeton', async () => {
    handlers = [
      membreDuCabinet(CABINET_MIEN, 'owner'),
      { match: /SELECT id FROM enterprise_roles WHERE name = \$1/, result: () => ({ rows: [] }) },
      { match: /INSERT INTO enterprise_roles/, result: (sql, params) => ({ rows: [{ id: 21, cabinet_id: params[0], name: params[1] }] }) }
    ];

    const res = await appeler('POST', '/roles', {
      token: jeton({ cabinet_id: 999, role: 'owner' }),
      body: { name: 'Contrôleur interne', permissions: {} }
    });

    expect(res.status).toBe(201);
    const insert = pool.query.mock.calls.find(([sql]) => /INSERT INTO enterprise_roles/.test(sql));
    expect(insert[1][0]).toBe(CABINET_MIEN);
  });

  it('refuse (403) d\'assigner un rôle à un utilisateur d\'un autre cabinet', async () => {
    handlers = [
      membreDuCabinet(CABINET_MIEN, 'owner'),
      { match: /SELECT 1 FROM cabinet_members/, result: () => ({ rows: [] }) }
    ];

    const res = await appeler('POST', '/users/55/roles', { token: jeton({ role: 'owner' }), body: { role_id: 4 } });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('user_not_in_cabinet');
    expect(pool.query.mock.calls.some(([sql]) => /INSERT INTO user_roles/.test(sql))).toBe(false);
  });

  it('refuse (403) d\'assigner un rôle appartenant à un autre cabinet', async () => {
    handlers = [
      membreDuCabinet(CABINET_MIEN, 'owner'),
      { match: /SELECT 1 FROM cabinet_members/, result: () => ({ rows: [{ '?column?': 1 }] }) },
      { match: /SELECT id, name, cabinet_id FROM enterprise_roles/, result: () => ({ rows: [{ id: 4, name: 'role-autre', cabinet_id: CABINET_AUTRE }] }) }
    ];

    const res = await appeler('POST', '/users/55/roles', { token: jeton({ role: 'owner' }), body: { role_id: 4 } });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('role_not_in_cabinet');
    expect(pool.query.mock.calls.some(([sql]) => /INSERT INTO user_roles/.test(sql))).toBe(false);
  });

  it('GET /users/:userId/roles ne fuit pas les rôles d\'un autre cabinet (403)', async () => {
    handlers = [
      membreDuCabinet(CABINET_MIEN, 'owner'),
      { match: /SELECT 1 FROM cabinet_members/, result: () => ({ rows: [] }) }
    ];

    const res = await appeler('GET', '/users/55/roles', { token: jeton({ role: 'owner' }) });

    expect(res.status).toBe(403);
    expect(pool.query.mock.calls.some(([sql]) => /JOIN enterprise_roles/.test(sql))).toBe(false);
  });

  it('un owner du cabinet peut assigner un rôle de son cabinet', async () => {
    handlers = [
      membreDuCabinet(CABINET_MIEN, 'owner'),
      { match: /SELECT 1 FROM cabinet_members/, result: () => ({ rows: [{ '?column?': 1 }] }) },
      { match: /SELECT id, name, cabinet_id FROM enterprise_roles/, result: () => ({ rows: [{ id: 4, name: 'gestionnaire', cabinet_id: CABINET_MIEN }] }) },
      { match: /INSERT INTO user_roles/, result: () => ({ rows: [] }) }
    ];

    const res = await appeler('POST', '/users/55/roles', { token: jeton({ role: 'owner' }), body: { role_id: 4 } });

    expect(res.status).toBe(200);
    expect(pool.query.mock.calls.some(([sql]) => /INSERT INTO user_roles/.test(sql))).toBe(true);
  });
});
