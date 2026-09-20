/**
 * clients.recherche.test.js — la liste des clients est filtrée PAR LE SERVEUR.
 *
 * POURQUOI CE TEST : `GET /api/clients` ignorait `search`, `statut`/`status`,
 * `segment` et `sort` — aucune clause WHERE. L'assistant de devis appelle
 * `/clients?search=<nom>&limit=10` : il recevait les 10 derniers clients du
 * cabinet quel que soit le terme, et le courtier pouvait donc rattacher un
 * devis au mauvais client. Ce test vérifie la construction de la requête
 * (filtre, tri, pagination, total) et le comportement HTTP réel du routeur.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
const express = require('express');
const pool = require('../db');
const router = require('./clients');

const {
  construireRequeteListeClients,
  normaliserTexteClient,
  expressionSansAccent,
} = require('./clients');

/** Rejoue le contrat des paramètres SQL : aucun $N non fourni, aucun fourni inutilisé. */
function controlerContratSql(sql, valeurs) {
  const references = [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
  const plusHaut = references.length ? Math.max(...references) : 0;
  const attendu = Array.isArray(valeurs) ? valeurs.length : 0;
  expect({ plusHaut, attendu }).toEqual({ plusHaut, attendu: plusHaut });
}

describe('construction de la requête de liste des clients', () => {
  test('sans filtre : tout le cabinet, tri par défaut et pagination conservée', () => {
    const requete = construireRequeteListeClients({ userId: 7, limit: 20, offset: 0 });
    expect(requete.sql).toContain('WHERE clients.courtier_id = $1');
    expect(requete.sql).toContain('ORDER BY clients.created_at DESC');
    expect(requete.params).toEqual([7, 20, 0]);
    expect(requete.countSql).toContain('WHERE clients.courtier_id = $1');
    expect(requete.countParams).toEqual([7]);
    controlerContratSql(requete.sql, requete.params);
  });

  test('`search` interroge nom, prénom, entreprise, e-mail et téléphone', () => {
    const requete = construireRequeteListeClients({ userId: 7, search: 'Martin', limit: 10, offset: 0 });
    for (const colonne of ['first_name', 'last_name', 'nom', 'prenom', 'company_name', 'email', 'phone', 'telephone', 'mobile']) {
      expect(requete.sql).toContain(`clients.${colonne}`);
    }
    expect(requete.params[1]).toBe('%martin%');
    expect(requete.countParams).toEqual([7, '%martin%']);
    controlerContratSql(requete.sql, requete.params);
  });

  test('le terme est replié : accents ET casse identiques au repli SQL', () => {
    expect(normaliserTexteClient('  ÉTIENNE  ')).toBe('etienne');
    expect(normaliserTexteClient('Hœrth')).toBe('hoerth');
    expect(normaliserTexteClient('HŒRTH')).toBe('hoerth');
    expect(normaliserTexteClient('Søren')).toBe('soren');
    expect(normaliserTexteClient('Bâtir Conseil')).toBe('batir conseil');
    // Le repli SQL couvre la même table : mêmes caractères, mêmes cibles.
    const expression = expressionSansAccent("clients.last_name", false);
    expect(expression).toContain("translate(lower(COALESCE(clients.last_name, ''))");
    expect(expression).toContain("replace(replace(");
    expect(expressionSansAccent("clients.last_name", true)).toContain('unaccent(lower(');
  });

  test('les jokers LIKE saisis sont neutralisés (pas de « % » qui ramène tout)', () => {
    const requete = construireRequeteListeClients({ userId: 7, search: '%_\\', limit: 10, offset: 0 });
    expect(requete.params[1]).toBe('%\\%\\_\\\\%');
  });

  test('`statut`/`status` et `segment`/`type` filtrent sur le schéma réel', () => {
    const parStatut = construireRequeteListeClients({ userId: 7, statut: 'ACTIF', limit: 10, offset: 0 });
    expect(parStatut.sql).toContain("lower(COALESCE(clients.status, '')) = lower($2)");
    expect(parStatut.params[1]).toBe('ACTIF');

    const parSegment = construireRequeteListeClients({ userId: 7, segment: 'pro', limit: 10, offset: 0 });
    expect(parSegment.sql).toContain("lower(COALESCE(clients.type, '')) = lower($2)");
    expect(parSegment.params[1]).toBe('pro');
  });

  test('`sort` est une liste blanche et `-nom` inverse la direction', () => {
    expect(construireRequeteListeClients({ userId: 7, sort: 'nom' }).sql).toContain('ORDER BY lower(COALESCE(clients.last_name, clients.nom, \'\')) ASC');
    expect(construireRequeteListeClients({ userId: 7, sort: '-nom' }).sql).toContain('DESC NULLS LAST');
    expect(construireRequeteListeClients({ userId: 7, sort: 'score_risque', direction: 'desc' }).sql).toContain('COALESCE(clients.risk_score, 0) DESC');
    // Valeur inconnue : aucun SQL injecté, tri par défaut.
    const inconnu = construireRequeteListeClients({ userId: 7, sort: 'created_at; DROP TABLE clients' });
    expect(inconnu.sql).toContain('ORDER BY clients.created_at DESC');
    expect(inconnu.sql).not.toContain('DROP TABLE');
  });

  test('le total porte exactement les mêmes filtres que la page', () => {
    const requete = construireRequeteListeClients({
      userId: 7, search: 'Léa', statut: 'actif', segment: 'particulier', limit: 10, offset: 10,
    });
    // Le comptage reprend le MÊME WHERE (3 filtres) que la page.
    const finDuWhere = requete.sql.slice(requete.sql.lastIndexOf('WHERE '));
    for (const clause of [
      'clients.courtier_id = $1',
      'LIKE $2',
      "lower(COALESCE(clients.status, '')) = lower($3)",
      "lower(COALESCE(clients.type, '')) = lower($4)",
    ]) {
      expect(requete.countSql).toContain(clause);
      expect(finDuWhere).toContain(clause);
    }
    expect(requete.params.slice(0, 4)).toEqual(requete.countParams);
    expect(requete.params.slice(4)).toEqual([10, 10]);
    controlerContratSql(requete.countSql, requete.countParams);
  });
});

describe('GET /api/clients – comportement HTTP', () => {
  let server;
  let origin;
  const requetes = [];

  const fakePool = {
    async query(sql, params) {
      requetes.push({ sql, params });
      if (sql.includes('pg_extension')) return { rows: [] }; // pas d'unaccent ici
      if (sql.includes('COUNT(*)')) return { rows: [{ count: 1 }] };
      return { rows: [{ id: 42, prenom: 'Léa', nom: 'Dupont' }] };
    },
  };

  beforeAll(async () => {
    const app = express();
    app.locals.pool = fakePool;
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next(); });
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise((r) => server.close(r)); });
  beforeEach(() => { requetes.length = 0; pool.query.mockReset(); });

  test('la recherche est transmise à PostgreSQL et le total est cohérent', async () => {
    const res = await fetch(`${origin}/?search=dupont&statut=actif&limit=10&page=2`);
    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.total).toBe(1);
    expect(corps.page).toBe(2);
    expect(corps.pages).toBe(1);
    expect(corps.data).toHaveLength(1);

    const [liste, comptage] = requetes.filter((r) => r.sql.includes('FROM clients'));
    expect(liste.sql).toContain('LIKE $2');
    expect(liste.params[1]).toBe('%dupont%');
    // `statut=actif` est un filtre serveur, pas un paramètre ignoré.
    expect(liste.sql).toMatch(/lower\(COALESCE\(clients\.status, ''\)\) = lower\(\$3\)/);
    expect(liste.params[2]).toBe('actif');
    expect(liste.params[3]).toBe(10);
    expect(liste.params[4]).toBe(10);
    expect(comptage.sql).toContain('COUNT(*)');
    expect(comptage.params).toEqual([7, '%dupont%', 'actif']);
  });

  test('sans filtre, aucune clause LIKE n’est ajoutée', async () => {
    const res = await fetch(`${origin}/`);
    expect(res.status).toBe(200);
    expect(requetes[0].sql).not.toContain('LIKE');
    expect(requetes[0].params).toEqual([7, 20, 0]);
  });
});
