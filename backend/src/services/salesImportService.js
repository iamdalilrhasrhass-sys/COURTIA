const crypto = require('crypto')
const XLSX = require('xlsx')
const pool = require('../db')
const {
  normalizeCabinetPayload,
  validateCabinetPayload,
  cleanText,
} = require('./salesProspectingPolicy')
const { appendSalesAudit } = require('./salesAuditService')
const { httpError, withTransaction } = require('./salesProspectingService')

const MAX_IMPORT_ROWS = 20000

const HEADER_ALIASES = {
  legal_name: ['raison sociale', 'denomination', 'dénomination', 'nom entreprise', 'company name', 'legal name'],
  trade_name: ['nom commercial', 'enseigne', 'trade name'],
  siren: ['siren'],
  siret: ['siret'],
  orias_number: ['orias', 'numero orias', 'numéro orias', 'n° orias'],
  address: ['adresse', 'address', 'adresse complete', 'adresse complète'],
  postal_code: ['code postal', 'cp', 'postal code'],
  city: ['ville', 'commune', 'city'],
  department: ['departement', 'département', 'department'],
  region: ['region', 'région'],
  phone: ['telephone', 'téléphone', 'tel', 'tél', 'phone'],
  professional_email: ['email', 'e-mail', 'courriel', 'email professionnel'],
  website: ['site', 'site internet', 'website', 'url'],
  legal_representative_name: ['dirigeant', 'nom dirigeant', 'representant legal', 'représentant légal'],
  primary_contact_name: ['contact', 'contact principal', 'nom contact'],
  primary_contact_role: ['fonction contact', 'fonction', 'role contact', 'rôle contact'],
  employee_count: ['salaries', 'salariés', 'nombre salaries', 'nombre salariés', 'effectif'],
  revenue_eur: ['chiffre affaires', "chiffre d'affaires", 'ca', 'revenue'],
  establishment_count: ['nombre etablissements', 'nombre établissements', 'etablissements', 'établissements'],
  company_category: ['categorie entreprise', 'catégorie entreprise', 'categorie', 'catégorie'],
  data_source: ['source', 'source donnees', 'source données'],
  source_url: ['url source', 'source url'],
  verified_at: ['date verification', 'date vérification', 'verified at'],
  priority: ['priorite', 'priorité', 'priority'],
  notes: ['notes', 'commentaire', 'commentaires'],
}

function canonicalHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9°' ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const ALIAS_LOOKUP = Object.entries(HEADER_ALIASES).reduce((lookup, [field, aliases]) => {
  lookup[canonicalHeader(field)] = field
  aliases.forEach((alias) => { lookup[canonicalHeader(alias)] = field })
  return lookup
}, {})

function parseWorkbook(buffer, fileName = 'import.csv') {
  let workbook
  try {
    const isCsv = /\.csv$/i.test(fileName)
    workbook = isCsv
      ? XLSX.read(buffer.toString('utf8').replace(/^\uFEFF/, ''), { type: 'string', raw: false, cellDates: true, codepage: 65001 })
      : XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: true })
  } catch (error) {
    throw httpError(422, 'import_file_unreadable', error.message)
  }
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw httpError(422, 'import_sheet_missing')
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  if (!rows.length) throw httpError(422, 'import_file_empty')
  if (rows.length > MAX_IMPORT_ROWS) throw httpError(413, 'import_row_limit_exceeded', { max_rows: MAX_IMPORT_ROWS })
  const headers = Object.keys(rows[0])
  return { fileName, sheetName, headers, rows }
}

function suggestMapping(headers = []) {
  const mapping = {}
  const unknown = []
  for (const header of headers) {
    const field = ALIAS_LOOKUP[canonicalHeader(header)]
    if (field && !mapping[field]) mapping[field] = header
    else if (!field) unknown.push(header)
  }
  return { mapping, unknown }
}

function mapRow(row, mapping) {
  const payload = {}
  for (const [field, header] of Object.entries(mapping || {})) payload[field] = row[header]
  return normalizeCabinetPayload(payload)
}

function duplicateKey(cabinet) {
  if (cabinet.siren) return `siren:${cabinet.siren}`
  if (cabinet.siret) return `siret:${cabinet.siret}`
  return `name:${String(cabinet.legal_name || '').toLowerCase()}|${String(cabinet.address || '').toLowerCase()}`
}

