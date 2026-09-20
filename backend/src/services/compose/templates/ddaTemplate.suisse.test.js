/**
 * ddaTemplate.suisse.test.js — un document suisse ne porte AUCUNE mention
 * française imposée, un document français les conserve toutes.
 *
 * POURQUOI CE TEST : défauts reproduits le 20/09/2026 sur un cabinet d'audit
 * dont `broker_profiles.pays = 'CH'` — le PDF DDA imprimait
 * « SIRET : [SIRET à renseigner] » (section 1), « ACPR » et
 * « 4 place de Budapest … Paris » (section 6), « Médiateur de l'Assurance » et
 * son adresse parisienne (section 5) et l'article L521-2 du Code des assurances
 * (pied de page). Un cabinet suisse remettait donc à son client un document
 * réglementaire français.
 *
 * Le test LIT LE TEXTE RÉELLEMENT ÉCRIT dans le PDF (flux FlateDecode de
 * PDFKit, chaînes hexadécimales en Latin-1) : il ne se contente pas de vérifier
 * que le code ne contient pas certaines chaînes.
 *
 * Contrepartie obligatoire : le marché français garde toutes ses mentions.
 */

const zlib = require('zlib')
const { generateDda } = require('./ddaTemplate')

/** Décode un tableau `[<hex> 30 <hex>] TJ` de PDFKit en texte lisible. */
function textePdf(buffer) {
  const brut = buffer.toString('latin1')
  const flux = brut.match(/stream\r?\n([\s\S]*?)endstream/g) || []
  const lignes = []
  for (const blocFlux of flux) {
    const corps = blocFlux.replace(/^stream\r?\n/, '').replace(/endstream$/, '')
    let contenu
    try {
      contenu = zlib.inflateSync(Buffer.from(corps, 'latin1')).toString('latin1')
    } catch {
      contenu = corps
    }
    if (!contenu.includes('BT')) continue
    for (const bloc of contenu.match(/BT([\s\S]*?)ET/g) || []) {
      const morceaux = []
      const unites = bloc.match(/\[(.*?)\]\s*TJ|<([0-9A-Fa-f\s]*)>\s*Tj|\(((?:[^()\\]|\\.)*)\)\s*Tj/g) || []
      for (const unite of unites) {
        const segments = unite.match(/<([0-9A-Fa-f\s]*)>|\(((?:[^()\\]|\\.)*)\)/g) || []
        for (const segment of segments) {
          if (segment.startsWith('<') && segment.endsWith('>')) {
            try {
              morceaux.push(Buffer.from(segment.slice(1, -1).replace(/\s/g, ''), 'hex').toString('latin1'))
            } catch { /* segment illisible : ignoré */ }
          } else {
            morceaux.push(segment.slice(1, -1))
          }
        }
      }
      if (morceaux.length) lignes.push(morceaux.join(''))
    }
  }
  return lignes.join('\n')
}

const CABINET_SUISSE = {
  market: 'CH',
  country: 'Suisse',
  company_name: 'Cabinet Audit Suisse SA',
  legal_form: 'SA',
  uid: 'CHE-123.456.789',
  registre_type: 'FINMA',
  registre_numero: '',
  supervisor_name: 'FINMA (Autorité fédérale de surveillance des marchés financiers)',
  supervisor_address: 'Laupenstrasse 27, 3003 Berne',
  address: 'Rue du Lac 12',
  postal_code: '1844',
  city: 'Villeneuve',
  phone: '+41 21 000 00 00',
  rcp_coverage_amount: 1500000,
}

const CABINET_FRANCAIS = {
  market: 'FR',
  country: 'France',
  company_name: 'Cabinet France SAS',
  legal_form: 'SAS',
  siret: '12345678900012',
  orias_number: '07000001',
  address: '1 rue de la Paix',
  postal_code: '75002',
  city: 'Paris',
  rcp_coverage_amount: 1500000,
}

/**
 * Mentions qui ne doivent JAMAIS apparaître sur un document suisse.
 *
 * Le texte extrait peut avoir perdu un espace (deux segments `TJ` consécutifs
 * sont concaténés), donc on n'exige une frontière que du côté gauche — sinon
 * « l'ORIAS est » deviendrait « l'ORIASest » et passerait inaperçu. Le côté
 * gauche est indispensable : sans lui, « DISTRIBUTEUR » serait lu comme « EUR ».
 */
