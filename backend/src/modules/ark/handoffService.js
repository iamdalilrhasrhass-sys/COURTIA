const { scoreAgainst } = require('./scoring')
const { getProductRequirements } = require('./verticals')
const { RELATION_LABELS, matchHandoffRules } = require('./handoffRules')

const CLOSED_STATUSES = ['resilie', 'résilié', 'abandoned', 'perdu']

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function dbPool() {
  return require('../../db')
}

function productLabel(verticalKey, productType) {
  return getProductRequirements(verticalKey, productType)?.label || productType
}

function buildHandoffTargets({ dossier, rules }) {
  return rules.flatMap((rule) => rule.create.map((target) => ({
    from_dossier_id: String(dossier.id),
    vertical_key: target.vertical_key,
    product_type: target.product_type,
    relation: target.relation,
    reason: target.reason,
    source_vertical_key: dossier.vertical_key || 'assurance',
    source_product_type: dossier.product_type,
  })))
}

function scorePrefilledDossier({ verticalKey, productType, presentFields = [], presentDocuments = [] }) {
  return scoreAgainst(getProductRequirements(verticalKey, productType), {
    presentFields,
    presentDocuments,
  })
}

async function getClientDataKeys(tenantId, clientId) {
  const pool = dbPool()
  const { rows } = await pool.query(
    `SELECT DISTINCT field_key
       FROM data_points
      WHERE tenant_id = $1
        AND client_id = $2
        AND superseded_by IS NULL`,
    [String(tenantId), String(clientId)],
  )
  return rows.map((row) => row.field_key)
}

async function getClientDocumentTypes(tenantId, clientId) {
  const pool = dbPool()
  const { rows } = await pool.query(
    `SELECT DISTINCT document_type
       FROM client_documents
      WHERE tenant_id = $1
        AND client_id = $2
        AND document_type IS NOT NULL
        AND status IN ('uploaded','extracting','extracted')`,
    [String(tenantId), String(clientId)],
  )
  return rows.map((row) => row.document_type)
}

async function findOpenTargetDossier(db, dossier, target) {
  const { rows } = await db.query(
    `SELECT id, status
       FROM dossiers
      WHERE tenant_id = $1
        AND client_id = $2
        AND vertical_key = $3
        AND product_type = $4
        AND status <> ALL($5::text[])
      LIMIT 1`,
    [
      String(dossier.tenant_id),
      String(dossier.client_id),
      target.vertical_key,
      target.product_type,
      CLOSED_STATUSES,
    ],
  )
  return rows[0] || null
}

async function createLinkedDossier(db, dossier, target, score, actorId) {
  const { emitEvent } = require('./events')

  const inserted = await db.query(
    `INSERT INTO dossiers
       (tenant_id, client_id, vertical_key, product_type, status, completion_score, assigned_to)
     VALUES ($1, $2, $3, $4, 'qualification', $5, $6)
     RETURNING *`,
    [
      String(dossier.tenant_id),
      String(dossier.client_id),
      target.vertical_key,
      target.product_type,
      score.completion_score,
      dossier.assigned_to || null,
    ],
  )
  const child = inserted.rows[0]

  await db.query(
    `INSERT INTO dossier_links
       (tenant_id, from_dossier_id, to_dossier_id, relation, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (from_dossier_id, to_dossier_id) DO NOTHING`,
    [
      String(dossier.tenant_id),
      String(dossier.id),
      String(child.id),
      target.relation,
      JSON.stringify({
        source_vertical_key: target.source_vertical_key,
        source_product_type: target.source_product_type,
        reason: target.reason,
      }),
    ],
  )

  await emitEvent({
    tenantId: dossier.tenant_id,
    aggregateType: 'dossier',
    aggregateId: child.id,
    eventType: 'dossier.created_by_handoff',
    actorType: 'ark',
    actorId,
    payload: {
      from_dossier_id: String(dossier.id),
      relation: target.relation,
      vertical_key: target.vertical_key,
      product_type: target.product_type,
      completion_score: score.completion_score,
      missing_fields: score.missing_fields,
      missing_documents: score.missing_documents,
    },
  }, db)

  await emitEvent({
    tenantId: dossier.tenant_id,
    aggregateType: 'dossier',
    aggregateId: dossier.id,
    eventType: 'dossier.handoff_created',
    actorType: 'ark',
    actorId,
    payload: {
      to_dossier_id: String(child.id),
      relation: target.relation,
      vertical_key: target.vertical_key,
      product_type: target.product_type,
    },
  }, db)

  return child
}