async function findExistingDuplicates(cabinets, db = pool) {
  const sirens = Array.from(new Set(cabinets.map((row) => row.siren).filter(Boolean)))
  const sirets = Array.from(new Set(cabinets.map((row) => row.siret).filter(Boolean)))
  const names = Array.from(new Set(cabinets.map((row) => row.legal_name?.toLowerCase()).filter(Boolean)))
  const result = await db.query(
    `SELECT id, legal_name, address, siren, siret FROM sales_cabinets
     WHERE (cardinality($1::text[]) > 0 AND siren=ANY($1::text[]))
        OR (cardinality($2::text[]) > 0 AND siret=ANY($2::text[]))
        OR (cardinality($3::text[]) > 0 AND LOWER(legal_name)=ANY($3::text[]))`,
    [sirens, sirets, names]
  )
  const lookup = new Map()
  for (const row of result.rows) {
    if (row.siren) lookup.set(`siren:${row.siren}`, row.id)
    if (row.siret) lookup.set(`siret:${row.siret}`, row.id)
    lookup.set(`name:${String(row.legal_name || '').toLowerCase()}|${String(row.address || '').toLowerCase()}`, row.id)
  }
  return lookup
}

async function previewImport(user, file, input = {}, auditContext = {}) {
  if (!file?.buffer) throw httpError(422, 'import_file_required')
  const parsed = parseWorkbook(file.buffer, file.originalname)
  const suggested = suggestMapping(parsed.headers)
  const mapping = input.mapping && typeof input.mapping === 'object' ? input.mapping : suggested.mapping
  const normalized = parsed.rows.map((row) => mapRow(row, mapping))
  const duplicates = await findExistingDuplicates(normalized)
  const seen = new Map()
  const stagedRows = normalized.map((cabinet, index) => {
    const errors = validateCabinetPayload(cabinet)
    const key = duplicateKey(cabinet)
    if (seen.has(key)) errors.push(`duplicate_in_file_row_${seen.get(key)}`)
    else seen.set(key, index + 2)
    const duplicateId = duplicates.get(key) || null
    return {
      row_number: index + 2,
      normalized_data: cabinet,
      validation_errors: errors,
      duplicate_cabinet_id: duplicateId,
      action: errors.length ? 'error' : (duplicateId ? 'update' : 'create'),
    }
  })
  const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex')
  return withTransaction(async (db) => {
    const job = await db.query(
      `INSERT INTO sales_import_jobs
       (created_by,source,source_label,file_name,file_sha256,total_rows,valid_rows,error_rows,errors)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [user.id, cleanText(input.source, 80) || 'csv', cleanText(input.source_label, 255), file.originalname.slice(0, 255), fileHash, stagedRows.length, stagedRows.filter((row) => !row.validation_errors.length).length, stagedRows.filter((row) => row.validation_errors.length).length, JSON.stringify(stagedRows.filter((row) => row.validation_errors.length).slice(0, 200).map((row) => ({ row_number: row.row_number, errors: row.validation_errors })))]
    )
    await db.query(
      `INSERT INTO sales_import_rows (import_job_id,row_number,normalized_data,validation_errors,duplicate_cabinet_id,action)
       SELECT $1,x.row_number,x.normalized_data,x.validation_errors,x.duplicate_cabinet_id,x.action
       FROM jsonb_to_recordset($2::jsonb) AS x(row_number int, normalized_data jsonb, validation_errors jsonb, duplicate_cabinet_id bigint, action text)`,
      [job.rows[0].id, JSON.stringify(stagedRows)]
    )
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'import.preview', entityType: 'sales_import_job', entityId: job.rows[0].id, metadata: { file_name: file.originalname, total_rows: stagedRows.length, source: input.source || 'csv' } }, db)
    return {
      job: job.rows[0],
      headers: parsed.headers,
      mapping,
      unknown_columns: suggested.unknown,
      preview_rows: stagedRows.slice(0, 50),
      duplicate_rows: stagedRows.filter((row) => row.duplicate_cabinet_id).length,
    }
  })
}

const CABINET_IMPORT_FIELDS = [
  'legal_name','trade_name','siren','siret','orias_number','address','postal_code','city','department','region',
  'phone','professional_email','website','legal_representative_name','primary_contact_name','primary_contact_role',
  'employee_count','revenue_eur','establishment_count','company_category','size_category','size_score','size_is_estimated',
  'size_explanation','data_source','source_url','verified_at','priority','notes',
]

async function commitImport(user, jobId, input = {}, auditContext = {}) {
  const mode = ['create_only', 'update_only', 'upsert'].includes(input.mode) ? input.mode : 'upsert'
  return withTransaction(async (db) => {
    const jobResult = await db.query(`SELECT * FROM sales_import_jobs WHERE id=$1 FOR UPDATE`, [jobId])
    const job = jobResult.rows[0]
    if (!job) throw httpError(404, 'import_job_not_found')
    if (job.status !== 'previewed') throw httpError(409, 'import_job_not_committable')
    const rows = await db.query(`SELECT * FROM sales_import_rows WHERE import_job_id=$1 ORDER BY row_number`, [jobId])
    const createdIds = []
    const updatedSnapshots = []
    let created = 0
    let updated = 0
    let skipped = 0
    for (const staged of rows.rows) {
      const errors = Array.isArray(staged.validation_errors) ? staged.validation_errors : []
      if (errors.length) { skipped += 1; continue }
      const data = staged.normalized_data
      const duplicateId = staged.duplicate_cabinet_id ? Number(staged.duplicate_cabinet_id) : null
      if (duplicateId) {
        if (mode === 'create_only') { skipped += 1; continue }
        const before = await db.query(`SELECT * FROM sales_cabinets WHERE id=$1 FOR UPDATE`, [duplicateId])
        if (!before.rows[0]) { skipped += 1; continue }
        updatedSnapshots.push({ id: duplicateId, data: before.rows[0] })
        const values = CABINET_IMPORT_FIELDS.map((field) => data[field] ?? null)
        const set = CABINET_IMPORT_FIELDS.map((field, index) => `${field}=COALESCE($${index + 1},${field})`).join(',')
        await db.query(`UPDATE sales_cabinets SET ${set}, import_job_id=$${values.length + 1}, updated_by=$${values.length + 2}, updated_at=NOW() WHERE id=$${values.length + 3}`, [...values, jobId, user.id, duplicateId])
        await db.query(`UPDATE sales_import_rows SET action='updated' WHERE id=$1`, [staged.id])
        updated += 1
      } else {
        if (mode === 'update_only') { skipped += 1; continue }
        const values = CABINET_IMPORT_FIELDS.map((field) => data[field] ?? null)
        const result = await db.query(`INSERT INTO sales_cabinets (${CABINET_IMPORT_FIELDS.join(',')},import_job_id,created_by,updated_by) VALUES (${values.map((_, index) => `$${index + 1}`).join(',')},$${values.length + 1},$${values.length + 2},$${values.length + 3}) RETURNING id`, [...values, jobId, user.id, user.id])
        createdIds.push(result.rows[0].id)
        await db.query(`UPDATE sales_import_rows SET action='created', duplicate_cabinet_id=$1 WHERE id=$2`, [result.rows[0].id, staged.id])
        created += 1
      }
    }
    await db.query(`UPDATE sales_import_jobs SET status='committed',import_mode=$1,created_rows=$2,updated_rows=$3,skipped_rows=$4,created_cabinet_ids=$5,updated_snapshots=$6,committed_at=NOW() WHERE id=$7`, [mode, created, updated, skipped, JSON.stringify(createdIds), JSON.stringify(updatedSnapshots), jobId])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'import.commit', entityType: 'sales_import_job', entityId: jobId, metadata: { mode, created, updated, skipped, source: job.source } }, db)
    return { job_id: Number(jobId), created, updated, skipped, status: 'committed' }
  })
}

async function rollbackImport(user, jobId, auditContext = {}) {
  return withTransaction(async (db) => {
    const result = await db.query(`SELECT * FROM sales_import_jobs WHERE id=$1 FOR UPDATE`, [jobId])
    const job = result.rows[0]
    if (!job) throw httpError(404, 'import_job_not_found')
    if (job.status !== 'committed' || !job.committed_at) throw httpError(409, 'import_job_not_rollbackable')
    if (Date.now() - new Date(job.committed_at).getTime() > 24 * 60 * 60 * 1000) throw httpError(409, 'import_rollback_window_expired')
    const createdIds = Array.isArray(job.created_cabinet_ids) ? job.created_cabinet_ids.map(Number) : []
    let deleted = 0
    for (const id of createdIds) {
      const removed = await db.query(
        `DELETE FROM sales_cabinets c WHERE c.id=$1
         AND c.updated_at <= (SELECT committed_at FROM sales_import_jobs WHERE id=$2)
         AND NOT EXISTS (SELECT 1 FROM sales_calls sc WHERE sc.cabinet_id=c.id)
         AND NOT EXISTS (SELECT 1 FROM sales_appointments sa WHERE sa.cabinet_id=c.id)
         AND NOT EXISTS (SELECT 1 FROM sales_cabinet_notes sn WHERE sn.cabinet_id=c.id)
         AND NOT EXISTS (SELECT 1 FROM sales_cabinet_assignments sh WHERE sh.cabinet_id=c.id)
         AND NOT EXISTS (SELECT 1 FROM sales_followups sf WHERE sf.cabinet_id=c.id)
         AND NOT EXISTS (SELECT 1 FROM sales_proposals sp WHERE sp.cabinet_id=c.id)
         AND NOT EXISTS (SELECT 1 FROM sales_status_history ss WHERE ss.cabinet_id=c.id)
         RETURNING id`,
        [id, jobId]
      )
      deleted += removed.rowCount
    }
    const snapshots = Array.isArray(job.updated_snapshots) ? job.updated_snapshots : []
    let restored = 0
    for (const snapshot of snapshots) {
      const data = snapshot.data || {}
      const values = CABINET_IMPORT_FIELDS.map((field) => data[field] ?? null)
      const set = CABINET_IMPORT_FIELDS.map((field, index) => `${field}=$${index + 1}`).join(',')
      const update = await db.query(
        `UPDATE sales_cabinets SET ${set}, assigned_to=$${values.length + 1}, commercial_status=$${values.length + 2}, interest_level=$${values.length + 3}, next_action=$${values.length + 4}, next_followup_at=$${values.length + 5}, notes=$${values.length + 6}, import_job_id=$${values.length + 7}, updated_by=$${values.length + 8}, updated_at=NOW()
         WHERE id=$${values.length + 9}
         AND sales_cabinets.updated_at <= (SELECT committed_at FROM sales_import_jobs WHERE id=$${values.length + 10})
         AND NOT EXISTS (SELECT 1 FROM sales_calls sc WHERE sc.cabinet_id=sales_cabinets.id AND sc.created_at > (SELECT committed_at FROM sales_import_jobs WHERE id=$${values.length + 10}))`,
        [...values, data.assigned_to ?? null, data.commercial_status || 'non_attribue', data.interest_level ?? null, data.next_action ?? null, data.next_followup_at ?? null, data.notes ?? null, data.import_job_id ?? null, user.id, snapshot.id, jobId]
      )
      restored += update.rowCount
    }
    const fullyRolledBack = deleted === createdIds.length && restored === snapshots.length
    await db.query(`UPDATE sales_import_jobs SET status=$1,rolled_back_at=NOW() WHERE id=$2`, [fullyRolledBack ? 'rolled_back' : 'partially_rolled_back', jobId])
    await appendSalesAudit({ ...auditContext, actorId: user.id, action: 'import.rollback', entityType: 'sales_import_job', entityId: jobId, metadata: { deleted, expected_deletions: createdIds.length, restored, expected_restores: snapshots.length, fully_rolled_back: fullyRolledBack } }, db)
    return { job_id: Number(jobId), deleted, restored, fully_rolled_back: fullyRolledBack }
  })
}

async function listImports() {
  const result = await pool.query(`SELECT sij.*,u.username,u.email FROM sales_import_jobs sij JOIN users u ON u.id=sij.created_by ORDER BY sij.created_at DESC LIMIT 100`)
  return result.rows
}

module.exports = {
  MAX_IMPORT_ROWS,
  canonicalHeader,
  parseWorkbook,
  suggestMapping,
  mapRow,
  duplicateKey,
  previewImport,
  commitImport,
  rollbackImport,
  listImports,
}
