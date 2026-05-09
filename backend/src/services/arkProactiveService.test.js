const {
  buildFallbackMorningBrief,
  computeClientRiskScore,
  computeCostMicroEur,
  normalizeArkAction,
  rewriteFallback,
} = require('./arkProactiveService')

describe('arkProactiveService', () => {
  test('computes deterministic client risk score from broker signals', () => {
    const score = computeClientRiskScore({
      client: { id: 1, first_name: 'Sophie', last_contact: '2025-10-01T00:00:00Z' },
      contracts: [{ date_echeance: '2026-05-20T00:00:00Z', type_contrat: 'Auto' }],
      tasks: [{ echeance: '2026-05-01T00:00:00Z', statut: 'a_faire' }],
      interactions: [],
      now: new Date('2026-05-09T12:00:00Z'),
    })

    expect(score.churn_score).toBeGreaterThanOrEqual(70)
    expect(score.factors.silence_days).toBeGreaterThan(180)
    expect(score.factors.upcoming_expiry_days).toBeLessThan(30)
    expect(score.factors.overdue_tasks).toBe(1)
  })

  test('builds a capped actionable morning brief', () => {
    const cards = buildFallbackMorningBrief({
      clients: [{ id: 1, first_name: 'Sophie', last_name: 'Martin', risk_score: 82 }],
      contracts: [{ client_id: 1, client_name: 'Sophie Martin', type_contrat: 'Auto', date_echeance: '2026-05-20T00:00:00Z' }],
      tasks: [{ client_id: 1, titre: 'Relancer Sophie', priorite: 'haute', echeance: '2026-05-01T00:00:00Z', statut: 'a_faire' }],
      events: [{ client_id: 1, title: 'RDV renouvellement', start_time: '2026-05-09T15:00:00Z' }],
      whatsappThreads: [{ client_id: 1, last_message_preview: 'Carte grise envoyée', last_message_at: '2026-05-09T10:00:00Z' }],
      now: new Date('2026-05-09T12:00:00Z'),
    })

    expect(cards).toHaveLength(5)
    expect(cards[0]).toMatchObject({ priority: expect.any(Number), suggested_action: expect.any(Object) })
    expect(cards.every((card) => card.title && card.rationale)).toBe(true)
  })

  test('normalizes ARK actions and computes bounded LLM costs', () => {
    expect(normalizeArkAction({ kind: 'email', label: 'Relancer', target: { type: 'client', id: 1 } })).toEqual({
      kind: 'email',
      label: 'Relancer',
      target: { type: 'client', id: '1' },
    })
    expect(computeCostMicroEur('claude-haiku-4-5', 1000, 500)).toBeGreaterThan(0)
  })

  test('provides deterministic rewrite fallback', () => {
    expect(rewriteFallback('bonjour client', 'commercial')).toContain('Bonjour')
    expect(rewriteFallback('texte très long avec beaucoup de détails', 'shorten').length).toBeLessThan(80)
  })
})
