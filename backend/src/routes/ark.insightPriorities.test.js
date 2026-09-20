/**
 * ark.insightPriorities.test.js — L'INSIGHT D'UN CLIENT INCONNU EST UN 404, ET
 * UNE PANNE SQL N'EST PLUS PRÉSENTÉE COMME UNE JOURNÉE VIDE.
 *
 * POURQUOI CE TEST (défauts P2 mesurés le 20/09/2026)
 *   • `GET /api/ark/clients/:id/insight` répondait 200 avec le titre INVENTÉ
 *     « Profil client à enrichir » pour un identifiant qui n'existe pas — ou qui
 *     appartient à un AUTRE cabinet — et trois `catch (_) {}` transformaient
 *     toute erreur SQL en « portefeuille vide », donc en un titre rassurant mais
 *     faux.
 *   • `GET /api/ark/priorities` avalait de la même façon les erreurs des trois
 *     blocs (recommandations, échéances, clients silencieux) et répondait 200
 *     « rien à faire aujourd'hui » alors que la base avait refusé la requête.
 *
 * Ce qui est vérifié ici est le contrat HTTP réel : statut, corps, et requêtes
 * réellement émises par les VRAIES routes.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/auth', () => ({
  verifyToken: (req, _res, next) => { req.user = { id: 7, userId: 7 }; next() },
  isSessionRevoked: async () => ({ revoked: false }),
}))
jest.mock('../middleware/planGuard', () => ({
  requireFeature: () => (_req, _res, next) => next(),
  requireUnderLimit: () => (_req, _res, next) => next(),
}))

const express = require('express')
const pool = require('../db')
const router = require('./ark')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

let requetes = []

/** Pool simulé : l'appelant est dans le cabinet A, qui ne connaît AUCUN client 999999. */
function brancherPool({ panneSqlSurQuotes = false } = {}) {
  pool.query.mockImplementation(async (sql) => {
    const s = String(sql)
    requetes.push(s)
    if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'owner' }] }
    if (s.includes('FROM cabinets')) return { rows: [{ id: CAB_A, name: 'Cabinet QA', country: 'France' }] }
    if (s.includes('FROM broker_profiles')) return { rows: [{ pays: 'France', registre_type: 'ORIAS' }] }
    // Le dossier demandé n'est pas dans la portée : la clause de portée ne rend rien.
    if (s.includes('FROM clients')) return { rows: [] }
    if (s.includes('FROM quotes')) {
      if (panneSqlSurQuotes) throw new Error('column "date_echeance" does not exist')
      return { rows: [] }
    }
    if (s.includes('FROM ark_recommendations')) return { rows: [] }
    return { rows: [] }
  })
}

describe('ARK — insight client et priorités disent la vérité', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api/ark', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    jest.clearAllMocks()
    requetes = []
    delete process.env.DEEPSEEK_API_KEY
  })

  test('insight d’un client inexistant ou hors cabinet : 404, aucun titre fabriqué', async () => {
    brancherPool()
    const res = await fetch(`${origin}/api/ark/clients/999999/insight`)
    const corps = await res.json()

    expect(res.status).toBe(404)
    expect(corps.headline).toBeUndefined()
    expect(JSON.stringify(corps)).not.toContain('Profil client à enrichir')
    expect(corps.error).toBe('client_introuvable')

    // La résolution est bornée au CABINET (et non à `courtier_id` seul).
    const resolution = requetes.find((s) => s.includes('FROM clients'))
    expect(resolution).toContain('clients.cabinet_id = ANY($2::uuid[])')
    expect(resolution).toContain('clients.courtier_id = $3')
    // Un dossier hors portée ne fait lire NI contrats NI recommandations.
    expect(requetes.filter((s) => /FROM quotes|FROM ark_recommendations/.test(s))).toEqual([])
  })

  test('insight : une panne SQL remonte (500), elle n’est plus une journée vide', async () => {
    brancherPool({ panneSqlSurQuotes: true })
    // Le dossier 201 est dans la portée : la panne vient de la lecture des contrats.
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql)
      requetes.push(s)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'owner' }] }
      if (s.includes('FROM clients')) return { rows: [{ id: 201, type: 'professionnel', risk_score: 20, silent_alert: false }] }
      if (s.includes('FROM quotes')) throw new Error('column "date_echeance" does not exist')
      return { rows: [] }
    })

    const res = await fetch(`${origin}/api/ark/clients/201/insight`)
    expect(res.status).toBe(500)
    const corps = await res.json()
    expect(corps.error).toBe('ark_insight_failed')
    // Aucun titre n'est publié sur une lecture en échec.
    expect(corps.headline).toBeUndefined()
  })

  test('insight nominal : le titre vient des données du dossier, pas d’un gabarit', async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql)
      requetes.push(s)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'owner' }] }
      if (s.includes('FROM clients')) return { rows: [{ id: 201, type: 'professionnel', risk_score: 20, silent_alert: true }] }
      if (s.includes('FROM quotes')) return { rows: [] }
      if (s.includes('FROM ark_recommendations')) return { rows: [] }
      return { rows: [] }
    })

    const res = await fetch(`${origin}/api/ark/clients/201/insight`)
    const corps = await res.json()
    expect(res.status).toBe(200)
    // Le client est silencieux en base → le titre porte ce fait mesuré.
    expect(corps.headline).toBe('Client silencieux — relance prioritaire recommandée pour préserver la relation.')
    expect(corps.signals.some((s) => s.kind === 'silent')).toBe(true)
  })

  test('priorités : un bloc en échec publie degraded:true (jamais « journée vide »)', async () => {
    pool.query.mockImplementation(async (sql) => {
      const s = String(sql)
      requetes.push(s)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: CAB_A, role: 'owner' }] }
      if (s.includes('FROM cabinets')) return { rows: [{ id: CAB_A, name: 'Cabinet QA', country: 'France' }] }
      if (s.includes('FROM broker_profiles')) return { rows: [{ pays: 'France' }] }
      // Panne sur le PREMIER bloc uniquement.
      if (s.includes('FROM ark_recommendations')) throw new Error('relation "ark_recommendations" does not exist')
      return { rows: [] }
    })

    const res = await fetch(`${origin}/api/ark/priorities`)
    const corps = await res.json()
    expect(res.status).toBe(200)
    expect(corps.degraded).toBe(true)
    expect(corps.degraded_blocs).toContain('recommandations')
    expect(corps.priorities).toEqual([])
  })

  test('priorités : quand tout est lisible, la réponse ne se dit PAS dégradée', async () => {
    brancherPool()
    const res = await fetch(`${origin}/api/ark/priorities`)
    const corps = await res.json()
    expect(res.status).toBe(200)
    expect(corps.degraded).toBe(false)
    expect(corps.degraded_blocs).toEqual([])
  })
})
