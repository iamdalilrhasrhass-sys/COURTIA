/**
 * contrats.modification.test.js — modifier, résilier et renouveler un contrat.
 *
 * POURQUOI CES TESTS (défauts reproduits en production le 20/09/2026) :
 *   1. PUT /api/contrats/:id répondait 500 sur TOUTE modification : la clause de
 *      portée était numérotée `depart: 3` alors que la requête utilisait déjà $1
 *      (données), $2 (statut) et $3 (identifiant). PostgreSQL recevait le même
 *      paramètre comme entier ET comme tableau d'UUID. Un cabinet suisse ne
 *      pouvait donc plus corriger une prime, ni résilier, ni renouveler.
 *   2. Un statut inconnu (« PIRATE ») était écrit tel quel : le contrat sortait
 *      silencieusement de tous les compteurs.
 *   3. Le renouvellement n'existait pas : aucune échéance n'était calculée.
 */
jest.mock('../db', () => ({ query: jest.fn() }));

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');
const router = require('./contrats');

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const CONTRAT_A = {
  id: 43,
  client_id: 88,
  status: 'actif',
  quote_data: {
    type_contrat: 'auto', compagnie: 'Helvetia', numero: 'POL-E2E-001',
    prime_annuelle: 1450.5, date_effet: '2026-10-01', date_echeance: '2027-09-30',
  },
};