const MENTIONS_FRANCAISES = {
  ORIAS: /(?<![A-Za-z])ORIAS/,
  ACPR: /(?<![A-Za-z])ACPR/,
  SIRET: /(?<![A-Za-z])SIRET/,
  Paris: /(?<![A-Za-z])Paris/,
  'code EUR': /(?<![A-Za-z])EUR(?![A-Za-z])/,
  TVA: /(?<![A-Za-z])TVA(?![A-Za-z])/,
}

describe('DDA — cabinet suisse (pays = CH)', () => {
  let texte

  beforeAll(async () => {
    const buffer = await generateDda({
      broker: CABINET_SUISSE,
      client: { nom: 'Dupont', prenom: 'Léa' },
      generatedAt: new Date('2026-09-20T10:00:00Z'),
    })
    texte = textePdf(buffer)
  })

  test('le texte du PDF est réellement extrait (le test porte sur le document)', () => {
    expect(texte).toContain('Cabinet Audit Suisse SA')
    expect(texte).toContain('AUTORITÉ DE CONTRÔLE')
  })

  test.each(Object.entries(MENTIONS_FRANCAISES))('aucune mention « %s » sur un document suisse', (_nom, motif) => {
    expect(texte).not.toMatch(motif)
  })

  test('aucun symbole ni code euro imposé', () => {
    expect(texte).not.toContain('€')
    expect(texte).not.toMatch(/\bEUR\b/)
  })

  test('l’autorité suisse et son adresse officielle sont bien reprises', () => {
    expect(texte).toContain('FINMA')
    expect(texte).toContain('Laupenstrasse 27, 3003 Berne')
  })

  test('l’IDE (UID) du cabinet est repris, jamais un SIRET', () => {
    expect(texte).toContain('CHE-123.456.789')
    expect(texte).not.toContain('SIRET')
  })

  test('la couverture RCP est en francs suisses, format suisse', () => {
    expect(texte).toContain('CHF')
    expect(texte).not.toContain('1500000')
  })

  test('la date est au format suisse (fr-CH)', () => {
    expect(texte).toMatch(/20\.09\.2026/)
  })
})

describe('DDA — cabinet suisse dont la fiche de composition a gardé les valeurs françaises par défaut', () => {
  // `broker_profile_settings.supervisor_name` vaut « ACPR » et son adresse
  // « 4 place de Budapest … Paris » par défaut de base de données
  // (migration 101), tout comme `country` qui vaut « France ». Ces valeurs
  // étaient recopiées telles quelles sur le document d'un cabinet suisse.
  let texte

  beforeAll(async () => {
    const buffer = await generateDda({
      broker: {
        ...CABINET_SUISSE,
        // Valeurs héritées de la base, non remplacées par le cabinet :
        supervisor_name: 'ACPR',
        supervisor_address: '4 place de Budapest CS 92459 75436 Paris cedex 09',
        country: 'France',
      },
      client: { nom: 'Dupont', prenom: 'Léa' },
      generatedAt: new Date('2026-09-20T10:00:00Z'),
    })
    texte = textePdf(buffer)
  })

  test('l’autorité imprimée reste suisse (FINMA) et jamais l’ACPR', () => {
    expect(texte).toContain('FINMA')
    expect(texte).not.toMatch(/ACPR/)
  })

  test('l’adresse imprimée reste celle de la FINMA (Berne), jamais Paris', () => {
    expect(texte).toContain('Laupenstrasse 27, 3003 Berne')
    expect(texte).not.toMatch(/Paris/)
  })

  test('le pays affiché est la Suisse, pas le « France » par défaut', () => {
    expect(texte).toContain('Suisse')
    expect(texte).not.toMatch(/France/)
  })
})

describe('DDA — cabinet français (pays = FR) : le marché français est intact', () => {
  let texte

  beforeAll(async () => {
    const buffer = await generateDda({
      broker: CABINET_FRANCAIS,
      client: { nom: 'Martin', prenom: 'Paul' },
      generatedAt: new Date('2026-09-20T10:00:00Z'),
    })
    texte = textePdf(buffer)
  })

  test.each(['ORIAS', 'ACPR', 'SIRET', 'Paris'])('la mention « %s » est conservée', (mot) => {
    expect(texte).toContain(mot)
  })

  test('le SIRET déclaré est imprimé', () => {
    expect(texte).toContain('12345678900012')
  })

  test('l’article L521-2 du Code des assurances reste cité', () => {
    expect(texte).toContain('L521-2')
  })

  test('la FINMA n’apparaît jamais sur un document français', () => {
    expect(texte).not.toContain('FINMA')
  })
})
