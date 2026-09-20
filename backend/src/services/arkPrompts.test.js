/**
 * Tests du paramètre marché des prompts ARK (point IA-016).
 *
 * Contrainte : pour le marché FR le comportement doit rester STRICTEMENT
 * inchangé ; pour la Suisse, les référentiels (FINMA, LSA, nLPD), le registre
 * (UID) et la devise (CHF) doivent remplacer les références françaises.
 */
const {
  ARK_PERSONA,
  getPrompt,
  resoudreMarche,
  normaliserMarche,
  appliquerMarche,
  chargerMarcheCabinet,
} = require('./arkPrompts')

describe('arkPrompts — résolution du marché du cabinet', () => {
  test('le pays prime sur la langue', () => {
    expect(resoudreMarche({ pays: 'SUISSE' })).toBe('CH')
    expect(resoudreMarche({ pays: 'CH' })).toBe('CH')
    expect(resoudreMarche({ pays: 'France' })).toBe('FR')
  })

  test('sans pays, une langue allemande ou italienne indique la Suisse', () => {
    expect(resoudreMarche({ langue: 'de' })).toBe('CH')
    expect(resoudreMarche({ langue: 'it-CH' })).toBe('CH')
  })

  test('défaut FR quand le profil est vide ou inconnu', () => {
    expect(resoudreMarche({})).toBe('FR')
    expect(resoudreMarche({ pays: 'Belgique' })).toBe('FR')
    expect(resoudreMarche()).toBe('FR')
    expect(normaliserMarche('')).toBeNull()
  })
})

describe('arkPrompts — le marché suisse n\'évoque plus le référentiel français', () => {
  const promptCh = getPrompt('clientBrief', 'CH').system

  test('les référentiels suisses remplacent les français', () => {
    expect(promptCh).toContain('FINMA')
    expect(promptCh).toContain('LSA')
    expect(promptCh).toContain('nLPD')
    // Le corps du prompt ne doit plus désigner les référentiels français comme
    // applicables : ils ne subsistent que dans la consigne qui les écarte.
    expect(promptCh).not.toContain('Autorité de surveillance: ACPR')
    expect(promptCh).not.toContain('registre unique des intermédiaires')
    expect(promptCh).not.toMatch(/Directive Distribution Assurance/)
    expect(promptCh).not.toMatch(/\bRGPD\b/)
    expect(promptCh).not.toContain('La Loi Hamon et la Loi Châtel')
    expect(promptCh).not.toMatch(/\bORIAS\b(?!, ACPR, DDA)/)
  })

  test('la devise devient le franc suisse', () => {
    expect(promptCh).toContain('CHF')
    expect(promptCh).not.toContain('€')
  })

  test('le bloc de contexte marché est injecté', () => {
    expect(promptCh).toContain('=== CONTEXTE MARCHÉ ===')
    expect(promptCh).toContain('Marché: Suisse (CH)')
    expect(promptCh).toContain('UID')
  })

  test('un cabinet suisse peut être pris directement depuis son profil', () => {
    const prompt = getPrompt('quoteAssistant', { market: 'CH' })
    expect(prompt.market).toBe('CH')
    expect(prompt.system).toContain('FINMA')
    expect(prompt.maxTokens).toBeGreaterThan(0)
  })

  test('le persona suisse ne contredit pas ses propres consignes', () => {
    // Les références françaises citées DANS le persona ne doivent pas être
    // remplacées par les motifs de substitution (qui visent le corps du prompt).
    expect(promptCh).toContain('Les référentiels français (ORIAS, ACPR, DDA) ne s\'appliquent pas')
  })
})

describe('arkPrompts — marché FR inchangé', () => {
  test('le prompt FR par défaut garde les référentiels français', () => {
    const prompt = getPrompt('clientBrief')
    expect(prompt.market).toBe('FR')
    expect(prompt.system).toContain('ORIAS')
    expect(prompt.system).toContain('ACPR')
    expect(prompt.system).toContain('DDA')
    expect(prompt.system).toContain(ARK_PERSONA)
    expect(prompt.system).not.toContain('FINMA')
  })

  test('le JSON attendu n\'est pas altéré par l\'ajout du bloc marché', () => {
    const prompt = getPrompt('clientBrief')
    expect(prompt.system).toContain('"summary"')
    expect(prompt.maxTokens).toBe(800)
  })

  test('appliquerMarche en FR n\'ajoute que le bloc de contexte', () => {
    const rendu = appliquerMarche('Question simple.', 'FR')
    expect(rendu).toContain('Question simple.')
    expect(rendu).toContain('Marché: France (FR)')
  })
})

describe('arkPrompts — lecture du marché du cabinet en base', () => {
  test('le marché vient du CABINET ; sans cabinet, du profil de la personne', async () => {
    // RÈGLE (20/09/2026) : le marché est une propriété du CABINET. Lu dans la
    // fiche de la personne connectée, il faisait répondre l'assistant IA au
    // référentiel français (ORIAS, ACPR, DDA, €) au commercial d'un cabinet
    // suisse dont la fiche était vide.
    const CAB = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const avecCabinet = {
      query: jest.fn(async (sql) => {
        const texte = String(sql)
        if (texte.includes('cabinet_members') && texte.includes('JOIN broker_profiles')) {
          return { rows: [{ user_id: 4, pays: 'CH', registre_type: 'FINMA' }] }
        }
        if (texte.includes('FROM cabinet_members')) return { rows: [{ cabinet_id: CAB, role: 'owner' }] }
        if (texte.includes('FROM cabinets')) return { rows: [{ id: CAB, name: 'Cabinet QA', country: 'CH' }] }
        return { rows: [] }
      }),
    }
    await expect(chargerMarcheCabinet(avecCabinet, 4)).resolves.toBe('CH')
    expect(avecCabinet.query.mock.calls[0][0]).toContain('cabinet_members')

    // Repli mono-utilisateur : aucun cabinet ⇒ le profil fait foi, et il est
    // bien lu en base (aucun marché inventé).
    const sansCabinet = {
      query: jest.fn(async (sql) => (String(sql).includes('FROM broker_profiles') ? { rows: [{ pays: 'CH', langue: 'fr' }] } : { rows: [] })),
    }
    await expect(chargerMarcheCabinet(sansCabinet, 4)).resolves.toBe('CH')
    expect(sansCabinet.query.mock.calls.some(([sql]) => String(sql).includes('broker_profiles'))).toBe(true)
  })

  test('un profil illisible retombe sur FR, sans marché inventé', async () => {
    const pool = { query: jest.fn(async () => { throw new Error('relation absente') }) }
    await expect(chargerMarcheCabinet(pool, 4)).resolves.toBe('FR')
    await expect(chargerMarcheCabinet(null, 4)).resolves.toBe('FR')
    const vide = { query: jest.fn(async () => ({ rows: [] })) }
    await expect(chargerMarcheCabinet(vide, 4)).resolves.toBe('FR')
  })
})
