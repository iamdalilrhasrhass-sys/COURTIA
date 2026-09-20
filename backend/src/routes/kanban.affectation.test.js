/**
 * kanban.affectation.test.js — affectation d'une carte à un collaborateur.
 *
 * POURQUOI CES TESTS (défaut reproduit en production le 20/09/2026) :
 * l'écran de pipeline propose d'affecter une carte à un collaborateur, mais
 * `kanban_cards` n'avait aucune colonne d'affectation : le PATCH répondait
 * « Aucun champ à mettre à jour » — ou, quand d'autres champs étaient envoyés
 * en même temps, l'affectation était ignorée EN SILENCE. Une action sans effet.
 * La colonne `assigned_to` existe désormais (migration 115) et l'affectation est
 * écrite ; un collaborateur HORS du cabinet du tableau est refusé (400), jamais
 * affecté en silence.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => {
    req.user = req.headers['x-test-user']
      ? JSON.parse(req.headers['x-test-user'])
      : { id: 7, userId: 7, role: 'broker' };
    next();
  },
}));
jest.mock('../middleware/planGuard', () => ({
  requireFeature: () => (_req, _res, next) => next(),
}));

const express = require('express');
const pool = require('../db');
const router = require('./kanban');

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('PATCH /api/kanban/cards/:id — affectation', () => {
  let server;
  let origin;
  const requetes = [];
  let reponseMetier = () => ({ rows: [] });

  beforeAll(async () => {
    const app = express();
    app.locals.pool = pool;
    app.use(express.json());
    app.use('/api/kanban', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    requetes.length = 0;
    pool.query.mockReset();
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params });
      return reponseMetier(String(sql), params);
    });
    reponseMetier = (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'broker' }] };
      if (String(sql).includes('FROM kanban_cards')) return { rows: [{ id: 8, board_id: 14, cabinet_id: CAB_A, courtier_id: 7 }] };
      if (String(sql).includes('UPDATE kanban_cards')) return { rows: [{ id: 8, assigned_to: 7 }], rowCount: 1 };
      if (String(sql).includes('DELETE FROM kanban_cards')) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    };
  });

  const patcher = (chemin, corps, entetes = {}) => fetch(`${origin}${chemin}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...entetes },
    body: JSON.stringify(corps),
  });

  const maj = () => requetes.find((r) => r.sql.includes('UPDATE kanban_cards'));

  test('assigned_to (+ owner_id, même valeur) → 200 et affectation écrite', async () => {
    const res = await patcher('/api/kanban/cards/8', { assigned_to: 7, owner_id: 7 });
    expect(res.status).toBe(200);

    const ecriture = maj();
    expect(ecriture.sql).toContain('assigned_to');
    expect(ecriture.params).toContain(7);
    expect((await res.json()).success).toBe(true);
  });

  test('désaffectation explicite (null) → 200, la colonne repasse à NULL', async () => {
    const res = await patcher('/api/kanban/cards/8', { assigned_to: null });
    expect(res.status).toBe(200);
    expect(maj().params).toContain(null);
  });

  test('assigned_to et owner_id contradictoires → 400 (aucun choix au hasard)', async () => {
    const res = await patcher('/api/kanban/cards/8', { assigned_to: 7, owner_id: 9 });
    const corps = await res.json();

    expect(res.status).toBe(400);
    expect(corps.error).toBe('affectation_ambigue');
    expect(maj()).toBeUndefined();
  });

  test('collaborateur d’un AUTRE cabinet → 400 et aucune écriture', async () => {
    reponseMetier = (sql) => {
      if (String(sql).includes('cabinet_members')) {
        // Aucune appartenance au cabinet du tableau pour cet utilisateur.
        return String(sql).includes('WHERE user_id = $1 AND cabinet_id') ? { rows: [] } : { rows: [{ cabinet_id: CAB_A, role: 'broker' }] };
      }
      if (String(sql).includes('FROM kanban_cards')) return { rows: [{ id: 8, board_id: 14, cabinet_id: CAB_A, courtier_id: 7 }] };
      return { rows: [], rowCount: 0 };
    };

    const res = await patcher('/api/kanban/cards/8', { assigned_to: 999 });
    const corps = await res.json();

    expect(res.status).toBe(400);
    expect(corps.error).toBe('affectation_hors_cabinet');
    expect(maj()).toBeUndefined();
  });

  test('affectation illisible (« beaucoup ») → 400', async () => {
    const res = await patcher('/api/kanban/cards/8', { assigned_to: 'beaucoup' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('affectation_invalide');
  });

  test('aucun champ connu → 400 en DISANT ce qui a été reçu', async () => {
    const res = await patcher('/api/kanban/cards/8', { couleur: 'rouge' });
    const corps = await res.json();

    expect(res.status).toBe(400);
    expect(corps.champs_recus).toEqual(['couleur']);
  });

  test('migration 115 non appliquée → 503 explicite (aucun faux succès)', async () => {
    reponseMetier = (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'broker' }] };
      if (String(sql).includes('FROM kanban_cards')) return { rows: [{ id: 8, board_id: 14, cabinet_id: CAB_A, courtier_id: 7 }] };
      if (String(sql).includes('UPDATE kanban_cards')) {
        throw Object.assign(new Error('column "assigned_to" does not exist'), { code: '42703' });
      }
      return { rows: [], rowCount: 0 };
    };

    const res = await patcher('/api/kanban/cards/8', { assigned_to: 7 });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('affectation_indisponible');
  });

  test('identifiant non numérique → 404 (jamais un 500 SQL)', async () => {
    const res = await patcher('/api/kanban/cards/abc', { title: 'X' });
    expect(res.status).toBe(404);
    expect(maj()).toBeUndefined();
  });

  test('carte d’un autre cabinet → 404, sans affectation ni suppression', async () => {
    reponseMetier = (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: [] };
      return { rows: [], rowCount: 0 };
    };

    const res = await patcher('/api/kanban/cards/8', { title: 'PIRATE' });
    expect(res.status).toBe(404);
    expect(maj()).toBeUndefined();
  });

  test('changement de colonne seul → 200 (comportement historique conservé)', async () => {
    const res = await patcher('/api/kanban/cards/8', { column_id: 'qualified' });
    expect(res.status).toBe(200);
    expect(maj().sql).toContain('column_id = $1');
  });
});
