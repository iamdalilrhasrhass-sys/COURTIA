const assert = require('node:assert/strict')
const { describe, test } = require('node:test')

const {
  canGenerateAdviceNote,
  assertAdviceNoteValidatable,
  splitFactsByVerification,
  pickAdviceEdits,
} = require('../src/modules/ark/adviceNoteService')

describe('ARK advice note DDA guardrails', () => {
  test('allows draft generation only from conseil state', () => {
    assert.equal(canGenerateAdviceNote('conseil').ok, true)

    const blocked = canGenerateAdviceNote('tarification')
    assert.equal(blocked.ok, false)
    assert.match(blocked.reason, /devoir de conseil|conseil/i)
  })

  test('refuses validation without needs, recommendation, and reasons', () => {
    assert.throws(() => assertAdviceNoteValidatable({
      needs_summary: 'Client cherche une MRH pour résidence principale.',
      recommendation: 'Recommandation provisoire : formule confort.',
      recommendation_reasons: '',
    }), /raisons de la recommandation/i)

    assert.throws(() => assertAdviceNoteValidatable({
      needs_summary: '',
      recommendation: 'Recommandation provisoire : formule confort.',
      recommendation_reasons: 'Elle couvre le besoin exprimé de protection du logement.',
    }), /besoins/i)
  })

  test('accepts a complete note with explicit recommendation reasons', () => {
    assert.equal(assertAdviceNoteValidatable({
      needs_summary: 'Assurer une résidence principale de 80 m².',
      recommendation: 'Recommandation provisoire : multirisque habitation confort.',
      recommendation_reasons: 'La formule répond au besoin de couvrir le logement et la responsabilité civile.',
    }), true)
  })

  test('separates verified facts from declared facts', () => {
    const facts = splitFactsByVerification([
      { field_key: 'surface_m2', value: 80, verified_at: '2026-06-07T09:00:00.000Z' },
      { field_key: 'security_features', value: 'alarme', verified_at: null },
    ])

    assert.deepEqual(facts.verified.map((fact) => fact.field_key), ['surface_m2'])
    assert.deepEqual(facts.declared.map((fact) => fact.field_key), ['security_features'])
  })

  test('keeps only broker-editable advice fields', () => {
    assert.deepEqual(pickAdviceEdits({
      needs_summary: 'Besoin corrigé',
      status: 'validated',
      validated_by: 'attacker',
      recommendation_reasons: 'Raison corrigée',
    }), {
      needs_summary: 'Besoin corrigé',
      recommendation_reasons: 'Raison corrigée',
    })
  })
})