describe('contrats — modification, résiliation, renouvellement', () => {
  let server;
  let origin;
  let jeton;
  const requetes = [];
  let appartenances = [];

  const fakePool = {
    async query(sql, params) {
      requetes.push({ sql: String(sql), params });
      const texte = String(sql);
      if (texte.includes('cabinet_members')) return { rows: appartenances };
      if (texte.includes('FROM quotes') && texte.includes('JOIN clients')) {
        // Lecture d'appartenance : le contrat n'est visible que dans SA portée.
        const portee = params[1];
        const visible = Array.isArray(portee) ? portee.includes(CAB_A) : portee === 7;
        return { rows: visible ? [CONTRAT_A] : [], rowCount: visible ? 1 : 0 };
      }
      if (texte.includes('UPDATE quotes')) {
        const quoteData = JSON.parse(params[0]);
        return {
          rows: [{
            id: 43, client_id: 88, status: params[1],
            quote_data: quoteData, prime_annuelle: params[2], date_echeance: params[3],
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  };

  beforeAll(async () => {
    const app = express();
    app.locals.pool = fakePool;
    app.use(express.json());
    app.use('/api/contrats', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
    jeton = jwt.sign({ userId: 7, id: 7, role: 'broker' }, getJwtSecret());
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    requetes.length = 0;
    appartenances = [];
    pool.query.mockReset();
  });

  const appeler = (chemin, methode, corps) => fetch(`${origin}${chemin}`, {
    method: methode,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
    body: corps ? JSON.stringify(corps) : undefined,
  });

  const maj = () => requetes.find((r) => r.sql.includes('UPDATE quotes'));

  test('la lecture d’appartenance numérote la portée APRÈS l’identifiant (jamais $3 pour deux usages)', async () => {
    const res = await appeler('/api/contrats/43', 'PUT', { prime_annuelle: 1500 });
    expect(res.status).toBe(200);

    const lecture = requetes.find((r) => r.sql.includes('JOIN clients'));
    expect(lecture.sql).toContain('WHERE q.id = $1');
    expect(lecture.sql).toContain('clients.courtier_id = $2');
    // $1 = identifiant du contrat, $2 = propriétaire de la portée.
    expect(lecture.params).toEqual([43, 7]);
  });

  test('modification de la prime : 200 et prime réellement écrite', async () => {
    const res = await appeler('/api/contrats/43', 'PUT', { prime_annuelle: 1500 });
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.quote_data.prime_annuelle).toBe(1500);
    const ecriture = maj();
    expect(JSON.parse(ecriture.params[0]).prime_annuelle).toBe(1500);
    // La colonne `prime_annuelle` est écrite AUSSI : le tableau de bord la lit
    // en premier, deux emplacements divergents afficheraient deux chiffres.
    expect(ecriture.params[2]).toBe(1500);
    expect(ecriture.sql).toContain('prime_annuelle = $3');
  });

  test('résiliation : le statut « resilie » est réellement écrit', async () => {
    const res = await appeler('/api/contrats/43', 'PUT', { statut: 'resilie' });
    expect(res.status).toBe(200);
    expect(maj().params[1]).toBe('resilie');
  });

  test('une modification partielle CONSERVE les champs non transmis', async () => {
    await appeler('/api/contrats/43', 'PUT', { prime_annuelle: 1500 });
    const donnees = JSON.parse(maj().params[0]);
    expect(donnees.numero).toBe('POL-E2E-001');
    expect(donnees.date_echeance).toBe('2027-09-30');
    expect(donnees.compagnie).toBe('Helvetia');
  });

  test('statut inconnu : 400 explicite avec les statuts acceptés, aucune écriture', async () => {
    const res = await appeler('/api/contrats/43', 'PUT', { statut: 'PIRATE' });
    const corps = await res.json();

    expect(res.status).toBe(400);
    expect(corps.error).toBe('statut_inconnu');
    expect(corps.statuts_acceptes).toContain('actif');
    expect(maj()).toBeUndefined();
  });

  test('prime invalide : 400, jamais un 500 SQL', async () => {
    const res = await appeler('/api/contrats/43', 'PUT', { prime_annuelle: 'beaucoup' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('prime_invalide');
    expect(maj()).toBeUndefined();
  });

  test('date invalide (31 février) : 400, aucune écriture', async () => {
    const res = await appeler('/api/contrats/43', 'PUT', { date_echeance: '2027-02-31' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('date_invalide');
    expect(maj()).toBeUndefined();
  });

  test('contrat d’un AUTRE cabinet : 404 sans aucune écriture (jamais 403)', async () => {
    appartenances = [{ cabinet_id: CAB_B, role: 'broker' }];
    const res = await appeler('/api/contrats/43', 'PUT', { prime_annuelle: 1500 });
    expect(res.status).toBe(404);
    expect(maj()).toBeUndefined();
  });

  test('revu depuis un cabinet dont le contrat n’est pas dans la portée : 404', async () => {
    appartenances = [{ cabinet_id: CAB_B, role: 'broker' }];
    const res = await appeler('/api/contrats/43', 'DELETE');
    expect(res.status).toBe(404);
    // Les règles métier ne s'exécutent PAS : aucune lecture de commission, donc
    // aucune confirmation de l'existence du contrat d'un autre cabinet.
    expect(requetes.some((r) => r.sql.includes('FROM commissions'))).toBe(false);
  });

  test('identifiant non numérique : 404 et aucune requête en base', async () => {
    const res = await appeler('/api/contrats/abc', 'PUT', { prime_annuelle: 1500 });
    expect(res.status).toBe(404);
    expect(requetes.some((r) => r.sql.includes('FROM quotes'))).toBe(false);
  });

  test('renouvellement sans nouvelle date : échéance + 1 an et statut actif', async () => {
    const res = await appeler('/api/contrats/43', 'PUT', { renouvellement: true });
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.renouvele).toBe(true);
    expect(JSON.parse(maj().params[0]).date_echeance).toBe('2028-09-30');
    expect(maj().params[1]).toBe('actif');
  });

  test('renouvellement avec une date fournie : c’est ELLE qui est écrite', async () => {
    const res = await appeler('/api/contrats/43', 'PUT',
      { renouvellement: true, date_echeance: '2029-01-31' });
    expect(res.status).toBe(200);
    expect(JSON.parse(maj().params[0]).date_echeance).toBe('2029-01-31');
  });

  test('route dédiée POST /:id/renouveler : échéance + 1 an', async () => {
    const res = await appeler('/api/contrats/43/renouveler', 'POST', {});
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.success).toBe(true);
    expect(corps.renouvele).toBe(true);
    expect(corps.contrat.quote_data.date_echeance).toBe('2028-09-30');
  });
});
