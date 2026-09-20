/**
 * devis.liste-cancel.test.js — la chaîne « devis » reste cohérente.
 *
 * POURQUOI CES TESTS (défauts reproduits en production le 20/09/2026) :
 *   1. Un devis créé par l'assistant (table `devis_wizard`, réf. DV-P92F76)
 *      n'apparaissait JAMAIS dans GET /api/devis (qui ne lisait que
 *      `quote_requests`) : la liste répondait {"devis":[],"stats":{"total":"0"}}
 *      alors que le devis existait.
 *   2. DELETE /api/devis/16 → 404 « Devis non trouvé » alors que la ligne
 *      `devis_wizard` existait toujours.
 *   3. POST /api/devis/:id/cancel renvoyait {ok:true} depuis un AUTRE cabinet,
 *      sans avoir modifié la moindre ligne (faux succès).
 *   4. L'e-mail de devis se terminait par « Validité 30 jours · ORIAS 12345678 »
 *      — un numéro de registre INVENTÉ dans un message destiné au client.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../services/emailService', () => ({
  sendCommercialEmail: jest.fn(async () => ({ success: false, skipped: true, error: 'email_non_configure' })),
  sendEmail: jest.fn(async () => ({ success: false, skipped: true })),
}));
jest.mock('../services/devisRelanceService', () => ({
  scheduleRelancesForDevis: jest.fn(async () => {}),
  cancelPendingRelancesForDevis: jest.fn(async () => {}),
  processDueRelances: jest.fn(async () => ({ sent: 0, not_sent: 0, scanned: 0 })),
}));

const express = require('express');
const pool = require('../db');
const router = require('./devis');

const AUCUNE_APPARTENANCE = { rows: [] };

describe('chaîne devis (assistant → liste → suppression → annulation → e-mail)', () => {
  let server;
  let origin;

  function mockSql(demandes = []) {
    // Liste ordonnée de [motif SQL, réponse] : premier motif présent gagne.
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql);
      for (const [motif, reponse] of demandes) {
        if (texte.includes(motif)) return typeof reponse === 'function' ? reponse(texte) : reponse;
      }
      return { rows: [], rowCount: 0 };
    });
  }

  beforeAll(async () => {
    const app = express();
    app.locals.pool = pool;
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { id: 11, userId: 11, role: 'broker' }; next(); });
    app.use('/api/devis', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });
  beforeEach(() => pool.query.mockReset());

  test('GET /api/devis expose aussi les devis de l’assistant (devis_wizard)', async () => {
    mockSql([
      ['cabinet_members', AUCUNE_APPARTENANCE],
      ['FROM quote_requests', { rows: [] }],                                  // aucun devis v1
      ['FROM devis_wizard d', {
        rows: [{
          id: 6, client_id: 20, product: 'auto', status: 'draft', garanties: { formule: 'confort' },
          reference: 'DV-P92F76', total_premium_cents: 48000, client_name_cache: 'Léa Dupont',
          client_email_cache: 'lea@exemple.invalid', created_at: new Date().toISOString(),
          sent_at: null, expires_at: null, first_name: 'Léa', last_name: 'Dupont', company_name: null,
        }],
      }],
      ['COUNT(*) AS total', { rows: [{ total: '0', drafts: '0', submitted: '0', completed: '0', accepted: '0' }] }],
    ]);

    const res = await fetch(`${origin}/api/devis`);
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.devis).toHaveLength(1);
    expect(corps.devis[0]).toMatchObject({ id: 6, source: 'wizard', reference: 'DV-P92F76', product_type: 'auto' });
    // Un total à 0 devant une liste non vide serait un mensonge.
    expect(corps.stats.total).toBe(1);
    expect(corps.stats.total_wizard).toBe(1);
    expect(JSON.parse(corps.stats.total_v1)).toBe(0);
  });

  test('DELETE /api/devis/:id supprime réellement le devis guidé', async () => {
    mockSql([
      ['cabinet_members', AUCUNE_APPARTENANCE],
      ['DELETE FROM devis_wizard', { rows: [{ id: 16, reference: 'DV-P92F76' }], rowCount: 1 }],
    ]);

    const res = await fetch(`${origin}/api/devis/16`, { method: 'DELETE' });
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps).toMatchObject({ success: true, deleted_id: 16, source: 'wizard', reference: 'DV-P92F76' });
  });

  test('DELETE /api/devis/:id sans ligne supprimée répond 404 (aucun faux succès)', async () => {
    mockSql([['cabinet_members', AUCUNE_APPARTENANCE]]);

    const res = await fetch(`${origin}/api/devis/16`, { method: 'DELETE' });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Devis non trouvé');
  });

  test('aucune requête n’interpole une portée `d.`/`qr.` dans une table sans alias', () => {
    // GARDE-FOU STATIQUE : la portée cabinet s'écrit `d.cabinet_id` /
    // `d.user_id` (devis_wizard) et `qr.cabinet_id` / `qr.broker_id`
    // (quote_requests). Un `FROM devis_wizard` sans alias faisait répondre 500
    // « missing FROM-clause entry for table "d" » — finalize, send, pdf, relance
    // et duplicate étaient inutilisables. Ce contrôle empêche le retour du défaut.
    const source = require('fs').readFileSync(require('path').join(__dirname, 'devis.js'), 'utf8');
    expect(source).not.toMatch(/FROM devis_wizard\s+WHERE/i);
    expect(source).not.toMatch(/FROM quote_requests\s+WHERE\s+\$\{(?!fStats)/);
    // documents.js : `documents` est filtré via l'alias `d` (filtreDocuments).
    const sourceDocuments = require('fs').readFileSync(require('path').join(__dirname, 'documents.js'), 'utf8');
    expect(sourceDocuments).not.toMatch(/FROM documents\s+WHERE[^`]*\$\{[^}]*\.sql\}/);
  });

  test('POST /api/devis/:id/cancel hors cabinet répond 404, jamais {ok:true}', async () => {
    mockSql([
      ['cabinet_members', AUCUNE_APPARTENANCE],
      ['UPDATE devis_wizard', { rows: [], rowCount: 0 }],   // la portée ne voit aucune ligne
    ]);

    const res = await fetch(`${origin}/api/devis/15/cancel`, { method: 'POST' });
    const corps = await res.json();

    expect(res.status).toBe(404);
    expect(corps.ok).toBeUndefined();
    expect(corps.error).toBe('devis_not_found');
  });

  test('POST /api/devis/:id/cancel répond 200 quand la ligne a réellement changé', async () => {
    mockSql([
      ['cabinet_members', AUCUNE_APPARTENANCE],
      ['UPDATE devis_wizard', { rows: [{ id: 15, reference: 'DV-AAA111', status: 'refused' }], rowCount: 1 }],
    ]);

    const res = await fetch(`${origin}/api/devis/15/cancel`, { method: 'POST' });
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps).toMatchObject({ ok: true, cancelled_id: 15, status: 'refused' });
  });

  test('l’e-mail de devis n’imprime AUCUN ORIAS inventé', async () => {
    mockSql([
      ['cabinet_members', AUCUNE_APPARTENANCE],
      ['FROM devis_wizard', {
        rows: [{
          id: 6, user_id: 11, cabinet_id: null, product: 'auto', status: 'ready',
          reference: 'DV-P92F76', cabinet_name_cache: 'Cabinet QA', validity_days: 30,
          client_email_cache: 'lea@exemple.invalid',
        }],
      }],
      // Fondateur : aucun registre renseigné (ni cabinet, ni profil courtier).
      ['broker_profiles bp', { rows: [{ registre: null }] }],
    ]);

    const res = await fetch(`${origin}/api/devis/6/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: true }),
    });
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.dry_run).toBe(true);
    expect(corps.envoye).toBe(false);
    expect(corps.html).toContain('Validité 30 jours');
    expect(corps.html).not.toMatch(/12345678/);
    expect(corps.html).not.toMatch(/ORIAS/);
    expect(corps.registre_imprime).toBeNull();
    // Aucun envoi : le devis ne doit pas avoir changé d'état.
    expect(pool.query.mock.calls.some(([sql]) => /status = 'sent'/.test(String(sql)))).toBe(false);
  });

  test('quand le cabinet a un ORIAS réel, c’est CE numéro qui est imprimé', async () => {
    mockSql([
      ['cabinet_members', AUCUNE_APPARTENANCE],
      ['FROM devis_wizard', {
        rows: [{
          id: 6, user_id: 11, cabinet_id: '96000000-0000-4000-8000-000000000001', product: 'auto',
          status: 'ready', reference: 'DV-P92F76', cabinet_name_cache: 'Cabinet QA', validity_days: 30,
          client_email_cache: 'lea@exemple.invalid',
        }],
      }],
      ['broker_profiles bp', { rows: [{ registre: '07000000' }] }],
    ]);

    const res = await fetch(`${origin}/api/devis/6/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: true }),
    });
    const corps = await res.json();

    expect(res.status).toBe(200);
    expect(corps.html).toContain('ORIAS 07000000');
    expect(corps.registre_imprime).toBe('07000000');
  });
});
