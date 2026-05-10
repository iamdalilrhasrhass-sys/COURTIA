const XLSX = require('xlsx');
const pool = require('../db');
const { suggestMapping, mapRowFromMapping } = require('./importMappingService');
const { validateClient, validateContract, validateTask, cleanString } = require('./importValidationService');

const MAX_ROWS = Number(process.env.IMPORT_MAX_ROWS || 10000);
const IMPORT_FILE_SIZE_LIMIT_MB = Number(process.env.IMPORT_MAX_MB || 10);

let importFoundationReady = false;

function safeUserId(user) {
  return user?.id || user?.userId || null;
}

async function ensureImportFoundation() {
  if (importFoundationReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS import_jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id INTEGER,
      filename TEXT NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'preview_ready',
      total_rows INTEGER NOT NULL DEFAULT 0,
      valid_rows INTEGER NOT NULL DEFAULT 0,
      error_rows INTEGER NOT NULL DEFAULT 0,
      duplicate_rows INTEGER NOT NULL DEFAULT 0,
      mapping_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS import_job_rows (
      id SERIAL PRIMARY KEY,
      import_job_id INTEGER NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
      row_number INTEGER NOT NULL,
      raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      mapped_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_import_job_rows_job ON import_job_rows(import_job_id);
    CREATE INDEX IF NOT EXISTS idx_import_job_rows_status ON import_job_rows(status);
  `);

  importFoundationReady = true;
}

function normalizeRows(rawRows = []) {
  return rawRows.map((row) => (Array.isArray(row) ? row : []));
}

function isCsvUpload(file = {}) {
  const name = String(file.originalname || '').toLowerCase();
  const mime = String(file.mimetype || '').toLowerCase();
  return name.endsWith('.csv') || mime.includes('csv') || mime.startsWith('text/');
}

function parseWorkbookFromBuffer(fileBuffer, file = {}) {
  const workbook = isCsvUpload(file)
    ? XLSX.read(Buffer.from(fileBuffer).toString('utf8').replace(/^\uFEFF/, ''), { type: 'string', cellDates: false })
    : XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error('import_empty_sheet');
  }
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });

  if (!matrix.length) {
    throw new Error('import_empty_file');
  }

  const headers = matrix[0].map((h) => String(h || '').trim());
  const rows = normalizeRows(matrix.slice(1)).filter((row) =>
    row.some((cell) => String(cell || '').trim() !== '')
  );

  if (!headers.some((h) => h)) {
    throw new Error('import_missing_headers');
  }

  if (rows.length > MAX_ROWS) {
    throw new Error('import_too_many_rows');
  }

  return { headers, rows };
}

function getPreviewStats({ headers = [], rows = [], mapping = {} }) {
  let validRows = 0;
  let errorRows = 0;
  const unknownColumns = headers.filter((h) => !Object.values(mapping).includes(h));
  const preview = [];

  rows.forEach((row, idx) => {
    const mapped = mapRowFromMapping({ headers, row, mapping });
    const clientValidation = validateClient(mapped);
    if (clientValidation.valid) validRows += 1;
    else errorRows += 1;
    if (preview.length < 8) {
      preview.push({
        row_number: idx + 2,
        mapped,
        errors: clientValidation.errors,
      });
    }
  });

  return {
    total_rows: rows.length,
    valid_rows_estimate: Math.max(validRows, 0),
    error_rows_estimate: Math.max(errorRows, 0),
    unknown_columns: unknownColumns,
    preview_rows: preview,
  };
}

async function createImportJob({ userId, filename, mapping, summary, headers, rows, organizationId = null }) {
  await ensureImportFoundation();

  const created = await pool.query(
    `INSERT INTO import_jobs (
      user_id, organization_id, filename, status, total_rows, valid_rows, error_rows, duplicate_rows, mapping_json, summary_json, created_at
    ) VALUES ($1,$2,$3,'preview_ready',$4,0,0,0,$5::jsonb,$6::jsonb,NOW())
    RETURNING *`,
    [userId, organizationId, filename, rows.length, JSON.stringify(mapping || {}), JSON.stringify(summary || {})]
  );

  const job = created.rows[0];
  for (let i = 0; i < rows.length; i += 1) {
    const rawObject = {};
    for (let c = 0; c < headers.length; c += 1) {
      rawObject[String(headers[c])] = rows[i][c];
    }
    await pool.query(
      `INSERT INTO import_job_rows (
        import_job_id, row_number, raw_json, mapped_json, status, errors_json, created_at
      ) VALUES ($1,$2,$3::jsonb,'{}'::jsonb,'pending','[]'::jsonb,NOW())`,
      [job.id, i + 2, JSON.stringify(rawObject)]
    );
  }

  return job;
}

async function getImportJobForUser(jobId, userId) {
  await ensureImportFoundation();
  const found = await pool.query(
    'SELECT * FROM import_jobs WHERE id=$1 AND user_id=$2 LIMIT 1',
    [jobId, userId]
  );
  return found.rows[0] || null;
}

async function getImportRows(jobId) {
  const rows = await pool.query(
    'SELECT * FROM import_job_rows WHERE import_job_id=$1 ORDER BY row_number ASC',
    [jobId]
  );
  return rows.rows;
}

async function findExistingClient({ userId, email, phone, prenom, nom, ville }, db) {
  const client = db || pool;
  const res = await client.query(
    `SELECT id
       FROM clients
      WHERE courtier_id = $1
        AND (
          ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
          OR ($3::text IS NOT NULL AND phone = $3)
          OR (
            $4::text IS NOT NULL
            AND $5::text IS NOT NULL
            AND LOWER(first_name) = LOWER($4)
            AND LOWER(last_name) = LOWER($5)
            AND ($6::text IS NULL OR LOWER(COALESCE(city, '')) = LOWER($6))
          )
        )
      LIMIT 1`,
    [userId, email || null, phone || null, prenom || null, nom || null, ville || null]
  );
  return res.rows[0]?.id || null;
}

async function createClientFromImport({ userId, normalized }, db) {
  const client = db || pool;
  const inserted = await client.query(
    `INSERT INTO clients (
      first_name, last_name, email, phone, address, status, type, company_name,
      postal_code, city, notes, courtier_id, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
    RETURNING id`,
    [
      normalized.prenom || '',
      normalized.nom || 'Client importé',
      normalized.email || null,
      normalized.telephone || null,
      normalized.adresse || null,
      normalized.statut || 'prospect',
      normalized.type_client || 'import',
      normalized.societe || null,
      normalized.code_postal || null,
      normalized.ville || null,
      normalized.notes || null,
      userId,
    ]
  );
  return inserted.rows[0].id;
}

async function maybeCreateContract({ clientId, contractData, db }) {
  if (!contractData?.valid || !clientId) return { created: false, duplicate: false };

  const contract = contractData.normalized;
  if (contract.numero) {
    const exists = await db.query(
      `SELECT q.id
         FROM quotes q
        WHERE q.client_id = $1
          AND q.quote_data->>'numero' = $2
        LIMIT 1`,
      [clientId, contract.numero]
    );
    if (exists.rows[0]) return { created: false, duplicate: true };
  }

  await db.query(
    `INSERT INTO quotes (client_id, quote_data, status, created_at)
     VALUES ($1,$2::jsonb,$3,NOW())`,
    [
      clientId,
      JSON.stringify({
        type_contrat: contract.type_contrat,
        compagnie: contract.compagnie,
        numero: contract.numero,
        prime_annuelle: contract.prime_annuelle,
        date_effet: contract.date_effet,
        date_echeance: contract.date_echeance,
      }),
      contract.statut || 'actif',
    ]
  );

  return { created: true, duplicate: false };
}

async function maybeCreateTask({ userId, clientId, taskData, db }) {
  if (!taskData?.valid) return { created: false };
  const task = taskData.normalized;
  await db.query(
    `INSERT INTO appointments (title, description, client_id, start_time, status, user_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [
      task.titre,
      'Tâche générée depuis import portefeuille COURTIA',
      clientId || null,
      task.echeance || null,
      'a_faire',
      userId,
    ]
  );
  return { created: true };
}

async function commitImportJob({ jobId, userId, mapping }) {
  await ensureImportFoundation();

  const job = await getImportJobForUser(jobId, userId);
  if (!job) {
    const err = new Error('import_job_not_found');
    err.code = 'IMPORT_JOB_NOT_FOUND';
    throw err;
  }

  const jobRows = await getImportRows(jobId);
  const effectiveMapping = mapping && Object.keys(mapping).length
    ? mapping
    : (job.mapping_json || {});

  const counters = {
    total_rows: jobRows.length,
    valid_rows: 0,
    error_rows: 0,
    duplicate_rows: 0,
    imported_clients: 0,
    imported_contracts: 0,
    imported_tasks: 0,
  };

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    await db.query(
      `UPDATE import_jobs
          SET status='processing', mapping_json=$2::jsonb
        WHERE id=$1`,
      [jobId, JSON.stringify(effectiveMapping)]
    );

    for (const rowEntry of jobRows) {
      const rawObject = rowEntry.raw_json && typeof rowEntry.raw_json === 'object' ? rowEntry.raw_json : {};
      const mapped = {};
      for (const [field, headerName] of Object.entries(effectiveMapping || {})) {
        if (headerName in rawObject) {
          mapped[field] = rawObject[headerName];
        }
      }

      const clientValidation = validateClient(mapped);
      const contractValidation = validateContract(mapped);
      const taskValidation = validateTask(mapped);

      const rowErrors = [];
      if (!clientValidation.valid) {
        rowErrors.push(...clientValidation.errors);
      }

      let rowStatus = 'error';
      let clientId = null;

      if (clientValidation.valid) {
        const n = clientValidation.normalized;
        const existingClientId = await findExistingClient({
          userId,
          email: n.email,
          phone: n.telephone,
          prenom: n.prenom,
          nom: n.nom,
          ville: n.ville,
        }, db);

        if (existingClientId) {
          clientId = existingClientId;
          counters.duplicate_rows += 1;
        } else {
          clientId = await createClientFromImport({ userId, normalized: n }, db);
          counters.imported_clients += 1;
        }

        const contractResult = await maybeCreateContract({ clientId, contractData: contractValidation, db });
        if (contractResult.created) counters.imported_contracts += 1;
        if (contractResult.duplicate) counters.duplicate_rows += 1;

        const taskResult = await maybeCreateTask({ userId, clientId, taskData: taskValidation, db });
        if (taskResult.created) counters.imported_tasks += 1;

        counters.valid_rows += 1;
        rowStatus = 'imported';
      } else {
        counters.error_rows += 1;
      }

      await db.query(
        `UPDATE import_job_rows
            SET mapped_json=$2::jsonb, status=$3, errors_json=$4::jsonb
          WHERE id=$1`,
        [rowEntry.id, JSON.stringify(mapped), rowStatus, JSON.stringify(rowErrors)]
      );
    }

    await db.query(
      `UPDATE import_jobs
          SET status='completed',
              total_rows=$2,
              valid_rows=$3,
              error_rows=$4,
              duplicate_rows=$5,
              summary_json=$6::jsonb,
              completed_at=NOW()
        WHERE id=$1`,
      [
        jobId,
        counters.total_rows,
        counters.valid_rows,
        counters.error_rows,
        counters.duplicate_rows,
        JSON.stringify(counters),
      ]
    );

    await db.query('COMMIT');
    return counters;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

async function getHistory(userId, limit = 20) {
  await ensureImportFoundation();
  const rows = await pool.query(
    `SELECT id, filename, status, total_rows, valid_rows, error_rows, duplicate_rows, summary_json, created_at, completed_at
       FROM import_jobs
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT $2`,
    [userId, Number(limit) || 20]
  );
  return rows.rows;
}

module.exports = {
  MAX_ROWS,
  IMPORT_FILE_SIZE_LIMIT_MB,
  safeUserId,
  ensureImportFoundation,
  parseWorkbookFromBuffer,
  suggestMapping,
  getPreviewStats,
  createImportJob,
  commitImportJob,
  getHistory,
};
