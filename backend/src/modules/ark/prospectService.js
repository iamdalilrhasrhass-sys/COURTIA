const HEADER_MAP = {
  nom: 'full_name',
  name: 'full_name',
  full_name: 'full_name',
  prenom_nom: 'full_name',
  societe: 'company',
  société: 'company',
  company: 'company',
  entreprise: 'company',
  cabinet: 'company',
  email: 'email',
  mail: 'email',
  courriel: 'email',
  'e-mail': 'email',
  telephone: 'phone',
  téléphone: 'phone',
  phone: 'phone',
  tel: 'phone',
  portable: 'phone',
  secteur: 'sector',
  sector: 'sector',
  domaine: 'sector',
  activite: 'sector',
  activité: 'sector',
}

const KNOWN_FIELDS = new Set(['full_name', 'company', 'email', 'phone', 'sector'])

function dbPool() {
  return require('../../db')
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function splitCsvLine(line, delimiter) {
  const cells = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function countDelimiter(line, delimiter) {
  return splitCsvLine(line, delimiter).length - 1
}

function parseCsv(text) {
  const normalizedText = String(text || '').replace(/\\r\\n|\\n|\\r/g, '\n')
  const lines = normalizedText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const delimiter = countDelimiter(lines[0], ';') >= countDelimiter(lines[0], ',') ? ';' : ','
  const headers = splitCsvLine(lines[0], delimiter).map((header) => HEADER_MAP[header.trim().toLowerCase()] || header.trim().toLowerCase())
  const rows = []

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, delimiter)
    const row = {}
    headers.forEach((header, index) => {
      if (KNOWN_FIELDS.has(header) && cells[index]) row[header] = cells[index].trim()
    })
    if (row.email) {
      row.email = row.email.toLowerCase()
      rows.push(row)
    }
  }
  return rows
}

function publicBaseUrl() {
  return (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.BASE_URL || 'https://courtiark.fr').replace(/\/+$/, '')
}

function buildOptOutUrl(baseUrl, token) {
  return `${String(baseUrl || '').replace(/\/+$/, '')}/api/public/prospects/opt-out/${encodeURIComponent(token)}`
}

function optOutText(prospect, baseUrl = publicBaseUrl()) {
  const link = prospect.opt_out_token ? buildOptOutUrl(baseUrl, prospect.opt_out_token) : null
  return link
    ? `Vous recevez ce message dans un cadre professionnel. Pour vous désinscrire : ${link}`
    : 'Vous recevez ce message dans un cadre professionnel. Pour ne plus être contacté(e), répondez STOP à cet email.'
}

function buildMessagesFromSequence(prospects, sequence, {
  subject,
  publicBaseUrl: baseUrl = publicBaseUrl(),
} = {}) {
  const emailSteps = (sequence || []).filter((step) => step.canal === 'email')
  const messages = []
  for (const prospect of prospects) {
    for (const step of emailSteps) {
      messages.push({
        prospect_id: prospect.id,
        channel: 'email',
        step: step.etape || 1,
        subject: subject || 'Prise de contact',
        body: `${step.contenu}\n\n${optOutText(prospect, baseUrl)}`,
      })
    }
  }
  return messages
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function normalizeEmailHtml(body) {
  const normalizedBody = String(body || '').replace(/\\r\\n|\\n|\\r/g, '\n')
  return `<p>${escapeHtml(normalizedBody).replace(/\r?\n/g, '<br>')}</p>`
}

async function importProspects(tenantId, rows, { source = 'import_csv' } = {}) {
  const pool = dbPool()
  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    if (!row.email) {
      skipped += 1
      continue
    }
    const result = await pool.query(
      `INSERT INTO prospects (tenant_id, full_name, company, email, phone, sector, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, email) DO NOTHING
       RETURNING id`,
      [
        String(tenantId),
        row.full_name || null,
        row.company || null,
        String(row.email).toLowerCase(),
        row.phone || null,
        row.sector || null,
        source,
      ],
    )
    if (result.rowCount) inserted += 1
    else skipped += 1
  }

  return { inserted, skipped, total: rows.length }
}

async function listProspects(tenantId, { status, sector, limit = 200 } = {}) {
  const pool = dbPool()
  const where = ['tenant_id = $1']
  const params = [String(tenantId)]
  if (status) {
    params.push(status)
    where.push(`status = $${params.length}`)
  }
  if (sector) {
    params.push(sector)
    where.push(`sector = $${params.length}`)
  }
  params.push(Number(limit) || 200)
  const { rows } = await pool.query(
    `SELECT * FROM prospects WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length}`,
    params,
  )
  return rows
}

async function listProspectMessages(tenantId, { status = 'draft', limit = 200 } = {}) {
  const pool = dbPool()
  const { rows } = await pool.query(
    `SELECT m.*, p.full_name, p.company, p.email
       FROM prospect_messages m
       JOIN prospects p ON p.id = m.prospect_id
      WHERE m.tenant_id = $1
        AND ($2::text IS NULL OR m.status = $2)
      ORDER BY m.created_at DESC
      LIMIT $3`,
    [String(tenantId), status || null, Number(limit) || 200],
  )
  return rows
}

