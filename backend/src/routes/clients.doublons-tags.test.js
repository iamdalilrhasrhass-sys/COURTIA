/**
 * clients.doublons-tags.test.js — détection de doublons, identifiants invalides
 * et lecture des tags d'un client.
 *
 * POURQUOI CES TESTS (défauts reproduits en production le 20/09/2026) :
 *   1. `GET /api/clients/duplicates` n'existait pas : la requête tombait dans
 *      `GET /api/clients/:id` et PostgreSQL répondait
 *      « invalid input syntax for type integer: "duplicates" » — un 500 pour une
 *      route inexistante. Les doublons sont désormais détectés réellement.
 *   2. Un identifiant non numérique ne doit JAMAIS produire un 500 SQL : il ne
 *      peut désigner aucun client, la réponse est un 404.
 *   3. Les tags d'un client n'étaient pas lisibles (POST/DELETE existaient) :
 *      l'écran ne pouvait pas réafficher ce qu'il venait de poser.
 */
jest.mock('../db', () => ({ query: jest.fn() }));

const express = require('express');
const poolModule = require('../db');
const router = require('./clients');

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('GET /api/clients — doublons, identifiants, tags', () => {
  let server;
  let origin;
  const requetes = [];
  let reponseMetier = () => ({ rows: [] });

  const fakePool = {
    async query(sql, params) {
      requetes.push({ sql: String(sql), params });
      return reponseMetier(String(sql), params);
    },
  };

  beforeAll(async () => {
    const app = express();
    app.locals.pool = fakePool;
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7, role: 'broker' }; next(); });
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    requetes.length = 0;
    poolModule.query.mockReset();
    poolModule.query.mockImplementation(async (sql) => (
      String(sql).includes('cabinet_members') ? { rows: [{ cabinet_id: CAB_A, role: 'broker' }] } : { rows: [] }
    ));
    reponseMetier = () => ({ rows: [] });
  });

  test('GET /api/clients/duplicates → 200 (et non un 500 SQL)', async () => {
    reponseMetier = (sql) => (String(sql).includes('FROM clients')
      ? {
        rows: [
          { id: 88, first_name: 'Élise', last_name: "Müller-d'Arc", email: 'elise@e2e-a.test', phone: '+41 79 123 45 67', city: 'Villeneuve', postal_code: '1844', status: 'actif' },
          { id: 91, first_name: 'Elise', last_name: 'Muller-d Arc', email: 'elise@e2e-a.test', phone: '0041 79 123 45 67', city: 'Villeneuve', postal_code: '1844', status: 'prospect' },
          { id: 92, first_name: 'Anna', last_name: 'Zürcher', email: 'anna@e2e-a.test', phone: '+41 76 555 66 77', city: 'Zürich', postal_code: '8008', status: 'actif' },
        ],
      }
      : { rows: [] });

    const res = await fetch(`${origin}/duplicates?nom=${encodeURIComponent("Müller-d'Arc")}`);
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.total).toBe(2);
    expect(corps.groupes).toBe(1);
    // Le rapprochement est justifié : e-mail identique ET nom replié identique.
    expect(corps.data[0].raisons).toEqual(['email', 'nom', 'telephone']);
    expect(corps.data[0].clients.map((c) => c.id).sort()).toEqual([88, 91]);
  });

  test('GET /api/clients/duplicates sans terme : ne rend QUE des groupes réels (≥ 2 clients)', async () => {
    reponseMetier = (sql) => (String(sql).includes('FROM clients')
      ? {
        rows: [
          { id: 1, first_name: 'A', last_name: 'Unique', email: 'unique@x.test', phone: '', status: 'actif' },
          { id: 2, first_name: 'B', last_name: 'Doublon', email: 'doublon@x.test', phone: '+41 21 000 00 00', status: 'actif' },
          { id: 3, first_name: 'B', last_name: 'Doublon', email: 'doublon@x.test', phone: '+41 21 000 00 00', status: 'prospect' },
        ],
      }
      : { rows: [] });

    const res = await fetch(`${origin}/duplicates`);
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.groupes).toBe(1);
    expect(corps.data[0].clients.map((c) => c.id).sort()).toEqual([2, 3]);
  });

  test('identifiant non numérique sur GET /:id → 404 et AUCUNE requête en base', async () => {
    const res = await fetch(`${origin}/duplicates-inexistant`);
    expect(res.status).toBe(404);
    expect(requetes).toHaveLength(0);
  });

  test('identifiant non numérique sur PUT /:id → 404 (jamais un 500 SQL)', async () => {
    const res = await fetch(`${origin}/abc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prenom: 'X', nom: 'Y' }),
    });
    expect(res.status).toBe(404);
    expect(requetes.some((r) => r.sql.includes('UPDATE clients'))).toBe(false);
  });

  test('GET /api/clients/:id/tags → 200 avec les tags RÉELS du client', async () => {
    requetes.length = 0;
    reponseMetier = (sql) => {
      if (String(sql).includes('FROM clients')) return { rows: [{ id: 88 }] };
      if (String(sql).includes('FROM client_tags')) {
        return { rows: [{ id: 7, name: 'E2E-Prioritaire', color: '#5B4DF5', created_at: '2026-09-20T10:00:00Z' }] };
      }
      return { rows: [] };
    };

    const res = await fetch(`${origin}/88/tags`);
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.success).toBe(true);
    expect(corps.data).toHaveLength(1);
    expect(corps.data[0].name).toBe('E2E-Prioritaire');
  });

  test('client hors portée : GET /:id/tags → 404 (jamais les tags d’un autre cabinet)', async () => {
    reponseMetier = () => ({ rows: [] });
    const res = await fetch(`${origin}/999/tags`);
    expect(res.status).toBe(404);
    expect(requetes.some((r) => r.sql.includes('FROM client_tags'))).toBe(false);
  });
});
