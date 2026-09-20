/**
 * devis.v1.test.js — création d'un devis v1 et relance forcée.
 *
 * POURQUOI CE TEST : deux erreurs serveur reproduites en production.
 *   1. `POST /api/devis` passait `criteria` / `target_providers` tels quels à
 *      des colonnes jsonb : une valeur texte (« Paris ») faisait échouer
 *      l'insertion (500 « invalid input syntax for type json »).
 *   2. `POST /api/devis/:id/relance` écrivait l'identifiant d'un devis v1
 *      (`quote_requests`, celui que liste l'application) dans `devis_relances`,
 *      dont la clé étrangère pointe `devis_wizard` : 500 `relance_failed` à
 *      chaque clic. Les deux familles de devis sont désormais routées vers
 *      leur table, et un identifiant inconnu répond 404.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../services/emailService', () => ({
  sendCommercialEmail: jest.fn(async () => ({ success: false, skipped: true, error: 'email_non_configure' })),
  sendEmail: jest.fn(async () => ({ success: false, skipped: true })),
}));
jest.mock('../services/devisRelanceService', () => ({
  scheduleRelancesForDevis: jest.fn(async () => {}),
  cancelPendingRelancesForDevis: jest.fn(async () => {}),
  processDueRelances: jest.fn(async () => ({ sent: 0, not_sent: 1, scanned: 1 })),
}));

const express = require('express');
const pool = require('../db');
const router = require('./devis');

describe('devis v1 (quote_requests)', () => {
  let server;
  let origin;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { id: 11, userId: 11 }; next(); });
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => { await new Promise((r) => server.close(r)); });
  beforeEach(() => pool.query.mockReset());

  const appeler = (chemin, corps) => fetch(`${origin}${chemin}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps || {}),
  });

  describe('POST /api/devis — création', () => {
    beforeEach(() => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 501, client_id: 201, product_type: 'auto', status: 'draft' }] });
    });

    test('un `criteria` en texte libre n’est plus une erreur SQL', async () => {
      const res = await appeler('/', { client_id: 201, product_type: 'auto', criteria: 'Paris (texte libre)' });
      expect(res.status).toBe(201);
      const [sql, valeurs] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO quote_requests');
      // La valeur transmise est du JSON VALIDE (jsonb) et non modifiée sur le fond.
      expect(() => JSON.parse(valeurs[3])).not.toThrow();
      expect(JSON.parse(valeurs[3])).toBe('Paris (texte libre)');
    });

    test('un objet est sérialisé et `target_providers` accepte aussi une chaîne', async () => {
      const res = await appeler('/', {
        client_id: 201, product_type: 'auto', criteria: { type: 'auto' }, target_providers: 'AXA,Allianz',
      });
      expect(res.status).toBe(201);
      const valeurs = pool.query.mock.calls[0][1];
      expect(JSON.parse(valeurs[3])).toEqual({ type: 'auto' });
      expect(JSON.parse(valeurs[4])).toBe('AXA,Allianz');
    });

    test('sans `criteria`, l’objet par défaut reste un objet JSON valide', async () => {
      await appeler('/', { client_id: 201, product_type: 'auto' });
      const valeurs = pool.query.mock.calls[0][1];
      expect(JSON.parse(valeurs[3])).toEqual({});
      expect(valeurs[4]).toBe('null');
    });

    test('`product_type` reste obligatoire (400, pas 500)', async () => {
      const res = await appeler('/', { client_id: 201 });
      expect(res.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/devis/:id/relance — relance forcée', () => {
    test('un devis v1 est routé vers `relances` (jamais vers devis_relances)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // aucun devis guidé avec cet id
        .mockResolvedValueOnce({ rows: [{ id: 501, client_id: 201, product_type: 'auto', client_email: 'client@exemple.invalid', client_name: 'Léa Dupont' }] })
        .mockResolvedValueOnce({ rows: [{ id: 9, client_id: 201, quote_request_id: 501, type: 'devis_relance', channel: 'email', status: 'pending', scheduled_at: new Date().toISOString() }] });

      const res = await appeler('/501/relance', { template: 'J7' });
      expect(res.status).toBe(200);
      const corps = await res.json();
      expect(corps.devis_type).toBe('v1');
      expect(corps.ok).toBe(true);
      // Rien n'est annoncé comme envoyé quand l'e-mail n'est pas parti.
      expect(corps.envoye).toBe(false);
      expect(corps.raison).toBe('email_non_configure');

      const sqls = pool.query.mock.calls.map((c) => c[0]);
      expect(sqls.some((s) => s.includes('INSERT INTO relances'))).toBe(true);
      expect(sqls.some((s) => s.includes('INSERT INTO devis_relances'))).toBe(false);
    });

    test('un devis guidé reste écrit dans devis_relances', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 601, status: 'sent', client_id: 201 }] }) // devis_wizard trouvé
        .mockResolvedValueOnce({ rows: [] }); // INSERT devis_relances

      const res = await appeler('/601/relance', { template: 'J3' });
      expect(res.status).toBe(200);
      expect((await res.json()).devis_type).toBe('wizard');
      const insert = pool.query.mock.calls.find((c) => c[0].includes('INSERT INTO devis_relances'));
      expect(insert).toBeTruthy();
      expect(insert[1]).toEqual([601, 'J3']);
    });

    test('un identifiant inconnu répond 404, pas 500', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const res = await appeler('/999999/relance', {});
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe('devis_not_found');
    });

    test('un identifiant non numérique est refusé en 400', async () => {
      const res = await appeler('/abc/relance', {});
      expect(res.status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    });
  });
});
