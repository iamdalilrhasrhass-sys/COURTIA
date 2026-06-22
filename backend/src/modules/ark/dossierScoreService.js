const pool = require('../../db')
const { scoreAgainst } = require('./scoring')
const { getProductRequirements } = require('./verticals')
const { emitEvent } = require('./events')

async function scoreDossier(dossierId) {
  const dossierRes = await pool.query('SELECT * FROM dossiers WHERE id = $1', [dossierId])
  const dossier = dossierRes.rows[0]
  if (!dossier) {
    const error = new Error('Dossier introuvable.')
    error.status = 404
    throw error
  }

  const score = await computeDossierCompleteness(dossier)

  await pool.query(
    'UPDATE dossiers SET completion_score = $1, updated_at = NOW() WHERE id = $2',
    [score.completion_score, dossierId],
  )

  await emitEvent({
    tenantId: dossier.tenant_id,
    aggregateType: 'dossier',
    aggregateId: dossierId,
    eventType: 'dossier.scored',
    actorType: 'ark',
    payload: {
      score: score.completion_score,
      vertical_key: dossier.vertical_key || 'assurance',
      product_type: dossier.product_type,
      missing_fields: score.missing_fields,
      missing_documents: score.missing_documents,
      blocking_points: score.blocking_points,
    },
  })

  return {
    dossier_id: dossierId,
    vertical_key: dossier.vertical_key || 'assurance',
    product_type: dossier.product_type,
    ...score,
  }
}

async function getDossierDetail(tenantId, dossierId) {
  const dossierRes = await pool.query(
    'SELECT * FROM dossiers WHERE id = $1 AND tenant_id = $2',
    [dossierId, String(tenantId)],
  )
  const dossier = dossierRes.rows[0]
  if (!dossier) {
    const error = new Error('Dossier introuvable.')
    error.status = 404
    throw error
  }

  const [score, dataPoints, documents] = await Promise.all([
    computeDossierCompleteness(dossier),
    pool.query(
      `SELECT id, field_key, value, source, source_ref, confidence, verified_by, verified_at, created_at
         FROM data_points
        WHERE tenant_id = $1 AND client_id = $2 AND superseded_by IS NULL
        ORDER BY field_key`,
      [String(tenantId), String(dossier.client_id)],
    ),
    pool.query(
      `SELECT id, document_type, file_name, mime_type, status, source, created_at
         FROM client_documents
        WHERE tenant_id = $1 AND client_id = $2
        ORDER BY created_at DESC`,
      [String(tenantId), String(dossier.client_id)],
    ),
  ])

  const requirements = getProductRequirements(dossier.vertical_key || 'assurance', dossier.product_type)
  const fieldLabels = requirements?.field_labels || {}
  const documentLabels = requirements?.document_labels || {}

  return {
    dossier,
    score: {
      dossier_id: dossierId,
      vertical_key: dossier.vertical_key || 'assurance',
      product_type: dossier.product_type,
      ...score,
    },
    data_points: dataPoints.rows.map((row) => ({ ...row, label: fieldLabels[row.field_key] || row.field_key })),
    documents: documents.rows.map((row) => ({ ...row, label: documentLabels[row.document_type] || row.document_type })),
  }
}

async function computeDossierCompleteness(dossier) {
  const [fields, documents] = await Promise.all([
    activeFieldKeys(dossier.tenant_id, dossier.client_id),
    receivedDocumentTypes(dossier.tenant_id, dossier.client_id),
  ])

  const requirements = getProductRequirements(dossier.vertical_key || 'assurance', dossier.product_type)
  return scoreAgainst(requirements, {
    presentFields: fields,
    presentDocuments: documents,
  })
}

async function activeFieldKeys(tenantId, clientId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT field_key
       FROM data_points
      WHERE tenant_id = $1 AND client_id = $2 AND superseded_by IS NULL`,
    [String(tenantId), String(clientId)],
  )
  return rows.map((row) => row.field_key)
}

async function receivedDocumentTypes(tenantId, clientId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT document_type
       FROM client_documents
      WHERE tenant_id = $1 AND client_id = $2
        AND document_type IS NOT NULL
        AND status IN ('uploaded','extracting','extracted')`,
    [String(tenantId), String(clientId)],
  )
  return rows.map((row) => row.document_type)
}

module.exports = {
  scoreDossier,
  getDossierDetail,
}
