/**
 * inboundProcessor.test.js — LE REPLI REGEX N'EST PAS UNE ANALYSE IA.
 *
 * POURQUOI CE TEST (défaut P1 mesuré en production le 20/09/2026)
 *     POST /api/messaging/webhook/inbound { subject: 'ok go' }
 *     → analyse { type: 'accord', confiance: 0.7 } enregistrée telle quelle et
 *       statut client passé à « signe ».
 * Aucun modèle n'avait lu le message : la classification venait de
 * `fallbackAnalysis`, une correspondance de mots-clés. Elle était pourtant
 * stockée dans `messages.analyse_type/analyse_confiance` (indistinguable d'une
 * vraie analyse) et elle modifiait le portefeuille du cabinet.
 *
 * Contrat testé : la source est CONSERVÉE (`analyse_source`), et seul un
 * résultat réellement produit par l'IA (`source: 'ia'`) avec une confiance
 * suffisante peut écrire le statut client.
 */
jest.mock('@anthropic-ai/sdk', () => {
  const create = jest.fn()
  const Ctor = jest.fn(() => ({ messages: { create } }))
  Ctor.__create = create
  return Ctor
})

const Anthropic = require('@anthropic-ai/sdk')
const {
  processInboundEmail,
  fallbackAnalysis,
  peutChangerStatutClient,
  SEUIL_CONFIANCE_STATUT,
} = require('./inboundProcessor')

const EMAIL_CLIENT = 'elise@example.test'

/** Pool simulé qui enregistre TOUT ce qui est exécuté. */
function creerPool({ clientExiste = true } = {}) {
  const appels = []
  return {
    appels,
    query: async (sql, params) => {
      const requete = String(sql)
      appels.push({ sql: requete, params })
      if (/LOWER\(email\)/i.test(requete)) {
        return {
          rows: clientExiste
            ? [{ id: 201, first_name: 'Élise', last_name: 'Martin', email: EMAIL_CLIENT, status: 'prospect' }]
            : [],
        }
      }
      return { rows: [{ id: 1 }] }
    },
  }
}

const ecrituresStatut = (pool) =>
  pool.appels.filter(({ sql }) => /UPDATE\s+clients\s+SET\s+status/i.test(sql))

const insertionsMessage = (pool) =>
  pool.appels.filter(({ sql }) => /INSERT INTO messages/i.test(sql))

describe('inboundProcessor — provenance de l’analyse et écriture du statut client', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.ANTHROPIC_API_KEY
  })

  test('la table `messages` porte la colonne `analyse_source` (création ET migration)', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const pool = creerPool()
    await processInboundEmail(pool, { from: EMAIL_CLIENT, subject: 'Bonjour', body: 'Question sur mon contrat' })

    expect(pool.appels.some(({ sql }) => /CREATE TABLE IF NOT EXISTS messages/i.test(sql))).toBe(true)
    expect(pool.appels.some(({ sql }) => /ADD COLUMN IF NOT EXISTS analyse_source/i.test(sql))).toBe(true)
  })

  test('sans IA : « ok go » est enregistré comme analyse REGEX et ne change AUCUN statut', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const pool = creerPool()

    const resultat = await processInboundEmail(pool, {
      from: EMAIL_CLIENT,
      subject: 'ok go',
      body: 'ok go',
    })

    expect(resultat.analyse.type).toBe('accord')
    expect(resultat.analyse_source).toBe('regex')
    // Le message est conservé, mais il est étiqueté « regex », pas « ia ».
    const insertion = insertionsMessage(pool)[0]
    expect(insertion).toBeDefined()
    expect(insertion.sql).toContain('analyse_source')
    expect(insertion.params).toContain('regex')
    // Le statut client n'est PAS touché.
    expect(ecrituresStatut(pool)).toHaveLength(0)
    expect(resultat.statut_nouveau).toBeNull()
    expect(resultat.action).toBe('status_non_modifie')
    expect(resultat.motif_statut).toBe('analyse_locale_regex_non_autorisee_a_ecrire')
    expect(resultat.statut_precedent).toBe('prospect')
  })

  test('IA confiante : l’analyse est marquée « ia » et peut modifier le statut', async () => {
    process.env.ANTHROPIC_API_KEY = 'cle-de-test'
    Anthropic.__create.mockResolvedValue({
      content: [{ text: JSON.stringify({ type: 'accord', confiance: 0.92, resume: 'Le client accepte', action_suggeree: 'Finaliser', intention_principale: 'acceptation' }) }],
    })
    const pool = creerPool()

    const resultat = await processInboundEmail(pool, { from: EMAIL_CLIENT, subject: 'Contrat', body: 'Je signe' })

    expect(resultat.analyse_source).toBe('ia')
    expect(insertionsMessage(pool)[0].params).toContain('ia')
    expect(ecrituresStatut(pool)).toHaveLength(1)
    expect(resultat.statut_nouveau).toBe('signe')
    expect(resultat.action).toBe('status_updated')
  })

  test('IA peu confiante : analyse enregistrée comme « ia » mais statut inchangé', async () => {
    process.env.ANTHROPIC_API_KEY = 'cle-de-test'
    Anthropic.__create.mockResolvedValue({
      content: [{ text: JSON.stringify({ type: 'accord', confiance: 0.5, resume: 'Ambigu', action_suggeree: 'Vérifier', intention_principale: 'peut_etre' }) }],
    })
    const pool = creerPool()

    const resultat = await processInboundEmail(pool, { from: EMAIL_CLIENT, subject: 'Peut-être', body: 'À voir' })

    expect(resultat.analyse_source).toBe('ia')
    expect(ecrituresStatut(pool)).toHaveLength(0)
    expect(resultat.statut_nouveau).toBeNull()
    expect(resultat.motif_statut).toBe('confiance_ia_insuffisante')
  })

  test('panne du modèle : repli regex, donc aucune écriture de statut', async () => {
    process.env.ANTHROPIC_API_KEY = 'cle-de-test'
    Anthropic.__create.mockRejectedValue(new Error('invalid x-api-key for account sk-ant-…'))
    const pool = creerPool()

    const resultat = await processInboundEmail(pool, { from: EMAIL_CLIENT, subject: 'ok go', body: 'ok go' })

    expect(resultat.analyse_source).toBe('regex')
    expect(ecrituresStatut(pool)).toHaveLength(0)
    expect(resultat.statut_nouveau).toBeNull()
  })

  test('la règle de décision est explicite et testable', () => {
    expect(SEUIL_CONFIANCE_STATUT).toBeGreaterThanOrEqual(0.7)
    expect(peutChangerStatutClient({ source: 'regex', confiance: 0.99 }).autorise).toBe(false)
    expect(peutChangerStatutClient({ source: 'inconnue', confiance: 0.99 }).autorise).toBe(false)
    expect(peutChangerStatutClient({ source: 'ia', confiance: 0.4 }).autorise).toBe(false)
    expect(peutChangerStatutClient({ source: 'ia', confiance: 0.9 }).autorise).toBe(true)
    // Le repli lui-même déclare sa provenance.
    expect(fallbackAnalysis('ok go', '').source).toBe('regex')
  })
})
