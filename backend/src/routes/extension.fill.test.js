/**
 * IA-005 — POST /api/extension/fill ne doit JAMAIS renvoyer de valeur inventée
 * (identité, SIRET, IBAN factices). Seules les valeurs réellement fournies par
 * l'appelant ou lues en base pour le client du cabinet sont renvoyées ; les
 * autres champs reviennent vides et sont listés dans `missing`.
 */

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../lib/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const express = require('express');
const pool = require('../db');
const router = require('./extension');

const VALEURS_FACTICES = [
  'DUPONT', 'Jean', 'client@email.fr', '0612345678', '1 Rue de la Paix',
  'Paris', '75001', '01/01/1990', '12345678901234',
  'FR7612345678901234567890123', 'BNPAFRPPXXX', 'AB-123-CD'
];

describe('POST /api/extension/fill — aucune valeur inventée (IA-005)', () => {
  let server;
  let origin;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.user = { userId: 42, id: 42 }; next(); });
    app.use(router);
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
    origin = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
  });

  const remplir = async (body) => {
    const res = await fetch(`${origin}/fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { status: res.status, body: await res.json() };
  };

  const champs = [
    { name: 'nom', label: 'Nom' },
    { name: 'prenom', label: 'Prénom' },
    { name: 'email', label: 'Email' },
    { name: 'telephone', label: 'Téléphone' },
    { name: 'siret', label: 'SIRET' },
    { name: 'iban', label: 'IBAN' },
    { name: 'immatriculation', label: 'Immatriculation' },
  ];

  it('sans valeur fournie, ne renvoie AUCUNE donnée factice', async () => {
    const { status, body } = await remplir({ url: 'https://assureur.example.invalid/form', fields: champs });

    expect(status).toBe(200);
    expect(body.data.filled).toBe(0);
    expect(body.data.fields).toEqual([]);
    expect(body.data.missing.map((f) => f.name).sort()).toEqual(champs.map((f) => f.name).sort());

    const texte = JSON.stringify(body);
    for (const factice of VALEURS_FACTICES) {
      expect(texte).not.toContain(factice);
    }
  });

  it('reprend exactement les valeurs fournies par l\'appelant', async () => {
    const { body } = await remplir({
      fields: [{ name: 'nom', label: 'Nom' }, { name: 'email', label: 'Email' }],
      values: { nom: 'Martin', email: 'martin@cabinet.example.invalid' }
    });

    expect(body.data.filled).toBe(2);
    expect(body.data.fields).toEqual([
      { name: 'nom', selector: '[name="nom"]', value: 'Martin' },
      { name: 'email', selector: '[name="email"]', value: 'martin@cabinet.example.invalid' }
    ]);
    expect(body.data.missing).toEqual([]);
  });

  it('lit les valeurs réelles en base pour le client DU cabinet connecté', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        last_name: 'Durand',
        first_name: 'Camille',
        email: 'camille.durand@example.invalid',
        telephone: '0555000000',
        code_postal: '33000',
        ville: 'Bordeaux'
      }]
    });

    const { body } = await remplir({ clientId: 7, fields: champs });

    const parNom = Object.fromEntries(body.data.fields.map((f) => [f.name, f.value]));
    expect(parNom.nom).toBe('Durand');
    expect(parNom.prenom).toBe('Camille');
    expect(parNom.email).toBe('camille.durand@example.invalid');
    expect(parNom.telephone).toBe('0555000000');
    // Données absentes en base : champ vide + missing, jamais une valeur inventée.
    expect(parNom.siret).toBeUndefined();
    expect(parNom.iban).toBeUndefined();
    expect(parNom.immatriculation).toBeUndefined();
    expect(body.data.missing.map((f) => f.name).sort()).toEqual(['iban', 'immatriculation', 'siret']);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/FROM clients WHERE id = \$1 AND courtier_id = \$2/);
    expect(params).toEqual([7, 42]);
  });

  it('ne remplit rien si le client n\'appartient pas au cabinet (et le signale)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // aucune ligne pour courtier_id = 42

    const { body } = await remplir({ clientId: 9999, fields: champs });

    expect(body.data.filled).toBe(0);
    expect(body.data.fields).toEqual([]);
    expect(body.data.warnings.join(' ')).toMatch(/client_introuvable/);
  });

  it('ignore les valeurs non scalaires fournies par l\'appelant', async () => {
    const { body } = await remplir({
      fields: [{ name: 'nom', label: 'Nom' }],
      values: { nom: { fake: true }, autre: null }
    });

    expect(body.data.filled).toBe(0);
    expect(body.data.missing.map((f) => f.name)).toEqual(['nom']);
  });
});
