const pool = require('../../db')
const { emitEvent } = require('./events')

async function registerDocument(tenantId, document) {
  const { rows } = await pool.query(
    `INSERT INTO client_documents
       (tenant_id, client_id, dossier_id, uploaded_by, source, document_type, file_url, file_name, mime_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded')
     RETURNING *`,
    [
      String(tenantId),
      String(document.client_id),
      document.dossier_id ? String(document.dossier_id) : null,
      document.uploaded_by ? String(document.uploaded_by) : null,
      document.source || 'manual_upload',
      document.document_type || null,
      document.file_url,
      document.file_name || null,
      document.mime_type || null,
    ],
  )

  await emitEvent({
    tenantId,
    aggregateType: document.dossier_id ? 'dossier' : 'client',
    aggregateId: document.dossier_id || document.client_id,
    eventType: 'document.received',
    actorType: document.source === 'whatsapp' ? 'client' : 'human',
    actorId: document.uploaded_by || null,
    payload: {
      document_id: rows[0].id,
      document_type: rows[0].document_type,
      source: rows[0].source,
      file_name: rows[0].file_name,
    },
  })

  return rows[0]
}

async function writeDataPoint(tenantId, clientId, point) {
  const db = await pool.connect()
  try {
    await db.query('BEGIN')

    const previous = await db.query(
      `SELECT id
         FROM data_points
        WHERE tenant_id = $1 AND client_id = $2 AND field_key = $3 AND superseded_by IS NULL
        ORDER BY created_at DESC
        LIMIT 1`,
      [String(tenantId), String(clientId), point.field_key],
    )

    const inserted = await db.query(
      `INSERT INTO data_points
         (tenant_id, client_id, field_key, value, source, source_ref, confidence, verified_by, verified_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        String(tenantId),
        String(clientId),
        point.field_key,
        JSON.stringify(point.value),
        point.source,
        point.source_ref || null,
        point.confidence ?? null,
        point.verified_by ? String(point.verified_by) : null,
        point.verified_at || null,
      ],
    )

    if (previous.rows[0]) {
      await db.query('UPDATE data_points SET superseded_by = $1 WHERE id = $2', [inserted.rows[0].id, previous.rows[0].id])
    }

    await db.query('COMMIT')
    return inserted.rows[0]
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    db.release()
  }
}

async function extractDocument() {
  const error = new Error('Extraction documentaire Claude non branchee : fournir une implementation par type de document avant usage production.')
  error.status = 501
  throw error
}

module.exports = {
  registerDocument,
  writeDataPoint,
  extractDocument,
}
