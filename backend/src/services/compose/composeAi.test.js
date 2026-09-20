/**
 * composeAi.test.js — garde-fou : un document de conformité ne contient JAMAIS
 * un contenu de repli fabriqué.
 *
 * POURQUOI CE TEST (mesuré le 20/09/2026) : sur échec IA, ce module
 * « utilisait un fallback » qui inventait le contenu client — besoins
 * « À définir avec le client », situation « Informations à compléter lors de
 * l'entretien », objectifs « Protection adaptée au profil », recommandation
 * « Meilleur rapport qualité/prix » avec confidence_score 50, IPID
 * `{exclusions: [], premium: {}}`. Ce repli partait dans un devoir de conseil,
 * un DDA ou un IPID : un document réglementaire factice.
 */
jest.mock('../arkEngine', () => ({ callArkStructured: jest.fn() }))
jest.mock('../../db', () => ({ query: jest.fn() }))

const { callArkStructured } = require('../arkEngine')
const pool = require('../../db')
const {
  extractNeedsFromClient,
  buildRecommendation,
  generateIpidContent,
  enrichQuoteData,
} = require('./composeAi')

/** Contenus que l'ancien repli inventait : ils ne doivent PLUS jamais sortir. */
const CONTENUS_FABRIQUES = [
  'À définir avec le client',
  'Informations à compléter lors de l’entretien',
  "Informations à compléter lors de l'entretien",
  'Protection adaptée au profil',
  'Meilleur rapport qualité/prix',
  'Tarif plus élevé',
  'Recommandation basée sur le tarif',
]

const MOTEUR_ABSENT = {
  text: null,
  error: 'configuration_required',
  message: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY.',
  usage: { inputTokens: 0, outputTokens: 0 },
}
const REPONSE_INEXPLOITABLE = {
  text: 'Voici une réponse en prose que le modèle a écrite au lieu du JSON demandé.',
  structured: null,
  usage: { inputTokens: 10, outputTokens: 10 },
}

function verifierAucunContenuFabrique(valeur) {
  const texte = JSON.stringify(valeur ?? '')
  for (const fabrique of CONTENUS_FABRIQUES) {
    expect({ fabrique, present: texte.includes(fabrique) }).toEqual({ fabrique, present: false })
  }
}

describe('composeAi — fail-closed sur les documents de conformité', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    pool.query.mockImplementation(async (sql) => {
      if (/FROM clients c/.test(sql)) return { rows: [{ id: 201, type: 'particulier' }] }
      if (/FROM clients WHERE id/.test(sql)) return { rows: [{ id: 201, nom: 'Dupont' }] }
      if (/FROM notes/.test(sql)) return { rows: [] }
      if (/FROM dda_quizzes/.test(sql)) return { rows: [] }
      if (/FROM quotes/.test(sql)) return { rows: [{ id: 7, premium_annual: 480 }] }
      return { rows: [] }
    })
  })

  test('moteur IA absent : extractNeedsFromClient refuse au lieu d’inventer les besoins', async () => {
    callArkStructured.mockResolvedValue(MOTEUR_ABSENT)

    await expect(extractNeedsFromClient(201, 42)).rejects.toMatchObject({
      code: 'configuration_required',
      erreurIa: true,
    })
    await extractNeedsFromClient(201, 42).catch((err) => verifierAucunContenuFabrique(err.message))
  })

  test('réponse IA sans JSON exploitable : refus (ia_indisponible), aucun besoin fabriqué', async () => {
    callArkStructured.mockResolvedValue(REPONSE_INEXPLOITABLE)

    await expect(extractNeedsFromClient(201, 42)).rejects.toMatchObject({ code: 'ia_indisponible' })
  })

  test('buildRecommendation refuse de « recommander le moins cher » sans analyse', async () => {
    callArkStructured.mockResolvedValue(MOTEUR_ABSENT)

    await expect(buildRecommendation({ clientId: 201, brokerId: 42 })).rejects.toMatchObject({
      code: 'configuration_required',
      erreurIa: true,
    })
  })

  test('generateIpidContent ne produit pas d’IPID tronqué (exclusions/prime vides)', async () => {
    callArkStructured.mockResolvedValue(MOTEUR_ABSENT)

    await expect(generateIpidContent({ productData: { name: 'MRH' }, coverageData: {}, brokerId: 42 }))
      .rejects.toMatchObject({ code: 'configuration_required', erreurIa: true })

    // Une réponse texte sans JSON ne devient pas non plus un IPID « complet ».
    callArkStructured.mockResolvedValue(REPONSE_INEXPLOITABLE)
    await expect(generateIpidContent({ productData: { name: 'MRH' }, coverageData: {}, brokerId: 42 }))
      .rejects.toMatchObject({ code: 'ia_indisponible' })
  })

  test('enrichQuoteData signale l’échec au lieu de renvoyer le devis inchangé en silence', async () => {
    callArkStructured.mockResolvedValue(MOTEUR_ABSENT)
    await expect(enrichQuoteData({ id: 7, premium_annual: 480 }, 42)).rejects.toMatchObject({
      code: 'configuration_required',
    })

    // Moteur « up » mais enrichissement vide : ce n'est pas un enrichissement.
    callArkStructured.mockResolvedValue({ structured: { guarantees: [] }, text: '{}' })
    await expect(enrichQuoteData({ id: 7 }, 42)).rejects.toMatchObject({ code: 'ia_indisponible' })
  })

  test('le chemin nominal reste intact : le contenu réel de l’IA est renvoyé', async () => {
    callArkStructured.mockResolvedValue({
      structured: {
        besoins: [{ type: 'MRH', description: 'Local commercial', priority: 'haute' }],
        situation: 'Artisan locataire',
        objectifs: ['Protéger le local'],
      },
      text: '{}',
    })
    const besoins = await extractNeedsFromClient(201, 42)
    expect(besoins.besoins[0].description).toBe('Local commercial')

    callArkStructured.mockResolvedValue({
      structured: { product: { name: 'MRH' }, coverage: { guarantees: [] }, exclusions: ['Guerre'] },
      text: '{}',
    })
    const ipid = await generateIpidContent({ productData: {}, coverageData: {}, brokerId: 42 })
    expect(ipid.exclusions).toEqual(['Guerre'])

    callArkStructured.mockResolvedValue({ structured: { guarantees: [{ name: 'Incendie' }] }, text: '{}' })
    const devis = await enrichQuoteData({ id: 7 }, 42)
    expect(devis.guarantees).toEqual([{ name: 'Incendie' }])
  })
})
