#!/usr/bin/env node
import { pathToFileURL } from 'node:url'

export const REQUIRED_TABLES = [
  'events',
  'dossiers',
  'ai_actions',
  'ark_daily_briefs',
  'client_documents',
  'data_points',
  'inbound_events',
  'whatsapp_accounts',
  'dossier_links',
  'advice_notes',
  'prospects',
  'prospect_messages',
]

const REQUIRED_ENV = [
  ['DATABASE_URL', 'databaseUrl'],
  ['BASE_URL', 'baseUrl'],
  ['SMOKE_AUTH_TOKEN', 'authToken'],
  ['SMOKE_TENANT_ID', 'tenantId'],
  ['SMOKE_CLIENT_ID', 'clientId'],
]

const OPTIONAL_ENV = [
  ['ANTHROPIC_API_KEY', 'anthropicReady'],
  ['WHATSAPP_TOKEN', 'whatsappReady'],
  ['BREVO_API_KEY', 'brevoKeyReady'],
  ['BREVO_SENDER_EMAIL', 'brevoSenderReady'],
]

const AUTO_FIELDS = {
  first_name: 'Smoke',
  last_name: 'Courtia',
  date_of_birth: '1988-01-01',
  address: '1 rue du Test, 75000 Paris',
  phone: '+33600000000',
  email: 'smoke@example.test',
  vehicle_registration: 'AA-123-AA',
  vehicle_usage: 'privé',
  bonus_malus: 0.76,
  claims_history_36m: 0,
  primary_driver: 'assuré principal',
}

const AUTO_DOCUMENTS = ['permis', 'carte_grise', 'releve_information', 'rib']

export function normalizeBaseUrl(value = '') {
  return String(value || '').replace(/\/+$/, '')
}

export function collectConfig(env = process.env) {
  return {
    databaseUrl: env.DATABASE_URL || '',
    baseUrl: normalizeBaseUrl(env.BASE_URL || ''),
    authToken: env.SMOKE_AUTH_TOKEN || '',
    tenantId: env.SMOKE_TENANT_ID || '',
    clientId: env.SMOKE_CLIENT_ID || '',
    allowWrites: env.SMOKE_ALLOW_WRITES === '1' || String(env.SMOKE_ALLOW_WRITES || '').toLowerCase() === 'true',
    keepData: env.SMOKE_KEEP_DATA === '1',
    testOutbound: env.SMOKE_TEST_OUTBOUND === '1',
    anthropicReady: Boolean(env.ANTHROPIC_API_KEY),
    whatsappReady: Boolean(env.WHATSAPP_TOKEN),
    brevoKeyReady: Boolean(env.BREVO_API_KEY),
    brevoSenderReady: Boolean(env.BREVO_SENDER_EMAIL),
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || '',
  }
}

export function evaluateConfig(config) {
  const checks = []

  for (const [name, key] of REQUIRED_ENV) {
    checks.push(config[key]
      ? pass(name, 'configuré')
      : fail(name, 'manquant'))
  }

  checks.push(config.allowWrites
    ? pass('SMOKE_ALLOW_WRITES', 'écritures explicitement autorisées')
    : fail('SMOKE_ALLOW_WRITES', 'refus d’écrire sans SMOKE_ALLOW_WRITES=1'))

  for (const [name, key] of OPTIONAL_ENV) {
    checks.push(config[key]
      ? pass(name, 'configuré')
      : skip(name, 'absent : les étapes live liées seront ignorées'))
  }

  return checks
}

export function summarizeChecks(checks) {
  const failCount = checks.filter((check) => check.status === 'FAIL').length
  const skipCount = checks.filter((check) => check.status === 'SKIP').length
  return {
    go: failCount === 0,
    failCount,
    skipCount,
    passCount: checks.filter((check) => check.status === 'PASS').length,
  }
}

function pass(name, detail = '') {
  return { status: 'PASS', name, detail }
}

function fail(name, detail = '') {
  return { status: 'FAIL', name, detail }
}

function skip(name, detail = '') {
  return { status: 'SKIP', name, detail }
}

function warn(name, detail = '') {
  return { status: 'WARN', name, detail }
}

function icon(status) {
  return {
    PASS: '✅',
    FAIL: '❌',
    SKIP: '⏭️',
    WARN: '⚠️',
  }[status] || '•'
}

function printChecks(title, checks) {
  console.log(`\n${title}`)
  for (const check of checks) {
    console.log(`${icon(check.status)} ${check.status.padEnd(4)} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`)
  }
}

