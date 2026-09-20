/**
 * kpi.arbitrage.test.js — LES DEUX ARBITRAGES, VERROUILLÉS PAR UN TEST.
 *
 * Ce fichier fige la décision du 20/09/2026 sur les deux ambiguïtés qui faisaient
 * diverger les écrans :
 *
 *  A. « CONTRATS » — deux notions, deux noms, jamais confondues :
 *       contrats.total  = TOUTES les lignes de `quotes` de nature contrat
 *                         (résilié/expiré/suspendu/annulé compris) ;
 *       contrats.actifs = celles au statut 'actif'/'active'.
 *     Un devis v1 resté dans `quotes` (statut 'envoye'/'brouillon') n'est NI l'un
 *     NI l'autre : c'est un DEVIS, compté dans `devis.total`.
 *
 *  B. `quotes` N'EST PAS UN NOM DE CONTRAT — c'est l'ancien nom de la clé des
 *     DEVIS : les réponses exposent `devis` (nom juste) et gardent `quotes` comme
 *     alias DÉPRÉCIÉ du même objet, annoncé dans `deprecations` et par les
 *     en-têtes HTTP. Aucun écran ne peut lire un taux de conversion de devis
 *     calculé sur des contrats (ni l'inverse).
 *
 * JEU DE DONNÉES D'AUDIT (le même que la recette qa_103_kpi_arbitrage.py) :
 *   3 lignes de NATURE CONTRAT :  2 actives (1 450,50 + 890,00 = 2 340,50)
 *                                 1 RÉSILIÉE (999 999,00 — hors portefeuille)
 *   3 DEVIS : 2 `devis_wizard` (1 234,50 + 3 210,75 = 4 445,25)
 *             + 1 devis v1 dans `quotes` (statut 'envoye', 777,00)
 * Attendus, calculés à la main :
 *   contrats.total = 3   contrats.actifs = 2   primes contrats = 2 340,50
 *   devis.total    = 3   primes devis    = 4 445,25 + 777,00 = 5 222,25
 *   devis.dontV1   = 1
 *   contrats.primeTotaleTous (audit)     = 2 340,50 + 999 999,00 = 1 002 339,50
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../middleware/planGuard', () => ({
  requireFeature: () => (_req, _res, next) => next(),
  requireUnderLimit: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7 }; next(); },
  isSessionRevoked: async () => ({ revoked: false }),
}));
jest.mock('../middleware/authMiddleware', () => (req, _res, next) => {
  req.user = { id: 7, userId: 7 };
  next();
});

const express = require('express');
const jwt = require('jsonwebtoken');
const poolModule = require('../db');
const { getJwtSecret } = require('../utils/jwtSecret');
const { kpi } = require('./dashboard');

const JETON = jwt.sign({ id: 7, userId: 7 }, getJwtSecret());
const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// ── Lignes telles que PostgreSQL les renverrait pour le jeu d'audit ──────────
// `total` = 3 lignes de nature contrat (2 actives + 1 résiliée) ; `actifs` = 2 ;
// la prime ne somme QUE les actives ; `prime_totale_tous` existe pour l'audit.
const LIGNE_CONTRATS = {
  total: 3, actifs: 2, prime_totale: '2340.50', prime_totale_tous: '1002339.50',
  contrats_avec_prime: 2, nouveaux: 1, echeances_30j: 1, echeances_90j: 2,
};
const LIGNE_DEVIS_WIZARD = {
  total: 2, envoyes: 1, signes: 1, en_preparation: 0, refuses: 0, expires: 0,
  nouveaux: 2, prime_cents: '444525', devis_avec_prime: 2,
};
const LIGNE_DEVIS_V1 = {
  total: 1, prime_v1: '777.00', devis_avec_prime: 1, envoyes: 1, nouveaux: 1,
};
const LIGNE_CLIENTS = { total: 7, actifs: 3, prospects: 4, nouveaux: 2 };
const LIGNE_TACHES = { total: 3, en_retard: 1 };

// Attendus recalculés à la main (aucun n'est recopié d'une réponse d'API) :
const CONTRATS_TOTAL = 3;
const CONTRATS_ACTIFS = 2;
const PRIME_CONTRATS = 2340.50;                 // 1450.50 + 890.00
const DEVIS_TOTAL = 3;                          // 2 (devis_wizard) + 1 (devis v1)
const PRIME_DEVIS = 5222.25;                    // 1234.50 + 3210.75 + 777.00
const PRIME_DEVIS_CONTROLE = 444525 / 100 + 777.00;
const PRIME_CONTRATS_TOUS = 2340.50 + 999999.00;

describe('arbitrage des indicateurs : contrats.total / contrats.actifs et clé quotes dépréciée', () => {
  let server;
  let origin;
  const emis = [];
  let appartenances = [];
  let entetes = {};

  function repondre(sql, params) {
    emis.push({ sql: String(sql), params });
    if (String(sql).includes('cabinet_members')) return { rows: appartenances };
    const s = String(sql);
    // Marqueurs uniques, ordre significatif.
    if (/AS prime_v1/.test(s)) return { rows: [LIGNE_DEVIS_V1] };
    if (/AS contrats_avec_prime/.test(s)) return { rows: [LIGNE_CONTRATS] };
    if (/AS prime_cents/.test(s)) return { rows: [LIGNE_DEVIS_WIZARD] };
    if (/AS en_retard/.test(s)) return { rows: [LIGNE_TACHES] };
    if (/AS prospects/.test(s)) return { rows: [LIGNE_CLIENTS] };
    return { rows: [] };
  }

  const fakePool = { async query(sql, params) { return repondre(sql, params); } };

  beforeAll(async () => {
    poolModule.query.mockImplementation(async (sql, params) => repondre(sql, params));
    const app = express();
    app.locals.pool = fakePool;
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next(); });
    app.use('/api/dashboard', require('./dashboard'));
    app.use('/api/reporting', require('./reporting'));
    app.use('/api/analytics', require('./analytics'));
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    emis.length = 0;
    entetes = {};
    appartenances = [{ cabinet_id: CAB_A, role: 'owner' }];
  });

  const lire = async (chemin) => {
    const res = await fetch(origin + chemin, { headers: { Authorization: `Bearer ${JETON}` } });
    expect(res.status).toBe(200);
    // En-têtes conservés pour les contrôles de dépréciation.
    entetes[chemin] = {
      deprecation: res.headers.get('deprecation'),
      warning: res.headers.get('warning'),
    };
    return res.json();
  };

  test('A · contrat total, contrat actif et devis : mêmes chiffres sur les trois écrans', async () => {
    const stats = await lire('/api/dashboard/stats');
    const overview = await lire('/api/reporting/overview');
    const executive = await lire('/api/analytics/executive');

    // ── Contrat TOTAL = 3 (2 actifs + 1 résilié) ────────────────────────────
    expect(stats.contratsTotal).toBe(CONTRATS_TOTAL);
    expect(stats.contrats.total).toBe(CONTRATS_TOTAL);
    expect(overview.kpis.contracts.total).toBe(CONTRATS_TOTAL);
    expect(executive.data.contracts_total).toBe(CONTRATS_TOTAL);
    expect(executive.data.contracts.total).toBe(CONTRATS_TOTAL);

    // ── Contrat ACTIF = 2 (le résilié n'est pas « en cours ») ───────────────
    expect(stats.contratsActifs).toBe(CONTRATS_ACTIFS);
    expect(stats.contrats.actifs).toBe(CONTRATS_ACTIFS);
    expect(overview.kpis.contracts.actifs).toBe(CONTRATS_ACTIFS);
    expect(executive.data.contracts_actifs).toBe(CONTRATS_ACTIFS);
    // Alias historique : même valeur que contracts_actifs, jamais un autre chiffre.
    expect(executive.data.contracts_count).toBe(executive.data.contracts_actifs);
    expect(executive.data.contracts_count).toBe(CONTRATS_ACTIFS);

    // ── Devis = 3 (2 devis_wizard + le devis v1 resté dans `quotes`) ────────
    expect(stats.devisTotal).toBe(DEVIS_TOTAL);
    expect(stats.devis.total).toBe(DEVIS_TOTAL);
    expect(overview.kpis.devis.total).toBe(DEVIS_TOTAL);
    expect(executive.data.devis_count).toBe(DEVIS_TOTAL);
    // La part v1 est publiée : l'audit n'a pas besoin de relire la base.
    expect(overview.kpis.devis.dontV1).toBe(1);
    expect(stats.devis.dontV1).toBe(1);

    // Le devis v1 n'est compté dans AUCUN compteur de contrat : 3 = 2 actifs + 1
    // résilié, et non 4 (avec le devis) — c'est le piège mesuré en production.
    expect(stats.contratsTotal).not.toBe(4);

    // ── Somme des primes des contrats = 2 340,50 (jamais le résilié) ────────
    expect(stats.primeTotale).toBe(PRIME_CONTRATS);
    expect(overview.kpis.contracts.totalValue).toBe(PRIME_CONTRATS);
    expect(executive.data.ca_estimated).toBe(PRIME_CONTRATS);

    // ── Somme des DEVIS = 4 445,25 + 777,00 = 5 222,25 ──────────────────────
    expect(PRIME_DEVIS).toBe(PRIME_DEVIS_CONTROLE);
    expect(stats.devisPrimeTotale).toBe(PRIME_DEVIS);
    expect(overview.kpis.devis.totalValue).toBe(PRIME_DEVIS);
    expect(executive.data.devis_prime_totale).toBe(PRIME_DEVIS);

    // ── Valeur d'audit : la prime du résilié n'est nulle part dans les mesures
    // de portefeuille, mais reste traçable.
    expect(stats.primeTotaleTous).toBe(PRIME_CONTRATS_TOUS);
    expect(overview.kpis.contracts.totalValueTous).toBe(PRIME_CONTRATS_TOUS);
    expect(executive.data.ca_estimated_tous).toBe(PRIME_CONTRATS_TOUS);
    expect(stats.primeTotale).not.toBe(stats.primeTotaleTous);
  });

  test('B · `quotes` est un alias déprécié de `devis`, annoncé et identique', async () => {
    const overview = await lire('/api/reporting/overview');

    // Le même objet, deux noms : aucune lecture ne peut donner deux chiffres.
    expect(overview.kpis.quotes).toEqual(overview.kpis.devis);
    expect(overview.kpis.quotes.total).toBe(DEVIS_TOTAL);
    expect(overview.kpis.quotes.conversionRate).toBe(overview.kpis.devis.conversionRate);

    // La dépréciation est ANNONCÉE dans le corps…
    expect(Array.isArray(overview.deprecations)).toBe(true);
    const d = overview.deprecations.find((x) => x.champ === 'kpis.quotes');
    expect(d).toBeTruthy();
    expect(d.remplace_par).toBe('kpis.devis');
    // …et par les en-têtes HTTP.
    expect(entetes['/api/reporting/overview'].deprecation).toBe('true');
    expect(entetes['/api/reporting/overview'].warning).toMatch(/kpis\.quotes/);

    // Le taux de conversion porte sur les DEVIS (1 signé / 3 devis = 33 %), et
    // non sur les contrats (2 signés sur 3 → 67 %) : c'est la confusion qui est
    // interdite.
    expect(overview.kpis.devis.conversionRate).toBe(Math.round((1 / 3) * 100));
    expect(overview.kpis.devis.conversionRate).not.toBe(Math.round((2 / 3) * 100));
  });

  test('la frontière est dans le SQL : devis v1 hors des contrats, dedans les devis', async () => {
    await lire('/api/dashboard/stats');
    await lire('/api/reporting/overview');
    await lire('/api/analytics/executive');

    const portee = { userId: 7, cabinetIds: [CAB_A] };
    const sqlContrats = kpi.requeteContrats(portee, { jours: 30 }).sql;
    const sqlDevisV1 = kpi.requeteDevisV1(portee, { jours: 30 }).sql;

    // Une seule et même requête de contrats pour les trois écrans.
    const requetesContrats = emis.filter(({ sql }) => /AS contrats_avec_prime/.test(sql)).map(({ sql }) => sql);
    expect(requetesContrats.length).toBe(3);
    expect(new Set(requetesContrats).size).toBe(1);
    expect(requetesContrats[0]).toBe(sqlContrats);
    // …et elle EXCLUT les statuts de devis v1, tout en comptant les deux notions.
    expect(sqlContrats).toContain(kpi.NATURE_CONTRAT);
    expect(sqlContrats).toContain(kpi.STATUTS_DEVIS_V1);
    expect(sqlContrats).toContain("COUNT(*) FILTER (WHERE q.status IN ('actif', 'active'))::int AS actifs");
    // La somme des primes du portefeuille est filtrée sur les actifs.
    expect(sqlContrats).toContain(`SUM(${kpi.PRIME_CONTRAT}) FILTER (WHERE q.status IN ('actif', 'active'))`);

    // La requête des devis v1 est bien une requête sur `quotes`, filtrée SUR les
    // statuts de devis v1 (l'inverse de la précédente).
    expect(sqlDevisV1).toContain(kpi.STATUTS_DEVIS_V1);
    expect(sqlDevisV1).not.toContain(kpi.NATURE_CONTRAT);
    const requetesV1 = emis.filter(({ sql }) => /AS prime_v1/.test(sql)).map(({ sql }) => sql);
    expect(requetesV1.length).toBe(3);   // une par écran
    expect(new Set(requetesV1).size).toBe(1);
    expect(requetesV1[0]).toBe(sqlDevisV1);

    // Aucun écran ne lit les tables jamais écrites.
    for (const { sql } of emis) {
      expect(/FROM\s+contracts\b/i.test(sql)).toBe(false);
      expect(/FROM\s+contrats\b/i.test(sql)).toBe(false);
    }
  });

  test('sans aucune donnée : les deux notions valent 0 (comptage exact) et les taux null', async () => {
    const ancien = fakePool.query;
    fakePool.query = async () => ({ rows: [] });
    poolModule.query.mockImplementation(async () => ({ rows: [] }));
    try {
      const stats = await lire('/api/dashboard/stats');
      const overview = await lire('/api/reporting/overview');
      const executive = await lire('/api/analytics/executive');

      expect(stats.contratsTotal).toBe(0);
      expect(stats.contratsActifs).toBe(0);
      expect(stats.devisTotal).toBe(0);
      expect(overview.kpis.contracts.total).toBe(0);
      expect(overview.kpis.contracts.actifs).toBe(0);
      expect(overview.kpis.devis.total).toBe(0);
      expect(executive.data.contracts_total).toBe(0);
      expect(executive.data.contracts_actifs).toBe(0);
      expect(executive.data.devis_count).toBe(0);
      // Un taux sans dénominateur n'existe pas : null, jamais 0 %.
      expect(overview.kpis.devis.conversionRate).toBeNull();
    } finally {
      fakePool.query = ancien;
      poolModule.query.mockImplementation(async (sql, params) => repondre(sql, params));
    }
  });
});
