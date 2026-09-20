/**
 * browserPilot.fauxSucces.test.js — ARK BROWSER PILOT : DIRE LA VÉRITÉ.
 *
 * POURQUOI CE TEST (défauts P2 corrigés le 20/09/2026)
 *   • `POST /api/browser-pilot/task/:id/approve` répondait 201
 *     `{success: true, message: 'Tâche approuvée et exécutée'}` même quand
 *     l'exécution avait ÉCHOUÉ (`status: 'failed'`) : le courtier lisait
 *     « exécutée » alors que rien n'avait abouti.
 *   • `DELETE /api/browser-pilot/task/:id` répondait `{success: true, message:
 *     'Tâche supprimée'}` SANS RIEN supprimer — la tâche réapparaissait aussitôt
 *     dans `GET /task` et `GET /task/:id`.
 *   • `actionsExecuted` valait `actions.length` (le nombre d'actions PRÉVUES) et
 *     `listSessions` publiait ce total prévu comme s'il avait été exécuté.
 *
 * Le navigateur est REMPLACÉ par un lancement qui échoue : c'est ce qui permet
 * de vérifier le chemin d'échec sans dépendre de Chromium ni du réseau.
 */
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(async () => { throw new Error('Chromium introuvable dans cet environnement de test') }),
  },
}))
jest.mock('../middleware/authMiddleware', () => (req, _res, next) => { req.user = { id: 11, userId: 11 }; next() })

const express = require('express')
const browserPilotService = require('../services/browserPilotService')
const router = require('./browserPilot')

const ACTIONS_VALIDES = [
  { type: 'navigate', url: 'https://example.com' },
  { type: 'screenshot' },
]

describe('ARK Browser Pilot — plus de succès annoncé sans exécution', () => {
  let server
  let origin

  beforeAll(async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/browser-pilot', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  const post = (chemin, corps) => fetch(origin + chemin, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps || {}),
  })

  test('dry-run : la tâche est planifiée (needs_approval) et réellement supprimable', async () => {
    const creation = await post('/api/browser-pilot/task', { actions: ACTIONS_VALIDES })
    expect(creation.status).toBe(201)
    const { data } = await creation.json()
    expect(data.status).toBe('needs_approval')
    const taskId = data.taskId

    // La tâche existe vraiment.
    const avant = await fetch(`${origin}/api/browser-pilot/task/${taskId}`)
    expect(avant.status).toBe(200)

    // Suppression : la session est RETIRÉE, pas seulement annoncée.
    const suppression = await fetch(`${origin}/api/browser-pilot/task/${taskId}`, { method: 'DELETE' })
    const corpsSuppression = await suppression.json()
    expect(suppression.status).toBe(200)
    expect(corpsSuppression.success).toBe(true)
    expect(corpsSuppression.data.supprimee).toBe(true)
    expect(browserPilotService.getSession(taskId, 11)).toBeNull()

    // Preuve de disparition réelle : la ressource n'existe plus.
    const apres = await fetch(`${origin}/api/browser-pilot/task/${taskId}`)
    expect(apres.status).toBe(404)
    expect((await fetch(`${origin}/api/browser-pilot/task/${taskId}`, { method: 'DELETE' })).status).toBe(404)
  })

  test('supprimer une tâche inexistante ne répond plus success:true', async () => {
    const res = await fetch(`${origin}/api/browser-pilot/task/bp_inexistant_999`, { method: 'DELETE' })
    const corps = await res.json()
    expect(res.status).toBe(404)
    expect(corps.success).toBe(false)
    expect(corps.message).not.toMatch(/supprim\u00e9e/i)
  })

  test('exécution en échec : jamais 201 « Tâche approuvée et exécutée »', async () => {
    const creation = await post('/api/browser-pilot/task', { actions: ACTIONS_VALIDES })
    const { data } = await creation.json()

    const approbation = await post(`/api/browser-pilot/task/${data.taskId}/approve`, {})
    const corps = await approbation.json()

    expect(approbation.status).toBe(502)
    expect(corps.success).toBe(false)
    expect(corps.data.status).toBe('failed')
    expect(String(corps.message || '')).toMatch(/\u00e9chou\u00e9|n'a pas \u00e9t\u00e9 ex\u00e9cut\u00e9e/i)
    expect(String(corps.message || '')).not.toMatch(/approuv\u00e9e et ex\u00e9cut\u00e9e/i)
  })

  test('action invalide : échec annoncé comme tel', async () => {
    const res = await post('/api/browser-pilot/task', { actions: [{ type: 'ouvre_la_porte' }] })
    const corps = await res.json()
    expect(res.status).toBe(400)
    expect(corps.success).toBe(false)
    expect(corps.data.status).toBe('failed')
  })

  test('une exécution en échec ne compte pas ses actions prévues comme exécutées', async () => {
    const echec = await browserPilotService.runTask({
      userId: 11, actions: ACTIONS_VALIDES, dryRun: false, headless: true,
    })
    expect(echec.status).toBe('failed')
    expect(echec.result).toBeNull()

    const vue = browserPilotService.listSessions(20, 11).find((s) => s.taskId === echec.taskId)
    expect(vue.status).toBe('failed')
    expect(vue.actionsCount).toBe(0)
  })

  test('cancelSession dit la vérité (false quand il n’y a rien à retirer)', () => {
    expect(browserPilotService.cancelSession('bp_absent')).toBe(false)
  })
})
