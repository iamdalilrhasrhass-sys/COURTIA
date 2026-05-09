const DEFAULT_MESSAGE_TEMPLATES = [
  {
    scope: 'system',
    channel: 'email',
    kind: 'relance_echeance',
    name: 'Relance échéance',
    subject: 'Votre contrat {{contract_type}} arrive à échéance',
    body_text: 'Bonjour {{client}}, votre contrat {{contract_type}} arrive à échéance le {{date}}. Souhaitez-vous que nous fassions le point ensemble ?',
  },
  {
    scope: 'system',
    channel: 'whatsapp',
    kind: 'relance_prospect',
    name: 'Relance prospect',
    subject: '',
    body_text: 'Bonjour {{client}}, souhaitez-vous que l’on avance sur votre besoin assurance cette semaine ?',
  },
  {
    scope: 'system',
    channel: 'email',
    kind: 'pre_rdv',
    name: 'Préparation rendez-vous',
    subject: 'Préparation de notre rendez-vous',
    body_text: 'Bonjour {{client}}, je vous confirme notre rendez-vous du {{date}}. Je préparerai vos contrats et vos prochaines échéances.',
  },
  {
    scope: 'system',
    channel: 'whatsapp',
    kind: 'pieces_manquantes',
    name: 'Pièces manquantes',
    subject: '',
    body_text: 'Bonjour {{client}}, il manque encore {{piece}} pour finaliser votre dossier. Vous pouvez me l’envoyer ici.',
  },
]

function normalizeTemplatePayload(payload = {}) {
  const channel = ['email', 'whatsapp'].includes(String(payload.channel || '').toLowerCase())
    ? String(payload.channel).toLowerCase()
    : 'email'
  return {
    scope: payload.scope === 'system' ? 'system' : 'cabinet',
    channel,
    kind: String(payload.kind || 'custom').trim().slice(0, 80),
    name: String(payload.name || 'Template COURTIA').trim().slice(0, 120),
    subject: String(payload.subject || '').trim().slice(0, 180),
    body_mjml: payload.body_mjml ? String(payload.body_mjml) : null,
    body_text: String(payload.body_text || payload.body || '').trim(),
    variables_schema: payload.variables_schema && typeof payload.variables_schema === 'object'
      ? payload.variables_schema
      : {},
  }
}

function renderTemplateText(text = '', variables = {}) {
  return String(text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables[key]
    return value == null ? '' : String(value)
  })
}

async function seedDefaultTemplates(pool) {
  for (const tpl of DEFAULT_MESSAGE_TEMPLATES) {
    await pool.query(
      `INSERT INTO message_templates (scope, channel, kind, name, subject, body_text, variables_schema)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
       ON CONFLICT (scope, channel, kind, name) DO NOTHING`,
      [tpl.scope, tpl.channel, tpl.kind, tpl.name, tpl.subject || null, tpl.body_text, JSON.stringify({})]
    )
  }
}

module.exports = {
  DEFAULT_MESSAGE_TEMPLATES,
  normalizeTemplatePayload,
  renderTemplateText,
  seedDefaultTemplates,
}
