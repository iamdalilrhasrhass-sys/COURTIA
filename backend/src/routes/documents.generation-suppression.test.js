/**
 * documents.generation-suppression.test.js — la chaîne « document client »
 * reste utilisable : génération puis suppression RÉELLE.
 *
 * POURQUOI CES TESTS (défauts reproduits en production le 20/09/2026) :
 *   1. POST /api/documents/generate → 500
 *      « column "orias_number" does not exist » pour attestation_assurance,
 *      proposition_commerciale et courrier_resiliation, alors qu'un client
 *      inexistant répondait bien 404 : le SELECT lisait une colonne imaginaire
 *      de `users` (le schéma ne porte que `iobsp_orias_number`, et le numéro du
 *      praticien est dans `broker_profiles.orias`).
 *   2. DELETE /api/documents/:id → 404 « Document introuvable » alors que le
 *      document généré existait : la route tombait sur celle de
 *      routes/clientDocuments.js (table `client_documents`) et aucune route ne
 *      supprimait les documents de `documents` / `generated_documents`.
 */
jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 11, userId: 11 }; next(); },
}));
jest.mock('../middleware/planGuard', () => ({
  requireUnderLimit: () => (_req, _res, next) => next(),
  requireFeature: () => (_req, _res, next) => next(),
}));

const express = require('express');
const fs = require('fs');
const pool = require('../db');
const router = require('./documents');

describe('chaîne document client (génération → téléchargement → suppression)', () => {
  let server;
  let origin;

  /** Mock SQL piloté par le CONTENU de la requête (l'ordre dépend de la portée). */
  function mockSql(demandes = {}) {
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql);
      for (const [motif, reponse] of Object.entries(demandes)) {
        if (texte.includes(motif)) return typeof reponse === 'function' ? reponse(texte) : reponse;
      }
      return { rows: [], rowCount: 0 };
    });
  }

  const appelSql = (motif) => pool.query.mock.calls.find(([sql]) => String(sql).includes(motif));

  beforeAll(async () => {
    const app = express();
    app.locals.pool = pool;
    app.use(express.json());
    app.use('/api/documents', router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => { await new Promise((r) => server.close(r)); });
  beforeEach(() => pool.query.mockReset());

  describe('POST /api/documents/generate — plus de colonne imaginaire', () => {
    test('le courtier est lu dans broker_profiles (aucune colonne `users.orias_number`)', async () => {
      mockSql({
        cabinet_members: { rows: [] },                        // portée mono-utilisateur
        'FROM clients': { rows: [{ id: 20, first_name: 'Léa', last_name: 'Dupont', email: 'lea@exemple.invalid' }] },
        'FROM users': { rows: [{ first_name: 'Dalil', last_name: 'R', orias_number: '07000000' }] },
        'INSERT INTO generated_documents': { rows: [{ id: 7, template_id: 'doc_test_1', document_type: 'attestation_assurance', created_at: new Date().toISOString() }] },
      });

      const res = await fetch(`${origin}/api/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'attestation_assurance', client_id: 20 }),
      });
      const corps = await res.json();

      expect(res.status).toBe(201);
      expect(corps.success).toBe(true);
      expect(corps.data.db_id).toBe(7);
      expect(corps.data.download_url).toMatch(/^\/api\/documents\/doc_\d+_[a-z0-9]+\/download$/);
      // Le `template_id` réellement enregistré est celui du lien de téléchargement
      // (sinon le téléchargement pointerait sur un document inexistant).
      const insert = appelSql('INSERT INTO generated_documents');
      const idEnregistre = String(corps.data.download_url).split('/')[3];
      expect(insert[1][3]).toBe(idEnregistre);

      // La requête courtier interroge des colonnes RÉELLES.
      const requeteCourtier = appelSql('broker_profiles');
      expect(requeteCourtier).toBeTruthy();
      expect(requeteCourtier[0]).toContain('iobsp_orias_number');
      expect(requeteCourtier[0]).toContain('bp.orias');
      // L'ancienne requête fautive (colonne inexistante de `users`) ne doit plus
      // pouvoir revenir : `orias_number` n'est jamais lu « FROM users ».
      expect(requeteCourtier[0]).not.toMatch(/orias_number[^;]*FROM\s+users\s+WHERE/i);
    });

    test('un client hors portée répond 404 (jamais un 500)', async () => {
      mockSql({
        cabinet_members: { rows: [] },
        'FROM clients': { rows: [] },
      });
      const res = await fetch(`${origin}/api/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: 'attestation_assurance', client_id: 999999 }),
      });
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe('not_found');
    });
  });

  describe('DELETE /api/documents/:id — suppression réelle', () => {
    test('supprime le document généré (generated_documents) et le confirme', async () => {
      mockSql({
        cabinet_members: { rows: [] },
        'FROM documents d': { rows: [] },                       // absent de la table v1
        'FROM generated_documents g': { rows: [{ id: 7, template_id: 'doc_test_1', document_type: 'attestation_assurance' }] },
        'DELETE FROM generated_documents': { rows: [{ id: 7, template_id: 'doc_test_1', document_type: 'attestation_assurance' }], rowCount: 1 },
      });

      const res = await fetch(`${origin}/api/documents/7`, { method: 'DELETE' });
      const corps = await res.json();

      expect(res.status).toBe(200);
      expect(corps).toMatchObject({ success: true, deleted_id: 7, source: 'generated_documents' });
      expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM generated_documents'))).toBe(true);
    });

    test('supprime aussi un document client de la table `documents` (v1)', async () => {
      mockSql({
        cabinet_members: { rows: [] },
        'FROM documents d': { rows: [{ id: 3, filename: 'courtia_fic_3.pdf', type: 'fic' }] },
        'FROM generated_documents g': { rows: [] },
        'DELETE FROM documents': { rows: [{ id: 3, filename: 'courtia_fic_3.pdf' }], rowCount: 1 },
      });

      const res = await fetch(`${origin}/api/documents/3`, { method: 'DELETE' });
      const corps = await res.json();

      expect(res.status).toBe(200);
      expect(corps).toMatchObject({ success: true, deleted_id: 3, source: 'documents' });
    });

    test('un identifiant inconnu répond 404, sans aucun succès', async () => {
      mockSql({ cabinet_members: { rows: [] } });
      const res = await fetch(`${origin}/api/documents/424242`, { method: 'DELETE' });
      expect(res.status).toBe(404);
      expect((await res.json()).error).toBe('not_found');
      expect(pool.query.mock.calls.some(([sql]) => /^DELETE/i.test(String(sql)))).toBe(false);
    });

    test('un identifiant présent dans les DEUX tables est refusé en 409', async () => {
      mockSql({
        cabinet_members: { rows: [] },
        'FROM documents d': { rows: [{ id: 7, filename: 'a.pdf', type: 'fic' }] },
        'FROM generated_documents g': { rows: [{ id: 7, template_id: 'doc_x', document_type: 'attestation_assurance' }] },
      });
      const res = await fetch(`${origin}/api/documents/7`, { method: 'DELETE' });
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe('ambiguous_document_id');
    });
  });

  test('le module de génération expose toujours ses fichiers PDF sur disque', () => {
    // Garde-fou : la suppression best-effort du PDF temporaire ne doit pas
    // empêcher l'écriture du fichier à la génération (dossier réel /tmp/documents).
    expect(fs.existsSync('/tmp/documents')).toBe(true);
  });
});
