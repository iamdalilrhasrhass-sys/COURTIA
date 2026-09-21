/**
 * extractor.marche.test.js — L'EXTRACTION D'APPEL PARLE LE RÉFÉRENTIEL DU
 * MARCHÉ DU CABINET (défaut P0 CH-001).
 *
 * DÉFAUT MESURÉ (audit du 21/09/2026, preuve `services/voice/extractor.js:76`) :
 * le prompt d'extraction se présentait comme « assistant expert en courtage
 * d'assurance français » et demandait de normaliser « les numéros de téléphone
 * au format français (+33 ou 0X XX XX XX XX) ». Un cabinet suisse faisait donc
 * réécrire les numéros de ses clients en format français, sous un référentiel
 * français.
 *
 * CE QUE CE TEST FIGE
 *   • CH : persona FINMA/LSA/nLPD, format « +41 … / 0XX XXX XX XX », aucun +33 ;
 *     le numéro extrait est rendu au format suisse ;
 *   • FR : persona et format français (comportement historique inchangé) ;
 *   • sans marché connu : repli FR (jamais un marché inventé).
 */
jest.mock('../arkEngine', () => ({ callArkStructured: jest.fn() }))

const arkEngine = require('../arkEngine')
const extractor = require('./extractor')

/** Pool simulé : répond au marché du CABINET (utilisateur 11 = CH). */
function poolSimule(cabinet) {
  return {
    query: async (sql) => {
      const s = String(sql)
      if (s.includes('cabinet_members')) return { rows: [{ cabinet_id: cabinet.id, role: 'owner' }] }
      if (s.includes('FROM cabinets')) return { rows: [{ ...cabinet }] }
      if (s.includes('broker_profiles')) return { rows: [] }
      return { rows: [] }
    },
  }
}

const REPONSE_IA = {
  structured: {
    client: { prenom: 'Élise', nom: 'Muller', telephone: '078 123 45 67', email: null },
    besoins: [],
    prochaine_action: { type: 'rappel', detail: 'Rappeler' },
    resume_court: 'Appel court',
    confidence_globale: 0.9,
  },
  model: 'test',
}

describe('voice/extractor — persona et formats du marché (CH-001)', () => {
  beforeEach(() => jest.clearAllMocks())

  test('prompt suisse : persona FINMA/LSA/nLPD, format +41, aucun +33', () => {
    const prompt = extractor.systemeExtraction('CH')
    const utile = prompt
      .split('\n')
      .filter((ligne) => !/ne s'appliquent pas/i.test(ligne))
      .join('\n')

    expect(prompt).toContain('FINMA')
    expect(prompt).toContain('CHF')
    expect(prompt).toContain('+41')
    expect(prompt).toContain('0XX XXX XX XX')
    expect(utile).not.toContain('+33')
    expect(utile).not.toContain('€')
    expect(utile).not.toContain('ORIAS')
    expect(prompt).not.toMatch(/expert en courtage d'assurance français/)
  })

  test('prompt français : comportement historique conservé (+33, persona FR)', () => {
    const prompt = extractor.systemeExtraction('FR')
    expect(prompt).toMatch(/expert en courtage d'assurance français/)
    expect(prompt).toContain('+33')
    expect(prompt).toContain('ORIAS')
    expect(prompt).not.toContain('FINMA')
  })

  test('extraction d’un dossier d’un cabinet suisse : prompt suisse ET numéro suisse', async () => {
    arkEngine.callArkStructured.mockResolvedValue(REPONSE_IA)
    const pool = poolSimule({ id: 'cab-ch-1', name: 'Helvetia QA SA', country: 'CH', registre_type: 'FINMA' })

    const resultat = await extractor.extractFromTranscript('Bonjour, mon numéro est le 078 123 45 67…', {
      userId: 11,
      pool,
    })

    const promptEnvoye = String(arkEngine.callArkStructured.mock.calls[0][0].system)
    expect(promptEnvoye).toContain('FINMA')
    expect(promptEnvoye).not.toMatch(/expert en courtage d'assurance français/)
    // Le numéro extrait est rendu au format du marché du cabinet (jamais « 06 … »).
    expect(resultat.data.client.telephone).toBe('+41 78 123 45 67')
  })

  test('sans marché connu : repli FR (aucun marché inventé)', async () => {
    await expect(extractor.marcheDuDossier({})).resolves.toBe('FR')
    await expect(extractor.marcheDuDossier({ userId: null })).resolves.toBe('FR')
    // Marché explicite : prioritaire, même sans base.
    await expect(extractor.marcheDuDossier({ marche: 'CH' })).resolves.toBe('CH')
  })
})
