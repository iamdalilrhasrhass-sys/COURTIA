const {
  DEFAULT_MESSAGE_TEMPLATES,
  normalizeTemplatePayload,
  renderTemplateText,
} = require('./templateService')

describe('templateService', () => {
  test('ships broker-ready default templates', () => {
    expect(DEFAULT_MESSAGE_TEMPLATES.map((tpl) => tpl.kind)).toContain('relance_echeance')
    expect(DEFAULT_MESSAGE_TEMPLATES.every((tpl) => tpl.channel && tpl.name && tpl.body_text)).toBe(true)
  })

  test('normalizes template payload safely', () => {
    expect(normalizeTemplatePayload({
      channel: 'whatsapp',
      kind: 'relance',
      name: 'Relance',
      subject: 'Sujet',
      body_text: 'Bonjour {{client}}',
    })).toMatchObject({
      channel: 'whatsapp',
      kind: 'relance',
      name: 'Relance',
      body_text: 'Bonjour {{client}}',
    })
  })

  test('renders simple variables without eval', () => {
    expect(renderTemplateText('Bonjour {{client}}, RDV le {{date}}.', { client: 'Sophie', date: 'lundi' })).toBe('Bonjour Sophie, RDV le lundi.')
  })
})
