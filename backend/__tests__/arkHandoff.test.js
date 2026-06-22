const assert = require('node:assert/strict')
const { describe, test } = require('node:test')

const { getProductRequirements } = require('../src/modules/ark/verticals')
const { scoreAgainst } = require('../src/modules/ark/scoring')
const {
  HANDOFF_RULES,
  matchHandoffRules,
  validateHandoffRules,
} = require('../src/modules/ark/handoffRules')
const {
  buildHandoffTargets,
  scorePrefilledDossier,
} = require('../src/modules/ark/handoffService')

describe('ARK inter-vertical handoff rules', () => {
  test('creates credit and insurance targets from a real-estate transaction', () => {
    const rules = matchHandoffRules({
      verticalKey: 'immobilier',
      productType: 'transaction',
      status: 'tarification',
    })

    const targets = buildHandoffTargets({
      dossier: {
        id: 'dossier-immo-1',
        vertical_key: 'immobilier',
        product_type: 'transaction',
        status: 'tarification',
      },
      rules,
    })

    assert.equal(rules.length, 1)
    assert.equal(targets.length, 2)
    assert.deepEqual(targets.map((target) => target.vertical_key), ['credit_immobilier', 'assurance'])
    assert.deepEqual(targets.map((target) => target.product_type), ['pret_immobilier', 'habitation'])
    assert.deepEqual(targets.map((target) => target.relation), ['financing', 'insurance'])
  })

  test('creates insurance target from a signed mortgage dossier', () => {
    const rules = matchHandoffRules({
      verticalKey: 'credit_immobilier',
      productType: 'pret_immobilier',
      status: 'souscription',
    })

    const targets = buildHandoffTargets({
      dossier: {
        id: 'dossier-credit-1',
        vertical_key: 'credit_immobilier',
        product_type: 'pret_immobilier',
        status: 'souscription',
      },
      rules,
    })

    assert.equal(targets.length, 1)
    assert.equal(targets[0].vertical_key, 'assurance')
    assert.equal(targets[0].product_type, 'habitation')
    assert.equal(targets[0].relation, 'insurance')
  })

  test('does not trigger on non-trigger states', () => {
    assert.equal(matchHandoffRules({
      verticalKey: 'immobilier',
      productType: 'transaction',
      status: 'qualification',
    }).length, 0)
  })

  test('every handoff target points to a real registry product', () => {
    const errors = validateHandoffRules(getProductRequirements)
    assert.deepEqual(errors, [])
    assert.ok(HANDOFF_RULES.length >= 3)
  })

  test('uses the shared scorer for prefilled downstream dossiers', () => {
    const knownFields = ['first_name', 'last_name', 'address', 'property_type', 'surface_m2', 'rooms', 'occupancy_status']
    const knownDocuments = ['rib']

    const expected = scoreAgainst(getProductRequirements('assurance', 'habitation'), {
      presentFields: knownFields,
      presentDocuments: knownDocuments,
    })
    const actual = scorePrefilledDossier({
      verticalKey: 'assurance',
      productType: 'habitation',
      presentFields: knownFields,
      presentDocuments: knownDocuments,
    })

    assert.equal(actual.completion_score, expected.completion_score)
    assert.equal(actual.completion_score, 89)
    assert.deepEqual(actual.missing_fields, ['security_features'])
    assert.deepEqual(actual.missing_documents, [])
  })
})
