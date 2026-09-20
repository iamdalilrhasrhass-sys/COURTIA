/**
 * leads.demoRequest.test.js — garde-fou : la demande de démo ne promet pas un
 * rappel quand personne n'a été alerté.
 *
 * POURQUOI CE TEST (mesuré le 20/09/2026) : POST /api/leads/demo-request
 * répondait 201 « Demande de démo reçue. Notre équipe vous recontacte
 * rapidement. » alors que la notification interne partait en « sans bloquant » :
 * sans COURTIA_ADMIN_EMAIL ni fournisseur d'e-mail, adminNotifier renvoie
 * {envoye:false,raison:'configuration_required'}, le résultat était jeté, et
 * personne n'était prévenu de la demande.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/adminNotifier', () => ({
  notifierAdmin: jest.fn(),
  notifierAdminSansBloquer: jest.fn(),
}))

const express = require('express')
const pool = require('../db')
const { notifierAdmin, notifierAdminSansBloquer } = require('../services/adminNotifier')
const router = require('./leads')

const CORPS = {
  first_name: 'Léa',
  last_name: 'Dupont',
  company_name: 'Garage du Pont',
  email: 'lea@garage-du-pont.test',
  phone: '0600000000',
  city: 'Lyon',
  team_size: '3-5',
  consent: true,
}

describe('POST /api/leads/demo-request — vérité sur la notification interne', () => {
  let server
  let origin
  let requetes

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    app.use('/api/leads', router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    jest.clearAllMocks()
    requetes = []
    pool.query.mockImplementation(async (sql, params = []) => {
      requetes.push({ sql: String(sql), params })
      if (/INSERT INTO demo_requests/.test(sql)) {
        return { rows: [{ id: 77, email: CORPS.email, company_name: CORPS.company_name, status: 'a_contacter' }] }
      }
      return { rows: [] }
    })
  })

  const envoyer = () => fetch(`${origin}/api/leads/demo-request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CORPS),
  })

  test('notification interne impossible : la réponse le dit, sans promesse de rappel', async () => {
    notifierAdmin.mockResolvedValue({ envoye: false, raison: 'configuration_required' })

    const res = await envoyer()
    const corps = await res.json()

    // La demande est bien enregistrée (action réelle) : le succès porte sur
    // l'enregistrement, pas sur l'alerte.
    expect(res.status).toBe(201)
    expect(corps.success).toBe(true)
    expect(requetes.some(({ sql }) => /INSERT INTO demo_requests/.test(sql))).toBe(true)

    // L'échec de la notification est explicite.
    expect(corps.notification_interne).toMatchObject({ envoye: false, raison: 'configuration_required' })
    expect(corps.configuration_required).toBe(true)
    expect(corps.message).toMatch(/notification interne n'a pas pu partir/i)
    // Plus aucune promesse de rappel sans destinataire.
    expect(corps.message).not.toMatch(/recontacte|rapidement/i)
  })

  test('notification partie : la promesse de rappel est légitime', async () => {
    notifierAdmin.mockResolvedValue({ envoye: true, provider: 'resend' })

    const corps = await (await envoyer()).json()

    expect(corps.notification_interne).toMatchObject({ envoye: true, raison: null })
    expect(corps.configuration_required).toBe(false)
    expect(corps.message).toMatch(/recontacte/i)
  })

  test('la notification est attendue, jamais lancée « en tâche de fond »', async () => {
    notifierAdmin.mockResolvedValue({ envoye: false, raison: 'configuration_required' })

    await envoyer()

    expect(notifierAdmin).toHaveBeenCalledTimes(1)
    expect(notifierAdmin.mock.calls[0][0]).toMatchObject({ evenement: 'nouvelle_demande_demo' })
    // L'ancien chemin « sans bloquant » jetait le résultat : il ne doit plus
    // être utilisé par cette route.
    expect(notifierAdminSansBloquer).not.toHaveBeenCalled()
  })
})
