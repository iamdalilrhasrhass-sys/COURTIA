/**
 * kpi.coherence.test.js — LE MÊME CONCEPT DONNE LE MÊME CHIFFRE PARTOUT.
 *
 * POURQUOI CE TEST (défaut reproduit en production le 20/09/2026, cabinet
 * d'audit suisse) : « contrats » valait 2 sur /api/dashboard/stats, 0 sur
 * /api/reporting/overview — qui lisait la table `contracts`, jamais alimentée —
 * et 3 sur /api/analytics/executive, qui comptait aussi les devis. Les primes
 * n'étaient pas sommées de la même façon selon l'écran, et GET /api/clients
 * renvoyait « prime 0 » pour un client qui portait un contrat de 1 450 CHF.
 *
 * Ce test monte les QUATRE routeurs sur un pool simulé qui répond aux requêtes
 * canoniques avec un jeu de données CONNU (7 clients = 3 actifs + 4 prospects,
 * 2 contrats de primes 1 450,50 et 890, 2 devis de 1 234,50 et 3 210,75,
 * 3 tâches dont 1 en retard) et vérifie que :
 *   1. les trois écrans renvoient les MÊMES chiffres pour clients / contrats /
 *      devis / primes / tâches en retard ;
 *   2. une seule requête (le même texte SQL) sert chaque indicateur, quel que
 *      soit l'écran — la définition est partagée, pas recopiée ;
 *   3. aucune requête ne lit les tables `contracts`, `contrats` ou `taches`
 *      (jamais écrites par l'application) ;
 *   4. l'agrégat « prime par client » de /api/clients utilise la même expression
 *      de prime et publie le nom lu par la liste Clients (`prime_annuelle_total`) ;
 *   5. l'absence de mesure n'est pas un zéro : sans aucune donnée, les moyennes
 *      et les taux valent `null` (jamais 0, jamais un « 75 » de repli).
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

// /api/dashboard porte son propre vérificateur de jeton : on lui présente un
// vrai jeton signé avec le secret de l'application (aucun jeton simulé).
const JETON = jwt.sign({ id: 7, userId: 7 }, getJwtSecret());

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

// ── Jeu de données CONNU (les attendus sont posés à la main, pas recopiés) ───
const CLIENTS = { total: 7, actifs: 3, prospects: 4, nouveaux: 2 };
const CONTRATS = {
  total: 2, prime_totale: '2340.50', contrats_avec_prime: 2,
  nouveaux: 1, echeances_30j: 1, echeances_90j: 2,
};
const DEVIS = {
  total: 2, envoyes: 1, signes: 1, en_preparation: 0, refuses: 0, expires: 0,
  nouveaux: 2, prime_cents: '444525', devis_avec_prime: 2,
};
const TACHES = { total: 3, en_retard: 1 };

// Attendus calculés à la main :
//   prime des contrats   = 1450.50 + 890.00            = 2340.50
//   montant des devis    = 123450 + 321075 centimes    = 4445.25
const PRIME_CONTRATS_ATTENDUE = 2340.50;
const PRIME_DEVIS_ATTENDUE = 4445.25;

describe('cohérence des indicateurs entre les trois écrans', () => {
  let server;
  let origin;
  const emis = [];
  let avecDonnees = true;
  let appartenances = [];

  /**
   * Répond aux requêtes canoniques avec le jeu de données CONNU. Utilisé à la
   * fois par le pool de l'application (req.app.locals.pool) et par le module
   * `../db` — analytics.js lit ses chiffres par ce dernier.
   */
  function repondre(sql, params) {
    emis.push({ sql: String(sql), params });
    // L'appartenance au cabinet n'est pas une « donnée métier » : elle est
    // toujours servie (c'est l'autorisation, pas un indicateur).
    if (String(sql).includes('cabinet_members')) return { rows: appartenances };
    if (!avecDonnees) return { rows: [] };
    const s = String(sql);
    // Marqueurs uniques : l'ordre compte (« AS nouveaux » est présent dans
    // plusieurs requêtes canoniques).
    if (/AS contrats_avec_prime/.test(s)) return { rows: [CONTRATS] };
    if (/AS prime_cents/.test(s)) return { rows: [DEVIS] };
    if (/AS en_retard/.test(s)) return { rows: [TACHES] };
    if (/AS prospects/.test(s)) return { rows: [CLIENTS] };
    if (/AVG\(c\.risk_score\)/.test(s)) return { rows: [{ score: 55 }] };
    if (/FROM clients/.test(s) && /COUNT\(\*\)/.test(s)) return { rows: [{ count: 1 }] };
    return { rows: [] };
  }

  const fakePool = { async query(sql, params) { return repondre(sql, params); } };

  /** Appartenances cabinet simulées (table `cabinet_members`). */
  function simulerAppartenances(liste) {
    appartenances = liste;
  }

  beforeAll(async () => {
    poolModule.query.mockImplementation(async (sql, params) => {
      if (String(sql).includes('cabinet_members')) return { rows: appartenances };
      return repondre(sql, params);
    });
    const app = express();
    app.locals.pool = fakePool;
    app.use(express.json());
    // L'utilisateur authentifié est posé comme le fait server.js avant de monter
    // les routeurs (dashboard.js re-vérifie ensuite le jeton signé).
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next(); });
    app.use('/api/dashboard', require('./dashboard'));
    app.use('/api/reporting', require('./reporting'));
    app.use('/api/analytics', require('./analytics'));
    app.use('/api/clients', require('./clients'));
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise((r) => server.close(r)); });

  beforeEach(() => {
    emis.length = 0;
    avecDonnees = true;
    simulerAppartenances([{ cabinet_id: CAB_A, role: 'owner' }]);
  });

  const lire = async (chemin) => {
    const res = await fetch(origin + chemin, { headers: { Authorization: `Bearer ${JETON}` } });
    expect(res.status).toBe(200);
    return res.json();
  };

  test('les trois écrans annoncent les MÊMES clients, contrats, devis, primes et retards', async () => {
    const stats = await lire('/api/dashboard/stats');
    const overview = await lire('/api/reporting/overview');
    const executive = await lire('/api/analytics/executive');

    // Clients : 7 (3 actifs + 4 prospects)
    expect(stats.totalClients).toBe(CLIENTS.total);
    expect(overview.kpis.clients.total).toBe(CLIENTS.total);
    expect(executive.data.clients_count).toBe(CLIENTS.total);

    // Contrats ACTIFS : 2 — et non 0 (table `contracts` vide) ni 3 (devis comptés)
    expect(stats.contratsActifs).toBe(CONTRATS.total);
    expect(overview.kpis.contracts.total).toBe(CONTRATS.total);
    expect(executive.data.contracts_count).toBe(CONTRATS.total);

    // Devis : 2
    expect(stats.devisTotal).toBe(DEVIS.total);
    expect(overview.kpis.devis.total).toBe(DEVIS.total);
    expect(overview.kpis.quotes.total).toBe(DEVIS.total);
    expect(executive.data.devis_count).toBe(DEVIS.total);

    // Somme des primes de contrats : 2 340,50 (un seul calcul, trois écrans)
    expect(stats.primeTotale).toBe(PRIME_CONTRATS_ATTENDUE);
    expect(overview.kpis.contracts.totalValue).toBe(PRIME_CONTRATS_ATTENDUE);
    expect(executive.data.ca_estimated).toBe(PRIME_CONTRATS_ATTENDUE);

    // Somme des montants de devis : 4 445,25
    expect(stats.devisPrimeTotale).toBe(PRIME_DEVIS_ATTENDUE);
    expect(overview.kpis.devis.totalValue).toBe(PRIME_DEVIS_ATTENDUE);
    expect(executive.data.devis_prime_totale).toBe(PRIME_DEVIS_ATTENDUE);

    // Tâches en retard : 1 (sur 3)
    expect(stats.tachesEnRetard).toBe(TACHES.en_retard);
    expect(overview.kpis.taches.enRetard).toBe(TACHES.en_retard);

    // Champ dédié : combien de lignes portaient réellement la mesure.
    expect(stats.contratsAvecPrime).toBe(CONTRATS.contrats_avec_prime);
    expect(overview.kpis.contracts.contratsAvecPrime).toBe(CONTRATS.contrats_avec_prime);
    expect(executive.data.ca_contrats_avec_prime).toBe(CONTRATS.contrats_avec_prime);
  });

  test('une seule requête pour « contrat » et pour « devis », quel que soit l’écran', async () => {
    await lire('/api/dashboard/stats');
    await lire('/api/reporting/overview');
    await lire('/api/analytics/executive');

    // Le texte examiné est celui des requêtes canoniques (marqueurs uniques de
    // chaque indicateur) : une par écran, et toutes les trois IDENTIQUES.
    const porteeCabinetSeul = { userId: 7, cabinetIds: [CAB_A] };
    const requetesContrats = emis.filter((e) => /AS prime_totale/.test(e.sql) && /AS contrats_avec_prime/.test(e.sql)).map((e) => e.sql);
    expect(requetesContrats.length).toBe(3); // une par écran
    const canoniqueContrats = kpi.requeteContratsActifs(porteeCabinetSeul, { jours: 30 }).sql;
    expect([...new Set(requetesContrats)].map((s) => s.replace(/\s+/g, ' ')))
      .toEqual([canoniqueContrats.replace(/\s+/g, ' ')]);
    // …et c'est exactement la requête canonique du bloc partagé.
    expect(requetesContrats[0]).toBe(canoniqueContrats);
    expect(requetesContrats[0]).toContain(kpi.PRIME_CONTRAT);

    const requetesDevis = emis.filter((e) => /FROM devis_wizard/.test(e.sql) && /AS prime_cents/.test(e.sql)).map((e) => e.sql);
    expect(requetesDevis.length).toBe(3);
    expect(new Set(requetesDevis).size).toBe(1);
    expect(requetesDevis[0]).toBe(kpi.requeteDevis(porteeCabinetSeul, { jours: 30 }).sql);

    const requetesClients = emis.filter((e) => /AS prospects/.test(e.sql)).map((e) => e.sql);
    expect(new Set(requetesClients).size).toBe(1);
    expect(requetesClients[0]).toBe(kpi.requeteClients(porteeCabinetSeul, { jours: 30 }).sql);
  });

  test('aucun écran ne lit les tables jamais écrites (`contracts`, `contrats`, `taches`)', async () => {
    await lire('/api/dashboard/stats');
    await lire('/api/dashboard/summary');
    await lire('/api/reporting/overview');
    await lire('/api/reporting/products');
    await lire('/api/reporting/revenue/forecast');
    await lire('/api/analytics/executive');

    for (const { sql } of emis) {
      expect(/FROM\s+contracts\b/i.test(sql)).toBe(false);
      expect(/FROM\s+contrats\b/i.test(sql)).toBe(false);
      expect(/FROM\s+taches\b/i.test(sql)).toBe(false);
    }
    // Les contrats sont bien cherchés là où ils sont écrits, et les devis aussi.
    expect(emis.some((e) => /FROM quotes q/.test(e.sql))).toBe(true);
    expect(emis.some((e) => /FROM devis_wizard/.test(e.sql))).toBe(true);
  });

  test('/api/clients publie la prime par client avec la MÊME expression et le nom lu par l’écran', async () => {
    const corps = await lire('/api/clients');
    expect(Array.isArray(corps.data)).toBe(true);

    const liste = emis.find((e) => /AS prime_annuelle_total/.test(e.sql));
    expect(liste).toBeTruthy();
    expect(liste.sql).toContain('AS prime_annuelle_total');   // nom lu par la liste Clients
    expect(liste.sql).toContain('AS prime_totale');           // nom historique conservé
    expect(liste.sql).toContain(kpi.PRIME_CONTRAT);           // même calcul que le tableau de bord
    expect(liste.sql).toContain("q.status IN ('actif', 'active')");
  });

  test('sans aucune donnée : une moyenne ou un taux absent vaut null, jamais 0 ni une valeur inventée', async () => {
    avecDonnees = false;

    const stats = await lire('/api/dashboard/stats');
    const overview = await lire('/api/reporting/overview');
    const executive = await lire('/api/analytics/executive');

    // Moyennes et taux : aucune mesure possible ⇒ null.
    expect(stats.scoreRisqueMoyen).toBeNull();
    expect(stats.tauxConversion).toBeNull();
    expect(overview.kpis.ark.avgScore).toBeNull();
    expect(overview.kpis.devis.conversionRate).toBeNull();
    expect(overview.kpis.signatures.rate).toBeNull();
    expect(executive.data.growth_rate_30d).toBeNull();
    expect(executive.data.portfolio_health_score).toBeNull();

    // Sommes et comptages : 0 est ici une VALEUR exacte (il n'y a aucune ligne).
    expect(executive.data.contracts_count).toBe(0);
    expect(executive.data.ca_estimated).toBe(0);
    expect(stats.devisTotal).toBe(0);
    expect(overview.kpis.taches.enRetard).toBe(0);
  });

  test('portée : les trois écrans comptent le cabinet, pas le seul utilisateur connecté', async () => {
    await lire('/api/dashboard/stats');
    await lire('/api/reporting/overview');
    await lire('/api/analytics/executive');
    await lire('/api/clients');

    const requetesCabinet = emis.filter((e) => /FROM clients/.test(e.sql));
    expect(requetesCabinet.length).toBeGreaterThan(0);
    // Message d'échec utile : on liste les requêtes SANS la clause de portée de
    // lib/porteeCabinet.js (un test qui dit seulement « false » ne diagnostique rien).
    const sansPortee = requetesCabinet.filter(({ sql, params }) => {
      const aClauseCabinet = /\w+\.cabinet_id = ANY\(\$\d+::uuid\[\]\) OR \w+\.courtier_id = \$\d+/.test(sql);
      const aClauseMono = /\w+\.courtier_id = \$\d+/.test(sql);
      const aLeCabinet = params.some((p) => Array.isArray(p) && p[0] === CAB_A);
      return !(aClauseCabinet || aClauseMono) || !(aLeCabinet || params.includes(7));
    }).map((e) => `${e.sql.replace(/\s+/g, ' ').slice(0, 140)} | params=${JSON.stringify(e.params)}`);
    expect(sansPortee).toEqual([]);

    // Sans cabinet (compte mono-utilisateur), la clause historique est conservée
    // — même comportement que /api/clients, aucune régression pour les pilotes.
    simulerAppartenances([]);
    emis.length = 0;
    await lire('/api/dashboard/stats');
    const requetesMono = emis.filter((e) => /FROM clients/.test(e.sql) && /AS nouveaux/.test(e.sql));
    expect(requetesMono.length).toBeGreaterThan(0);
    for (const { sql, params } of requetesMono) {
      expect(sql).toContain('c.courtier_id = $1');
      expect(params[0]).toBe(7);
    }
  });
});
