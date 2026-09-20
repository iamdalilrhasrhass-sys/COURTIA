/**
 * contrats.montants.test.js — UNE SAISIE FAUTIVE NE CASSE NI LE CONTRAT NI LES ÉCRANS.
 *
 * POURQUOI CES TESTS (défaut P0 reproduit en production le 20/09/2026)
 *   • `POST /api/contrats {"client_id":92,"type_contrat":"Auto","prime_annuelle":"abc"}`
 *     répondait 201. La chaîne entrait dans `quotes.quote_data`, puis
 *     `GET /api/clients`, `GET /api/reporting/overview` et
 *     `GET /api/dashboard/stats` DU CABINET ENTIER tombaient en 500
 *     (« invalid input syntax for type numeric: "abc" »).
 *   • `prime_annuelle: -2000` était accepté et le total de primes du cockpit
 *     DIMINUAIT ; `99999999999999` était accepté.
 * Le contrat est donc refusé AVANT toute écriture, avec un motif nommé, et
 * l'écriture garde la valeur NORMALISÉE (jamais la chaîne d'origine).
 */
jest.mock('../db', () => ({ query: jest.fn() }));

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');
const router = require('./contrats');

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('contrats — validation des montants', () => {
  let server;
  let origin;
  let jeton;
  let requetes;
  let insertions;

  const repondre = async (sql, params) => {
    const texte = String(sql);
    requetes.push({ sql: texte, params });
    if (texte.includes('FROM cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'broker' }] };
    if (texte.includes('SELECT 1 FROM clients')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
    if (texte.includes('INSERT INTO quotes')) {
      insertions.push({ sql: texte, params });
      const donnees = JSON.parse(params[1]);
      return { rows: [{ id: 77, client_id: params[0], status: params[2], quote_data: donnees, prime_annuelle: params[3] }], rowCount: 1 };
    }
    if (texte.includes('UPDATE quotes')) return { rows: [{ id: 43, client_id: 88, status: 'actif', quote_data: {} }], rowCount: 1 };
    if (texte.includes('FROM quotes')) return { rows: [{ id: 43, client_id: 88, status: 'actif', quote_data: { prime_annuelle: 1450 } }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  };

  beforeAll(async () => {
    const app = express();
    app.locals.pool = { query: (sql, params) => repondre(sql, params) };
    app.use(express.json());
    app.use('/api/contrats', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
    jeton = jwt.sign({ userId: 42, id: 42, role: 'broker' }, getJwtSecret());
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    requetes = [];
    insertions = [];
    pool.query.mockReset();
    pool.query.mockImplementation((sql, params) => repondre(sql, params));
  });

  const creer = (corps) => fetch(`${origin}/api/contrats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
    body: JSON.stringify(corps),
  });

  test('un montant non numérique est refusé en 400, sans AUCUNE écriture', async () => {
    const reponse = await creer({ client_id: 92, type_contrat: 'Auto', prime_annuelle: 'abc' });
    expect(reponse.status).toBe(400);
    const corps = await reponse.json();
    expect(corps).toMatchObject({ error: 'prime_invalide', motif: 'montant_non_numerique', champ: 'prime_annuelle' });
    expect(insertions).toHaveLength(0);
  });

  test('un montant négatif est refusé en 400 (le total du cockpit ne peut pas diminuer)', async () => {
    const reponse = await creer({ client_id: 92, type_contrat: 'Auto', prime_annuelle: -2000 });
    expect(reponse.status).toBe(400);
    expect(await reponse.json()).toMatchObject({ error: 'prime_invalide', motif: 'montant_negatif' });
    expect(insertions).toHaveLength(0);
  });

  test('un montant au-delà du plafond est refusé en 400, plafond annoncé', async () => {
    const reponse = await creer({ client_id: 92, type_contrat: 'Auto', prime_annuelle: 99999999999999 });
    expect(reponse.status).toBe(400);
    const corps = await reponse.json();
    expect(corps).toMatchObject({ error: 'prime_invalide', motif: 'montant_hors_plafond' });
    expect(corps.plafond).toBe(10000000);
    expect(insertions).toHaveLength(0);
  });

  test('le plafond est un paramètre documenté, pas une limite cachée', async () => {
    const reponse = await creer({ client_id: 92, type_contrat: 'Auto', prime_annuelle: 10000000 });
    expect(reponse.status).toBe(201);
    expect(insertions).toHaveLength(1);
  });

  test('une écriture acceptée stocke le NOMBRE normalisé, jamais la chaîne d’origine', async () => {
    const reponse = await creer({ client_id: 92, type_contrat: 'Auto', prime_annuelle: "1'450,50" });
    expect(reponse.status).toBe(201);
    const donnees = JSON.parse(insertions[0].params[1]);
    expect(donnees.prime_annuelle).toBe(1450.5);
    expect(insertions[0].params[3]).toBe(1450.5); // colonne `prime_annuelle`
  });

  test('la modification (PUT) applique la MÊME règle', async () => {
    const reponse = await fetch(`${origin}/api/contrats/43`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ prime_annuelle: 'abc' }),
    });
    expect(reponse.status).toBe(400);
    const corps = await reponse.json();
    expect(corps).toMatchObject({ error: 'prime_invalide', motif: 'montant_non_numerique' });
    expect(requetes.some((r) => r.sql.includes('UPDATE quotes'))).toBe(false);
  });
});