function printSummary(checks) {
  const summary = summarizeChecks(checks)
  console.log(`\nRésumé : ${summary.passCount} PASS · ${summary.skipCount} SKIP · ${summary.failCount} FAIL`)
  console.log(summary.go ? '\n✅ GO' : '\n❌ NO-GO')
  return summary
}

async function makePool(databaseUrl) {
  const pg = await import('pg')
  const Pool = pg.Pool || pg.default?.Pool
  return new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
  })
}

async function preflightDatabase(pool, config) {
  const checks = []

  await pool.query('SELECT 1')
  checks.push(pass('DB', 'connexion OK'))

  const tables = await pool.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES],
  )
  const present = new Set(tables.rows.map((row) => row.table_name))
  const missing = REQUIRED_TABLES.filter((table) => !present.has(table))
  checks.push(missing.length === 0
    ? pass('Tables ARK', `${REQUIRED_TABLES.length}/${REQUIRED_TABLES.length} présentes`)
    : fail('Tables ARK', `manquantes : ${missing.join(', ')}`))

  const trigger = await pool.query(
    `SELECT 1
       FROM pg_trigger
      WHERE tgname = 'trg_events_immutable'
        AND NOT tgisinternal
      LIMIT 1`,
  )
  checks.push(trigger.rows[0]
    ? pass('Journal append-only', 'trigger trg_events_immutable présent')
    : fail('Journal append-only', 'trigger trg_events_immutable absent'))

  const client = await loadSmokeClient(pool, config.clientId)
  checks.push(client
    ? pass('Client smoke', `client ${config.clientId} trouvé`)
    : fail('Client smoke', `client ${config.clientId} introuvable`))
  if (client) {
    checks.push(client.email ? pass('Client email', client.email) : warn('Client email', 'absent : email live non testable'))
    checks.push(client.phone ? pass('Client téléphone', client.phone) : warn('Client téléphone', 'absent : WhatsApp live non testable'))
  }

  const phoneNumberId = await tenantPhoneNumberId(pool, config)
  if (phoneNumberId) {
    checks.push(pass('WhatsApp mapping', `phone_number_id=${phoneNumberId}`))
  } else if (config.whatsappReady) {
    checks.push(fail('WhatsApp mapping', 'WHATSAPP_TOKEN présent mais aucun phone_number_id configuré'))
  } else {
    checks.push(skip('WhatsApp mapping', 'pas de credentials Meta : étape live ignorée'))
  }

  return { checks, client, phoneNumberId }
}

async function loadSmokeClient(pool, clientId) {
  const columnResult = await pool.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_name = 'clients'
        AND column_name = ANY($1::text[])`,
    [['email', 'phone', 'mobile', 'telephone']],
  )
  const columns = new Set(columnResult.rows.map((row) => row.column_name))
  const select = [
    'id::text AS id',
    columns.has('email') ? 'email' : 'NULL::text AS email',
    columns.has('phone') ? 'phone' : 'NULL::text AS phone',
    columns.has('mobile') ? 'mobile' : 'NULL::text AS mobile',
    columns.has('telephone') ? 'telephone' : 'NULL::text AS telephone',
  ].join(', ')

  const { rows } = await pool.query(`SELECT ${select} FROM clients WHERE id::text = $1 LIMIT 1`, [String(clientId)])
  if (!rows[0]) return null
  return {
    id: rows[0].id,
    email: rows[0].email || null,
    phone: rows[0].phone || rows[0].mobile || rows[0].telephone || null,
  }
}

async function tenantPhoneNumberId(pool, config) {
  if (config.whatsappPhoneNumberId) return config.whatsappPhoneNumberId
  const { rows } = await pool.query(
    'SELECT phone_number_id FROM whatsapp_accounts WHERE tenant_id = $1 LIMIT 1',
    [String(config.tenantId)],
  )
  return rows[0]?.phone_number_id || null
}

async function apiRequest(config, method, path, body = undefined) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${config.authToken}`,
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: response.status, ok: response.ok, data }
}

