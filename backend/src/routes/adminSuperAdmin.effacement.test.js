/**
 * adminSuperAdmin.effacement.test.js — le chemin d'EFFACEMENT d'un compte.
 *
 * POURQUOI CE TEST : la Red Team du 21/09/2026 (défaut RT4-12) a mesuré qu'AUCUNE
 * route d'effacement n'existait — cinq formes d'appel essayées, cinq 404. Le
 * droit à l'effacement dépendait donc d'une intervention manuelle en base, et
 * l'état « compte supprimé » n'était même pas représentable, donc invérifiable.
 *
 * Ce que le test exige, dans l'ordre :
 *   1. une confirmation par l'e-mail EXACT est obligatoire (aucune suppression
 *      par identifiant seul) ;
 *   2. un compte ne peut pas s'effacer lui-même ;
 *   3. le dernier super administrateur est protégé ;
 *   4. l'effacement réel révoque les sessions, détache le cabinet, retire les
 *      données personnelles et journalise l'opération.
 */
jest.mock('../db', () => {
  const client = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return { query: jest.fn(), connect: jest.fn(async () => client), __client: client };
});
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 5, userId: 5, role: 'super_admin' }; next(); },
}));
jest.mock('../middleware/superAdminGuard', () => (req, _res, next) => next());

const express = require('express');
const pool = require('../db');
const router = require('./adminSuperAdmin');

const client = pool.__client;

function requetes() {
  return client.query.mock.calls.map(([sql]) => String(sql));
}

describe('DELETE /api/admin/super/users/:id', () => {
  let server;
  let origin;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    client.query.mockReset();
    client.release.mockReset();
    pool.connect.mockClear();
    // Par défaut : la cible existe, n'est pas super_admin.
    client.query.mockImplementation(async (sql) => {
      const texte = String(sql);
      if (texte.startsWith('SELECT id, email, role FROM users')) {
        return { rows: [{ id: 163, email: 'audit@courtia-rt4.test', role: 'broker' }] };
      }
      if (texte.includes('UPDATE cabinet_members SET removed_at')) {
        return { rows: [{ cabinet_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }] };
      }
      if (texte.includes('INSERT INTO audit_logs')) return { rows: [{ id: 900 }] };
      return { rows: [] };
    });
  });

  const effacer = (id, corps) => fetch(`${origin}/users/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps || {}),
  });

  test('refuse une suppression sans confirmation par l’e-mail exact', async () => {
    const res = await effacer(163, {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('confirmation_invalide');
    // Aucune écriture ne doit avoir été appliquée.
    expect(requetes().some((sql) => sql.startsWith('UPDATE users'))).toBe(false);
    expect(requetes()).toContain('ROLLBACK');
  });

  test('refuse une confirmationApproximative différente de l’e-mail', async () => {
    const res = await effacer(163, { confirmation: 'audit@courtia-rt4.TEST ' });
    expect(res.status).toBe(400);
    expect(requetes().some((sql) => sql.startsWith('UPDATE users'))).toBe(false);
  });

  test('refuse l’auto-suppression', async () => {
    const res = await effacer(5, { confirmation: 'audit@courtia-rt4.test' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('auto_suppression_refusee');
  });

  test('répond 404 pour un compte inexistant', async () => {
    client.query.mockImplementation(async (sql) => {
      if (String(sql).startsWith('SELECT id, email, role FROM users')) return { rows: [] };
      return { rows: [] };
    });
    const res = await effacer(9999, { confirmation: 'x@y.test' });
    expect(res.status).toBe(404);
  });

  test('protège le DERNIER super administrateur actif', async () => {
    client.query.mockImplementation(async (sql) => {
      const texte = String(sql);
      if (texte.startsWith('SELECT id, email, role FROM users')) {
        return { rows: [{ id: 163, email: 'patron@courtia.test', role: 'super_admin' }] };
      }
      if (texte.includes("role = 'super_admin'")) return { rows: [{ nombre: 0 }] };
      return { rows: [] };
    });
    const res = await effacer(163, { confirmation: 'patron@courtia.test' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('dernier_super_admin');
    expect(requetes().some((sql) => sql.startsWith('UPDATE users'))).toBe(false);
  });

  test('efface réellement le compte : sessions révoquées, cabinet détaché, journal écrit', async () => {
    const res = await effacer(163, { confirmation: 'audit@courtia-rt4.test' });
    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.success).toBe(true);
    expect(corps.compte_efface.statut).toBe('supprime');
    expect(corps.compte_efface.sessions_revoquees).toBe(true);
    expect(corps.compte_efface.cabinets_detaches).toBe(1);

    const effacement = client.query.mock.calls.find(([sql]) => String(sql).startsWith('UPDATE users'));
    expect(effacement).toBeDefined();
    const [sqlUsers, valeursUsers] = effacement;
    // L'e-mail devient une adresse technique non routable ; le statut est posé ;
    // les sessions sont révoquées ; les jetons OAuth et de réinitialisation sont retirés.
    expect(sqlUsers).toMatch(/email = \$2/);
    expect(sqlUsers).toMatch(/status = 'supprime'/);
    expect(sqlUsers).toMatch(/sessions_revoked_at = NOW\(\)/);
    expect(sqlUsers).toMatch(/google_access_token = NULL/);
    expect(sqlUsers).toMatch(/password_reset_token = NULL/);
    expect(valeursUsers[1]).toBe('supprime+163@courtia.invalid');
    expect(String(valeursUsers[2])).toMatch(/^efface:/);

    const detachement = requetes().find((sql) => sql.includes('UPDATE cabinet_members SET removed_at'));
    expect(detachement).toBeDefined();
    expect(requetes().some((sql) => sql.includes('INSERT INTO audit_logs'))).toBe(true);
    expect(requetes()).toContain('COMMIT');
  });
});