async function createHandoffAction(dossier, child, target, score, actorId) {
  const { createAction } = require('./actionService')

  return createAction(dossier.tenant_id, {
    client_id: dossier.client_id,
    dossier_id: child.id,
    agent_key: 'ark',
    action_type: 'send_whatsapp_message',
    title: `Proposer ${productLabel(target.vertical_key, target.product_type)} (${RELATION_LABELS[target.relation] || target.relation})`,
    rationale: `${target.reason} Dossier pre-rempli a ${score.completion_score} % avec les donnees deja collectees.`,
    payload: {
      dossier_id: String(child.id),
      relation: target.relation,
      suggested_reply: null,
      actor_id: actorId ? String(actorId) : null,
    },
    priority: 'high',
    requires_approval: true,
  })
}

async function runHandoff(dossierId, { tenantId = null, actorId = null } = {}) {
  const pool = dbPool()
  const dossierResult = await pool.query(
    `SELECT *
       FROM dossiers
      WHERE id = $1
        AND ($2::text IS NULL OR tenant_id = $2)
      LIMIT 1`,
    [String(dossierId), tenantId ? String(tenantId) : null],
  )
  const dossier = dossierResult.rows[0]
  if (!dossier) throw httpError(404, 'Dossier introuvable.')

  const verticalKey = dossier.vertical_key || 'assurance'
  const rules = matchHandoffRules({
    verticalKey,
    productType: dossier.product_type,
    status: dossier.status,
  })
  const targets = buildHandoffTargets({ dossier: { ...dossier, vertical_key: verticalKey }, rules })
  if (targets.length === 0) return { from: String(dossier.id), created: [], skipped: [] }

  const [presentFields, presentDocuments] = await Promise.all([
    getClientDataKeys(dossier.tenant_id, dossier.client_id),
    getClientDocumentTypes(dossier.tenant_id, dossier.client_id),
  ])

  const created = []
  const skipped = []

  for (const target of targets) {
    const db = await pool.connect()
    let committed = false
    try {
      await db.query('BEGIN')

      const existing = await findOpenTargetDossier(db, dossier, target)
      if (existing) {
        skipped.push({
          dossier_id: String(existing.id),
          vertical_key: target.vertical_key,
          product_type: target.product_type,
          reason: 'target_already_exists',
        })
        await db.query('COMMIT')
        committed = true
        continue
      }

      const score = scorePrefilledDossier({
        verticalKey: target.vertical_key,
        productType: target.product_type,
        presentFields,
        presentDocuments,
      })
      const child = await createLinkedDossier(db, dossier, target, score, actorId)

      await db.query('COMMIT')
      committed = true

      await createHandoffAction(dossier, child, target, score, actorId)

      created.push({
        dossier_id: String(child.id),
        vertical_key: target.vertical_key,
        product_type: target.product_type,
        relation: target.relation,
        completion_score: score.completion_score,
        missing_fields: score.missing_fields,
        missing_documents: score.missing_documents,
        blocking_points: score.blocking_points,
      })
    } catch (err) {
      if (!committed) await db.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      db.release()
    }
  }

  return { from: String(dossier.id), created, skipped }
}

async function getFlywheel(tenantId, clientId) {
  const pool = dbPool()
  const dossiers = await pool.query(
    `SELECT id, vertical_key, product_type, status, completion_score, estimated_premium, created_at
       FROM dossiers
      WHERE tenant_id = $1
        AND client_id = $2
      ORDER BY created_at ASC`,
    [String(tenantId), String(clientId)],
  )

  const links = await pool.query(
    `SELECT from_dossier_id, to_dossier_id, relation, metadata, created_at
       FROM dossier_links
      WHERE tenant_id = $1
        AND (
          from_dossier_id IN (SELECT id::text FROM dossiers WHERE tenant_id = $1 AND client_id = $2)
          OR to_dossier_id IN (SELECT id::text FROM dossiers WHERE tenant_id = $1 AND client_id = $2)
        )
      ORDER BY created_at ASC`,
    [String(tenantId), String(clientId)],
  )

  const totalPotential = dossiers.rows.reduce((sum, dossier) => (
    sum + Number(dossier.estimated_premium || 0)
  ), 0)

  return {
    client_id: String(clientId),
    dossiers: dossiers.rows,
    links: links.rows,
    total_potential: totalPotential,
  }
}

module.exports = {
  buildHandoffTargets,
  scorePrefilledDossier,
  runHandoff,
  getFlywheel,
}
