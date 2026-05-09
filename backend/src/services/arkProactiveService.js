const Anthropic = require('@anthropic-ai/sdk')
const logger = require('../lib/logger')

const DEFAULT_MODEL = process.env.ARK_DEFAULT_MODEL || 'claude-sonnet-4-5'
const LIGHT_MODEL = process.env.ARK_LIGHT_MODEL || 'claude-haiku-4-5'
const DEFAULT_MONTHLY_CAP_MICRO_EUR = 15000000
const DEFAULT_HARD_CAP_MICRO_EUR = 25000000

function daysBetween(a, b) {
  if (!a || !b) return null
  const start = new Date(a).getTime()
  const end = new Date(b).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.floor((end - start) / 86400000)
}

function getClientName(client = {}) {
  return `${client.first_name || client.prenom || ''} ${client.last_name || client.nom || ''}`.trim() || client.company_name || 'Client'
}

function getContractExpiry(contract = {}) {
  return contract.date_echeance || contract.echeance || contract.end_date || contract.renewal_date || null
}

function isTaskDone(task = {}) {
  return ['terminee', 'terminée', 'done', 'completed'].includes(String(task.statut || task.status || '').toLowerCase())
}

function computeClientRiskScore({ client = {}, contracts = [], tasks = [], interactions = [], now = new Date() }) {
  const factors = {}
  let score = 0

  const lastContact = client.last_contact || client.last_contact_at || client.updated_at || client.created_at
  const silenceDays = lastContact ? daysBetween(lastContact, now) : null
  factors.silence_days = silenceDays
  if (silenceDays == null) score += 12
  else if (silenceDays > 180) score += 30
  else if (silenceDays > 90) score += 22
  else if (silenceDays > 45) score += 12

  const expiryDays = contracts
    .map(getContractExpiry)
    .map((value) => daysBetween(now, value))
    .filter((value) => value !== null && value >= 0)
    .sort((a, b) => a - b)[0]
  factors.upcoming_expiry_days = expiryDays ?? null
  if (expiryDays != null && expiryDays <= 30) score += 25
  else if (expiryDays != null && expiryDays <= 90) score += 16

  const overdueTasks = tasks.filter((task) => {
    const due = task.echeance || task.due_date || task.date_echeance
    const overdue = due && new Date(due).getTime() < now.getTime()
    return overdue && !isTaskDone(task)
  }).length
  factors.overdue_tasks = overdueTasks
  score += Math.min(20, overdueTasks * 10)

  const unanswered = interactions.filter((interaction) => {
    const direction = String(interaction.direction || '').toLowerCase()
    const occurred = new Date(interaction.occurred_at || interaction.created_at || 0).getTime()
    return direction === 'in' && now.getTime() - occurred > 48 * 3600000
  }).length
  factors.unanswered_messages = unanswered
  score += Math.min(15, unanswered * 8)

  const activeContracts = contracts.filter((contract) => ['actif', 'active', 'en_cours'].includes(String(contract.status || contract.statut || '').toLowerCase())).length
  factors.active_contracts = activeContracts
  if (activeContracts <= 1) score += 10

  return {
    client_id: client.id,
    user_id: client.courtier_id || client.user_id || null,
    churn_score: Math.max(0, Math.min(100, Math.round(score))),
    factors,
    computed_at: now,
  }
}

function normalizeArkAction(action = {}) {
  const kind = ['call', 'email', 'meeting', 'generate_doc', 'task', 'open_client'].includes(action.kind)
    ? action.kind
    : 'open_client'
  const label = String(action.label || 'Ouvrir la fiche').slice(0, 80)
  const target = action.target || {}
  return {
    kind,
    label,
    target: {
      type: String(target.type || 'client'),
      id: String(target.id || ''),
    },
  }
}

function makeCard({ kind, title, rationale, priority, clientId, action }) {
  return {
    kind,
    title: String(title || '').slice(0, 90),
    rationale: String(rationale || '').slice(0, 220),
    priority: Math.max(0, Math.min(100, Number(priority) || 50)),
    client_id: clientId || null,
    suggested_action: normalizeArkAction(action || { target: { type: 'client', id: clientId } }),
  }
}

