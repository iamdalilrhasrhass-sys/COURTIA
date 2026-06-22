const { ARK_CONSEIL_SYSTEM, ADVICE_TOOL } = require('./adviceNotePrompts')

const EDITABLE_ADVICE_FIELDS = [
  'needs_summary',
  'client_situation',
  'options_considered',
  'recommendation',
  'recommendation_reasons',
  'warnings',
  'missing_information',
]

function dbPool() {
  return require('../../db')
}

function httpError(status, message, code = null) {
  const error = new Error(message)
  error.status = status
  if (code) error.code = code
  return error
}

function canGenerateAdviceNote(dossierStatus) {
  if (dossierStatus !== 'conseil') {
    return {
      ok: false,
      reason: "La note se genere depuis l'etat « Devoir de conseil ». Fais d'abord avancer le dossier : le garde-fou verifie qu'il est complet et sans piece bloquante.",
    }
  }
  return { ok: true }
}

function assertAdviceNoteValidatable(note) {
  const missing = []
  if (!String(note.needs_summary || '').trim()) missing.push('besoins et exigences')
  if (!String(note.recommendation || '').trim()) missing.push('recommandation')
  if (!String(note.recommendation_reasons || '').trim()) missing.push('raisons de la recommandation')

  if (missing.length > 0) {
    throw httpError(
      422,
      `Note incomplete au regard du devoir de conseil : ${missing.join(', ')} manquant(s).`,
      'ADVICE_INCOMPLETE',
    )
  }
  return true
}

function splitFactsByVerification(dataPoints = []) {
  return dataPoints.reduce((acc, dataPoint) => {
    if (dataPoint.verified_at) acc.verified.push(dataPoint)
    else acc.declared.push(dataPoint)
    return acc
  }, { verified: [], declared: [] })
}

function pickAdviceEdits(edits = {}) {
  return EDITABLE_ADVICE_FIELDS.reduce((picked, field) => {
    if (edits[field] !== undefined) picked[field] = edits[field]
    return picked
  }, {})
}

