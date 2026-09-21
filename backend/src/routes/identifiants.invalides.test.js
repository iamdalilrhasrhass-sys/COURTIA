/**
 * identifiants.invalides.test.js — UN IDENTIFIANT INVALIDE N'EST PAS UNE PANNE
 * DU SERVEUR.
 *
 * DÉFAUT P3 MESURÉ EN PRODUCTION (21/09/2026, 4e passe adverse) :
 *   GET  /api/relances/abc                          → 500 (message PostgreSQL)
 *   PUT  /api/taches/999999999999999999999999999    → 500
 *   GET  /api/clients/999999999999999999999999999   → 500
 * Un identifiant qui n'est pas un nombre, ou qui sort de la plage de sa colonne
 * (`integer`), ne peut désigner aucune ressource : c'est une demande mal formée
 * (400 `identifiant_invalide`, message produit, français, sans terme technique)
 * ou une ressource inexistante (404). JAMAIS un 500, jamais un message
 * PostgreSQL dans la réponse, et jamais une requête émise pour un identifiant
 * qui ne peut exister.
 *
 * Les pièges couverts ici : `parseInt("12abc")` vaut 12 (ce n'est PAS un
 * identifiant valide), et `999999999999999999999999999` est « numérique » mais
 * hors plage de la colonne — PostgreSQL lève alors une erreur de plage, donc un
 * 500 si l'entrée n'est pas validée avant la base.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../utils/jwtSecret', () => ({ getJwtSecret: () => 'secret-de-test' }));

const express = require('express');
const jwt = require('jsonwebtoken');
const poolModule = require('../db');

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const HORS_PLAGE = '999999999999999999999999999';
const RE_MESSAGE_TECHNIQUE = /invalid input syntax|out of range|integer|NaN|SQL|message:/i;

describe('identifiants invalides : 400 / 404, jamais 500 avec message SQL', () => {
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
    app.use((req, _res, next) => { req.user = { id: 11, userId: 11, role: 'broker' }; next(); });
    app.use('/api/relances', require('./relances'));
    app.use('/api/taches', require('./taches'));
    app.use('/api/clients', require('./clients'));
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    requetes.length = 0;
    poolModule.query.mockReset();
    poolModule.query.mockImplementation((sql, params) => fakePool.query(sql, params));
    reponseMetier = (sql) => (String(sql).includes('cabinet_members')
      ? { rows: [{ cabinet_id: CAB_A, role: 'broker' }] }
      : { rows: [] });
  });

  const appeler = async (methode, chemin, corps) => {
    const enTetes = { Authorization: `Bearer ${jwt.sign({ id: 11, userId: 11 }, 'secret-de-test')}` };
    if (corps !== undefined) enTetes['Content-Type'] = 'application/json';
    const res = await fetch(`${origin}${chemin}`, {
      method: methode,
      headers: enTetes,
      ...(corps !== undefined ? { body: JSON.stringify(corps) } : {}),
    });
    const texte = await res.text();
    let json = null;
    try { json = JSON.parse(texte); } catch (_) { /* réponse non JSON = anomalie */ }
    return { statut: res.status, json, texte };
  };

  const attendreRefus = (resultat, { statut, erreur }) => {
    expect(resultat.statut).toBe(statut);
    expect(resultat.json).not.toBeNull();
    expect(resultat.json.error).toBe(erreur);
    expect(resultat.texte).not.toMatch(RE_MESSAGE_TECHNIQUE);
  };

  describe('relances', () => {
    test('GET /api/relances/abc → 400 identifiant_invalide, sans toucher la base', async () => {
      const res = await appeler('GET', '/api/relances/abc');
      attendreRefus(res, { statut: 400, erreur: 'identifiant_invalide' });
      expect(res.json.message).toMatch(/identifiant valide/);
      expect(requetes).toHaveLength(0);
    });

    test('GET /api/relances/12abc → 400 (parseInt("12abc") vaut 12 : ce n’est pas un identifiant)', async () => {
      const res = await appeler('GET', '/api/relances/12abc');
      attendreRefus(res, { statut: 400, erreur: 'identifiant_invalide' });
      expect(requetes).toHaveLength(0);
    });

    test('GET /api/relances/<hors plage> → 400 (jamais un 500 de plage PostgreSQL)', async () => {
      const res = await appeler('GET', `/api/relances/${HORS_PLAGE}`);
      attendreRefus(res, { statut: 400, erreur: 'identifiant_invalide' });
      expect(requetes).toHaveLength(0);
    });

    test('GET /api/relances/999999 → 404 : identifiant valide, ressource inexistante', async () => {
      const res = await appeler('GET', '/api/relances/999999');
      attendreRefus(res, { statut: 404, erreur: 'Relance non trouvée' });
      expect(requetes.some((r) => /FROM relances/.test(r.sql))).toBe(true);
    });

    test('PUT et DELETE /api/relances/abc → 400, sans requête d’écriture', async () => {
      const maj = await appeler('PUT', '/api/relances/abc', { status: 'sent' });
      attendreRefus(maj, { statut: 400, erreur: 'identifiant_invalide' });
      const suppression = await appeler('DELETE', `/api/relances/${HORS_PLAGE}`);
      attendreRefus(suppression, { statut: 400, erreur: 'identifiant_invalide' });
      expect(requetes.some((r) => /UPDATE relances|DELETE FROM relances/.test(r.sql))).toBe(false);
    });
  });

  describe('tâches', () => {
    test('PUT /api/taches/<hors plage> → 400 identifiant_invalide (mesuré 500 en production)', async () => {
      const res = await appeler('PUT', `/api/taches/${HORS_PLAGE}`, { titre: 'X' });
      attendreRefus(res, { statut: 400, erreur: 'identifiant_invalide' });
      expect(requetes.some((r) => /UPDATE appointments/.test(r.sql))).toBe(false);
    });

    test('PUT et DELETE /api/taches/abc → 400, aucun message PostgreSQL', async () => {
      attendreRefus(await appeler('PUT', '/api/taches/abc', { titre: 'X' }), { statut: 400, erreur: 'identifiant_invalide' });
      attendreRefus(await appeler('DELETE', '/api/taches/abc'), { statut: 400, erreur: 'identifiant_invalide' });
    });

    test('PUT /api/taches/999999 → 404 : identifiant valide, tâche inexistante', async () => {
      const res = await appeler('PUT', '/api/taches/999999', { titre: 'X' });
      attendreRefus(res, { statut: 404, erreur: 'Tâche non trouvée' });
    });
  });

  describe('clients', () => {
    test('GET /api/clients/<hors plage> → 400 identifiant_invalide (mesuré 500 en production)', async () => {
      const res = await appeler('GET', `/api/clients/${HORS_PLAGE}`);
      attendreRefus(res, { statut: 400, erreur: 'identifiant_invalide' });
      expect(requetes).toHaveLength(0);
    });

    test('GET /api/clients/abc → 404 : contrat historique (aucune ligne ne peut porter cet identifiant)', async () => {
      const res = await appeler('GET', '/api/clients/abc');
      attendreRefus(res, { statut: 404, erreur: 'not_found' });
      expect(requetes).toHaveLength(0);
    });

    test('PUT /api/clients/<hors plage> → 400, aucune écriture en base', async () => {
      const res = await appeler('PUT', `/api/clients/${HORS_PLAGE}`, { prenom: 'X', nom: 'Y' });
      attendreRefus(res, { statut: 400, erreur: 'identifiant_invalide' });
      expect(requetes.some((r) => /UPDATE clients/.test(r.sql))).toBe(false);
    });

    test('GET /api/clients/2147483647 (borne haute acceptée) → 404, pas 400', async () => {
      const res = await appeler('GET', '/api/clients/2147483647');
      attendreRefus(res, { statut: 404, erreur: 'Client non trouvé' });
    });

    test('les sous-routes valident aussi leur identifiant (contrats, score, cross-sell, interactions)', async () => {
      for (const chemin of [
        `/api/clients/${HORS_PLAGE}/contrats`,
        `/api/clients/${HORS_PLAGE}/score`,
        `/api/clients/${HORS_PLAGE}/cross-sell`,
        `/api/clients/${HORS_PLAGE}/interactions`,
      ]) {
        const res = await appeler('GET', chemin);
        attendreRefus(res, { statut: 400, erreur: 'identifiant_invalide' });
      }
      expect(requetes.some((r) => /FROM quotes|FROM clients/.test(r.sql))).toBe(false);
    });
  });
});
