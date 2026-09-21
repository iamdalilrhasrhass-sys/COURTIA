/**
 * conformite.checklist.test.js — mise à jour de la checklist DDA.
 *
 * POURQUOI CE TEST : `POST /api/conformite/dda/checklist/:client_id` fournissait
 * 8 valeurs pour 9 marqueurs — PostgreSQL refusait chaque appel (« bind message
 * supplies 8 parameters, but prepared statement requires 9 ») et la checklist
 * DDA répondait 500. Le test impose le contrat : plus haut $N = nombre de
 * valeurs, et le statut calculé est réellement transmis.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
// conformite.js protège son routeur avec verifyToken (middleware/auth).
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 101, userId: 101 }; next(); },
  isSessionRevoked: async () => ({ revoked: false }),
}));

const express = require('express');
const pool = require('../db');
const router = require('./conformite');

function controler(sql, valeurs) {
  const references = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  const plusHaut = references.length ? Math.max(...references) : 0;
  expect({ plusHaut, fournis: valeurs.length }).toEqual({ plusHaut, fournis: plusHaut });
}

describe('POST /api/conformite/dda/checklist/:client_id', () => {
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

  /** Appel de la route qui a réellement écrit la checklist. */
  function appelChecklist() {
    return pool.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO dda_checklists'));
  }

  beforeEach(() => {
    pool.query.mockReset();
    // Le pool sert AUSSI à résoudre la PORTÉE (`cabinet_members`) puis à
    // contrôler que le client appartient au cabinet : ce test porte sur la forme
    // de l'INSERT et sur le statut calculé, pas sur la portée (couverte par
    // conformite.portee-cabinet.test.js). Le compte simulé n'a pas de cabinet.
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: [] };
      if (String(sql).includes('FROM clients c')) return { rows: [{ id: 201 }] };
      return { rows: [{ id: 7, user_id: 101, client_id: 201, status: 'incomplete' }] };
    });
  });

  const cocher = (corps) => fetch(`${origin}/dda/checklist/201`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
  });

  test('les 9 colonnes reçoivent 9 valeurs, dont le statut', async () => {
    const res = await cocher({ besoin_exprime: true, devoir_conseil: false, notes: 'premier échange' });
    expect(res.status).toBe(200);
    const [sql, valeurs] = appelChecklist();
    controler(sql, valeurs);
    expect(sql).toContain('INSERT INTO dda_checklists');
    expect(valeurs).toHaveLength(9);
    expect(valeurs[0]).toBe(101);          // user_id
    expect(valeurs[1]).toBe(201);          // client_id
    expect(valeurs[7]).toBe('premier échange'); // notes
    expect(valeurs[8]).toBe('incomplete'); // status calculé
  });

  test('une checklist complète est marquée conforme', async () => {
    const res = await cocher({
      besoin_exprime: true, devoir_conseil: true, document_remis: true,
      informations_marche: true, fiche_synthese: true,
    });
    expect(res.status).toBe(200);
    expect(appelChecklist()[1][8]).toBe('conforme');
  });

  test('la lecture de la checklist d’un client vide répond une checklist par défaut', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: [] };
      // Le client doit exister dans le périmètre (contrôle ajouté après la
      // Red Team RT4-13 : un client hors périmètre répond 404, jamais 200).
      if (String(sql).includes('FROM clients c')) return { rows: [{ id: 201 }] };
      return { rows: [] };
    });
    const res = await fetch(`${origin}/dda/checklist/201`);
    expect(res.status).toBe(200);
    expect((await res.json()).checklist.status).toBe('pending');
  });

  test('un client HORS périmètre répond 404 (jamais une checklist vide en 200)', async () => {
    // Mesure Red Team RT4-13 du 21/09/2026 : GET /api/conformite/dda/checklist/183
    // (client d'un autre cabinet) répondait 200 — l'existence de la ressource
    // était confirmée sans qu'aucune donnée ne soit servie.
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: [] };
      if (String(sql).includes('FROM clients c')) return { rows: [] };
      return { rows: [] };
    });
    const res = await fetch(`${origin}/dda/checklist/201`);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('client_not_found');
  });
});
