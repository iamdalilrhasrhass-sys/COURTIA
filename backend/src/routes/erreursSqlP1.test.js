/**
 * erreursSqlP1.test.js — garde-fou : les requêtes de ces routes ne réclament
 * plus les colonnes qui n'existent pas dans le schéma réel.
 *
 * POURQUOI CE TEST : trois erreurs 500 ont été mesurées en production, chacune
 * causée par une colonne imaginaire ou une table inexistante :
 *   - /api/ark/client/:id/brief (et next-best-actions, quote-assistant)
 *     → `column "notes" does not exist` (calendar_events n'a pas de `notes`)
 *     et `summary` (client_interactions a subject/body_preview) ;
 *   - /api/analytics/executive → `column "annual_premium" does not exist`
 *     (quotes porte prime_annuelle / premium / amount) ;
 *   - /api/reporting/overview → `montant` (quotes) et table `opportunities`
 *     (le schéma porte `opportunites`) ; /api/reporting/revenue/forecast
 *     → `date_fin` (contracts porte date_echeance / end_date).
 *
 * Chaque requête émise est relue ici : plus aucune référence périmée ne peut
 * repasser sans que ce test échoue.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../middleware/planGuard', () => ({
  requireFeature: () => (_req, _res, next) => next(),
  requireUnderLimit: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 11, userId: 11 }; next(); },
  isSessionRevoked: async () => ({ revoked: false }),
}));
jest.mock('../middleware/authMiddleware', () => (req, _res, next) => {
  req.user = { id: 11, userId: 11 };
  next();
});

const express = require('express');
const pool = require('../db');
const arkContext = require('../services/arkContext');

const sqlEmis = [];

const COLONNES_INTERDITES = [
  { motif: /\bannual_premium\b/, remplacee: 'prime_annuelle / premium / amount' },
  { motif: /\bmontant\b/, remplacee: 'prime_annuelle / premium / amount' },
  { motif: /\bdate_fin\b/, remplacee: 'date_echeance / end_date' },
  { motif: /calendar_events[\s\S]*\bnotes\b/is, remplacee: 'calendar_events.description' },
  { motif: /client_interactions[\s\S]*\bsummary\b/is, remplacee: 'client_interactions.subject / body_preview' },
];

function verifierAucuneColonnePerimee() {
  for (const { sql } of sqlEmis) {
    for (const { motif, remplacee } of COLONNES_INTERDITES) {
      expect({ motif: String(motif), conforme: !motif.test(sql), remplacee }).toEqual({
        motif: String(motif), conforme: true, remplacee,
      });
    }
  }
}

describe('colonnes et tables réellement présentes dans le schéma', () => {
  let server;
  let origin;

  beforeAll(async () => {
    const app = express();
    app.locals.pool = pool;
    app.use(express.json());
    app.use('/api/analytics', require('./analytics'));
    app.use('/api/reporting', require('./reporting'));
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    sqlEmis.length = 0;
    pool.query.mockReset();
    pool.query.mockImplementation(async (sql) => {
      sqlEmis.push({ sql: String(sql) });
      if (/COUNT\(\*\)|SUM\(|AVG\(/i.test(sql)) {
        return { rows: [{ total: 3, count: 3, new: 1, total_value: 0, won: 0, expiring_90d: 0, total_signals: 0, avg_ark_score: 0, signed: 0, current_arr: 0, next_30d: 0, next_90d: 0, pipeline_value: 0, avg_score: null, min_score: null, max_score: null }] };
      }
      return { rows: [] };
    });
  });

  test('GET /api/analytics/executive n’interroge que des colonnes existantes', async () => {
    const res = await fetch(`${origin}/api/analytics/executive`);
    expect(res.status).toBe(200);
    expect(sqlEmis.length).toBeGreaterThan(0);
    // La prime est bien lue sur les colonnes réelles de `quotes`.
    expect(sqlEmis.some(({ sql }) => /prime_annuelle/.test(sql))).toBe(true);
    verifierAucuneColonnePerimee();
  });

  test('GET /api/reporting/overview et /revenue/forecast sont conformes au schéma', async () => {
    expect((await fetch(`${origin}/api/reporting/overview`)).status).toBe(200);
    expect((await fetch(`${origin}/api/reporting/revenue/forecast`)).status).toBe(200);
    // Les deux tables existent dans le schéma réel (opportunites ET la table
    // historique opportunities) : on vérifie le nom réellement écrit.
    expect(sqlEmis.some(({ sql }) => /FROM opportunit(es|ies)\b/.test(sql))).toBe(true);
    expect(sqlEmis.some(({ sql }) => /COALESCE\(date_echeance, end_date\)/.test(sql))).toBe(true);
    // La prime des devis est lue sur les colonnes réelles de `quotes`.
    const requeteDevis = sqlEmis.find(({ sql }) => /FROM quotes/.test(sql));
    expect(requeteDevis).toBeTruthy();
    for (const colonne of ['prime_annuelle', 'premium', 'amount']) {
      expect(requeteDevis.sql).toContain(colonne);
    }
    verifierAucuneColonnePerimee();
  });

  test('le contexte client ARK (brief, next-best-actions, quote-assistant) est conforme', async () => {
    pool.query.mockImplementation(async (sql) => {
      sqlEmis.push({ sql: String(sql) });
      if (/FROM clients c/.test(sql)) return { rows: [{ id: 201, first_name: 'Léa', last_name: 'Dupont', courtier_id: 11, status: 'actif' }] };
      return { rows: [] };
    });

    const contexte = await arkContext.getClientContext(201, 11);
    expect(contexte.error).toBeUndefined();
    expect(contexte.client.id).toBe(201);
    // Le RDV est lu sur sa vraie colonne, et l'interaction sur les siennes.
    expect(sqlEmis.some(({ sql }) => /calendar_events/.test(sql) && /description/.test(sql))).toBe(true);
    expect(sqlEmis.some(({ sql }) => /client_interactions/.test(sql) && /subject/.test(sql))).toBe(true);
    verifierAucuneColonnePerimee();
  });
});