async function seedFixture(pool, config) {
  const created = {
    dossiers: [],
    dataPoints: [],
    documents: [],
    adviceNotes: [],
    actions: [],
  }

  const dossier = await pool.query(
    `INSERT INTO dossiers
       (tenant_id, client_id, vertical_key, product_type, status, completion_score, estimated_premium, assigned_to)
     VALUES ($1, $2, 'assurance', 'auto', 'tarification', 45, 420, 'smoke-test')
     RETURNING id`,
    [String(config.tenantId), String(config.clientId)],
  )
  const dossierId = String(dossier.rows[0].id)
  created.dossiers.push(dossierId)

  for (const [fieldKey, value] of Object.entries(AUTO_FIELDS)) {
    const inserted = await pool.query(
      `INSERT INTO data_points
         (tenant_id, client_id, field_key, value, source, confidence, verified_at)
       VALUES ($1, $2, $3, $4::jsonb, 'smoke-test', 1, NOW())
       RETURNING id`,
      [String(config.tenantId), String(config.clientId), fieldKey, JSON.stringify(value)],
    )
    created.dataPoints.push(String(inserted.rows[0].id))
  }

  for (const documentType of AUTO_DOCUMENTS) {
    const inserted = await pool.query(
      `INSERT INTO client_documents
         (tenant_id, client_id, dossier_id, uploaded_by, source, document_type, file_url, file_name, mime_type, status)
       VALUES ($1, $2, $3, 'smoke-test', 'api', $4, $5, $6, 'application/pdf', 'extracted')
       RETURNING id`,
      [
        String(config.tenantId),
        String(config.clientId),
        dossierId,
        documentType,
        `smoke://${documentType}.pdf`,
        `${documentType}.pdf`,
      ],
    )
    created.documents.push(String(inserted.rows[0].id))
  }

  return { dossierId, created }
}

async function insertAdviceNote(pool, config, dossierId, overrides = {}) {
  const inserted = await pool.query(
    `INSERT INTO advice_notes
       (tenant_id, client_id, dossier_id, vertical_key, product_type,
        needs_summary, client_situation, facts_used, options_considered,
        recommendation, recommendation_reasons, warnings, missing_information, status, generated_by_model)
     VALUES ($1,$2,$3,'assurance','auto',$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10::jsonb,$11::jsonb,'draft','smoke-fixture')
     RETURNING id`,
    [
      String(config.tenantId),
      String(config.clientId),
      dossierId,
      overrides.needs_summary ?? 'Le client souhaite assurer son véhicule principal.',
      overrides.client_situation ?? 'Dossier smoke test avec données vérifiées.',
      JSON.stringify(overrides.facts_used ?? [{ fact: 'Bonus-malus 0.76', verified: true }]),
      JSON.stringify(overrides.options_considered ?? [
        { name: 'Tiers étendu', pros: ['Prime plus basse'], cons: ['Protection limitée'] },
        { name: 'Tous risques', pros: ['Protection renforcée'], cons: ['Prime plus élevée'] },
      ]),
      overrides.recommendation ?? 'Recommandation provisoire : formule tous risques.',
      overrides.recommendation_reasons ?? 'Elle répond au besoin de protéger le véhicule principal avec une couverture large.',
      JSON.stringify(overrides.warnings ?? []),
      JSON.stringify(overrides.missing_information ?? []),
    ],
  )
  return String(inserted.rows[0].id)
}

async function insertAction(pool, config, actionType, payload, requiresApproval = true) {
  const inserted = await pool.query(
    `INSERT INTO ai_actions
       (tenant_id, client_id, agent_key, action_type, title, rationale, payload, priority, status, requires_approval)
     VALUES ($1, $2, 'ark', $3, $4, 'Smoke test', $5::jsonb, 'high', 'pending', $6)
     RETURNING id`,
    [
      String(config.tenantId),
      String(config.clientId),
      actionType,
      `Smoke ${actionType}`,
      JSON.stringify(payload || {}),
      requiresApproval,
    ],
  )
  return String(inserted.rows[0].id)
}