function buildFallbackMorningBrief({ clients = [], contracts = [], tasks = [], events = [], whatsappThreads = [], now = new Date() }) {
  const cards = []

  clients
    .filter((client) => Number(client.risk_score || client.score_risque || client.churn_score || 0) >= 70)
    .slice(0, 2)
    .forEach((client) => {
      const score = Number(client.risk_score || client.score_risque || client.churn_score || 0)
      cards.push(makeCard({
        kind: 'client_risk',
        title: `${getClientName(client)} à sécuriser`,
        rationale: `Score risque ${score}/100 : relance de rétention recommandée aujourd’hui.`,
        priority: 88,
        clientId: client.id,
        action: { kind: 'call', label: 'Appeler le client', target: { type: 'client', id: client.id } },
      }))
    })

  contracts
    .map((contract) => ({ contract, days: daysBetween(now, getContractExpiry(contract)) }))
    .filter((row) => row.days !== null && row.days >= 0 && row.days <= 45)
    .sort((a, b) => a.days - b.days)
    .slice(0, 2)
    .forEach(({ contract, days }) => {
      cards.push(makeCard({
        kind: 'contract_expiry',
        title: `Échéance ${contract.type_contrat || contract.type || 'contrat'} à ${days} jours`,
        rationale: `${contract.client_name || 'Un client'} arrive à échéance prochainement : préparer la relance avant concurrence.`,
        priority: days <= 15 ? 92 : 76,
        clientId: contract.client_id,
        action: { kind: 'email', label: 'Préparer la relance', target: { type: 'client', id: contract.client_id } },
      }))
    })

  tasks
    .filter((task) => !isTaskDone(task) && new Date(task.echeance || task.due_date || 0).getTime() < now.getTime())
    .slice(0, 1)
    .forEach((task) => {
      cards.push(makeCard({
        kind: 'overdue_task',
        title: task.titre || task.title || 'Tâche en retard',
        rationale: 'Une action déjà planifiée est en retard : elle doit remonter dans le cockpit.',
        priority: 82,
        clientId: task.client_id,
        action: { kind: 'task', label: 'Traiter la tâche', target: { type: 'client', id: task.client_id } },
      }))
    })

  events
    .filter((event) => {
      const start = new Date(event.start_time || event.start_at || 0)
      return start.toDateString() === now.toDateString()
    })
    .slice(0, 1)
    .forEach((event) => {
      cards.push(makeCard({
        kind: 'meeting_prep',
        title: `Préparer ${event.title || 'le rendez-vous'}`,
        rationale: 'Rendez-vous aujourd’hui : ARK doit rappeler contexte client, contrats et prochaine action.',
        priority: 80,
        clientId: event.client_id,
        action: { kind: 'meeting', label: 'Préparer RDV', target: { type: 'client', id: event.client_id } },
      }))
    })

  whatsappThreads
    .filter((thread) => thread.last_message_preview)
    .slice(0, 1)
    .forEach((thread) => {
      cards.push(makeCard({
        kind: 'whatsapp_reply',
        title: 'Réponse WhatsApp à traiter',
        rationale: `Dernier message : ${String(thread.last_message_preview).slice(0, 90)}`,
        priority: 74,
        clientId: thread.client_id,
        action: { kind: 'email', label: 'Préparer réponse', target: { type: 'client', id: thread.client_id } },
      }))
    })

  if (cards.length < 5) {
    clients
      .filter((client) => !cards.some((card) => card.client_id === client.id))
      .slice(0, 5 - cards.length)
      .forEach((client) => {
        cards.push(makeCard({
          kind: 'multi_equipment',
          title: `${getClientName(client)} : opportunité multi-équipement`,
          rationale: 'Client à potentiel : vérifier s’il manque habitation, prévoyance ou RC selon son profil.',
          priority: 58,
          clientId: client.id,
          action: { kind: 'call', label: 'Identifier opportunité', target: { type: 'client', id: client.id } },
        }))
      })
  }

  return cards.sort((a, b) => b.priority - a.priority).slice(0, 5)
}

