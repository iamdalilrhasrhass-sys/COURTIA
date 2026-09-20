/**
 * commissions.import.test.js — L'IMPORT CSV DIT LA VÉRITÉ.
 *
 * POURQUOI CE TEST : mesuré en production le 20/09/2026 (Red Team P1 #2),
 * `POST /api/commissions/import` répondait 201
 * `{total:1, imported:0, errors:[{line:2, error:"could not determine data type
 * of parameter $1"}]}` : le courtier lisait un succès, sa base n'avait rien, et
 * le diagnostic était un message SQL interne.
 *
 * CAUSE RACINE FIGÉE ICI : la requête de recherche du contrat passait un
 * paramètre ($1 = identifiant utilisateur) que PLUS AUCUNE clause ne
 * référençait — PostgreSQL refuse alors la requête entière (« could not
 * determine data type of parameter $1 »). Le test vérifie donc, pour CHAQUE
 * requête émise, que tous les paramètres fournis sont utilisés par un marqueur
 * `$n` et qu'aucun marqueur ne dépasse le nombre de paramètres : c'est
 * exactement la propriété que PostgreSQL exige.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
// Le routeur monte `requireCabinetFeature('v1_commissions')` (drapeau de
// fonctionnalité) : neutralisé ici — ce test ne porte pas sur le gating.
jest.mock('../middleware/cabinetAccess', () => ({
  requireCabinetFeature: () => (_req, _res, next) => next(),
  attachCabinet: (_req, _res, next) => next(),
}))
// `commissionsAutoService` charge une dépendance non transformable par jest sans
// être nécessaire à l'import CSV : remplacé par des espions.
jest.mock('../services/commissionsAutoService', () => ({
  listRules: jest.fn(), upsertRule: jest.fn(), calculateCommission: jest.fn(),
  calculatePeriodCommissions: jest.fn(), reconcileMonth: jest.fn(),
  generateStatement: jest.fn(), detectVariance: jest.fn(),
}))

const express = require('express')
const pool = require('../db')
const { importCommissionsCsv } = require('../services/commissionService')

/**
 * Vérifie qu'une requête serait ACCEPTÉE par PostgreSQL du point de vue des
 * paramètres : tous les marqueurs $n existent, et tous les paramètres fournis
 * sont référencés (un paramètre non référencé est refusé par le moteur :
 * « could not determine data type of parameter $N »).
 */
function verifierParametres(sql, params) {
  const marqueurs = [...String(sql).matchAll(/\$(\d+)/g)].map((m) => Number(m[1]))
  const utilises = new Set(marqueurs)
  const maxMarqueur = marqueurs.length ? Math.max(...marqueurs) : 0
  const nonUtilises = (params || [])
    .map((_, index) => index + 1)
    .filter((index) => !utilises.has(index))
  return { maxMarqueur, fournis: (params || []).length, nonUtilises }
}

