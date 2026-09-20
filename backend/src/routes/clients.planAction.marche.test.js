/**
 * clients.planAction.marche.test.js — LE PLAN D'ACTION ARK PARLE LE MARCHÉ DU
 * CABINET, JAMAIS LE RÉFÉRENTIEL FRANÇAIS PAR DÉFAUT.
 *
 * POURQUOI CE TEST (défaut P1 mesuré le 20/09/2026)
 * `GET /api/clients/:id/ark-action-plan` construisait son prompt avec
 * « Tu es ARK, expert en courtage d'assurance français. » ÉCRIT EN DUR. Un
 * cabinet suisse recevait donc de son propre assistant un plan d'action fondé
 * sur un référentiel qui n'est pas le sien (DDA, ORIAS, ACPR, loi Hamon) et des
 * consignes en euros. La règle appliquée est celle de routes/ark.js : le marché
 * se lit depuis le CABINET (lib/marcheCabinet) et la persona vient de la source
 * unique (services/arkPrompts), complétée par son bloc de marché.
 *
 * Le test monte la VRAIE route et capture l'invite réellement transmise au
 * moteur (seul le client Anthropic est remplacé : aucune clé IA en recette).
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
    breakdown: [
      { dim: 'compliance', label: 'Conformité', score: 50, points_lost: 10, reason: 'DDA manquant', impact: 'Risque réglementaire' },
    ],
    client_value_estimate: { min: 900, max: 1800, label: 'potentiel moyen', contrats_sans_prime_renseignee: 0 },
  })),
}))

/** Invites réellement transmises au moteur : c'est ce que ce test vérifie. */
const invites = []
jest.mock('@anthropic-ai/sdk', () => {
  return class AnthropicFictif {
    constructor() {
      this.messages = {
        create: async (args) => {
          invites.push(String(args?.messages?.[0]?.content || ''))
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
const CAB_FR = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

describe('GET /api/clients/:id/ark-action-plan — le prompt suit le marché du cabinet', () => {
  let server
  let origin

  /** Pool simulé : le cabinet de l'appelant est celui qu'on veut éprouver. */
  function brancherPool(cabinetId, { pays, registre_type, orias_number }) {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: cabinetId, role: 'owner' }] }
      if (s.includes('FROM cabinets')) return { rows: [{ id: cabinetId, name: 'Cabinet QA', country: pays, registre_type, orias_number }] }
      if (s.includes('FROM broker_profiles')) return { rows: [{ pays, registre_type }] }
      if (s.includes('FROM clients')) return { rows: [{ courtier_id: 7, first_name: 'Léa', last_name: 'Dupont', email: 'lea@courtia-qa.test' }] }
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
    jest.clearAllMocks()
    invites.length = 0
    process.env.ANTHROPIC_API_KEY = 'cle-factice-de-recette'
  })
  afterAll(() => { delete process.env.ANTHROPIC_API_KEY })

  test('cabinet suisse : FINMA/LSA/nLPD/CHF — aucun ORIAS, ACPR ni « français »', async () => {
    brancherPool(CAB_CH, { pays: 'CH', registre_type: 'FINMA', orias_number: null })

    const res = await fetch(`${origin}/api/clients/201/ark-action-plan`)
    expect(res.status).toBe(200)
    const corps = await res.json()
    // Le score potentiel heuristique est publié sous son vrai nom, aucune
    // projection ARK n'est annoncée sans analyse.
    expect(corps.action_plan.projected_score_source).toBe('indisponible')

    expect(invites).toHaveLength(1)
    const prompt = invites[0]
    for (const reference of ['FINMA', 'LSA', 'nLPD', 'CHF']) {
      expect({ reference, present: prompt.includes(reference) }).toEqual({ reference, present: true })
    }
    expect(prompt).toContain('Marché: Suisse (CH)')
    for (const interdit of ['ORIAS', 'ACPR', 'français']) {
      expect({ interdit, present: prompt.includes(interdit) }).toEqual({ interdit, present: false })
    }
  })

  test('cabinet français : la persona française complète est conservée', async () => {
    brancherPool(CAB_FR, { pays: 'FR', registre_type: 'ORIAS', orias_number: '07000000' })

    const res = await fetch(`${origin}/api/clients/201/ark-action-plan`)
    expect(res.status).toBe(200)

    expect(invites).toHaveLength(1)
    const prompt = invites[0]
    expect(prompt).toContain('ORIAS')
    expect(prompt).toContain('ACPR')
    expect(prompt).toContain('Marché: France (FR)')
    expect(prompt).not.toContain('FINMA')
  })
})
