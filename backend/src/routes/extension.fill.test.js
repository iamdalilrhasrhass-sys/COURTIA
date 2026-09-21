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
    // Le pool sert AUSSI à résoudre la PORTÉE (`cabinet_members`) : ici le compte
    // n'a aucune appartenance, donc la portée reste « mono-utilisateur » et la
    // clause de lecture est l'historique `courtier_id = $n`.
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: [] };
      return { rows: [] };
    });
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
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) return { rows: [] };
      return {
        rows: [{
          last_name: 'Durand',
          first_name: 'Camille',
          email: 'camille.durand@example.invalid',
          telephone: '0555000000',
          code_postal: '33000',
          ville: 'Bordeaux'
        }]
      };
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

    // Portée mono-utilisateur (ce compte n'a pas de cabinet) : la clause de
    // lecture reste EXACTEMENT l'historique `courtier_id = $n`. La décision de
    // portée vient de `lib/porteeCabinet`, pas de la route.
    const [sql, params] = pool.query.mock.calls.find(([s]) => String(s).includes('FROM clients c'));
    expect(sql).toMatch(/FROM clients c WHERE c\.id = \$2 AND c\.courtier_id = \$1/);
    expect(params).toEqual([42, 7]);
  });

  it('un collaborateur lit le client de son CABINET (clause cabinet, pas courtier_id)', async () => {
    const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('cabinet_members')) {
        return { rows: [{ cabinet_id: CAB_A, role: 'broker', retire: false }] };
      }
      return { rows: [{ last_name: 'Durand', first_name: 'Camille' }] };
    });

    const { body } = await remplir({ clientId: 7, fields: champs });

    expect(body.data.filled).toBeGreaterThan(0);
    const [sql, params] = pool.query.mock.calls.find(([s]) => String(s).includes('FROM clients c'));
    expect(sql).toMatch(/\(c\.cabinet_id = ANY\(\$1::uuid\[\]\) OR c\.courtier_id = \$2\)/);
    expect(params).toEqual([[CAB_A], 42, 7]);
  });

  it('ne remplit rien si le client n\'appartient pas au cabinet (et le signale)', async () => {
    pool.query.mockImplementation(async () => ({ rows: [] })); // aucune ligne accessible

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