function computeCostMicroEur(model, inputTokens = 0, outputTokens = 0) {
  const rates = {
    'claude-sonnet-4-5': { in: 3, out: 15 },
    'claude-haiku-4-5': { in: 0.8, out: 4 },
  }
  const rate = rates[model] || rates[DEFAULT_MODEL] || rates['claude-sonnet-4-5']
  const usd = ((Number(inputTokens) || 0) * rate.in + (Number(outputTokens) || 0) * rate.out) / 1000000
  return Math.max(1, Math.round(usd * 0.92 * 1000000))
}

async function ensureArkBudget(pool, userId) {
  const result = await pool.query(
    `INSERT INTO ark_budgets (user_id, monthly_cap_micro_eur, hard_cap_micro_eur, current_period_start, current_spend_micro_eur, paused)
     VALUES ($1,$2,$3,date_trunc('month', NOW())::date,0,false)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId, DEFAULT_MONTHLY_CAP_MICRO_EUR, DEFAULT_HARD_CAP_MICRO_EUR]
  )
  return result.rows[0]
}

async function chargeArkRun(pool, { userId, feature, model = LIGHT_MODEL, inputTokens = 0, outputTokens = 0, latencyMs = null, status = 'success', error = null }) {
  const cost = computeCostMicroEur(model, inputTokens, outputTokens)
  const result = await pool.query(
    `INSERT INTO ark_runs (user_id, feature, model, input_tokens, output_tokens, cost_micro_eur, latency_ms, status, error, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     RETURNING *`,
    [userId, feature, model, inputTokens, outputTokens, cost, latencyMs, status, error]
  )
  await ensureArkBudget(pool, userId)
  await pool.query(
    `UPDATE ark_budgets
     SET current_spend_micro_eur = current_spend_micro_eur + $2,
         paused = CASE WHEN current_spend_micro_eur + $2 >= hard_cap_micro_eur THEN true ELSE paused END
     WHERE user_id = $1`,
    [userId, cost]
  )
  return result.rows[0]
}

async function loadArkContext(pool, userId) {
  const clients = (await pool.query(
    `SELECT id, courtier_id, first_name, last_name, email, phone, status, risk_score, last_contact, created_at, updated_at
     FROM clients
     WHERE courtier_id = $1
     ORDER BY updated_at DESC NULLS LAST
     LIMIT 300`,
    [userId]
  )).rows

  const contracts = (await pool.query(
    `SELECT q.id, q.client_id, q.status, q.quote_data->>'type_contrat' AS type_contrat,
            q.quote_data->>'compagnie' AS compagnie,
            q.quote_data->>'date_echeance' AS date_echeance,
            CONCAT(c.first_name, ' ', c.last_name) AS client_name
     FROM quotes q
     JOIN clients c ON c.id = q.client_id
     WHERE c.courtier_id = $1
     LIMIT 500`,
    [userId]
  ).catch(() => ({ rows: [] }))).rows

  const tasks = (await pool.query(
    `SELECT id, client_id, titre, statut, priorite, echeance
     FROM taches
     WHERE courtier_id = $1 OR user_id = $1
     ORDER BY echeance ASC NULLS LAST
     LIMIT 300`,
    [userId]
  ).catch(() => ({ rows: [] }))).rows

  const events = (await pool.query(
    `SELECT id, client_id, title, start_time, end_time
     FROM calendar_events
     WHERE user_id = $1
     ORDER BY start_time ASC
     LIMIT 50`,
    [userId]
  ).catch(() => ({ rows: [] }))).rows

  const whatsappThreads = (await pool.query(
    `SELECT id, client_id, last_message_preview, last_message_at
     FROM whatsapp_threads
     WHERE user_id = $1
     ORDER BY last_message_at DESC NULLS LAST
     LIMIT 50`,
    [userId]
  ).catch(() => ({ rows: [] }))).rows

  const interactions = (await pool.query(
    `SELECT id, client_id, provider, direction, occurred_at, created_at
     FROM client_interactions
     WHERE user_id = $1
     ORDER BY occurred_at DESC NULLS LAST
     LIMIT 1000`,
    [userId]
  ).catch(() => ({ rows: [] }))).rows

  return { clients, contracts, tasks, events, whatsappThreads, interactions }
}

async function computeAndStoreRiskScores(pool, userId, now = new Date()) {
  const context = await loadArkContext(pool, userId)
  const rows = []
  for (const client of context.clients) {
    const score = computeClientRiskScore({
      client,
      contracts: context.contracts.filter((contract) => Number(contract.client_id) === Number(client.id)),
      tasks: context.tasks.filter((task) => Number(task.client_id) === Number(client.id)),
      interactions: context.interactions.filter((interaction) => Number(interaction.client_id) === Number(client.id)),
      now,
    })
    const saved = await pool.query(
      `INSERT INTO client_risk_scores (client_id, user_id, churn_score, factors, computed_at)
       VALUES ($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT (client_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         churn_score = EXCLUDED.churn_score,
         factors = EXCLUDED.factors,
         computed_at = EXCLUDED.computed_at
       RETURNING *`,
      [client.id, userId, score.churn_score, JSON.stringify(score.factors), now]
    )
    rows.push(saved.rows[0])
  }
  return rows
}

async function saveRecommendations(pool, userId, cards = []) {
  const saved = []
  for (const card of cards) {
    const result = await pool.query(
      `INSERT INTO ark_recommendations (user_id, client_id, kind, priority, title, rationale, suggested_action, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW() + INTERVAL '2 days',NOW())
       RETURNING *`,
      [userId, card.client_id || null, card.kind, card.priority, card.title, card.rationale, JSON.stringify(card.suggested_action || {})]
    )
    saved.push(result.rows[0])
  }
  return saved
}

async function buildAndStoreMorningBrief(pool, userId) {
  await ensureArkBudget(pool, userId)
  const budget = (await pool.query('SELECT * FROM ark_budgets WHERE user_id = $1', [userId])).rows[0]
  if (budget?.paused || Number(budget?.current_spend_micro_eur || 0) >= Number(budget?.hard_cap_micro_eur || DEFAULT_HARD_CAP_MICRO_EUR)) {
    const err = new Error('ark_budget_exceeded')
    err.status = 402
    throw err
  }

  const context = await loadArkContext(pool, userId)
  const cards = buildFallbackMorningBrief(context)

  // LLM hook ready: keep deterministic fallback unless Anthropic is configured.
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const startedAt = Date.now()
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Réponds uniquement: OK' }],
      })
      await chargeArkRun(pool, { userId, feature: 'morning_brief', model: DEFAULT_MODEL, inputTokens: 50, outputTokens: 5, latencyMs: Date.now() - startedAt })
    } catch (err) {
      logger.warn({ error: err.message, user_id: userId }, 'ark llm probe failed, fallback cards kept')
      await chargeArkRun(pool, { userId, feature: 'morning_brief', model: DEFAULT_MODEL, status: 'fallback', error: err.message })
    }
  }

  const saved = await saveRecommendations(pool, userId, cards)
  return { cards: saved, source: process.env.ANTHROPIC_API_KEY ? 'llm_ready_with_deterministic_cards' : 'deterministic_fallback' }
}

function rewriteFallback(text, mode = 'rephrase') {
  const value = String(text || '').trim()
  if (!value) return ''
  if (mode === 'shorten') return value.length > 72 ? `${value.slice(0, 69)}...` : value
  if (mode === 'commercial') return `Bonjour, ${value.charAt(0).toLowerCase()}${value.slice(1)}. Je vous propose qu’on fasse le point ensemble.`
  if (mode === 'compliance') return `${value}\n\nNote : recommandation indicative, à valider selon votre devoir de conseil.`
  return value.replace(/\s+/g, ' ')
}

module.exports = {
  DEFAULT_MODEL,
  LIGHT_MODEL,
  buildAndStoreMorningBrief,
  buildFallbackMorningBrief,
  chargeArkRun,
  computeAndStoreRiskScores,
  computeClientRiskScore,
  computeCostMicroEur,
  ensureArkBudget,
  loadArkContext,
  normalizeArkAction,
  rewriteFallback,
  saveRecommendations,
}