async function queueCampaign(tenantId, { prospectIds, sector, valueProp, subject, actorId = null }) {
  if (!Array.isArray(prospectIds) || prospectIds.length === 0) throw httpError(422, 'Aucun prospect sélectionné.')

  const pool = dbPool()
  const { rows: prospects } = await pool.query(
    `SELECT id::text AS id, full_name, company, sector, opt_out_token
       FROM prospects
      WHERE tenant_id = $1
        AND id::text = ANY($2::text[])
        AND status <> 'opted_out'`,
    [String(tenantId), prospectIds.map(String)],
  )
  if (prospects.length === 0) throw httpError(404, 'Prospects introuvables ou désinscrits.')

  const { runAgent } = require('./agentService')
  const consigne = `Prépare une séquence d'emails B2B pour prospecter des ${sector || 'professionnels'}. Proposition de valeur : ${valueProp || 'notre solution'}. Messages courts, personnalisables, conformes.`
  const { sortie } = await runAgent(tenantId, 'ark_prospection', {
    consigne,
    contexte: { sector, valueProp },
    actorId,
  })

  const messages = buildMessagesFromSequence(prospects, sortie.sequence, { subject })
  for (const message of messages) {
    await pool.query(
      `INSERT INTO prospect_messages (tenant_id, prospect_id, channel, step, subject, body, status)
       VALUES ($1,$2,$3,$4,$5,$6,'draft')`,
      [String(tenantId), message.prospect_id, message.channel, message.step, message.subject, message.body],
    )
  }
  await pool.query(
    `UPDATE prospects SET status = 'queued' WHERE tenant_id = $1 AND id::text = ANY($2::text[])`,
    [String(tenantId), prospects.map((prospect) => prospect.id)],
  )

  const { emitEvent } = require('./events')
  await emitEvent({
    tenantId,
    aggregateType: 'prospect',
    aggregateId: String(tenantId),
    eventType: 'prospect.campaign_queued',
    actorType: 'ark',
    actorId,
    payload: { prospects: prospects.length, messages: messages.length, sector },
  })

  return { prospects: prospects.length, messages: messages.length, sequence: sortie.sequence }
}

async function approveMessages(tenantId, messageIds) {
  const pool = dbPool()
  const { rowCount } = await pool.query(
    `UPDATE prospect_messages
        SET status = 'approved'
      WHERE tenant_id = $1
        AND id::text = ANY($2::text[])
        AND status = 'draft'`,
    [String(tenantId), (messageIds || []).map(String)],
  )
  return { approved: rowCount }
}

async function sendApproved(tenantId, { limit = 50, actorId = null } = {}) {
  if (!process.env.BREVO_API_KEY) throw httpError(412, 'BREVO_API_KEY non configurée.')
  if (!process.env.BREVO_SENDER_EMAIL) throw httpError(412, 'BREVO_SENDER_EMAIL non configurée.')

  const pool = dbPool()
  const { rows: messages } = await pool.query(
    `SELECT m.id, m.subject, m.body, p.email, p.id AS prospect_id
       FROM prospect_messages m
       JOIN prospects p ON p.id = m.prospect_id
      WHERE m.tenant_id = $1
        AND m.status = 'approved'
        AND p.status <> 'opted_out'
        AND p.email IS NOT NULL
      LIMIT $2`,
    [String(tenantId), Number(limit) || 50],
  )

  let sent = 0
  let failed = 0
  for (const message of messages) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || 'Courtia' },
          to: [{ email: message.email }],
          subject: message.subject || 'Prise de contact',
          htmlContent: normalizeEmailHtml(message.body),
        }),
      })
      if (!response.ok) throw new Error(`Brevo ${response.status}: ${await response.text()}`)
      const json = await response.json()
      await pool.query(
        `UPDATE prospect_messages SET status = 'sent', sent_at = NOW(), provider_response = $2::jsonb WHERE id = $1`,
        [message.id, JSON.stringify(json)],
      )
      await pool.query(`UPDATE prospects SET status = 'contacted' WHERE id = $1 AND status = 'queued'`, [message.prospect_id])
      sent += 1
    } catch (error) {
      await pool.query(
        `UPDATE prospect_messages SET status = 'failed', provider_response = $2::jsonb WHERE id = $1`,
        [message.id, JSON.stringify({ error: error.message })],
      )
      failed += 1
    }
  }

  if (sent > 0) {
    const { emitEvent } = require('./events')
    await emitEvent({
      tenantId,
      aggregateType: 'prospect',
      aggregateId: String(tenantId),
      eventType: 'prospect.emails_sent',
      actorType: 'human',
      actorId,
      payload: { sent, failed },
    })
  }

  return { sent, failed }
}

async function markOptedOut(tenantId, prospectId) {
  const pool = dbPool()
  await pool.query(`UPDATE prospects SET status = 'opted_out' WHERE tenant_id = $1 AND id::text = $2`, [String(tenantId), String(prospectId)])
  await pool.query(
    `UPDATE prospect_messages
        SET status = 'cancelled'
      WHERE tenant_id = $1
        AND prospect_id::text = $2
        AND status IN ('draft','approved')`,
    [String(tenantId), String(prospectId)],
  )
  return { ok: true }
}

async function markOptedOutByToken(token) {
  const pool = dbPool()
  const selected = await pool.query('SELECT tenant_id, id::text AS id FROM prospects WHERE opt_out_token = $1 LIMIT 1', [String(token)])
  const prospect = selected.rows[0]
  if (!prospect) throw httpError(404, 'Lien de désinscription invalide.')
  return markOptedOut(prospect.tenant_id, prospect.id)
}

module.exports = {
  buildMessagesFromSequence,
  buildOptOutUrl,
  importProspects,
  listProspectMessages,
  listProspects,
  markOptedOut,
  markOptedOutByToken,
  normalizeEmailHtml,
  parseCsv,
  queueCampaign,
  approveMessages,
  sendApproved,
}