async function runJourney(pool, config) {
  const checks = []
  const fixture = await seedFixture(pool, config)
  const { dossierId, created } = fixture
  checks.push(pass('Fixture', `dossier auto ${dossierId} créé`))

  const blocked = await apiRequest(config, 'POST', `/api/ark/dossiers/${dossierId}/advance`, {
    to_state: 'conseil',
    context: { completionScore: 45, blockingPoints: ['Relevé d’information manquant'], skipHandoff: true },
  })
  checks.push(blocked.status === 403
    ? pass('Gate DDA conseil', 'conseil bloqué sur dossier incomplet')
    : fail('Gate DDA conseil', `attendu 403, reçu ${blocked.status}`))

  const score = await apiRequest(config, 'POST', `/api/ark/dossiers/${dossierId}/score`)
  checks.push(score.ok && score.data?.completion_score >= 100
    ? pass('Score dossier', `complétude ${score.data.completion_score}%`)
    : fail('Score dossier', `score inattendu : ${JSON.stringify(score.data)}`))

  const advanced = await apiRequest(config, 'POST', `/api/ark/dossiers/${dossierId}/advance`, {
    to_state: 'conseil',
    context: { completionScore: 100, blockingPoints: [], skipHandoff: true },
  })
  checks.push(advanced.ok
    ? pass('Transition conseil', 'dossier avancé en conseil via API')
    : fail('Transition conseil', `reçu ${advanced.status} : ${JSON.stringify(advanced.data)}`))

  if (config.anthropicReady) {
    const generated = await apiRequest(config, 'POST', `/api/ark/dossiers/${dossierId}/advice-note`)
    if (generated.ok) {
      created.adviceNotes.push(String(generated.data.id))
      checks.push(pass('Génération note', `note ${generated.data.id}`))
    } else {
      checks.push(fail('Génération note', `reçu ${generated.status} : ${JSON.stringify(generated.data)}`))
    }
  } else {
    checks.push(skip('Génération note', 'ANTHROPIC_API_KEY absent'))
  }

  const incompleteNoteId = await insertAdviceNote(pool, config, dossierId, { recommendation_reasons: '' })
  created.adviceNotes.push(incompleteNoteId)
  const refusedNote = await apiRequest(config, 'POST', `/api/ark/advice-notes/${incompleteNoteId}/validate`, {})
  checks.push(refusedNote.status === 422
    ? pass('Validation note DDA', 'refus sans raisons')
    : fail('Validation note DDA', `attendu 422, reçu ${refusedNote.status}`))

  const noteId = await insertAdviceNote(pool, config, dossierId)
  created.adviceNotes.push(noteId)
  const validated = await apiRequest(config, 'POST', `/api/ark/advice-notes/${noteId}/validate`, {})
  checks.push(validated.ok && validated.data?.status === 'validated'
    ? pass('Validation note complète', `note ${noteId} validée`)
    : fail('Validation note complète', `reçu ${validated.status} : ${JSON.stringify(validated.data)}`))

  const sensitiveActionId = await insertAction(pool, config, 'send_email', {
    subject: 'Smoke Courtia',
    message: 'Smoke test',
    to_email: 'smoke@example.test',
  })
  created.actions.push(sensitiveActionId)
  const refusedAction = await apiRequest(config, 'POST', `/api/ark/actions/${sensitiveActionId}/execute`)
  checks.push(refusedAction.status === 403
    ? pass('Policy gate action', 'action sensible refusée sans approbation')
    : fail('Policy gate action', `attendu 403, reçu ${refusedAction.status}`))

  const internalActionId = await insertAction(pool, config, 'create_task', { title: 'Smoke task' })
  created.actions.push(internalActionId)
  const approved = await apiRequest(config, 'POST', `/api/ark/actions/${internalActionId}/approve`)
  const executed = approved.ok
    ? await apiRequest(config, 'POST', `/api/ark/actions/${internalActionId}/execute`)
    : { ok: false, status: approved.status, data: approved.data }
  checks.push(approved.ok && executed.ok && executed.data?.action?.status === 'executed'
    ? pass('Boucle action', 'créer → approuver → exécuter OK')
    : fail('Boucle action', `approve=${approved.status}, execute=${executed.status}`))

  if (config.testOutbound && config.brevoKeyReady && config.brevoSenderReady) {
    const outboundActionId = await insertAction(pool, config, 'send_email', {
      subject: 'Smoke Courtia',
      message: 'Smoke test Courtia',
    })
    created.actions.push(outboundActionId)
    const outboundApproved = await apiRequest(config, 'POST', `/api/ark/actions/${outboundActionId}/approve`)
    const outboundExecuted = outboundApproved.ok
      ? await apiRequest(config, 'POST', `/api/ark/actions/${outboundActionId}/execute`)
      : { ok: false, status: outboundApproved.status, data: outboundApproved.data }
    checks.push(outboundExecuted.ok
      ? pass('Envoi email Brevo', 'email envoyé via dispatch réel')
      : fail('Envoi email Brevo', `reçu ${outboundExecuted.status} : ${JSON.stringify(outboundExecuted.data)}`))
  } else {
    checks.push(skip('Envoi live', 'SMOKE_TEST_OUTBOUND=1 + Brevo requis pour envoyer réellement'))
  }

  const subscribed = await apiRequest(config, 'POST', `/api/ark/dossiers/${dossierId}/advance`, {
    to_state: 'souscription',
    context: { adviceNoteValidated: true },
  })
  const active = subscribed.ok
    ? await apiRequest(config, 'POST', `/api/ark/dossiers/${dossierId}/advance`, { to_state: 'actif', context: {} })
    : { ok: false, status: subscribed.status, data: subscribed.data }
  checks.push(subscribed.ok && active.ok
    ? pass('Souscription → actif', 'policy gate puis activation OK')
    : fail('Souscription → actif', `souscription=${subscribed.status}, actif=${active.status}`))

  const handoff = await apiRequest(config, 'POST', `/api/ark/dossiers/${dossierId}/handoff`)
  if (handoff.ok) {
    for (const item of handoff.data?.created || []) created.dossiers.push(String(item.dossier_id))
  }
  checks.push(handoff.ok && ((handoff.data?.created || []).length + (handoff.data?.skipped || []).length > 0)
    ? pass('Flywheel handoff', `${(handoff.data.created || []).length} créé(s), ${(handoff.data.skipped || []).length} skip`)
    : fail('Flywheel handoff', `réponse inattendue : ${handoff.status} ${JSON.stringify(handoff.data)}`))

  const flywheel = await apiRequest(config, 'GET', `/api/ark/clients/${config.clientId}/flywheel`)
  checks.push(flywheel.ok && Array.isArray(flywheel.data?.dossiers) && flywheel.data.dossiers.length > 0
    ? pass('Flywheel API', `${flywheel.data.dossiers.length} dossier(s) retourné(s)`)
    : fail('Flywheel API', `réponse inattendue : ${flywheel.status}`))

  const immutable = await assertEventsImmutable(pool, config, dossierId)
  checks.push(immutable)

  if (!config.keepData) {
    const cleanup = await cleanupMutableRows(pool, created)
    checks.push(cleanup)
  } else {
    checks.push(warn('Cleanup', 'SMOKE_KEEP_DATA=1 : données mutables conservées'))
  }
  checks.push(warn('Journal events', 'les événements smoke restent append-only par design'))

  return checks
}