describe('importCommissionsCsv', () => {
  const utilisateur = { id: 7, userId: 7 }
  const CSV = ['contract_ref;insurer;period;expected_amount', 'POL-1;Helvetia;2026-09;181.31'].join('\n')

  beforeEach(() => { pool.query.mockReset() })

  /**
   * Pool simulé complet du chemin d'import : recherche du contrat par
   * référence, contrôle d'appartenance, puis écriture de la commission.
   */
  function poolImport(requetes = [], { contratTrouve = true } = {}) {
    return {
      async query(sql, params) {
        const texte = String(sql)
        requetes.push({ sql: texte, params })
        if (texte.includes('q.id::text')) {
          return { rows: contratTrouve ? [{ id: 42 }] : [] }
        }
        if (texte.includes('FROM quotes q') && texte.includes('q.id = $1')) {
          return { rows: [{ id: 42, client_id: 1, quote_data: {}, status: 'actif' }] }
        }
        if (texte.includes('INSERT INTO commissions')) {
          return { rows: [{ id: 99, contract_id: 42, expected_amount_cents: 18131, received_amount_cents: 0 }] }
        }
        return { rows: [] }
      },
    }
  }

  test('tous les paramètres de chaque requête sont utilisés (cause du $1 fantôme)', async () => {
    const requetes = []
    const rapport = await importCommissionsCsv(poolImport(requetes), utilisateur, CSV, null)

    expect(requetes.length).toBeGreaterThan(0)
    for (const { sql, params } of requetes) {
      const controle = verifierParametres(sql, params)
      expect({ sql: sql.slice(0, 60), controle }).toEqual({
        sql: sql.slice(0, 60),
        controle: { maxMarqueur: controle.fournis, fournis: controle.fournis, nonUtilises: [] },
      })
    }
    expect(rapport.imported).toBe(1)
    expect(rapport.ok).toBe(true)
  })

  test('une ligne importée : la référence de contrat est le paramètre $1', async () => {
    const requetes = []
    await importCommissionsCsv(poolImport(requetes), utilisateur, CSV, null)
    const recherche = requetes.find(({ sql }) => sql.includes('q.id::text'))
    expect(recherche).toBeDefined()
    expect(recherche.params[0]).toBe('POL-1')
  })

  test('aucun contrat trouvé : échec explicite, message lisible, aucun SQL', async () => {
    const rapport = await importCommissionsCsv(poolImport([], { contratTrouve: false }), utilisateur, CSV, null)
    expect(rapport.imported).toBe(0)
    expect(rapport.ok).toBe(false)
    expect(rapport.unmatched).toBe(1)
    const erreur = rapport.errors[0]
    expect(erreur.line).toBe(2)
    expect(erreur.code).toBe('contract_not_found')
    expect(erreur.error).toMatch(/POL-1/)
    expect(erreur.error).not.toMatch(/parameter|syntax|SQL|could not determine/i)
  })

  test('une erreur SQL de ligne n’est jamais recopiée à l’appelant', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('q.quote_data')) return { rows: [{ id: 42 }] }
      const erreur = new Error('invalid input syntax for type integer: "NaN"')
      erreur.code = '22P02'
      throw erreur
    })
    const rapport = await importCommissionsCsv(pool, utilisateur, CSV, null)
    expect(rapport.imported).toBe(0)
    expect(rapport.errors[0].error).not.toMatch(/NaN|invalid input syntax|integer/i)
    expect(rapport.errors[0].error.length).toBeGreaterThan(10)
  })

  test('en-tête sans contract_ref : la ligne est nommée et non importée', async () => {
    pool.query.mockImplementation(async () => ({ rows: [] }))
    const csv = ['insurer;period;expected_amount', 'Helvetia;2026-09;100'].join('\n')
    const rapport = await importCommissionsCsv(pool, utilisateur, csv, null)
    expect(rapport.imported).toBe(0)
    expect(rapport.errors[0].code).toBe('contract_ref_missing')
    expect(rapport.ok).toBe(false)
  })
})

describe('POST /api/commissions/import — code HTTP', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next() })
    // Le routeur s'exporte sous la forme `{ router }` (cf. server.js).
    const { router } = require('./commissions')
    app.use('/api/commissions', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    pool.query.mockReset()
    // Aucune appartenance cabinet : portée mono-utilisateur (l'appelant écrit).
    pool.query.mockImplementation(async () => ({ rows: [] }))
  })

  const importer = (csv) => fetch(`${origin}/api/commissions/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv }),
  })

  test('un import qui n’importe RIEN est un échec (422), pas un 201', async () => {
    const res = await importer(['contract_ref;insurer;period;expected_amount', 'INCONNU;X;2026-09;1'].join('\n'))
    const corps = await res.json()
    expect(res.status).toBe(422)
    expect(corps.error).toBe('import_aucune_ligne')
    expect(corps.imported).toBe(0)
    expect(corps.message).toMatch(/aucune commission n'a été importée/i)
    expect(JSON.stringify(corps)).not.toMatch(/could not determine|invalid input syntax|parameter \$/i)
  })

  test('un CSV vide d’en-têtes explique ce qui manque', async () => {
    const res = await importer('titre_seul')
    const corps = await res.json()
    expect(res.status).toBe(422)
    expect(corps.message).toMatch(/en-têtes/i)
  })
})
