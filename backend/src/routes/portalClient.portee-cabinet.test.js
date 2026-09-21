/**
 * portalClient.portee-cabinet.test.js — l'espace CLIENT voit tout le CABINET.
 *
 * POURQUOI CE TEST : `GET /api/portal/messages` bornait le fil à
 * `broker_id = <le courtier du compte portail>`. Dès qu'un AUTRE membre du cabinet
 * répondait au client (route courtier `POST /api/portail/messages`, qui estampille
 * son propre identifiant), la réponse n'apparaissait JAMAIS côté client : un
 * message envoyé qui ne parvient pas à son destinataire.
 *
 * PORTÉE ICI : le fil appartient au CLIENT — un client ne peut pas être rattaché à
 * deux cabinets, donc `client_id` EST la borne de tenance de cette route. Le
 * périmètre « cabinet » n'a pas d'autre sens côté client : tous les messages de ce
 * client, quel que soit le membre du cabinet qui les a écrits, forment une seule
 * conversation.
 *
 * Le middleware `verifyClientPortalToken` est court-circuité (on appelle le
 * gestionnaire final) : ce qui est testé est la PORTÉE du fil, pas l'auth portail.
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/portail/portalAuth', () => ({
  verifyClientPortalToken: (req, _res, next) => next(),
  getAccountInfo: jest.fn(),
  activate: jest.fn(),
  login: jest.fn(),
  requestReset: jest.fn(),
  resetPassword: jest.fn(),
  RESET_REQUEST_RESPONSE: { success: true, message: '' },
}))

const pool = require('../db')
const router = require('./portalClient')

function gestionnaire(methode, chemin) {
  const couche = router.stack.find((l) => l.route && l.route.path === chemin && l.route.methods[methode])
  if (!couche) throw new Error(`Route introuvable : ${methode} ${chemin}`)
  return couche.route.stack[couche.route.stack.length - 1].handle
}

function fausseReponse() {
  return {
    code: 200, corps: null,
    status(c) { this.code = c; return this },
    json(p) { this.corps = p; return this },
  }
}

async function jouer() {
  const requetes = []
  pool.query.mockImplementation(async (sql, params) => {
    requetes.push({ sql: String(sql), params })
    return { rows: [{ count: '0' }], rowCount: 1 }
  })
  const res = fausseReponse()
  const req = {
    portalUser: { clientId: 5, brokerId: 3, portalAccountId: 1, email: 'client@example.invalid' },
    query: {}, body: {},
  }
  await gestionnaire('get', '/messages')(req, res)
  return { res, requetes }
}

describe('portalClient — le fil du client couvre tout le cabinet', () => {
  beforeEach(() => pool.query.mockReset())

  test('le fil n’est plus borné au courtier du compte portail', async () => {
    const { res, requetes } = await jouer()
    expect(res.code).toBe(200)
    const fil = requetes.find((r) => /FROM client_portal_messages/.test(r.sql))
    expect(fil).toBeTruthy()
    expect(fil.sql).not.toMatch(/broker_id\s*=/)
    // Le fil reste borné au CLIENT : aucune fuite vers un autre dossier.
    expect(fil.sql).toMatch(/client_id = \$1/)
    expect(fil.params[0]).toBe(5)
  })

  test('le marquage « lu » couvre aussi les messages des autres membres du cabinet', async () => {
    const { requetes } = await jouer()
    const maj = requetes.find((r) => /UPDATE client_portal_messages/.test(r.sql))
    expect(maj).toBeTruthy()
    expect(maj.sql).not.toMatch(/broker_id\s*=/)
    expect(maj.sql).toMatch(/client_id = \$1/)
  })

  test('le client ne voit jamais les messages d’un autre client', async () => {
    const { requetes } = await jouer()
    // Toutes les requêtes du fil portent le client du compte portail (5) et
    // jamais un identifiant fourni par l'appelant.
    const surLeFil = requetes.filter((r) => /client_portal_messages/.test(r.sql))
    for (const r of surLeFil) {
      expect(r.params).toContain(5)
      expect(r.params.join(',')).not.toMatch(/\b(?!5\b)\d{6,}\b/)
    }
  })
})
