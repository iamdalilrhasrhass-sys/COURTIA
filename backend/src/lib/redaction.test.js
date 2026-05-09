const { redactString, redactValue } = require('./redaction')

describe('redaction', () => {
  it('redacts emails, bearer tokens, jwt values and phones in strings', () => {
    const redacted = redactString('dalil@repairebrise.fr Bearer abc.def.ghi +33612345678')
    expect(redacted).toContain('da***@repairebrise.fr')
    expect(redacted).toContain('Bearer [REDACTED]')
    expect(redacted).toContain('***5678')
    expect(redacted).not.toContain('abc.def.ghi')
  })

  it('redacts sensitive object keys deeply', () => {
    const redacted = redactValue({
      email: 'broker@courtia.fr',
      nested: { refresh_token: 'secret-token', phone: '0612345678' },
    })

    expect(redacted.email).toBe('br***@courtia.fr')
    expect(redacted.nested.refresh_token).toBe('[REDACTED]')
    expect(redacted.nested.phone).toBe('***5678')
  })
})
