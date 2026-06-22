const assert = require('node:assert/strict')
const { describe, test } = require('node:test')
const { scoreAgainst } = require('../src/modules/ark/scoring')
const { getProductRequirements, listVerticals } = require('../src/modules/ark/verticals')
const { canTransition, checkEntryGuard } = require('../src/modules/ark/stateMachine')
const { assertExecutable } = require('../src/modules/ark/policy')
const { parseInboundPayload, verifyWebhook } = require('../src/modules/ark/whatsapp/whatsappService')

describe('ARK shared vertical engine', () => {
  test('scores assurance, credit, and immobilier with the same scorer', () => {
    const cases = [
      {
        vertical: 'assurance',
        product: 'auto',
        presentFields: ['first_name', 'last_name', 'date_of_birth', 'address', 'phone', 'email', 'vehicle_registration', 'vehicle_usage'],
        presentDocuments: ['permis', 'carte_grise'],
        blockingLabel: "Relevé d'information",
      },
      {
        vertical: 'credit_immobilier',
        product: 'pret_immobilier',
        presentFields: ['first_name', 'last_name', 'date_of_birth', 'revenus_mensuels', 'situation_pro', 'anciennete_pro', 'apport', 'montant_emprunte'],
        presentDocuments: ['piece_identite', 'bulletins_salaire'],
        blockingLabel: 'Compromis de vente',
      },
      {
        vertical: 'immobilier',
        product: 'mandat_vente',
        presentFields: ['owner_name', 'property_address', 'property_type', 'surface_m2', 'rooms', 'asking_price'],
        presentDocuments: ['titre_propriete'],
        blockingLabel: 'Mandat signé',
      },
    ]

    for (const item of cases) {
      const requirements = getProductRequirements(item.vertical, item.product)
      const score = scoreAgainst(requirements, item)

      assert.ok(score.completion_score > 0)
      assert.ok(score.completion_score < 100)
      assert.match(score.blocking_points.join(' '), new RegExp(item.blockingLabel))
      assert.match(score.next_best_action.type, /request_/)
    }
  })

  test('exposes the three transaction-chain verticals', () => {
    assert.deepEqual(listVerticals().map((vertical) => vertical.key), [
      'assurance',
      'credit_immobilier',
      'immobilier',
    ])
  })
})

describe('ARK dossier state machine and policy gate', () => {
  test('blocks illegal transitions and DDA-sensitive target states', () => {
    assert.equal(canTransition('lead', 'souscription').ok, false)

    assert.equal(checkEntryGuard('conseil', {
      completionScore: 80,
      blockingPoints: ['Relevé d’information manquant'],
    }).ok, false)

    assert.equal(checkEntryGuard('souscription', {
      adviceNoteValidated: false,
      actorType: 'human',
    }).ok, false)

    assert.equal(checkEntryGuard('souscription', {
      adviceNoteValidated: true,
      actorType: 'ark',
    }).ok, false)

    assert.equal(checkEntryGuard('souscription', {
      adviceNoteValidated: true,
      actorType: 'human',
    }).ok, true)
  })

  test('requires human approval before sensitive action execution', () => {
    assert.throws(() => assertExecutable({
      action_type: 'send_whatsapp_message',
      approved_by: null,
      status: 'pending',
    }), /validation humaine/i)

    assert.equal(assertExecutable({
      action_type: 'send_whatsapp_message',
      approved_by: 'user-123',
      status: 'approved',
    }), true)
  })
})

describe('WhatsApp intake pure functions', () => {
  test('validates Meta webhook handshakes', () => {
    assert.deepEqual(verifyWebhook({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'courtia-token',
      'hub.challenge': 'abc123',
    }, 'courtia-token'), { ok: true, challenge: 'abc123' })

    assert.deepEqual(verifyWebhook({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong',
      'hub.challenge': 'abc123',
    }, 'courtia-token'), { ok: false, challenge: null })
  })

  test('normalizes text, image, and document Meta payloads', () => {
    const messages = parseInboundPayload({
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: 'phone-1' },
            contacts: [{ profile: { name: 'Marie Martin' } }],
            messages: [
              { id: 'm1', from: '33600000000', type: 'text', text: { body: 'Bonjour' }, timestamp: '1' },
              { id: 'm2', from: '33600000000', type: 'image', image: { id: 'img-1', mime_type: 'image/jpeg' }, timestamp: '2' },
              { id: 'm3', from: '33600000000', type: 'document', document: { id: 'doc-1', mime_type: 'application/pdf', filename: 'ri.pdf' }, timestamp: '3' },
            ],
          },
        }],
      }],
    })

    assert.equal(messages.length, 3)
    assert.deepEqual(messages[0], {
      phoneNumberId: 'phone-1',
      from: '33600000000',
      contactName: 'Marie Martin',
      messageId: 'm1',
      type: 'text',
      text: 'Bonjour',
      mediaId: null,
      mimeType: null,
      fileName: null,
      timestamp: '1',
    })
    assert.equal(messages[1].mediaId, 'img-1')
    assert.equal(messages[1].mimeType, 'image/jpeg')
    assert.equal(messages[2].mediaId, 'doc-1')
    assert.equal(messages[2].mimeType, 'application/pdf')
    assert.equal(messages[2].fileName, 'ri.pdf')
  })

  test('accepts empty webhook payloads without crashing', () => {
    assert.deepEqual(parseInboundPayload({}), [])
    assert.deepEqual(parseInboundPayload(null), [])
  })
})
