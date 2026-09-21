const Anthropic = require('@anthropic-ai/sdk')
const logger = require('../lib/logger')
const porteeCabinet = require('../lib/porteeCabinet')

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
  // AUCUNE FACTURATION SANS CONSOMMATION MESURÉE — correction 20/09/2026.
  // `computeCostMicroEur` renvoie un minimum de 1 micro-euro : un appel IA
  // journalisé avec 0 jeton (sonde échouée, repli local) faisait donc payer au
  // cabinet une dépense qui n'a pas eu lieu. Un run dont AUCUN jeton n'a été
  // renvoyé par le fournisseur n'est pas facturé et ne peut pas, à lui seul,
  // déclencher le plafond mensuel ARK.
  const jetonsMesures = (Number(inputTokens) || 0) + (Number(outputTokens) || 0)
  const cost = jetonsMesures > 0 ? computeCostMicroEur(model, inputTokens, outputTokens) : 0
  const result = await pool.query(
    `INSERT INTO ark_runs (user_id, feature, model, input_tokens, output_tokens, cost_micro_eur, latency_ms, status, error, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     RETURNING *`,
    [userId, feature, model, inputTokens, outputTokens, cost, latencyMs, status, error]
  )
  await ensureArkBudget(pool, userId)
  if (cost > 0) {
    await pool.query(
      `UPDATE ark_budgets
       SET current_spend_micro_eur = current_spend_micro_eur + $2,
           paused = CASE WHEN current_spend_micro_eur + $2 >= hard_cap_micro_eur THEN true ELSE paused END
       WHERE user_id = $1`,
      [userId, cost]
    )
  }
  return result.rows[0]
}

/**
 * Contexte métier d'ARK — PORTÉE DU CABINET, PAS DE LA SEULE PERSONNE.
 *
 * DÉFAUT MESURÉ (21/09/2026, P1) : les lectures filtraient `courtier_id = $1` /
 * `user_id = $1`. Un collaborateur (`broker`) du même cabinet recevait donc un
 * contexte VIDE (aucun client, aucun contrat, aucune tâche) et ARK lui fabriquait
 * des cartes de repli hors sujet — deux vérités pour une même donnée.
 *
 * RÈGLE TENUE : chaque lecture passe par `lib/porteeCabinet` (seule autorité).
 * Sans cabinet, la clause est EXACTEMENT la clause historique
 * (`courtier_id = $1`), les cabinets mono-utilisateur ne changent donc pas.
 *
 * RESTE VOLONTAIREMENT PAR-UTILISATEUR : `calendar_events` (agenda personnel
 * synchronisé, aucune ancre de cabinet), `whatsapp_threads` (session/inbox
 * WhatsApp) et `client_interactions` (flux collecté par l'intégration mail de
 * l'utilisateur, sans ancre de cabinet). Ces trois tables ne portent pas
 * `cabinet_id` : les élargir par jointure changerait aussi le comportement des
 * cabinets mono-utilisateur.
 *
 * @param {Object} [options] `{ portee }` déjà résolue (aucune requête en plus)
 */
