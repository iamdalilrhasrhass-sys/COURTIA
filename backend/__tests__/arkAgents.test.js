const assert = require('node:assert/strict')
const { describe, test } = require('node:test')

const { getAgent, listAgents } = require('../src/modules/ark/agentRegistry')
const { buildAgentFallback, buildProspectionActions } = require('../src/modules/ark/agentService')

describe('ARK business agents registry', () => {
  test('exposes the seven French agents', () => {
    const agents = listAgents()
    assert.equal(agents.length, 7)
    assert.deepEqual(agents.map((agent) => agent.cle), [
      'ark_marketing',
      'ark_visibilite',
      'ark_prospection',
      'ark_finances',
      'ark_juridique',
      'ark_recrutement',
      'ark_accueil',
    ])
  })

  test('uses French output schema keys for product-facing agents', () => {
    assert.ok(getAgent('ark_prospection').outil.input_schema.properties.resume_cible)
    assert.ok(getAgent('ark_finances').outil.input_schema.properties.synthese)
    assert.ok(getAgent('ark_juridique').outil.input_schema.properties.a_valider_avec_juriste)
    assert.ok(getAgent('ark_accueil').outil.input_schema.properties.transfert_humain)
  })

  test('rejects unknown agents clearly', () => {
    assert.throws(() => getAgent('ark_sales'), /Agent inconnu/)
  })

  test('materializes only outbound email and whatsapp prospection actions', () => {
    const actions = buildProspectionActions('client-1', 'ark_prospection', {
      sequence: [
        { etape: 1, canal: 'email', contenu: 'Bonjour' },
        { etape: 2, canal: 'linkedin', contenu: 'Invitation' },
        { etape: 3, canal: 'whatsapp', contenu: 'Relance' },
        { etape: 4, canal: 'appel', contenu: 'Script' },
      ],
    })

    assert.equal(actions.length, 2)
    assert.deepEqual(actions.map((action) => action.action_type), ['send_email', 'send_whatsapp_message'])
    assert.equal(actions[0].requires_approval, true)
    assert.equal(actions[0].payload.agent_source, 'ark_prospection')
  })

  test('builds a usable local prospection fallback when Claude is not configured', () => {
    const sortie = buildAgentFallback('ark_prospection', 'Vendre Courtia', {
      sector: 'agents immobiliers',
      valueProp: 'Courtia transforme un lead immobilier en crédit puis assurance.',
    })

    assert.equal(sortie.resume_cible.includes('agents immobiliers'), true)
    assert.equal(sortie.sequence.length >= 2, true)
    assert.equal(sortie.sequence.every((step) => step.canal === 'email'), true)
    assert.match(sortie.donnees_manquantes[0], /ANTHROPIC_API_KEY/)
  })
})
