const assert = require('node:assert/strict')
const { describe, test } = require('node:test')

const {
  buildMessagesFromSequence,
  buildOptOutUrl,
  normalizeEmailHtml,
  parseCsv,
} = require('../src/modules/ark/prospectService')

describe('ARK prospection pipeline pure functions', () => {
  test('imports comma CSV with French headers and accents', () => {
    const rows = parseCsv('nom,email,société,secteur\nÉlodie Martin,elodie@agence.fr,Agence Étoile,immobilier')
    assert.deepEqual(rows, [{
      full_name: 'Élodie Martin',
      email: 'elodie@agence.fr',
      company: 'Agence Étoile',
      sector: 'immobilier',
    }])
  })

  test('imports semicolon CSV', () => {
    const rows = parseCsv('nom;courriel;societe;telephone\nJean Dupont;jean@cabinet.fr;Cabinet Dupont;0600000000')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].email, 'jean@cabinet.fr')
    assert.equal(rows[0].phone, '0600000000')
  })

  test('supports quoted CSV cells', () => {
    const rows = parseCsv('nom,email,societe\n\"Dupont, Jean\",jean@example.fr,\"Agence, Paris\"')
    assert.equal(rows[0].full_name, 'Dupont, Jean')
    assert.equal(rows[0].company, 'Agence, Paris')
  })

  test('builds only email draft messages and appends opt-out', () => {
    const messages = buildMessagesFromSequence(
      [{ id: 'p1', opt_out_token: 'tok-1' }],
      [
        { etape: 1, canal: 'email', contenu: 'Bonjour' },
        { etape: 2, canal: 'appel', contenu: 'Appel' },
      ],
      { subject: 'Courtia', publicBaseUrl: 'https://courtiark.fr' },
    )

    assert.equal(messages.length, 1)
    assert.equal(messages[0].subject, 'Courtia')
    assert.match(messages[0].body, /Bonjour/)
    assert.match(messages[0].body, /désinscrire/i)
    assert.equal(messages[0].body.includes('https://courtiark.fr/api/public/prospects/opt-out/tok-1'), true)
  })

  test('normalizes plaintext email body to escaped html', () => {
    assert.equal(normalizeEmailHtml('<script>bad</script>\nOK'), '<p>&lt;script&gt;bad&lt;/script&gt;<br>OK</p>')
  })

  test('builds opt-out URL from public base URL', () => {
    assert.equal(
      buildOptOutUrl('https://courtiark.fr/', 'abc'),
      'https://courtiark.fr/api/public/prospects/opt-out/abc',
    )
  })
})
