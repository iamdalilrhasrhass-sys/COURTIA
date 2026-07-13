/**
 * Smoke test du domaine de prospection commerciale.
 * Sécurité : s'exécute uniquement sur une base dont le nom contient "test" ou "qa".
 * La base est considérée jetable ; le journal d'audit append-only n'est volontairement pas nettoyé.
 */
const pool = require('../src/db')
const {
  assignCabinets,
  completeCall,
  createAppointment,
  createCabinet,
  createProposal,
  getDashboard,
  getNextCabinet,
  listCabinets,
  searchCabinetConflicts,
  startCall,
  updateAppointment,
} = require('../src/services/salesProspectingService')
const { commitImport, previewImport, rollbackImport } = require('../src/services/salesImportService')
const { hashEntry } = require('../src/services/salesAuditService')
let currentStep = 'bootstrap'

function assert(condition, message) {
  if (!condition) throw new Error(`smoke_assertion_failed:${message}`)
}

async function createUser(username, role, suffix) {
  const result = await pool.query(
    `INSERT INTO users (email,username,password_hash,first_name,last_name,role,status,must_change_password)
     VALUES ($1,$2,'smoke-unused',$3,'Smoke',$4,'active',FALSE) RETURNING *`,
    [`${username}.${suffix}@smoke.courtiark.invalid`, `${username}_${suffix}`, username, role]
  )
  return result.rows[0]
}

async function run() {
  const databaseName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, '')
  if (!/(test|qa)/i.test(databaseName)) throw new Error('refusing_non_test_database')
  const suffix = `${Date.now()}`
  currentStep = 'users'
  const boss = await createUser('boss', 'super_admin', suffix)
  const tarek = await createUser('tarek', 'prospecteur', suffix)
  const ahmed = await createUser('ahmed', 'prospecteur', suffix)

  currentStep = 'create_cabinets'
  const alpha = await createCabinet(boss, {
    legal_name: `Cabinet Alpha ${suffix}`,
    siren: String(suffix).slice(-9).padStart(9, '1'),
    city: 'Lyon',
    phone: '+33400000001',
    employee_count: 2,
    revenue_eur: 400000,
    establishment_count: 1,
    company_category: 'petite entreprise',
  })
  const beta = await createCabinet(boss, {
    legal_name: `Cabinet Beta ${suffix}`,
    city: 'Paris',
    phone: '+33100000002',
    employee_count: 15,
    revenue_eur: 3000000,
  })

  currentStep = 'assign_cabinets'
  await assignCabinets(boss, [alpha.id], tarek.id, { method: 'smoke' })
  await assignCabinets(boss, [beta.id], ahmed.id, { method: 'smoke' })
  currentStep = 'list_scoped_cabinets'
  const tarekList = await listCabinets(tarek, { search: suffix })
  assert(tarekList.total === 1 && Number(tarekList.cabinets[0].id) === Number(alpha.id), 'strict_portfolio_scope')

  currentStep = 'search_conflicts'
  const conflicts = await searchCabinetConflicts(tarek, `Beta ${suffix}`)
  assert(conflicts.length === 1 && conflicts[0].assigned_username === ahmed.username, 'conflict_owner_visible')
  assert(conflicts[0].phone === null, 'conflict_phone_redacted')

  currentStep = 'next_cabinet'
  const next = await getNextCabinet(tarek)
  assert(Number(next.id) === Number(alpha.id), 'next_smallest_assigned_cabinet')
  currentStep = 'start_call'
  const started = await startCall(tarek, alpha.id)
  currentStep = 'complete_call'
  const completed = await completeCall(tarek, started.call.id, {
    outcome: 'oui',
    reached: true,
    contacted_person_name: 'Mme Alpha',
    contacted_person_role: 'Direction',
    direct_phone: '+33400000003',
    direct_email: 'direction.alpha@smoke.courtiark.invalid',
    interest_level: 'tres_fort',
    identified_need: 'Structurer la relance et les démonstrations.',
    comment: 'Qualification smoke test.',
    next_step: 'organiser_demo',
  })
  assert(completed.cabinet_status === 'demo_programmee', 'mandatory_call_result')

  currentStep = 'appointment'
  const appointment = await createAppointment(tarek, alpha.id, {
    event_type: 'demonstration',
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    duration_minutes: 30,
    attendee_name: 'Mme Alpha',
    format: 'visioconference',
    meeting_url: 'https://example.invalid/demo',
    preparation_notes: 'Préparer le scénario de relance.',
  })
  currentStep = 'demo_report'
  await updateAppointment(tarek, appointment.id, {
    status: 'realise',
    demo_held: true,
    prospect_interested: true,
    proposal_required: true,
    callback_required: false,
    next_action: 'Envoyer la proposition.',
    potential_amount_eur: 1500,
    signature_probability: 80,
  })
  currentStep = 'proposal'
  await createProposal(tarek, alpha.id, { status: 'signee', subject: 'Proposition smoke', amount_eur: 1500 })

  const csv = Buffer.from(`Dénomination,SIREN,Ville,Salariés\nCabinet Gamma ${suffix},${String(Number(String(suffix).slice(-9)) + 1).padStart(9, '0')},Bordeaux,4\n`, 'utf8')
  currentStep = 'import_preview'
  const preview = await previewImport(boss, { buffer: csv, originalname: `smoke-${suffix}.csv` }, { source: 'SIRENE' })
  assert(preview.job.valid_rows === 1, 'import_preview')
  currentStep = 'import_commit'
  const committed = await commitImport(boss, preview.job.id, { mode: 'upsert' })
  assert(committed.created === 1, 'import_commit')
  currentStep = 'import_rollback'
  const rolledBack = await rollbackImport(boss, preview.job.id)
  assert(rolledBack.deleted === 1 && rolledBack.fully_rolled_back, 'import_safe_rollback')

  currentStep = 'dashboard'
  const dashboard = await getDashboard(boss)
  assert(Number(dashboard.signatures) >= 1, 'boss_dashboard_signature')
  const audit = await pool.query(`SELECT * FROM sales_audit_log ORDER BY id ASC`)
  assert(audit.rows.length >= 10, 'append_only_audit_written')
  let previousHash = null
  for (const entry of audit.rows) {
    const expected = hashEntry({
      actorId: entry.actor_id,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      cabinetId: entry.cabinet_id,
      metadata: entry.metadata,
      ipAddress: entry.ip_address,
      previousHash,
      createdAt: new Date(entry.created_at).toISOString(),
    })
    assert(entry.previous_hash === previousHash && entry.entry_hash === expected, `audit_chain_${entry.id}`)
    previousHash = entry.entry_hash
  }

  console.log(JSON.stringify({
    ok: true,
    database: databaseName,
    checks: ['rbac', 'isolation', 'conflict_redaction', 'next_call', 'call_lock', 'call_result', 'demo', 'signature', 'import', 'rollback', 'dashboard', 'audit_chain'],
    audit_entries: audit.rows.length,
  }))
}

run()
  .catch((error) => {
    console.error(`${currentStep}:${error.code || 'error'}:${error.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
