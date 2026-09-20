/**
 * objectifs.ranking.test.js — LE CLASSEMENT NE SORT JAMAIS DU CABINET.
 *
 * POURQUOI CES TESTS (défaut P0 démontré par la Red Team le 20/09/2026)
 * `GET /api/objectifs/ranking` lisait `SELECT id, cabinet_id FROM users` alors
 * que `users.cabinet_id` N'EXISTE PAS : la requête échouait, le
 * `.catch(() => ({ rows: [] }))` transformait l'erreur en résultat vide, la
 * clause `WHERE u.cabinet_id = $1` n'était donc jamais ajoutée et la requête
 * suivante partait SANS AUCUN FILTRE. N'importe quel compte authentifié
 * recevait les 20 premiers comptes de la plateforme — dont les deux comptes
 * pilotes `fyakoubi@centuryfinance.ch` et `a.prodomo@spondeo-assurances.ch`.
 *
 * CE QUE CES TESTS VÉRIFIENT, ET POURQUOI ILS SONT ÉCRITS AINSI
 *   • Ils lisent le SQL RÉELLEMENT envoyé (aucune requête n'est simulée dans le
 *     routeur) : si la clause de portée disparaît, le test tombe.
 *   • Ils exécutent la requête simulée comme le ferait PostgreSQL : les
 *     paramètres sont appliqués au jeu de données, donc un filtre oublié
 *     ramènerait visiblement les comptes d'un autre cabinet.
 *   • Ils vérifient explicitement que les e-mails pilotes n'apparaissent JAMAIS.
 */
jest.mock('../db', () => ({ query: jest.fn() }));

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');
const router = require('./objectifsAdvanced');

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PILOTE_1 = 'fyakoubi@centuryfinance.ch';
const PILOTE_2 = 'a.prodomo@spondeo-assurances.ch';

/** Comptes de la plateforme : ceux du cabinet A, ceux du cabinet B, et les pilotes. */
const COMPTES = [
  { id: 42, email: 'alpha@cabinet-a.test', first_name: 'Alpha', last_name: 'A', cabinet: CAB_A, clients_count: 2, quotes_count: 3, ca_cents: 200 },
  { id: 53, email: 'collab@cabinet-a.test', first_name: 'Collab', last_name: 'A', cabinet: CAB_A, clients_count: 1, quotes_count: 1, ca_cents: 100 },
  { id: 99, email: 'voisin@cabinet-b.test', first_name: 'Voisin', last_name: 'B', cabinet: CAB_B, clients_count: 9, quotes_count: 9, ca_cents: 900 },
  { id: 11, email: PILOTE_1, first_name: 'Fouad', last_name: 'Y', cabinet: CAB_B, clients_count: 5, quotes_count: 5, ca_cents: 500 },
  { id: 14, email: PILOTE_2, first_name: 'A', last_name: 'P', cabinet: CAB_B, clients_count: 6, quotes_count: 6, ca_cents: 600 },
];

