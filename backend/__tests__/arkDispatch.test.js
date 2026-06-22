const assert = require('node:assert/strict')
const { describe, test } = require('node:test')

const {
  channelFor,
  normalizeEmailHtml,
  requireDispatchMessage,
} = require('../src/modules/ark/actionDispatch')

describe('ARK action dispatch', () => {
  test('routes sensitive outbound actions to real channels', () => {
    assert.equal(channelFor('send_whatsapp_message'), 'whatsapp')
    assert.equal(channelFor('send_email'), 'email')
    assert.equal(channelFor('create_task'), 'internal')
    assert.equal(channelFor('unknown_action'), 'none')
  })

  test('requires a message before sending outbound content', () => {
    assert.throws(() => requireDispatchMessage({ payload: {} }), /message vide|contenu/i)
    assert.equal(requireDispatchMessage({
      payload: { suggested_reply: 'Bonjour, voici la relance.' },
    }), 'Bonjour, voici la relance.')
  })

  test('normalizes plaintext email body into safe html paragraphs', () => {
    assert.equal(
      normalizeEmailHtml('Bonjour\nVotre dossier est prêt.'),
      '<p>Bonjour<br>Votre dossier est prêt.</p>',
    )
    assert.equal(
      normalizeEmailHtml('<script>alert(1)</script>'),
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
  })
})
