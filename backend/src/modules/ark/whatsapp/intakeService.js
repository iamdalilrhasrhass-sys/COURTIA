const pool = require('../../../db')
const { emitEvent } = require('../events')
const { createAction } = require('../actionService')
const { registerDocument, extractDocument } = require('../documentService')
const { scoreDossier } = require('../dossierScoreService')
const { downloadMedia, classifyDocumentType } = require('./whatsappService')

const DOCUMENT_TO_PRODUCT = {
  carte_grise: { vertical_key: 'assurance', product_type: 'auto' },
  releve_information: { vertical_key: 'assurance', product_type: 'auto' },
  permis: { vertical_key: 'assurance', product_type: 'auto' },
  kbis: { vertical_key: 'assurance', product_type: 'rc_pro' },
}

async function resolveTenant(phoneNumberId) {
  const { rows } = await pool.query('SELECT tenant_id FROM whatsapp_accounts WHERE phone_number_id = $1', [phoneNumberId])
  return rows[0]?.tenant_id || process.env.DEFAULT_TENANT_ID || null
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

async function matchClientByPhone(tenantId, from) {
  const suffix = onlyDigits(from).slice(-9)
  if (!suffix) return null

  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, phone
       FROM clients
      WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE $1
        AND ($2::text IS NULL OR COALESCE(courtier_id::text, '') = $2::text)
      ORDER BY id DESC
      LIMIT 1`,
    [`%${suffix}`, tenantId ? String(tenantId) : null],
  )
  return rows[0] || null
}

async function getOrCreateActiveDossier(tenantId, clientId, verticalKey, productType) {
  const selected = await pool.query(
    `SELECT *
       FROM dossiers
      WHERE tenant_id = $1 AND client_id = $2 AND vertical_key = $3 AND product_type = $4
        AND status NOT IN ('actif','resilie','abandoned')
      ORDER BY created_at DESC
      LIMIT 1`,
    [String(tenantId), String(clientId), verticalKey, productType],
  )
  if (selected.rows[0]) return selected.rows[0]

  const inserted = await pool.query(
    `INSERT INTO dossiers (tenant_id, client_id, vertical_key, product_type, status)
     VALUES ($1, $2, $3, $4, 'collecte_pieces')
     RETURNING *`,
    [String(tenantId), String(clientId), verticalKey, productType],
  )

  await emitEvent({
    tenantId,
    aggregateType: 'dossier',
    aggregateId: inserted.rows[0].id,
    eventType: 'dossier.created',
    actorType: 'ark',
    payload: { vertical_key: verticalKey, product_type: productType, origin: 'whatsapp' },
  })

  return inserted.rows[0]
}

async function handleInbound(message) {
  const tenantId = await resolveTenant(message.phoneNumberId)
  const eventType = message.type === 'text' ? 'message.text' : 'message.media'

  const inserted = await pool.query(
    `INSERT INTO inbound_events
       (tenant_id, provider, event_type, external_id, from_identifier, raw_payload, normalized_payload)
     VALUES ($1, 'whatsapp', $2, $3, $4, $5::jsonb, $6::jsonb)
     ON CONFLICT (provider, external_id) WHERE external_id IS NOT NULL DO NOTHING
     RETURNING *`,
    [tenantId ? String(tenantId) : null, eventType, message.messageId, message.from, JSON.stringify(message), JSON.stringify(message)],
  )
  const inbound = inserted.rows[0]
  if (!inbound) return { skipped: 'duplicate' }

  const client = await matchClientByPhone(tenantId, message.from)
  if (client) {
    await pool.query('UPDATE inbound_events SET client_id = $1 WHERE id = $2', [String(client.id), inbound.id])
  }

  try {
    if (message.type === 'text') {
      await handleText({ tenantId, client, message, inboundId: inbound.id })
    } else if (message.mediaId) {
      await handleMedia({ tenantId, client, message, inboundId: inbound.id })
    }
    await pool.query("UPDATE inbound_events SET status = 'processed', processed_at = NOW() WHERE id = $1", [inbound.id])
    return { ok: true, matched: Boolean(client) }
  } catch (err) {
    await pool.query("UPDATE inbound_events SET status = 'failed' WHERE id = $1", [inbound.id])
    throw err
  }
}

async function handleText({ tenantId, client, message, inboundId }) {
  if (!tenantId) return

  if (!client) {
    await createAction(tenantId, {
      action_type: 'create_task',
      priority: 'high',
      title: `Nouveau contact WhatsApp (${message.from})`,
      rationale: `Message recu : "${truncate(message.text, 120)}". Aucun client correspondant.`,
      payload: { from: message.from, text: message.text, inbound_id: inboundId },
      requires_approval: false,
    })
    return
  }

  await createAction(tenantId, {
    client_id: client.id,
    action_type: 'send_whatsapp_message',
    priority: 'high',
    title: `Repondre a ${displayName(client)} sur WhatsApp`,
    rationale: `Message recu : "${truncate(message.text, 120)}".`,
    payload: { to: message.from, inbound_id: inboundId, suggested_reply: null },
    requires_approval: true,
  })
}

async function handleMedia({ tenantId, client, message, inboundId }) {
  if (!tenantId) return

  const media = await downloadMedia(message.mediaId)
  const classified = await classifyDocumentType({ base64: media.base64, mediaType: media.mimeType || message.mimeType })
  const documentType = classified.document_type || 'unknown'

  if (!client) {
    await createAction(tenantId, {
      action_type: 'create_task',
      priority: 'high',
      title: `Document recu d'un contact inconnu (${message.from})`,
      rationale: `Type detecte : ${documentType} (${Math.round((classified.confidence || 0) * 100)}%).`,
      payload: { from: message.from, document_type: documentType, inbound_id: inboundId },
      requires_approval: false,
    })
    return
  }

  const product = DOCUMENT_TO_PRODUCT[documentType] || { vertical_key: 'assurance', product_type: 'auto' }
  const dossier = await getOrCreateActiveDossier(tenantId, client.id, product.vertical_key, product.product_type)
  const document = await registerDocument(tenantId, {
    client_id: client.id,
    dossier_id: dossier.id,
    source: 'whatsapp',
    document_type: documentType === 'unknown' ? null : documentType,
    file_url: `whatsapp://${message.mediaId}`,
    file_name: message.fileName,
    mime_type: media.mimeType || message.mimeType,
  })

  if (documentType !== 'unknown') {
    try {
      await extractDocument({ tenantId, documentId: document.id, base64: media.base64, mediaType: media.mimeType || message.mimeType })
    } catch (err) {
      console.error('[ark:whatsapp] extraction skipped:', err.message)
    }
  }

  const score = await scoreDossier(dossier.id)
  const next = score.next_best_action
  if (next && next.type !== 'ready') {
    await createAction(tenantId, {
      client_id: client.id,
      dossier_id: dossier.id,
      action_type: 'send_whatsapp_message',
      priority: 'high',
      title: `Relancer ${displayName(client)} : ${next.message}`,
      rationale: `Dossier ${score.product_type} complete a ${score.completion_score}%.`,
      payload: { to: message.from, dossier_id: dossier.id, suggested_reply: next.message },
      requires_approval: true,
    })
  }
}

function displayName(client) {
  return `${client.first_name || ''} ${client.last_name || ''}`.trim() || `client #${client.id}`
}

function truncate(value, max) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max)}...` : text
}

module.exports = {
  resolveTenant,
  matchClientByPhone,
  handleInbound,
}
