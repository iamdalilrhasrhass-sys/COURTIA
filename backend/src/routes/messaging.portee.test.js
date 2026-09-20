/**
 * messaging.portee.test.js — L'HISTORIQUE DE MESSAGES D'UN CLIENT EST CELUI DU
 * CABINET, JAMAIS CELUI D'UN AUTRE (défaut D3-01, P1 — troisième QA adverse,
 * mesuré le 20/09/2026).
 *
 * DÉFAUT MESURÉ : `GET /api/messaging/history/:clientId` ne portait que
 * `verifyToken` et lisait `SELECT * FROM messages WHERE client_id = $1` — aucun
 * filtre. Tout compte authentifié, y compris un compte en LECTURE SEULE d'un
 * cabinet ÉTRANGER, recevait le sujet, le corps et le contenu de la conversation
 * d'un client qui n'est pas le sien (marqueur relu depuis trois cabinets
 * étrangers). Même classe exacte que le P0 des conversations ARK, sur une autre
 * route.
 *
 * CE QUE CE TEST FIGE
 *   1. dossier du cabinet (propriétaire OU collaborateur) → 200 avec les messages ;
 *   2. dossier d'un cabinet ÉTRANGER → 404 `client_introuvable`, et AUCUNE
 *      lecture de `messages` n'est émise ;
 *   3. la requête de lecture joint le dossier et applique la portée cabinet
 *      (jamais un `SELECT * FROM messages WHERE client_id = …` nu) ;
 *   4. le service refuse de lire sans portée fournie (aucun chemin non filtré) ;
 *   5. aucun message d'infrastructure dans les corps d'erreur.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../middleware/authMiddleware', () => (req, _res, next) => {
  const id = Number(req.headers['x-test-user'] || 140)
  req.user = { id, userId: id }
  next()
})
jest.mock('../services/whatsappService', () => ({ getWhatsAppStatus: () => ({ connected: false }) }))
jest.mock('../services/imapService', () => ({ getIMAPStatus: () => ({ running: false }) }))
jest.mock('../jobs/relanceScheduler', () => ({ runDailyRelances: jest.fn(async () => ({})) }))

const express = require('express')
const pool = require('../db')
const messagingService = require('../services/messagingService')
const router = require('./messaging')

const CAB_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CAB_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const MESSAGE = {
  id: 7,
  client_id: 148,
  canal: 'email',
  direction: 'sortant',
  content: 'MARQUEUR-AUDIT message metier confidentiel',
  sujet: 'MARQUEUR-AUDIT — relance contrat',
  corps: 'Corps MARQUEUR-AUDIT',
}

describe('GET /api/messaging/history/:clientId — portée cabinet (D3-01)', () => {
  let server
  let origin
  let requetes
  let appartenances
  let cabinetDuClient
  let lectureMessages

  function brancherPool() {
    pool.query.mockImplementation(async (sql, params) => {
      requetes.push({ sql: String(sql), params })
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: appartenances }
      if (/FROM clients c WHERE c\.id/.test(s)) {
        const dansLaPortee = s.includes('c.cabinet_id = ANY($2::uuid[])')
          ? (params[1] || []).includes(cabinetDuClient)
          : params[1] === 140
        return { rows: dansLaPortee ? [{ id: Number(params[0]) }] : [] }
      }
      if (/FROM messages m/.test(s)) {
        lectureMessages = true
        const dansLaPortee = s.includes('c.cabinet_id = ANY($5::uuid[])')
          ? (params[4] || []).includes(cabinetDuClient)
          : true
        return { rows: dansLaPortee ? [MESSAGE] : [] }
      }
      return { rows: [] }
    })
  }

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api/messaging', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    requetes = []
    lectureMessages = false
    appartenances = [{ cabinet_id: CAB_A, role: 'broker', retire: false }]
    cabinetDuClient = CAB_A
    pool.query.mockReset()
    brancherPool()
  })

  const appeler = (clientId, userId = 140) => fetch(`${origin}/api/messaging/history/${clientId}`, {
    headers: { 'x-test-user': String(userId) },
  })

  test('le dossier du cabinet est servi (200) avec le contenu des messages', async () => {
    const res = await appeler(148)
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.success).toBe(true)
    expect(corps.total).toBe(1)
    expect(corps.data[0].content).toContain('MARQUEUR-AUDIT')
    // Pas de régression sur le contrat d'écran : le tableau attendu est `data`.
    expect(Array.isArray(corps.data)).toBe(true)
  })

  test('un COLLABORATEUR du même cabinet lit le même historique (portée cabinet, pas mono)', async () => {
    const res = await appeler(148, 146) // 146 = broker du cabinet, pas le créateur
    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.total).toBe(1)
  })

  test('dossier d’un AUTRE cabinet : 404 et AUCUNE lecture de la table messages', async () => {
    cabinetDuClient = CAB_B
    const res = await appeler(148)
    expect(res.status).toBe(404)
    const corps = await res.json()
    expect(corps.error).toBe('client_introuvable')
    expect(lectureMessages).toBe(false)
    expect(requetes.some((r) => /FROM messages m/.test(r.sql))).toBe(false)
  })

  test('la lecture joint le dossier et applique la portée cabinet (jamais nue)', async () => {
    await appeler(148)
    const lecture = requetes.find((r) => /FROM messages m/.test(r.sql))
    expect(lecture).toBeDefined()
    expect(lecture.sql).toContain('JOIN clients c ON c.id = m.client_id')
    expect(lecture.sql).toContain('c.cabinet_id = ANY(')
    expect(lecture.sql).not.toContain('SELECT * FROM messages WHERE client_id')
  })

  test('aucune réponse ne contient de fragment SQL ni de message d’infrastructure', async () => {
    for (const cab of [CAB_A, CAB_B]) {
      cabinetDuClient = cab
      const texte = await (await appeler(148)).text()
      // `client_id` est un champ LÉGITIME de la ligne de message (contrat d'écran) :
      // on ne cherche que du vocabulaire d'infrastructure.
      for (const interdit of ['SELECT', 'FROM messages', 'cabinet_members', 'relation', 'ENOENT', '/opt/']) {
        expect({ cab, interdit, present: texte.includes(interdit) }).toEqual({ cab, interdit, present: false })
      }
    }
  })

  test('le service ne lit RIEN sans portée fournie (aucun chemin non filtré ne subsiste)', async () => {
    pool.query.mockClear()
    const messages = await messagingService.getHistory(148, { limit: 10 })
    expect(messages).toEqual([])
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('le service applique la portée reçue (paramètres attendus)', async () => {
    pool.query.mockClear()
    const portee = { mode: 'cabinet', userId: 140, cabinetIds: [CAB_A], cabinetIdsEcriture: [CAB_A] }
    const messages = await messagingService.getHistory(148, { portee, canal: 'email' })
    expect(messages).toHaveLength(1)
    const [sql, params] = pool.query.mock.calls[0]
    expect(String(sql)).toContain('c.cabinet_id = ANY($2::uuid[])')
    expect(params[0]).toBe(148)
    expect(params[1]).toEqual([CAB_A])
    expect(params[2]).toBe(140)
    expect(params).toContain('email')
  })
})
