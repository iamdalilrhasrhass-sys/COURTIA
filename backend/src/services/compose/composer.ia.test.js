/**
 * composer.ia.test.js — garde-fou : aucun document de conformité n'est écrit
 * avec un contenu de repli fabriqué.
 *
 * POURQUOI CE TEST (mesuré le 20/09/2026) : composer.composeDevoirConseil
 * appelait extractNeedsFromClient puis buildRecommendation. Quand le moteur IA
 * était absent, composeAi renvoyait des besoins INVENTÉS (« À définir avec le
 * client », « Informations à compléter lors de l'entretien », « Protection
 * adaptée au profil ») et une recommandation « meilleur rapport qualité/prix »
 * avec confidence_score 50. Le devoir de conseil — un document réglementaire —
 * était donc écrit, publié et marqué ai_generated:true sans aucune analyse.
 */
process.env.COMPOSE_STORAGE_PATH = require('os').tmpdir() + '/courtia-qa-composer-ia'

jest.mock('../../db', () => ({ query: jest.fn() }))
jest.mock('../arkEngine', () => ({ callArkStructured: jest.fn() }))

const pool = require('../../db')
const { callArkStructured } = require('../arkEngine')
const { composeDevoirConseil, composeIpid } = require('./composer')

const MOTEUR_ABSENT = {
  text: null,
  error: 'configuration_required',
  message: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY.',
}

const BESOINS_ET_RECO = {
  besoins: [{ type: 'MRH', description: 'Local commercial', priority: 'haute' }],
  situation: 'Artisan locataire de son local',
  objectifs: ['Protéger le local'],
}
const RECOMMANDATION = {
  recommended_product: { name: 'MRH Pro', insurer: 'AXA', premium: 480 },
  reasoning: ['Garanties adaptées'],
  alternatives_considered: [],
  confidence_score: 70,
}

let requetes
const insertsDocuments = () => requetes.filter(({ sql }) => /INSERT INTO compliance_documents/.test(sql))

describe('composer — un document de conformité ne contient jamais un repli inventé', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requetes = []
    callArkStructured.mockResolvedValue(MOTEUR_ABSENT)
    pool.query.mockImplementation(async (sql, params = []) => {
      requetes.push({ sql: String(sql), params })
      if (/FROM broker_profile_settings bps/.test(sql)) {
        return { rows: [{ broker_id: 42, company_name: 'Cabinet Test', orias_number: '07000000' }] }
      }
      if (/FROM clients c/.test(sql)) return { rows: [{ id: 201, type: 'professionnel' }] }
      if (/FROM clients WHERE id/.test(sql)) return { rows: [{ id: 201, nom: 'Dupont', prenom: 'Léa' }] }
      if (/FROM quotes q/.test(sql)) return { rows: [{ id: 7, product_name: 'MRH Pro', premium_annual: 480 }] }
      if (/FROM notes/.test(sql)) return { rows: [] }
      if (/FROM dda_quizzes/.test(sql)) return { rows: [] }
      if (/FROM compliance_documents/.test(sql)) return { rows: [] }
      if (/INSERT INTO compliance_documents/.test(sql)) return { rows: [{ id: 1, version: 1 }] }
      return { rows: [] }
    })
  })

  test('IA absente : le devoir de conseil échoue, aucun document n’est écrit', async () => {
    await expect(composeDevoirConseil({ brokerId: 42, clientId: 201 })).rejects.toMatchObject({
      code: 'configuration_required',
      erreurIa: true,
    })
    expect(insertsDocuments()).toHaveLength(0)
  })

  test('IA absente : l’IPID échoue (devis non enrichi), aucun document n’est écrit', async () => {
    await expect(composeIpid({ brokerId: 42, clientId: 201, quoteId: 7 })).rejects.toMatchObject({
      code: 'configuration_required',
    })
    expect(insertsDocuments()).toHaveLength(0)
  })

  test('IA opérationnelle : le document écrit ne contient que le contenu réel de l’IA', async () => {
    callArkStructured.mockImplementation(async ({ route }) => {
      if (route === 'compose:extract-needs') return { structured: BESOINS_ET_RECO, text: '{}' }
      if (route === 'compose:build-recommendation') return { structured: RECOMMANDATION, text: '{}' }
      return { structured: {}, text: '{}' }
    })

    const doc = await composeDevoirConseil({ brokerId: 42, clientId: 201 })

    expect(insertsDocuments()).toHaveLength(1)
    const insert = insertsDocuments()[0]
    expect(insert.sql).toMatch(/INSERT INTO compliance_documents/)
    const contenuEnregistre = String(insert.params[insert.params.length - 1])
    expect(contenuEnregistre).toContain('Local commercial')
    for (const fabrique of [
      'À définir avec le client',
      'Informations à compléter lors de',
      'Protection adaptée au profil',
      'Meilleur rapport qualité/prix',
      'Tarif plus élevé',
    ]) {
      expect({ fabrique, present: contenuEnregistre.includes(fabrique) }).toEqual({ fabrique, present: false })
    }
    expect(doc.content_data.recommendation.recommended_product.name).toBe('MRH Pro')
  })
})
