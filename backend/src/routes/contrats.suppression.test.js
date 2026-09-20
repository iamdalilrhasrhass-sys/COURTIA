/**
 * contrats.suppression.test.js — supprimer un contrat : jamais de faux succès.
 *
 * POURQUOI CES TESTS :
 *   - Défaut reproduit en production le 20/09/2026 : POST /api/contrats avec le
 *     client d'un AUTRE cabinet répondait 403 « client_not_owned » — un 403
 *     confirme l'existence du dossier d'un autre cabinet. Le refus doit être un
 *     404, et RIEN ne doit être créé.
 *   - La migration 114 repointe `commissions.contract_id` vers `quotes(id)` :
 *     supprimer un contrat qui porte des commissions est désormais refusé par la
 *     base. La route doit le dire explicitement (409) au lieu de laisser passer
 *     un 500 illisible — sans jamais détruire une ligne comptable.
 */
jest.mock('../db', () => ({ query: jest.fn() }));

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');
const router = require('./contrats');

function mockSql(demandes = []) {
  pool.query.mockImplementation(async (sql) => {
    const texte = String(sql);
    for (const [motif, reponse] of demandes) {
      if (texte.includes(motif)) return typeof reponse === 'function' ? reponse(texte) : reponse;
    }
    return { rows: [], rowCount: 0 };
  });
}

describe('contrats — cloisonnement et suppression', () => {
  let server;
  let origin;
  let jeton;

  beforeAll(async () => {
    const app = express();
    app.locals.pool = pool;
    app.use(express.json());
    app.use('/api/contrats', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
    // Jeton RÉEL : routes/contrats.js définit son propre vérificateur (il ne
    // dépend pas de middleware/auth), le test signe donc comme le fait l'auth.
    jeton = jwt.sign({ userId: 11, id: 11, role: 'broker' }, getJwtSecret());
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });
  beforeEach(() => pool.query.mockReset());

  const appeler = (chemin, methode, corps) => fetch(`${origin}${chemin}`, {
    method: methode,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
    body: corps ? JSON.stringify(corps) : undefined,
  });

  test('client d’un autre cabinet → 404 et aucune insertion', async () => {
    mockSql([
      ['cabinet_members', { rows: [] }],          // portée mono-utilisateur
      ['FROM clients', { rows: [] }],             // le client n'est pas dans la portée
    ]);

    const res = await appeler('/api/contrats', 'POST', { client_id: 999999, type_contrat: 'auto' });
    const corps = await res.json();

    expect(res.status).toBe(404);
    expect(corps.error).toBe('client_not_found');
    expect(pool.query.mock.calls.some(([sql]) => /INSERT INTO quotes/i.test(String(sql)))).toBe(false);
  });

  test('suppression d’un contrat portant des commissions → 409 explicite', async () => {
    mockSql([
      ['cabinet_members', { rows: [] }],
      ['FROM commissions', { rows: [{ nombre: 2 }] }],
    ]);

    const res = await appeler('/api/contrats/42', 'DELETE');
    const corps = await res.json();

    expect(res.status).toBe(409);
    expect(corps).toMatchObject({ error: 'contract_has_commissions', commissions: 2 });
    expect(pool.query.mock.calls.some(([sql]) => /DELETE FROM quotes/i.test(String(sql)))).toBe(false);
  });

  test('suppression d’un contrat sans commission → 200 seulement si la ligne part', async () => {
    mockSql([
      ['cabinet_members', { rows: [] }],
      ['FROM commissions', { rows: [{ nombre: 0 }] }],
      ['DELETE FROM quotes', { rows: [{ id: 42 }], rowCount: 1 }],
    ]);

    const res = await appeler('/api/contrats/42', 'DELETE');
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
