/**
 * opportunites.prompts-marche.test.js — LES PROMPTS D'OPPORTUNITÉS PARLENT LA
 * DEVISE ET L'IDENTIFIANT DU MARCHÉ DU CABINET (défaut P3 CH-038).
 *
 * DÉFAUT MESURÉ (audit du 21/09/2026, preuve `routes/opportunites.js` ~605, ~612,
 * ~789-802) : les prompts envoyés au modèle injectaient `{montant}€` en dur, un
 * « SIRET » et un potentiel « €/an ». Pour un cabinet suisse, le modèle
 * raisonnait donc en euros et sur un identifiant d'entreprise français qui
 * n'existe pas (le registre suisse est la FINMA, l'identifiant d'entreprise est
 * l'IDE / UID).
 *
 * Ce test monte les VRAIES routes sur un moteur IA ESPION (il enregistre le
 * prompt réellement transmis) et vérifie, pour un cabinet suisse et un cabinet
 * français :
 *   • CH : devise CHF, AUCUN « € », AUCUN « SIRET » dans les prompts ;
 *   • FR : devise € (comportement historique) et libellé « SIRET » quand le
 *     client en a un.
 * Aucun montant n'est inventé par ce correctif : les nombres injectés restent
 * ceux de la base (le potentiel reste « non calculé »).
 */
jest.mock('../db', () => ({ query: jest.fn() }))
jest.mock('../services/arkEngine', () => ({
  callArk: jest.fn(),
  callArkLight: jest.fn(),
  callArkStructured: jest.fn(),
  checkRateLimit: () => ({ allowed: true, resetAt: Date.now() }),
}))

const express = require('express')
const pool = require('../db')
const arkEngine = require('../services/arkEngine')
const router = require('./opportunites')

const CAB_CH = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

const CLIENT = {
  id: 148,
  first_name: 'Élise',
  last_name: 'Muller',
  company_name: 'Muller & Fils SA',
  type: 'professionnel',
  lifetime_value: 4200,
  risk_score: 30,
  silent_alert: false,
  products: ['MRH'],
  total_premium: 1813.1,
  contracts_count: 1,
  next_renewal: '2027-01-01',
  siret: '12345678900012',
  city: 'Genève',
}

const CONTRAT = { product_type: 'MRH', premium: 1813.1, start_date: '2026-01-01' }
const OPPORTUNITE = {
  id: 5,
  client_id: 148,
  type: 'cross_sell',
  product_current: 'MRH',
  product_target: 'RC Pro',
  score: 82,
  status: 'detected',
  reasoning: 'mono-produit',
  suggested_action: 'Appeler',
  estimated_revenue: null,
  metadata: {},
}

/** Utilisateur 11 : cabinet suisse. Utilisateur 12 : cabinet français. */
const UTILISATEURS = { 11: 'CH', 12: 'FR' }

