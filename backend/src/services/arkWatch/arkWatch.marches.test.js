/**
 * arkWatch.marches.test.js — LES LOIS FRANÇAISES NE S'APPLIQUENT QU'EN FRANCE.
 *
 * Défaut mesuré le 20/09/2026 (P1 CH-016) : les détecteurs `hamon` (loi Hamon,
 * résiliation après 1 an) et `chatel` (préavis de 2 mois) étaient exécutés pour
 * TOUS les cabinets, y compris un cabinet établi en Suisse. Un cabinet suisse
 * recevait donc des signaux « Loi Hamon : Auto résiliable » et « Préavis Chatel :
 * relance à envoyer avant le … » : des droits et des obligations qui ne sont pas
 * ceux de son marché. Le courtier appelait son client sur un fondement faux.
 *
 * Le correctif DÉSACTIVE ces règles hors du marché français, le DIT dans le
 * compte rendu du run, et n'invente AUCUNE règle suisse de remplacement.
 */
const { runAllDetectors, getDetectorsList, DETECTORS } = require('./detectors')

/** Détecteur factice : compte ses exécutions, sans base. */
function fauxDetecteur(code, resultat = []) {
  return { code, name: `Détecteur ${code}`, severity: 'low', run: jest.fn(async () => resultat) }
}

describe('ARK Watch — marché du cabinet et détecteurs de lois françaises', () => {
  test('hamon et chatel déclarent le marché français comme seul marché applicable', () => {
    for (const code of ['hamon', 'chatel']) {
      const detector = DETECTORS.find((d) => d.code === code)
      expect(detector).toBeTruthy()
      expect(detector.marches).toEqual(['FR'])
      expect(String(detector.motifHorsMarche || '')).toMatch(/français/)
    }
  })

  test('aucun détecteur neutre ne se déclare réservé à un marché', () => {
    // Les règles qui ne citent aucune loi (échéance, silence, documents) doivent
    // rester actives partout : sinon on éteindrait la surveillance au lieu de la
    // corriger.
    for (const code of ['echeance', 'silence', 'documents_expired', 'documents_missing', 'cross_sell', 'reconquete']) {
      const detector = DETECTORS.find((d) => d.code === code)
      expect(detector.marches).toBeUndefined()
    }
  })

  test('cabinet FRANÇAIS : hamon et chatel tournent (comportement inchangé)', async () => {
    const pool = { query: jest.fn(async () => ({ rows: [], rowCount: 0 })) }
    const resultats = await runAllDetectors(1, pool, { marche: 'FR' })
    expect(resultats.marche).toBe('FR')
    expect(resultats.desactives).toEqual([])
    expect(resultats.byDetector.hamon.status).toBe('success')
    expect(resultats.byDetector.chatel.status).toBe('success')
  })

  test('cabinet SUISSE : hamon et chatel ne sont PAS exécutés et sont signalés', async () => {
    const pool = { query: jest.fn(async () => ({ rows: [], rowCount: 0 })) }
    const resultats = await runAllDetectors(1, pool, { marche: 'CH' })

    expect(resultats.marche).toBe('CH')
    const codes = resultats.desactives.map((d) => d.code).sort()
    expect(codes).toEqual(['chatel', 'hamon'])
    for (const desactive of resultats.desactives) {
      expect(desactive.marche).toBe('CH')
      expect(String(desactive.motif)).toMatch(/français/)
    }
    // Le statut dit la vérité : ni « success » (rien n'a été vérifié), ni erreur.
    expect(resultats.byDetector.hamon.status).toBe('desactive_hors_marche')
    expect(resultats.byDetector.chatel.status).toBe('desactive_hors_marche')
    // Les règles neutres continuent de tourner : la surveillance n'est pas éteinte.
    expect(resultats.byDetector.echeance.status).toBe('success')
  })

  test('un détecteur applicable est réellement exécuté, un détecteur hors marché non', async () => {
    const factice = fauxDetecteur('factice-neutre')
    const facticeFr = fauxDetecteur('factice-fr')
    facticeFr.marches = ['FR']
    DETECTORS.push(factice, facticeFr)
    try {
      const pool = { query: jest.fn(async () => ({ rows: [], rowCount: 0 })) }
      await runAllDetectors(1, pool, { marche: 'CH' })
      expect(factice.run).toHaveBeenCalledTimes(1)
      expect(facticeFr.run).not.toHaveBeenCalled()
    } finally {
      DETECTORS.splice(DETECTORS.indexOf(factice), 2)
    }
  })

  test('la liste des détecteurs dit lesquels s’appliquent au cabinet', () => {
    const ch = getDetectorsList('CH')
    const hamon = ch.find((d) => d.code === 'hamon')
    expect(hamon.actif).toBe(false)
    expect(hamon.marches).toEqual(['FR'])
    expect(String(hamon.motif)).toMatch(/français/)
    expect(ch.find((d) => d.code === 'echeance').actif).toBe(true)

    const fr = getDetectorsList('FR')
    expect(fr.every((d) => d.actif)).toBe(true)
  })
})