describe('GET /api/objectifs/ranking — portée cabinet', () => {
  let server;
  let origin;
  let jetonA;
  let jetonMono;
  let appartenances;
  let requetes;
  let queryReelle;

  /**
   * Pool simulé : applique réellement le filtre reçu, comme le ferait
   * PostgreSQL. Le routeur importe `../db` (mocké par jest) — c'est donc CE
   * mock qui reçoit le SQL, et le test l'examine tel quel.
   */
  const repondre = async (sql, params) => {
    const texte = String(sql);
    requetes.push({ sql: texte, params });
    // Middleware d'authentification : aucune marque de révocation pour ce test.
    if (texte.includes('password_changed_at')) {
      return { rows: [{ password_changed_at: null, sessions_revoked_at: null }] };
    }
    if (texte.includes('clients_count')) {
      const filtre = params || [];
      let lignes = COMPTES;
      if (/cm\.cabinet_id = \$1/.test(texte)) lignes = lignes.filter((c) => c.cabinet === filtre[0]);
      if (/u\.id = \$1/.test(texte)) lignes = lignes.filter((c) => c.id === filtre[0]);
      // `ORDER BY ca_cents DESC` : la simulation trie comme la base.
      lignes = [...lignes].sort((a, b) => b.ca_cents - a.ca_cents);
      return { rows: lignes.slice(0, 20) };
    }
    // Portée (lib/porteeCabinet) : la requête de classement contient ELLE AUSSI
    // `FROM cabinet_members` (sous-requête de portée) — elle est donc traitée
    // AVANT ce cas.
    if (texte.includes('FROM cabinet_members')) return { rows: appartenances };
    return { rows: [] };
  };

  beforeAll(async () => {
    const app = express();
    app.locals.pool = { query: (sql, params) => repondre(sql, params) };
    app.use(express.json());
    app.use('/api', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
    jetonA = jwt.sign({ userId: 42, id: 42, role: 'broker' }, getJwtSecret());
    jetonMono = jwt.sign({ userId: 77, id: 77, role: 'broker' }, getJwtSecret());
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    appartenances = [];
    requetes = [];
    pool.query.mockReset();
    queryReelle = repondre;
    pool.query.mockImplementation((sql, params) => queryReelle(sql, params));
  });

  const ranger = () => fetch(`${origin}/api/objectifs/ranking`, {
    headers: { Authorization: `Bearer ${jetonA}` },
  });

  test('un membre de cabinet ne voit QUE son cabinet', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker' }];
    const reponse = await ranger();
    expect(reponse.status).toBe(200);
    const corps = await reponse.json();
    const emails = corps.ranking.map((m) => m.email);
    expect(emails).toEqual(['alpha@cabinet-a.test', 'collab@cabinet-a.test']);
    expect(corps.portee).toBe('cabinet');
  });

  test('les e-mails des comptes pilotes n’apparaissent JAMAIS', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker' }];
    const corps = await (await ranger()).json();
    const brut = JSON.stringify(corps);
    expect(brut).not.toContain(PILOTE_1);
    expect(brut).not.toContain(PILOTE_2);
    expect(brut).not.toContain('voisin@cabinet-b.test');
  });

  test('LA requête envoyée porte bien la clause de portée (le filtre n’est pas optionnel)', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker' }];
    await ranger();
    const requeteEquipe = requetes.find((r) => r.sql.includes('clients_count'));
    expect(requeteEquipe).toBeDefined();
    expect(requeteEquipe.sql).toContain('FROM cabinet_members');
    expect(requeteEquipe.sql).toContain('cm.removed_at IS NULL');
    expect(requeteEquipe.params).toEqual([CAB_A]);
  });

  test('aucune requête ne lit une colonne inexistante (users.cabinet_id n’existe pas)', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker' }];
    await ranger();
    for (const r of requetes) {
      expect(r.sql).not.toContain('u.cabinet_id');
      expect(r.sql).not.toContain('SELECT id, cabinet_id FROM users');
    }
  });

  test('sans cabinet (repli mono-utilisateur) : le classement ne contient que soi-même', async () => {
    appartenances = [];
    const reponse = await fetch(`${origin}/api/objectifs/ranking`, {
      headers: { Authorization: `Bearer ${jetonMono}` },
    });
    expect(reponse.status).toBe(200);
    const corps = await reponse.json();
    expect(corps.portee).toBe('mono-utilisateur');
    expect(corps.ranking).toEqual([]); // l'utilisateur 77 n'existe pas dans le jeu
    const requeteEquipe = requetes.find((r) => r.sql.includes('clients_count'));
    expect(requeteEquipe.sql).toContain('u.id = $1');
    expect(requeteEquipe.params).toEqual([77]);
  });

  test('une erreur SQL remonte en 500 — elle n’est JAMAIS servie comme un classement sans filtre', async () => {
    appartenances = [{ cabinet_id: CAB_A, role: 'broker' }];
    queryReelle = async (sql, params) => {
      if (String(sql).includes('clients_count')) {
        throw new Error('invalid input syntax for type numeric: "abc"');
      }
      return repondre(sql, params);
    };
    const reponse = await ranger();
    expect(reponse.status).toBe(500);
    const corps = await reponse.json();
    expect(corps.error).toBe('ranking_failed');
    expect(JSON.stringify(corps)).not.toContain(PILOTE_1);
  });

  test('sans jeton : 401, aucun classement', async () => {
    const reponse = await fetch(`${origin}/api/objectifs/ranking`);
    expect(reponse.status).toBe(401);
  });
});