async function assertEventsImmutable(pool, config, dossierId) {
  const event = await pool.query(
    `SELECT id
       FROM events
      WHERE tenant_id = $1
        AND aggregate_id = $2
      ORDER BY occurred_at DESC
      LIMIT 1`,
    [String(config.tenantId), String(dossierId)],
  )
  if (!event.rows[0]) return fail('Immutabilité events', 'aucun événement smoke trouvé')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE events
          SET payload = payload || '{"smoke_mutation_attempt": true}'::jsonb
        WHERE id = $1`,
      [event.rows[0].id],
    )
    await client.query('ROLLBACK')
    return fail('Immutabilité events', 'UPDATE accepté alors qu’il doit être refusé')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return pass('Immutabilité events', `UPDATE refusé (${error.code || error.message})`)
  } finally {
    client.release()
  }
}

async function cleanupMutableRows(pool, created) {
  try {
    await pool.query('DELETE FROM dossier_links WHERE from_dossier_id = ANY($1::text[]) OR to_dossier_id = ANY($1::text[])', [created.dossiers])
    await pool.query('DELETE FROM advice_notes WHERE id::text = ANY($1::text[])', [created.adviceNotes])
    await pool.query('DELETE FROM ai_actions WHERE id::text = ANY($1::text[])', [created.actions])
    await pool.query('DELETE FROM client_documents WHERE id::text = ANY($1::text[])', [created.documents])
    await pool.query('DELETE FROM data_points WHERE id::text = ANY($1::text[])', [created.dataPoints])
    await pool.query('DELETE FROM dossiers WHERE id::text = ANY($1::text[])', [created.dossiers])
    return pass('Cleanup mutable', 'dossiers/actions/notes/documents smoke supprimés')
  } catch (error) {
    return warn('Cleanup mutable', error.message)
  }
}

export async function runSmoke(env = process.env) {
  const config = collectConfig(env)
  const checks = [...evaluateConfig(config)]
  const configSummary = summarizeChecks(checks)
  if (!configSummary.go) return checks

  let pool = null
  try {
    pool = await makePool(config.databaseUrl)
    const preflight = await preflightDatabase(pool, config)
    checks.push(...preflight.checks)

    const preflightSummary = summarizeChecks(checks)
    if (preflightSummary.go) {
      checks.push(...await runJourney(pool, config))
    }
  } catch (error) {
    checks.push(fail('Smoke runtime', error.stack || error.message))
  } finally {
    if (pool) await pool.end().catch(() => {})
  }

  return checks
}

async function main() {
  console.log('COURTIA ARK · production smoke gate')
  console.log('⚠️  À lancer sur STAGING : des événements append-only seront écrits.')

  const checks = await runSmoke(process.env)
  printChecks('Résultats', checks)
  const summary = printSummary(checks)

  process.exit(summary.go ? 0 : 1)
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isCli) {
  main().catch((error) => {
    console.error('\n❌ NO-GO')
    console.error(error.stack || error.message)
    process.exit(1)
  })
}
