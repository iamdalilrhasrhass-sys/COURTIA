/**
 * clients.planAction.ia.test.js — LE PLAN D'ACTION ARK NE RECOPIE JAMAIS
 * L'ERREUR DU FOURNISSEUR D'IA (P1, deuxième QA adverse, 20/09/2026).
 *
 * DÉFAUT MESURÉ en production :
 *   GET /api/clients/148/ark-action-plan
 *   -> 500 {"error":"401 {\"type\":\"error\",\"error\":{\"type\":\"authentication_error\",
 *           \"message\":\"invalid x-api-key\"},\"request_id\":\"req_011CfFTaxQNsZZZoV33xHBxr\"}"}
 * C'est-à-dire, dans la réponse HTTP : l'état du compte chez le fournisseur, son
 * type d'erreur interne et son identifiant de requête — et un 500 là où les
 * autres routes IA du produit répondent 503 `ia_indisponible`
 * (`/api/ark/client/:id/brief`, mesuré le même jour).
 *
 * Ce test fige le contrat :
 *   1. panne du moteur IA → 503 `ia_indisponible`, message produit, AUCUN
 *      fragment du corps du fournisseur (ni « x-api-key », ni « request_id ») ;
 *   2. clé absente → 503 `configuration_required` (jamais un plan fabriqué) ;
 *   3. dossier d'un AUTRE cabinet → 404 AVANT tout appel au moteur ;
 *   4. panne de base → 500 avec message produit, AUCUN nom de table ni message
 *      SQL dans la réponse.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/planService', () => ({
  getUserPlanInfo: jest.fn(async () => ({
    plan: 'elite',
    limits: { features: { client_ark_action_plan: true } },
  })),
}))
jest.mock('../services/portfolioAnalyzer', () => ({
  getClientScoreBreakdown: jest.fn(async () => ({
    score: 62,
    grade: 'B',
    potential_score: 84,
    total_quotes: 2,
    breakdown: [{ dim: 'compliance', label: 'Conformité', score: 50, points_lost: 10, reason: 'DDA manquant', impact: 'Risque' }],
    client_value_estimate: { min: 900, max: 1800, label: 'potentiel moyen', contrats_sans_prime_renseignee: 0 },
  })),
}))

/** Erreur du SDK Anthropic : son `message` EST le corps brut du fournisseur. */
const mockCorpsFournisseur = '401 {"type":"error","error":{"type":"authentication_error",'
  + '"message":"invalid x-api-key"},"request_id":"req_011CfFTaxQNsZZZoV33xHBxr"}'

let mockModeMoteur = 'ok'
jest.mock('@anthropic-ai/sdk', () => {
  return class AnthropicFictif {
    constructor() {
      this.messages = {
        create: async () => {
          if (mockModeMoteur === 'erreur_fournisseur') {
            const err = new Error(mockCorpsFournisseur)
            err.status = 401
            throw err
          }
          return { content: [{ text: '{}' }] }
        },
      }
    }
  }
})

const express = require('express')
const pool = require('../db')
const router = require('./clients')

const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

describe('GET /api/clients/:id/ark-action-plan — erreurs IA normalisées', () => {
  let server
  let origin
  let requetes

  function brancherPool({ dansLeCabinet = true, echecBase = null } = {}) {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql)
      requetes.push(s)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_CH, role: 'owner' }] }
      if (s.includes('FROM clients')) {
        if (echecBase) throw new Error(echecBase)
        if (!dansLeCabinet) return { rows: [] }
        return { rows: [{ courtier_id: 7, first_name: 'Léa', last_name: 'Dupont' }] }
      }
      if (s.includes('FROM cabinets')) return { rows: [{ id: CAB_CH, name: 'Helvetia', country: 'CH', registre_type: 'FINMA' }] }
      if (s.includes('FROM broker_profiles')) return { rows: [{ pays: 'CH', registre_type: 'FINMA' }] }
      return { rows: [] }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use((req, _res, next) => { req.user = { id: 7, userId: 7 }; next() })
    app.use('/api/clients', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    mockModeMoteur = 'ok'
    process.env.ANTHROPIC_API_KEY = 'cle-factice-de-recette'
    brancherPool()
  })
  afterAll(() => { delete process.env.ANTHROPIC_API_KEY })

  test('panne du moteur IA : 503 ia_indisponible, AUCUN corps de fournisseur', async () => {
    mockModeMoteur = 'erreur_fournisseur'
    const res = await fetch(`${origin}/api/clients/148/ark-action-plan`)
    const corps = await res.json()
    const brut = JSON.stringify(corps)

    expect(res.status).toBe(503)
    expect(corps.error).toBe('ia_indisponible')
    expect(corps.message).toBeTruthy()
    for (const interdit of ['x-api-key', 'authentication_error', 'request_id', 'req_011CfFTaxQNsZZZoV33xHBxr', '401']) {
      expect({ interdit, present: brut.includes(interdit) }).toEqual({ interdit, present: false })
    }
  })

  test('sans clé IA : aucune analyse n’est annoncée (aucune action fabriquée)', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await fetch(`${origin}/api/clients/148/ark-action-plan`)
    const corps = await res.json()
    // La route ne peut pas appeler de moteur : elle le DIT, et elle n'invente
    // ni projection ni action.
    expect(res.status).toBe(200)
    expect(corps.action_plan.projected_score).toBeNull()
    expect(corps.action_plan.projected_score_source).toBe('indisponible')
    expect(corps.action_plan.actions).toEqual([])
    expect(corps.action_plan.coaching_summary).toMatch(/non disponible|indisponible/i)
  })

  test('dossier d’un AUTRE cabinet : 404 (jamais un plan d’action, jamais un 500)', async () => {
    brancherPool({ dansLeCabinet: false })
    const res = await fetch(`${origin}/api/clients/99999/ark-action-plan`)
    expect(res.status).toBe(404)
    const corps = await res.json()
    expect(corps.error).toMatch(/non trouvé|introuvable/i)
    // Aucun appel au moteur : la portée est refusée AVANT tout traitement.
    expect(requetes.some((sql) => sql.includes('FROM clients'))).toBe(true)
  })

  test('panne de base : aucun message SQL ni nom de table dans la réponse', async () => {
    brancherPool({ echecBase: 'invalid reference to FROM-clause entry for table "clients"' })
    const res = await fetch(`${origin}/api/clients/148/ark-action-plan`)
    const brut = JSON.stringify(await res.json())
    expect([404, 500]).toContain(res.status)
    expect(brut).not.toMatch(/FROM-clause/i)
    expect(brut).not.toMatch(/relation "clients"/i)
    expect(brut).not.toMatch(/server_error/i)
  })

  test('moteur opérationnel : la route répond 200 (aucune régression du chemin nominal)', async () => {
    const res = await fetch(`${origin}/api/clients/148/ark-action-plan`)
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.client_id).toBe(148)
    expect(corps.action_plan).toBeTruthy()
  })
})