function brancherPool() {
  pool.query.mockImplementation(async (sql, params) => {
    const s = String(sql)
    // ── Résolution du marché / de la portée (lib/marcheCabinet, porteeCabinet)
    if (s.includes('cabinet_members')) {
      const uid = Number(params?.[0])
      return UTILISATEURS[uid] === 'CH'
        ? { rows: [{ cabinet_id: CAB_CH, role: 'owner' }], rowCount: 1 }
        : { rows: [], rowCount: 0 }
    }
    if (s.includes('FROM cabinets')) {
      return { rows: [{ id: CAB_CH, name: 'Helvetia QA SA', country: 'CH', registre_type: 'FINMA', orias_number: null }], rowCount: 1 }
    }
    if (s.includes('broker_profiles')) {
      return { rows: [{ user_id: 12, pays: 'France', registre_type: 'ORIAS', orias: '07000000' }], rowCount: 1 }
    }
    // ── POST /detect
    if (s.includes('lifetime_value') && /FROM clients c/.test(s)) return { rows: [CLIENT], rowCount: 1 }
    if (s.includes('AS product_type') && /FROM clients c/.test(s)) return { rows: [{ ...CLIENT }], rowCount: 1 }
    if (s.includes('FROM opportunites') && s.includes("status = 'detected'")) return { rows: [], rowCount: 0 }
    if (s.includes('SELECT id FROM clients')) return { rows: [{ id: 148 }], rowCount: 1 }
    if (s.includes('INSERT INTO opportunites')) return { rows: [{ ...OPPORTUNITE, cabinet_id: CAB_CH }], rowCount: 1 }
    // ── POST /:id/ai-pitch
    if (/FROM opportunites o/.test(s)) return { rows: [{ ...OPPORTUNITE, ...CLIENT, client_type: CLIENT.type }], rowCount: 1 }
    if (/FROM quotes q/.test(s)) return { rows: [CONTRAT], rowCount: 0 }
    if (s.includes('UPDATE opportunites')) return { rows: [], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
}

describe('opportunités — les prompts IA suivent le marché du cabinet (CH-038)', () => {
  let server
  let origin
  let prompts

  beforeAll(async () => {
    const app = express()
    app.locals.pool = pool
    app.use(express.json())
    // `opportunites.js` ne porte pas ses gardes d'authentification : server.js
    // les monte sur le préfixe (même montage que les autres tests de ce routeur).
    app.use('/api/opportunites', (req, _res, next) => {
      const id = Number(req.headers['x-test-user'] || 11)
      req.user = { id, userId: id }
      next()
    }, router)
    await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve) })
    origin = `http://127.0.0.1:${server.address().port}`
  })
  afterAll(async () => { await new Promise((r) => server.close(r)) })

  beforeEach(() => {
    jest.clearAllMocks()
    prompts = []
    pool.query.mockReset()
    brancherPool()
    arkEngine.callArkStructured.mockImplementation(async (args) => {
      prompts.push({ system: String(args.system || ''), user: String(args.user || '') })
      if (args.route === 'opportunites-detect') {
        return { structured: { opportunites: [{ ...OPPORTUNITE }], analyse_portefeuille: 'analyse' }, usage: {}, model: 'test' }
      }
      return { structured: { accroche: 'Bonjour', pitch: 'argumentaire', objections: [] }, usage: {}, model: 'test' }
    })
  })

  const detecter = (utilisateur) => fetch(`${origin}/api/opportunites/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-user': String(utilisateur) },
    body: JSON.stringify({ max_opportunites: 5 }),
  })

  const argumentaire = (utilisateur) => fetch(`${origin}/api/opportunites/5/ai-pitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-user': String(utilisateur) },
  })

  test('cabinet SUISSE : CHF partout, jamais « € » ni « SIRET »', async () => {
    const resDetect = await detecter(11)
    expect(resDetect.status).toBe(200)
    const resPitch = await argumentaire(11)
    expect(resPitch.status).toBe(200)
    expect(prompts).toHaveLength(2)

    for (const prompt of prompts) {
      const complet = `${prompt.system}\n${prompt.user}`
      expect(complet).toContain('CHF')
      expect(complet).not.toContain('€')
      expect(complet).not.toContain('SIRET')
    }
    // La devise du cabinet est annoncée au modèle…
    expect(prompts[0].system).toContain('en CHF')
    // …et les montants réellement présents portent ce libellé.
    expect(prompts[0].user).toContain('1813.1 CHF')
    expect(prompts[1].user).toContain('4200 CHF')
    // Aucun montant inventé : le potentiel non calculable reste annoncé comme tel.
    expect(prompts[1].user).toContain('non calculé')
  })

  test('cabinet FRANÇAIS : € et « SIRET » (comportement historique conservé)', async () => {
    const resDetect = await detecter(12)
    expect(resDetect.status).toBe(200)
    const resPitch = await argumentaire(12)
    expect(resPitch.status).toBe(200)
    expect(prompts).toHaveLength(2)

    const complet = `${prompts[0].system}\n${prompts[0].user}\n${prompts[1].user}`
    expect(complet).toContain('€')
    expect(complet).not.toContain('CHF')
    expect(prompts[1].user).toContain('SIRET: 12345678900012')
    expect(prompts[1].user).toContain('4200 €')
  })
})