async function loadArkContext(pool, userId, options = {}) {
  const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, userId, options)
  const fClients = porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 1,
  })

  const clients = (await pool.query(
    `SELECT c.id, c.courtier_id, c.first_name, c.last_name, c.email, c.phone, c.status, c.risk_score, c.last_contact, c.created_at, c.updated_at
     FROM clients c
     WHERE ${fClients.sql}
     ORDER BY c.updated_at DESC NULLS LAST
     LIMIT 300`,
    fClients.params
  )).rows

  const contracts = (await pool.query(
    `SELECT q.id, q.client_id, q.status, q.quote_data->>'type_contrat' AS type_contrat,
            q.quote_data->>'compagnie' AS compagnie,
            q.quote_data->>'date_echeance' AS date_echeance,
            CONCAT(c.first_name, ' ', c.last_name) AS client_name
     FROM quotes q
     JOIN clients c ON c.id = q.client_id
     WHERE ${fClients.sql}
     LIMIT 500`,
    fClients.params
  ).catch(() => ({ rows: [] }))).rows

  // `taches` porte `cabinet_id` (migration 113). L'affectation PERSONNELLE
  // (`user_id = $n`) reste acceptée pour ne faire disparaître aucune ligne
  // existante — sauf pour un compte dont l'appartenance a été RÉVOQUÉE, qui ne
  // doit plus rien lire (le fragment seul ne peut alors correspondre à rien).
  const fTaches = porteeCabinet.fragment(portee, {
    cabinet: 'taches.cabinet_id',
    proprietaire: 'taches.courtier_id',
    depart: 1,
  })
  const paramsTaches = [...fTaches.params]
  let clauseAffectation = ''
  if (portee.mode !== 'revoquee') {
    paramsTaches.push(userId)
    clauseAffectation = ` OR taches.user_id = $${paramsTaches.length}`
  }
  const tasks = (await pool.query(
    `SELECT id, client_id, titre, statut, priorite, echeance
     FROM taches
     WHERE (${fTaches.sql}${clauseAffectation})
     ORDER BY echeance ASC NULLS LAST
     LIMIT 300`,
    paramsTaches
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

async function computeAndStoreRiskScores(pool, userId, now = new Date(), options = {}) {
  const context = await loadArkContext(pool, userId, options)
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

async function buildAndStoreMorningBrief(pool, userId, options = {}) {
  await ensureArkBudget(pool, userId)
  const budget = (await pool.query('SELECT * FROM ark_budgets WHERE user_id = $1', [userId])).rows[0]
  if (budget?.paused || Number(budget?.current_spend_micro_eur || 0) >= Number(budget?.hard_cap_micro_eur || DEFAULT_HARD_CAP_MICRO_EUR)) {
    const err = new Error('ark_budget_exceeded')
    err.status = 402
    throw err
  }

  const context = await loadArkContext(pool, userId, options)
  const cards = buildFallbackMorningBrief(context)

  // ── SONDE LLM : LE MODE SE DÉDUIT DE LA RÉUSSITE RÉELLE ──────────────────
  // Correction 20/09/2026 (défaut IA-008). Avant, `source` valait
  // 'llm_ready_with_deterministic_cards' dès que `ANTHROPIC_API_KEY` était
  // PRÉSENTE, même quand la sonde échouait (clé invalide, quota, réseau) : le
  // cockpit annonçait un mode LLM opérationnel qui ne fonctionnait pas.
  // Et la sonde était FACTURÉE avec des jetons inventés (50 en entrée, 5 en
  // sortie) au lieu des jetons réellement renvoyés par le fournisseur.
  // Désormais : la sonde ne facture que `usage.input_tokens`/`usage.output_tokens`
  // réellement rendus, et une sonde en échec laisse le mode en repli local.
  const sonde = {
    tentee: Boolean(process.env.ANTHROPIC_API_KEY),
    reussie: false,
    modele: null,
    jetons_entree: 0,
    jetons_sortie: 0,
    erreur: null,
  }
  let source = 'deterministic_fallback'

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const startedAt = Date.now()
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const reponse = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Réponds uniquement: OK' }],
      })
      const jetonsEntree = Number(reponse?.usage?.input_tokens) || 0
      const jetonsSortie = Number(reponse?.usage?.output_tokens) || 0
      sonde.reussie = true
      sonde.modele = reponse?.model || DEFAULT_MODEL
      sonde.jetons_entree = jetonsEntree
      sonde.jetons_sortie = jetonsSortie
      await chargeArkRun(pool, {
        userId,
        feature: 'morning_brief',
        model: sonde.modele,
        inputTokens: jetonsEntree,
        outputTokens: jetonsSortie,
        latencyMs: Date.now() - startedAt,
        status: jetonsEntree + jetonsSortie > 0 ? 'success' : 'success_sans_usage',
      })
      source = 'llm_ready_with_deterministic_cards'
    } catch (err) {
      sonde.reussie = false
      sonde.erreur = String(err.message || 'sonde_llm_echec')
      logger.warn({ error: err.message, user_id: userId }, 'ark llm probe failed, fallback cards kept')
      // Aucun jeton rendu : coût nul, aucun débit du budget ARK.
      await chargeArkRun(pool, { userId, feature: 'morning_brief', model: DEFAULT_MODEL, status: 'sonde_echec', error: err.message })
      source = 'deterministic_fallback'
    }
  }

  const saved = await saveRecommendations(pool, userId, cards)
  return { cards: saved, source, llm_probe: sonde }
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
