/**
 * arkVoice.cout.test.js — LE COÛT D'UN APPEL EST MESURÉ OU INCONNU, JAMAIS FORFAITAIRE.
 *
 * POURQUOI CE TEST (défaut P2 corrigé le 20/09/2026)
 * `handleWebhook` écrivait TOUJOURS `cost_eur = (duration / 60) * 0,09` — un
 * tarif forfaitaire codé en dur — dans la colonne que l'écran ARK Voice SOMME
 * (`SELECT COALESCE(SUM(cost_eur), 0)`) et compare au budget quotidien du
 * cabinet. Une estimation y devenait donc un coût réel, indistinguable.
 *
 * Contrat testé : le coût annoncé par le fournisseur est écrit tel quel ;
 * sinon `cost_eur` reste NULL (inconnu) et l'estimation locale est rangée à part
 * sous `cost_estimated_eur`, avec `cost_source` pour dire d'où vient le chiffre.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const pool = require('../db')
const { handleWebhook } = require('./arkVoice')

const updates = () =>
  pool.query.mock.calls.filter(([sql]) => /UPDATE voice_calls SET status='completed'/i.test(String(sql)))

/** Colonne → index du paramètre ($N-1) dans la requête réellement exécutée. */
function valeurColonne(update, nom) {
  const correspondance = {}
  for (const m of update[0].matchAll(/(\w+)\s*=\s*\$(\d+)/g)) correspondance[m[1]] = Number(m[2])
  expect(correspondance[nom]).toBeGreaterThan(0)
  return update[1][correspondance[nom] - 1]
}

const FIN_APPEL = (id, extra = {}) => ({
  message: { type: 'end-of-call-report', call: { id }, durationSeconds: 120, summary: 'Appel court', ...extra },
})

describe('ARK Voice — provenance du coût d’appel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    pool.query.mockResolvedValue({ rows: [{ id: 1 }] })
  })

  test('les colonnes de provenance sont créées UNE fois par processus (idempotent)', async () => {
    // Premier appel du fichier : c'est ici que l'ALTER est émis.
    await handleWebhook(FIN_APPEL('vapi_alter_1'))
    const apres1 = pool.query.mock.calls.filter(([sql]) => /ALTER TABLE voice_calls/i.test(String(sql)))
    expect(apres1.some(([sql]) => /ADD COLUMN IF NOT EXISTS cost_source/i.test(String(sql)))).toBe(true)
    expect(apres1.some(([sql]) => /ADD COLUMN IF NOT EXISTS cost_estimated_eur/i.test(String(sql)))).toBe(true)

    await handleWebhook(FIN_APPEL('vapi_alter_2'))
    const apres2 = pool.query.mock.calls.filter(([sql]) => /ALTER TABLE voice_calls/i.test(String(sql)))
    expect(apres2).toHaveLength(apres1.length)
  })

  test('coût non annoncé : cost_eur NULL (inconnu), estimation rangée à part', async () => {
    await handleWebhook(FIN_APPEL('vapi_test_1'))

    const update = updates()[0]
    expect(update).toBeDefined()
    // Le forfait d'hier (120 s → 0,18 €) ne doit PAS être écrit comme un coût réel.
    expect(valeurColonne(update, 'cost_eur')).toBeNull()
    expect(valeurColonne(update, 'cost_source')).toBe('inconnu')
    expect(valeurColonne(update, 'cost_estimated_eur')).toBeCloseTo(0.18, 4)
  })

  test('coût annoncé par le fournisseur : écrit tel quel, sans estimation', async () => {
    await handleWebhook(FIN_APPEL('vapi_test_2', { cost: 0.1234 }))

    const update = updates()[0]
    expect(valeurColonne(update, 'cost_eur')).toBe(0.1234)
    expect(valeurColonne(update, 'cost_source')).toBe('fournisseur')
    expect(valeurColonne(update, 'cost_estimated_eur')).toBeNull()
  })

  test('coût fournisseur en détail (costBreakdown.total) : également retenu', async () => {
    await handleWebhook(FIN_APPEL('vapi_test_3', { costBreakdown: { total: 0.5 } }))

    const update = updates()[0]
    expect(valeurColonne(update, 'cost_eur')).toBe(0.5)
    expect(valeurColonne(update, 'cost_source')).toBe('fournisseur')
  })
})
