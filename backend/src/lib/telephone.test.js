/**
 * telephone.test.js — LA RÈGLE DE NORMALISATION NE DEVINE JAMAIS LE PAYS
 * (défaut P0 CH-008, mesuré le 21/09/2026).
 *
 * DÉFAUT MESURÉ (code d'avant ce correctif) :
 *     sanitizePhone('078 123 45 67')  →  '+33781234567'
 * Un mobile suisse de 10 chiffres était lu comme un numéro français : les SMS
 * et WhatsApp de relance partaient vers un numéro inexistant.
 *
 * CE QUE CE TEST FIGE
 *   1. national suisse + pays connu → `+41…` (jamais `+33…`) ;
 *   2. national français + pays connu → `+33…` ;
 *   3. `+41…`, `+33…`, `0041…`, `0033…` → pays CONSERVÉ, jamais réécrit ;
 *   4. chaîne vide, numéro trop court, numéro trop long → `null` ;
 *   5. espaces, points, tirets, parenthèses nettoyés ; « +33 (0)6… » correct ;
 *   6. national SANS pays connu → `null` : la forme est ambiguë (même longueur
 *      en France et en Suisse), donc on refuse au lieu de produire un numéro
 *      faux — c'est la règle demandée par le constat.
 */
const {
  INDICATIFS,
  normaliserPays,
  formatsTelephone,
  normaliserTelephone,
} = require('./telephone')

describe('lib/telephone — normalisation des numéros (CH-008)', () => {
  test('un mobile suisse national devient +41 (plus jamais +33)', () => {
    expect(normaliserTelephone('078 123 45 67', { pays: 'CH' })).toBe('+41781234567')
    expect(normaliserTelephone('079 123 45 67', { pays: 'CH' })).toBe('+41791234567')
    // Fixe suisse (Zurich) : 0XX XXX XX XX, 10 chiffres comme un numéro français.
    expect(normaliserTelephone('044 123 45 67', { pays: 'CH' })).toBe('+41441234567')
    // Le pays peut arriver en clair, comme dans `clients.country`.
    expect(normaliserTelephone('021 123 45 67', { country: 'Suisse' })).toBe('+41211234567')
  })

  test('un numéro français national reste +33 (comportement historique)', () => {
    expect(normaliserTelephone('06 12 34 56 78', { pays: 'FR' })).toBe('+33612345678')
    expect(normaliserTelephone('01 40 00 00 00', { pays: 'France' })).toBe('+33140000000')
  })

  test('les numéros internationaux ne changent JAMAIS de pays', () => {
    expect(normaliserTelephone('+41 78 123 45 67')).toBe('+41781234567')
    expect(normaliserTelephone('+33 6 12 34 56 78')).toBe('+33612345678')
    expect(normaliserTelephone('0041 78 123 45 67')).toBe('+41781234567')
    expect(normaliserTelephone('0033 6 12 34 56 78')).toBe('+33612345678')
    // Pays connu et fiche opposés : l'indicatif du numéro est la seule autorité.
    expect(normaliserTelephone('+41 78 123 45 67', { pays: 'FR' })).toBe('+41781234567')
    expect(normaliserTelephone('0041 78 123 45 67', { pays: 'FR' })).toBe('+41781234567')
  })

  test('la forme internationale sans + est reconnue par son indicatif (pas une devinette)', () => {
    expect(normaliserTelephone('41781234567')).toBe('+41781234567')
    expect(normaliserTelephone('33612345678')).toBe('+33612345678')
  })

  test('un numéro national SANS pays connu est refusé, jamais converti en +33', () => {
    // C'est le défaut mesuré : ce cas produisait `+33781234567`.
    expect(normaliserTelephone('078 123 45 67')).toBeNull()
    expect(normaliserTelephone('06 12 34 56 78')).toBeNull()
  })

  test('vide, trop court, trop long ou sans chiffres : aucun numéro inventé', () => {
    expect(normaliserTelephone('')).toBeNull()
    expect(normaliserTelephone('   ')).toBeNull()
    expect(normaliserTelephone(null)).toBeNull()
    expect(normaliserTelephone(undefined)).toBeNull()
    // Trop court : un mobile suisse s'écrit sur 10 caractères, pas 9.
    expect(normaliserTelephone('078123456', { pays: 'CH' })).toBeNull()
    expect(normaliserTelephone('0612345', { pays: 'FR' })).toBeNull()
    // Trop long.
    expect(normaliserTelephone('078123456789', { pays: 'CH' })).toBeNull()
    // Des lettres ou un texte libre ne deviennent pas un numéro.
    expect(normaliserTelephone('pas de numéro', { pays: 'CH' })).toBeNull()
    // Chiffres sans indicatif ni 0 national : supposer le pays serait une devinette.
    expect(normaliserTelephone('612345678')).toBeNull()
  })

  test('espaces, points, tirets et parenthèses sont nettoyés', () => {
    expect(normaliserTelephone('078.123.45.67', { pays: 'CH' })).toBe('+41781234567')
    expect(normaliserTelephone('078-123-45-67', { pays: 'CH' })).toBe('+41781234567')
    expect(normaliserTelephone('078 123 45 67', { pays: 'CH' })).toBe('+41781234567')
    expect(normaliserTelephone('(078) 123 45 67', { pays: 'CH' })).toBe('+41781234567')
    expect(normaliserTelephone('+33 (0)6 12 34 56 78')).toBe('+33612345678')
    expect(normaliserTelephone('+41 (0)78 123 45 67')).toBe('+41781234567')
  })

  test('les plans de numérotation sont ceux des deux marchés servis', () => {
    expect(INDICATIFS.CH.indicatif).toBe('+41')
    expect(INDICATIFS.CH.national).toBe('0XX XXX XX XX')
    expect(INDICATIFS.FR.indicatif).toBe('+33')
    expect(normaliserPays('Suisse')).toBe('CH')
    expect(normaliserPays('France')).toBe('FR')
    expect(normaliserPays('')).toBeNull()
    // Aide de prompt : jamais « format français » à un cabinet suisse.
    expect(formatsTelephone('CH')).toContain('+41')
    expect(formatsTelephone('CH')).not.toContain('+33')
  })
})
