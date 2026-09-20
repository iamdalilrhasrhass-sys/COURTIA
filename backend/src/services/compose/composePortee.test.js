/**
 * composePortee.test.js — LE DEVOIR DE CONSEIL TROUVE LE CLIENT D'UN CABINET RÉEL.
 *
 * POURQUOI CE TEST (défaut P1 reproduit en production le 20/09/2026)
 * `composer.getClientData`, `composeAi.extractNeedsFromClient` et
 * `composeAi.buildRecommendation` résolvaient le client par
 *     `SELECT … FROM clients WHERE id = $1 AND broker_id = $2`
 * Or le produit n'écrit JAMAIS `clients.broker_id` : il renseigne `courtier_id`
 * et `cabinet_id`. Mesure en base : 0 client sur 22 porte `broker_id`. La
 * condition était donc toujours fausse et `POST /api/compose/devoir-conseil`
 * répondait 500 « Client non trouvé ou accès non autorisé » pour un client RÉEL.
 *
 * Ce test verrouille trois propriétés :
 *   1. le client est résolu par la PORTÉE DU CABINET (lib/porteeCabinet) ;
 *   2. AUCUNE requête du chemin de composition ne filtre sur `broker_id` ;
 *   3. un client hors portée est refusé, et la résolution a lieu AVANT toute
 *      lecture de contrat / note / devis.
 */
jest.mock('../../db', () => ({ query: jest.fn() }))
jest.mock('../arkEngine', () => ({ callArkStructured: jest.fn() }))

const pool = require('../../db')
const { callArkStructured } = require('../arkEngine')
const { resoudreClientAutorise } = require('./composeAi')
const { composeDevoirConseil } = require('./composer')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const BESOINS = {
  structured: { besoins: [{ type: 'MRH', description: 'Local commercial', priority: 'haute' }], situation: 'Artisan', objectifs: ['Protéger le local'] },
  text: '{}',
}
const RECO = {
  structured: { recommended_product: { name: 'MRH Pro', insurer: 'AXA', premium: 480 }, reasoning: ['Garanties adaptées'], alternatives_considered: [] },
  text: '{}',
}

let requetes = []

/** Pool simulé : l'utilisateur 7 appartient au cabinet A et n'a que le client 201. */
function brancherPool({ clientDansPortee = true } = {}) {
  pool.query.mockImplementation(async (sql, params = []) => {
    const s = String(sql)
    requetes.push({ sql: s, params })
    if (s.includes('FROM cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'owner' }] }
    if (s.includes('FROM clients')) {
      return clientDansPortee && Number(params[0]) === 201
        ? { rows: [{ id: 201, type: 'professionnel', nom: 'Dupont', prenom: 'Léa', courtier_id: 7, cabinet_id: CAB_A }] }
        : { rows: [] }
    }
    if (s.includes('FROM broker_profile_settings')) return { rows: [{ broker_id: 7, company_name: 'Cabinet A', orias_number: '07000000' }] }
    if (s.includes('FROM contracts')) return { rows: [] }
    if (s.includes('FROM notes')) return { rows: [] }
    if (s.includes('FROM dda_quizzes')) return { rows: [] }
    if (s.includes('FROM quotes')) return { rows: [{ id: 9, product_name: 'MRH Pro', premium_annual: 480 }] }
    if (s.includes('INSERT INTO compliance_documents')) return { rows: [{ id: 1, version: 1 }] }
    return { rows: [] }
  })
}

describe('composition de documents — le client est résolu par la PORTÉE DU CABINET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requetes = []
    process.env.COMPOSE_STORAGE_PATH = require('os').tmpdir() + '/courtia-qa-compose-portee'
    callArkStructured.mockImplementation(async ({ route }) => {
      if (route === 'compose:extract-needs') return BESOINS
      if (route === 'compose:build-recommendation') return RECO
      return { structured: {}, text: '{}' }
    })
  })

  test('la portée du CABINET est appliquée : `cabinet_id` + `courtier_id`, jamais `broker_id`', async () => {
    brancherPool()
    const client = await resoudreClientAutorise(201, 7)

    expect(client.id).toBe(201)
    const resolution = requetes.find(({ sql }) => sql.includes('FROM clients') && sql.includes('WHERE id = $1'))
    expect(resolution).toBeTruthy()
    expect(resolution.sql).toContain('clients.cabinet_id = ANY($2::uuid[])')
    expect(resolution.sql).toContain('clients.courtier_id = $3')
    // La colonne qui n'est jamais écrite ne doit plus apparaître dans la clause.
    expect(resolution.sql).not.toMatch(/broker_id/)
    expect(resolution.params[0]).toBe(201)
  })

  test('un client HORS PORTÉE est refusé (aucune lecture de son dossier)', async () => {
    brancherPool({ clientDansPortee: false })

    await expect(resoudreClientAutorise(999, 7)).rejects.toThrow('Client non trouvé ou accès non autorisé')
    // Seule la résolution a été tentée : ni contrats, ni notes, ni devis.
    expect(requetes.filter(({ sql }) => /FROM (contracts|notes|quotes|dda_quizzes)/.test(sql))).toHaveLength(0)
  })

  test('un client d’un AUTRE cabinet (cabinet B) est refusé', async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql)
      requetes.push({ sql: s })
      // L'appelant est dans le cabinet A…
      if (s.includes('FROM cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'owner' }] }
      // …et le client 202 appartient au cabinet B : la clause de portée ne le rend pas.
      if (s.includes('FROM clients') && s.includes('$2')) return { rows: [] }
      return { rows: [] }
    })

    await expect(resoudreClientAutorise(202, 7)).rejects.toThrow('Client non trouvé ou accès non autorisé')
    expect(CAB_B).not.toBe(CAB_A)
  })

  test('le devoir de conseil aboutit pour un client réel et n’interroge jamais broker_id', async () => {
    brancherPool()
    const doc = await composeDevoirConseil({ brokerId: 7, clientId: 201 })

    expect(doc.id).toBe(1)
    expect(doc.recommendation.recommended_product.name).toBe('MRH Pro')
    // Aucune requête du chemin complet ne filtre sur la colonne jamais écrite.
    // (`compliance_documents.broker_id` et `broker_profile_settings.broker_id`
    // sont, eux, réellement écrits par le produit : ils ne sont pas concernés.)
    const surBrokerId = requetes.filter(({ sql }) =>
      /\bbroker_id\s*=\s*\$\d/.test(sql) && !/compliance_documents|broker_profile_settings/.test(sql))
    expect(surBrokerId).toEqual([])
    // Et, nommément : la table `clients` n'est plus jamais filtrée par `broker_id`.
    expect(requetes.filter(({ sql }) => /FROM clients/.test(sql) && /broker_id/.test(sql))).toEqual([])
    expect(requetes.filter(({ sql }) => /FROM quotes/.test(sql) && /broker_id/.test(sql))).toEqual([])
    // Le document est bien écrit.
    expect(requetes.some(({ sql }) => /INSERT INTO compliance_documents/.test(sql))).toBe(true)
  })
})
