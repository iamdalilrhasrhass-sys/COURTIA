/**
 * devis.ia.test.js — LES TROIS ROUTES IA DU DEVIS NE MENTENT PLUS.
 *
 * POURQUOI CE TEST (défauts mesurés en production le 20/09/2026)
 *   • `POST /api/devis/19/ai-prepare` répondait 500 en portant l'erreur brute
 *     du fournisseur, alors que le contrat des routes ARK est un 503 lisible.
 *   • Quand le moteur IA ne renvoyait aucun JSON exploitable, les trois routes
 *     répondaient 200 `{success: true, preparation: null}` (idem
 *     `recommendation: null`, `proposal: null`) ET écrivaient ce `null` dans
 *     `quote_requests.metadata` avec `ai_prepared_at: <date>` : le dossier était
 *     marqué « préparé par ARK » alors que rien n'avait été préparé.
 *
 * Contrat testé : 503 (ia_indisponible ou configuration_required) et AUCUNE
 * écriture en base sans contenu réel ; 200 `success:true` uniquement avec du
 * contenu.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/arkEngine', () => ({
  callArkStructured: jest.fn(),
  callArk: jest.fn(),
  callArkLight: jest.fn(),
}))
jest.mock('../services/emailService', () => ({
  sendCommercialEmail: jest.fn(async () => ({ success: false, skipped: true })),
  sendEmail: jest.fn(async () => ({ success: false, skipped: true })),
}))
jest.mock('../services/devisRelanceService', () => ({
  scheduleRelancesForDevis: jest.fn(async () => {}),
  cancelPendingRelancesForDevis: jest.fn(async () => {}),
}))

const express = require('express')
const pool = require('../db')
const arkEngine = require('../services/arkEngine')
const router = require('./devis')

const DEVIS = {
  id: 19,
  client_id: 201,
  broker_id: 11,
  cabinet_id: null,
  product_type: 'auto',
  normalized_data: { vehicule: 'Peugeot 208' },
  first_name: 'Élise',
  last_name: 'Martin',
  company_name: null,
  client_type: 'particulier',
  siret: null,
  city: 'Genève',
  email: 'elise@example.test',
}

const OFFRE = {
  id: 1,
  provider_id: 2,
  provider_code: 'AXA',
  provider_name: 'AXA',
  premium_annual: 812.5,
  coverage_summary: { franchise: 300 },
  status: 'received',
}

function brancherPool() {
  pool.query.mockImplementation(async (sql) => {
    const s = String(sql)
    if (s.includes('FROM cabinet_members')) return { rows: [] } // portée mono-utilisateur
    if (s.includes('FROM quote_results')) return { rows: [OFFRE] }
    if (s.includes('FROM quote_requests')) return { rows: [DEVIS] }
    return { rows: [] }
  })
}

const ROUTES = [
  ['POST', '/api/devis/19/ai-prepare', {}, 'preparation'],
  ['POST', '/api/devis/19/ai-recommendation', {}, 'recommendation'],
  ['POST', '/api/devis/19/generate-proposal', {}, 'proposal'],
]

describe('routes IA du devis — 503, jamais 200 {success:true} sans contenu', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 11, userId: 11 }; next() })
    app.use('/api/devis', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    jest.clearAllMocks()
    brancherPool()
  })

  const appeler = ([methode, chemin, corps]) => fetch(origin + chemin, {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  })

  /** Un succès ne doit JAMAIS s'accompagner d'une écriture `ai_*` fabriquée. */
  const ecrituresIa = () => pool.query.mock.calls.filter(([sql, params]) =>
    /UPDATE quote_requests/.test(String(sql))
    && /ai_preparation|ai_recommendation|ai_proposal/.test(JSON.stringify(params || [])))

  test('moteur IA non configuré : 503 configuration_required, aucune écriture en base', async () => {
    arkEngine.callArkStructured.mockResolvedValue({
      text: null,
      error: 'configuration_required',
      message: 'Clé API Anthropic non configurée.',
      usage: { inputTokens: 0, outputTokens: 0 },
      model: null,
    })

    for (const route of ROUTES) {
      const res = await appeler(route)
      const corps = await res.json()
      expect({ chemin: route[1], statut: res.status }).toEqual({ chemin: route[1], statut: 503 })
      expect({ chemin: route[1], erreur: corps.error }).toEqual({ chemin: route[1], erreur: 'configuration_required' })
      expect(corps.success).toBeUndefined()
      expect(JSON.stringify(corps)).not.toMatch(/ANTHROPIC|api[-_ ]?key/i)
    }
    expect(ecrituresIa()).toHaveLength(0)
  })

  test('réponse IA sans JSON exploitable : 503 ia_indisponible, jamais {…: null}', async () => {
    arkEngine.callArkStructured.mockResolvedValue({
      text: 'Je préfère répondre en prose plutôt qu’en JSON.',
      structured: null,
      usage: { inputTokens: 40, outputTokens: 30 },
      model: 'claude-sonnet-4-5',
      latencyMs: 800,
    })

    for (const route of ROUTES) {
      const res = await appeler(route)
      const corps = await res.json()
      expect({ chemin: route[1], statut: res.status }).toEqual({ chemin: route[1], statut: 503 })
      expect({ chemin: route[1], erreur: corps.error }).toEqual({ chemin: route[1], erreur: 'ia_indisponible' })
      expect(corps.success).toBeUndefined()
      expect(corps[route[3]]).toBeUndefined()
      expect(String(corps.message || '')).toMatch(/exploitable|indisponible/i)
    }
    // Aucun `ai_prepared_at` / `ai_recommended_at` / `ai_proposal_at` écrit.
    expect(ecrituresIa()).toHaveLength(0)
  })

  test('erreur inattendue du moteur : 503/500 produit, jamais l’erreur du fournisseur', async () => {
    arkEngine.callArkStructured.mockRejectedValue(new Error('invalid x-api-key for account sk-ant-…'))

    for (const route of ROUTES) {
      const res = await appeler(route)
      const corps = await res.json()
      expect({ chemin: route[1], statut: res.status }).toEqual({ chemin: route[1], statut: 500 })
      expect(corps.error).toBe('ark_devis_indisponible')
      expect(corps.success).toBeUndefined()
      expect(JSON.stringify(corps)).not.toMatch(/x-api-key|sk-ant/)
      expect(corps.details).toBeUndefined()
    }
  })

  test('contenu réel : 200 success:true et écriture en base légitime', async () => {
    arkEngine.callArkStructured.mockResolvedValue({
      text: '{"ok":true}',
      structured: { checklist: ['permis de conduire'], questions: ['usage du véhicule'] },
      usage: { inputTokens: 100, outputTokens: 80 },
      model: 'claude-sonnet-4-5',
      latencyMs: 900,
    })

    for (const route of ROUTES) {
      const res = await appeler(route)
      const corps = await res.json()
      expect({ chemin: route[1], statut: res.status }).toEqual({ chemin: route[1], statut: 200 })
      expect(corps.success).toBe(true)
      expect(corps[route[3]]).toEqual({ checklist: ['permis de conduire'], questions: ['usage du véhicule'] })
    }
    expect(ecrituresIa().length).toBe(ROUTES.length)
  })
})
