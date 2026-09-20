/**
 * arkProactiveService.probe.test.js — LE MODE LLM SE DÉDUIT DE LA SONDE RÉELLE.
 *
 * POURQUOI CE TEST (défaut P1 IA-008 corrigé le 20/09/2026)
 * `buildAndStoreMorningBrief` renvoyait
 *     source: 'llm_ready_with_deterministic_cards'
 * dès que `ANTHROPIC_API_KEY` était PRÉSENTE — même quand la sonde échouait
 * (clé invalide, quota, réseau). Le cockpit annonçait donc un mode LLM
 * opérationnel qui ne répondait pas.
 * La sonde écrivait de plus dans `ark_runs` des jetons INVENTÉS
 * (`inputTokens: 50, outputTokens: 5`) et débitait le budget ARK pour un appel
 * qui n'avait produit aucun jeton mesurable.
 *
 * Contrat testé : sonde en échec ⇒ mode local et AUCUN jeton facturé ; sonde
 * réussie ⇒ mode LLM et uniquement les jetons réellement renvoyés.
 */
jest.mock('@anthropic-ai/sdk', () => {
  const create = jest.fn()
  const Ctor = jest.fn(() => ({ messages: { create } }))
  Ctor.__create = create
  return Ctor
})

const Anthropic = require('@anthropic-ai/sdk')
const { buildAndStoreMorningBrief } = require('./arkProactiveService')

/** Pool simulé : compte les écritures dans `ark_runs` et `ark_budgets`. */
function creerPool() {
  const appels = []
  return {
    appels,
    query: async (sql, params) => {
      const requete = String(sql)
      appels.push({ sql: requete, params })
      if (/FROM ark_budgets/i.test(requete)) {
        return { rows: [{ user_id: 11, paused: false, current_spend_micro_eur: 0, hard_cap_micro_eur: 25000000 }] }
      }
      return { rows: [{ id: 1 }] }
    },
  }
}

const runsMorningBrief = (pool) =>
  pool.appels.filter(({ sql, params }) =>
    /INSERT INTO ark_runs/i.test(sql) && String((params || [])[1] || '').includes('morning_brief'))

const debits = (pool) =>
  pool.appels.filter(({ sql }) => /UPDATE ark_budgets/i.test(sql))

describe('morning brief — mode et facturation déduits de la sonde', () => {
  afterEach(() => {
    jest.clearAllMocks()
    delete process.env.ANTHROPIC_API_KEY
  })

  test('sonde en échec : mode local, aucun jeton, aucun débit du budget', async () => {
    process.env.ANTHROPIC_API_KEY = 'cle-invalide'
    Anthropic.__create.mockRejectedValue(new Error('invalid x-api-key'))
    const pool = creerPool()

    const resultat = await buildAndStoreMorningBrief(pool, 11)

    expect(resultat.source).toBe('deterministic_fallback')
    expect(resultat.llm_probe).toMatchObject({ tentee: true, reussie: false })

    const run = runsMorningBrief(pool)[0]
    expect(run).toBeDefined()
    // [userId, feature, model, inputTokens, outputTokens, cost, latency, status, error]
    expect(run.params[3]).toBe(0)
    expect(run.params[4]).toBe(0)
    expect(run.params[5]).toBe(0)
    expect(run.params[7]).toBe('sonde_echec')
    expect(debits(pool)).toHaveLength(0)
    // Les jetons inventés d'hier ne doivent plus apparaître.
    expect(JSON.stringify(run.params)).not.toContain('"50"')
  })

  test('sonde réussie : mode LLM et jetons RÉELLEMENT renvoyés par le fournisseur', async () => {
    process.env.ANTHROPIC_API_KEY = 'cle-valide'
    Anthropic.__create.mockResolvedValue({
      model: 'claude-sonnet-4-5',
      usage: { input_tokens: 41, output_tokens: 3 },
      content: [{ text: 'OK' }],
    })
    const pool = creerPool()

    const resultat = await buildAndStoreMorningBrief(pool, 11)

    expect(resultat.source).toBe('llm_ready_with_deterministic_cards')
    expect(resultat.llm_probe).toMatchObject({ tentee: true, reussie: true, jetons_entree: 41, jetons_sortie: 3 })

    const run = runsMorningBrief(pool)[0]
    expect(run.params[2]).toBe('claude-sonnet-4-5')
    expect(run.params[3]).toBe(41)
    expect(run.params[4]).toBe(3)
    expect(run.params[5]).toBeGreaterThan(0)
    expect(debits(pool)).toHaveLength(1)
  })

  test('sonde réussie sans usage : rien à facturer', async () => {
    process.env.ANTHROPIC_API_KEY = 'cle-valide'
    Anthropic.__create.mockResolvedValue({ model: 'claude-sonnet-4-5', content: [{ text: 'OK' }] })
    const pool = creerPool()

    const resultat = await buildAndStoreMorningBrief(pool, 11)

    expect(resultat.source).toBe('llm_ready_with_deterministic_cards')
    const run = runsMorningBrief(pool)[0]
    expect(run.params[3]).toBe(0)
    expect(run.params[4]).toBe(0)
    expect(run.params[5]).toBe(0)
    expect(run.params[7]).toBe('success_sans_usage')
    expect(debits(pool)).toHaveLength(0)
  })

  test('sans clé : aucune sonde tentée, mode local', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const pool = creerPool()

    const resultat = await buildAndStoreMorningBrief(pool, 11)

    expect(resultat.source).toBe('deterministic_fallback')
    expect(resultat.llm_probe.tentee).toBe(false)
    expect(Anthropic.__create).not.toHaveBeenCalled()
    expect(runsMorningBrief(pool)).toHaveLength(0)
  })
})