function parseJsonValue(value) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function arrayValue(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function anthropicClient() {
  const AnthropicModule = require('@anthropic-ai/sdk')
  const Anthropic = AnthropicModule.default || AnthropicModule
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

async function generateDraftWithClaude({ dossier, facts }) {
  const model = process.env.ARK_MODEL || 'claude-sonnet-4-6'
  const message = await anthropicClient().messages.create({
    model,
    max_tokens: 2000,
    system: ARK_CONSEIL_SYSTEM,
    tools: [ADVICE_TOOL],
    tool_choice: { type: 'tool', name: 'record_advice_note' },
    messages: [{
      role: 'user',
      content: [
        `Verticale : ${dossier.vertical_key || 'assurance'}.`,
        `Produit : ${dossier.product_type}.`,
        'Faits du dossier :',
        JSON.stringify(facts, null, 2),
        "Redige le brouillon de note de conseil via l'outil.",
      ].join('\n'),
    }],
  })
  const toolUse = message.content.find((block) => block.type === 'tool_use')
  if (!toolUse?.input) throw httpError(502, 'Generation de la note impossible.')
  return { draft: toolUse.input, model }
}

async function loadAdviceFacts(pool, tenantId, clientId) {
  const { rows } = await pool.query(
    `SELECT field_key, value, source, confidence, verified_at
       FROM data_points
      WHERE tenant_id = $1
        AND client_id = $2
        AND superseded_by IS NULL
      ORDER BY field_key ASC`,
    [String(tenantId), String(clientId)],
  )

  return rows.map((row) => ({
    field: row.field_key,
    value: parseJsonValue(row.value),
    source: row.source,
    confidence: row.confidence,
    verified: Boolean(row.verified_at),
  }))
}

async function generateAdviceNote(tenantId, dossierId, { actorId = null } = {}) {
  const pool = dbPool()
  const dossierResult = await pool.query(
    'SELECT * FROM dossiers WHERE id = $1 AND tenant_id = $2 LIMIT 1',
    [String(dossierId), String(tenantId)],
  )
  const dossier = dossierResult.rows[0]
  if (!dossier) throw httpError(404, 'Dossier introuvable.')

  const gate = canGenerateAdviceNote(dossier.status)
  if (!gate.ok) throw httpError(409, gate.reason)

  const facts = await loadAdviceFacts(pool, tenantId, dossier.client_id)
  const { draft, model } = await generateDraftWithClaude({ dossier, facts })

  const inserted = await pool.query(
    `INSERT INTO advice_notes
       (tenant_id, client_id, dossier_id, vertical_key, product_type,
        needs_summary, client_situation, facts_used, options_considered,
        recommendation, recommendation_reasons, warnings, missing_information,
        status, generated_by_model)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12::jsonb,$13::jsonb,'draft',$14)
     RETURNING *`,
    [
      String(tenantId),
      String(dossier.client_id),
      String(dossierId),
      dossier.vertical_key || 'assurance',
      dossier.product_type,
      draft.needs_summary,
      draft.client_situation,
      JSON.stringify(draft.facts_used || facts),
      JSON.stringify(draft.options_considered || []),
      draft.recommendation,
      draft.recommendation_reasons,
      JSON.stringify(draft.warnings || []),
      JSON.stringify(draft.missing_information || []),
      model,
    ],
  )
  const saved = inserted.rows[0]

  const { emitEvent } = require('./events')
  await emitEvent({
    tenantId,
    aggregateType: 'dossier',
    aggregateId: dossierId,
    eventType: 'advice.generated',
    actorType: 'ark',
    actorId,
    payload: { note_id: saved.id, product_type: dossier.product_type },
  })

  return saved
}

async function validateAdviceNote(tenantId, noteId, userId, edits = {}) {
  const pool = dbPool()
  const selected = await pool.query(
    'SELECT * FROM advice_notes WHERE id = $1 AND tenant_id = $2 LIMIT 1',
    [String(noteId), String(tenantId)],
  )
  const note = selected.rows[0]
  if (!note) throw httpError(404, 'Note introuvable.')
  if (note.status === 'validated') throw httpError(409, 'Note deja validee.')

  const patch = pickAdviceEdits(edits)
  const merged = {
    ...note,
    ...patch,
    options_considered: patch.options_considered ?? arrayValue(note.options_considered),
    warnings: patch.warnings ?? arrayValue(note.warnings),
    missing_information: patch.missing_information ?? arrayValue(note.missing_information),
  }
  assertAdviceNoteValidatable(merged)

  const updated = await pool.query(
    `UPDATE advice_notes
        SET needs_summary = $3,
            client_situation = $4,
            options_considered = $5::jsonb,
            recommendation = $6,
            recommendation_reasons = $7,
            warnings = $8::jsonb,
            missing_information = $9::jsonb,
            status = 'validated',
            validated_by = $10,
            validated_at = NOW()
      WHERE id = $1
        AND tenant_id = $2
      RETURNING *`,
    [
      String(noteId),
      String(tenantId),
      merged.needs_summary,
      merged.client_situation,
      JSON.stringify(merged.options_considered || []),
      merged.recommendation,
      merged.recommendation_reasons,
      JSON.stringify(merged.warnings || []),
      JSON.stringify(merged.missing_information || []),
      String(userId),
    ],
  )

  const { emitEvent } = require('./events')
  await emitEvent({
    tenantId,
    aggregateType: 'dossier',
    aggregateId: note.dossier_id,
    eventType: 'advice.validated',
    actorType: 'human',
    actorId: userId,
    payload: { note_id: noteId, product_type: note.product_type },
  })

  return updated.rows[0]
}

async function listAdviceNotes(tenantId, dossierId) {
  const pool = dbPool()
  const { rows } = await pool.query(
    `SELECT *
       FROM advice_notes
      WHERE tenant_id = $1
        AND dossier_id = $2
      ORDER BY created_at DESC`,
    [String(tenantId), String(dossierId)],
  )
  return rows
}

module.exports = {
  canGenerateAdviceNote,
  assertAdviceNoteValidatable,
  splitFactsByVerification,
  pickAdviceEdits,
  generateAdviceNote,
  validateAdviceNote,
  listAdviceNotes,
}
