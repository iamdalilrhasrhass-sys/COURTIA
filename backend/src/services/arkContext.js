/**
 * ARK Context - Récupération contexte client/portefeuille depuis la DB
 * LOT 3: Backend ARK Réel
 * 
 * @module arkContext
 */

const pool = require('../db')
const porteeCabinet = require('../lib/porteeCabinet')
const logger = require('../lib/logger')

/**
 * ────────────────────────────────────────────────────────────────────────────
 * PORTÉE DU DOSSIER CLIENT — LE CABINET, PAS LA SEULE PERSONNE
 * (correction du 20/09/2026 — troisième QA adverse, défaut D3-02, P2)
 *
 * DÉFAUT MESURÉ : la lecture du dossier filtrait `c.courtier_id = $2` (portée
 * MONO-utilisateur) alors que tout le reste du produit — `/api/ark/history`,
 * `/api/ark/conversations`, `/api/clients/:id`, `/api/documents/client/:id` —
 * filtre le CABINET. Un collaborateur (`broker`) du même cabinet lisait donc la
 * conversation ARK du dossier (200) puis recevait 404 « Client non trouvé ou non
 * autorisé » sur `/brief`, `/next-best-actions` et `/documents-analysis` : deux
 * réponses contradictoires pour la même personne et le même dossier, sur les
 * deux marchés (CH et FR).
 *
 * RÈGLE TENUE : le dossier se résout dans la portée du CABINET
 * (`lib/porteeCabinet` — seule autorité), jamais au-delà : un cabinet ÉTRANGER
 * reçoit toujours le même refus.
 *
 * `options.req` (requête Express) ou `options.portee` (portée déjà résolue) est
 * REQUIS sur tout chemin HTTP : tous les appels de `routes/ark.js` le passent.
 * Sans l'un des deux, on retombe volontairement sur la clause historique
 * (`courtier_id = $2`) pour les appelants hors requête HTTP (outillage, tests) —
 * ce repli ne peut PAS élargir la portée, il la restreint.
 * ────────────────────────────────────────────────────────────────────────────
 * PORTÉE DU PORTEFEUILLE ET DU BRIEF — LE CABINET, PAS LA SEULE PERSONNE
 * (correction du 21/09/2026 — même défaut P1, autres lectures)
 *
 * DÉFAUT MESURÉ : `getPortfolioContext` et `getMorningBriefContext` filtraient
 * `courtier_id = $1` alors que le reste du produit sert le CABINET. Un
 * collaborateur (`broker`) du même cabinet lisait donc « 0 client » dans son
 * portefeuille et dans son brief du matin, là où le propriétaire en lisait 1 :
 * deux chiffres pour la même donnée, dans le même cabinet.
 *
 * RÈGLE TENUE : ces lectures passent désormais par `lib/porteeCabinet` (seule
 * autorité). Un compte SANS cabinet garde EXACTEMENT la clause historique
 * (`courtier_id = $1`) ; un compte dont l'appartenance a été retirée ne lit
 * plus rien. `options` accepte `{ portee }` (portée déjà résolue par la route :
 * aucune requête supplémentaire) ou `{ req }`.
 *
 * RESTENT VOLONTAIREMENT PAR-UTILISATEUR (et pourquoi) :
 *   * `calendar_events` (`ce.user_id`) — agenda PERSONNEL synchronisé depuis
 *     l'intégration de l'utilisateur : la table ne porte aucune ancre de
 *     cabinet (`cabinet_id` absent) et un rendez-vous privé n'est pas un actif
 *     du cabinet ;
 *   * `whatsapp_threads` (`wt.user_id`) — session/inbox WhatsApp, explicitement
 *     hors du périmètre « données du cabinet » ;
 *   * `ark_recommendations` (`ar.user_id`) — cache d'ARK écrit PAR utilisateur,
 *     dont l'acquittement (`dismissed_at`) est personnel : la table ne porte pas
 *     d'ancre de cabinet et le partager effacerait l'acquittement d'autrui.
 * ────────────────────────────────────────────────────────────────────────────
 */
async function resoudrePorteeDossier(userId, options = {}) {
  if (options.portee) return options.portee
  if (options.req) {
    const ressource = options.req.app?.locals?.pool || pool
    return porteeCabinet.resoudrePortee(ressource, options.req)
  }
  return null
}

/**
 * Portée d'un SERVICE qui ne reçoit qu'un identifiant (`{ portee }` déjà
 * résolue, `{ req }` Express, sinon résolution autoritaire par userId).
 * Jamais `null` : le repli est la portée mono-utilisateur (comportement
 * historique), jamais un accès plus large.
 */
async function resoudrePorteeService(userId, options = {}) {
  if (options.portee) return options.portee
  if (options.req) {
    const ressource = options.req.app?.locals?.pool || pool
    return porteeCabinet.resoudrePortee(ressource, options.req)
  }
  return porteeCabinet.resoudrePorteeUtilisateur(pool, userId, options)
}

/**
 * Récupère le contexte complet d'un client
 * @param {number} clientId - ID du client
 * @param {number} userId - ID du courtier (pour vérification sécurité)
 * @param {Object} [options] - `{ req }` (requête Express) ou `{ portee }`
 * @returns {Object} Contexte client enrichi
 */
async function getClientContext(clientId, userId, options = {}) {
  try {
    const portee = await resoudrePorteeDossier(userId, options)
    // Portée CABINET si une requête (ou une portée) est fournie : le dossier
    // d'un COLLÈGUE du même cabinet est légitime, celui d'un autre cabinet reste
    // introuvable.
    let clausePortee = 'c.courtier_id = $2'
    let parametresClient = [clientId, userId]
    if (portee) {
      const f = porteeCabinet.fragment(portee, {
        cabinet: 'c.cabinet_id',
        proprietaire: 'c.courtier_id',
        depart: 2,
      })
      clausePortee = f.sql
      parametresClient = [clientId, ...f.params]
    }

    // Vérifier que le client appartient bien au cabinet de l'appelant
    const clientResult = await pool.query(
      `SELECT c.*, bp.cabinet_name, bp.specialites
       FROM clients c
       LEFT JOIN broker_profiles bp ON bp.user_id = c.courtier_id
       WHERE c.id = $1 AND ${clausePortee}`,
      parametresClient
    )
    
    if (clientResult.rows.length === 0) {
      return { error: 'client_not_found', message: 'Client non trouvé ou non autorisé' }
    }
    
    const client = clientResult.rows[0]
    
    // Contrats (quotes) du client
    const contractsResult = await pool.query(
      `SELECT 
        id, status,
        quote_data->>'type_contrat' as type_contrat,
        quote_data->>'compagnie' as compagnie,
        (quote_data->>'prime_annuelle')::numeric as prime_annuelle,
        quote_data->>'date_echeance' as date_echeance,
        quote_data->>'date_effet' as date_effet,
        created_at, updated_at
       FROM quotes 
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [clientId]
    )
    
    // RDV du client
    // `calendar_events` n'a PAS de colonne `notes` (schéma réel : description,
    // metadata). Cette requête répondait 500 « column "notes" does not exist »
    // sur /api/ark/client/:id/brief, /next-best-actions et /quote-assistant.
    const appointmentsResult = await pool.query(
      `SELECT id, title, start_time, end_time, location, description, status
       FROM calendar_events
       WHERE client_id = $1
       ORDER BY start_time DESC
       LIMIT 10`,
      [clientId]
    )
    
    // Tâches actives
    const tasksResult = await pool.query(
      `SELECT id, titre, statut, priorite, echeance, description
       FROM taches
       WHERE client_id = $1 AND statut != 'terminee'
       ORDER BY echeance ASC NULLS LAST
       LIMIT 10`,
      [clientId]
    )
    
    // Dernières interactions
    // `client_interactions` n'a PAS de colonne `summary` (schéma réel :
    // subject, body_preview) : deuxième requête en échec sur le brief client.
    const interactionsResult = await pool.query(
      `SELECT id, provider, direction, subject, body_preview, occurred_at
       FROM client_interactions
       WHERE client_id = $1
       ORDER BY occurred_at DESC
       LIMIT 5`,
      [clientId]
    )
    
    // Score risque
    const riskResult = await pool.query(
      `SELECT churn_score, factors, computed_at
       FROM client_risk_scores
       WHERE client_id = $1
       ORDER BY computed_at DESC
       LIMIT 1`,
      [clientId]
    )
    
    const contracts = contractsResult.rows
    const activeContracts = contracts.filter(c => c.status === 'actif' || c.status === 'active')
    const totalPremium = activeContracts.reduce((sum, c) => sum + (parseFloat(c.prime_annuelle) || 0), 0)
    
    return {
      client: {
        id: client.id,
        nom: client.last_name,
        prenom: client.first_name,
        email: client.email,
        telephone: client.phone,
        adresse: client.address,
        profession: client.profession,
        statut: client.status,
        segment: client.segment,
        createdAt: client.created_at,
        lastContact: client.last_contact
      },
      contracts: contracts,
      contractsSummary: {
        total: contracts.length,
        actifs: activeContracts.length,
        primeAnnuelleTotale: totalPremium,
        types: [...new Set(activeContracts.map(c => c.type_contrat).filter(Boolean))]
      },
      appointments: appointmentsResult.rows,
      tasks: tasksResult.rows,
      recentInteractions: interactionsResult.rows,
      riskScore: riskResult.rows[0] || null,
      cabinet: {
        name: client.cabinet_name,
        specialites: client.specialites
      }
    }
  } catch (err) {
    logger.error({ error: err.message, clientId, userId }, 'getClientContext failed')
    throw err
  }
}

/**
 * Récupère le contexte du portefeuille d'un courtier
 * @param {number} userId - ID du courtier
 * @param {Object} [options] - `{ portee }` (portée déjà résolue) ou `{ req }`
 * @returns {Object} KPIs et alertes portefeuille
 */
async function getPortfolioContext(userId, options = {}) {
  try {
    // Portée du CABINET (lib/porteeCabinet — seule autorité). Sans cabinet, la
    // clause retombe sur `courtier_id = $1` : comportement historique exact.
    const portee = await resoudrePorteeService(userId, options)
    // Une SEULE clause, réutilisée par les quatre sous-requêtes du bloc KPI et
    // par les trois lectures suivantes : cette requête n'a AUCUN autre
    // paramètre, donc les indices $1..$n restent valides partout. Alias `c`
    // pour `clients`, `q` pour `quotes`, `crs` pour `client_risk_scores`.
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
    })

    // KPIs généraux
    const kpisResult = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM clients c WHERE ${f.sql}) as total_clients,
        (SELECT COUNT(*) FROM clients c WHERE ${f.sql} AND c.status = 'actif') as clients_actifs,
        (SELECT COUNT(*) FROM quotes q 
         JOIN clients c ON c.id = q.client_id 
         WHERE ${f.sql} AND q.status = 'actif') as contrats_actifs,
        (SELECT COALESCE(SUM((q.quote_data->>'prime_annuelle')::numeric), 0)
         FROM quotes q 
         JOIN clients c ON c.id = q.client_id 
         WHERE ${f.sql} AND q.status = 'actif') as prime_totale_annuelle`,
      f.params
    )
    
    // Contrats à échéance prochaine (45 jours)
    const expiringResult = await pool.query(
      `SELECT q.id, q.quote_data->>'type_contrat' as type,
              q.quote_data->>'date_echeance' as date_echeance,
              (q.quote_data->>'prime_annuelle')::numeric as prime,
              c.id as client_id,
              CONCAT(c.first_name, ' ', c.last_name) as client_name
       FROM quotes q
       JOIN clients c ON c.id = q.client_id
       WHERE ${f.sql}
         AND q.status = 'actif'
         AND (q.quote_data->>'date_echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '45 days'
       ORDER BY (q.quote_data->>'date_echeance')::date ASC
       LIMIT 10`,
      f.params
    )
    
    // Clients à risque (score >= 70)
    const atRiskResult = await pool.query(
      `SELECT c.id, CONCAT(c.first_name, ' ', c.last_name) as name,
              crs.churn_score, crs.factors
       FROM client_risk_scores crs
       JOIN clients c ON c.id = crs.client_id
       WHERE ${f.sql} AND crs.churn_score >= 70
       ORDER BY crs.churn_score DESC
       LIMIT 5`,
      f.params
    )
    
    // Clients silencieux (pas de contact > 45 jours)
    const silentResult = await pool.query(
      `SELECT c.id, CONCAT(c.first_name, ' ', c.last_name) as name,
              c.last_contact,
              EXTRACT(days FROM NOW() - c.last_contact) as days_silent
       FROM clients c
       WHERE ${f.sql}
         AND c.last_contact < NOW() - INTERVAL '45 days'
       ORDER BY c.last_contact ASC
       LIMIT 5`,
      f.params
    )
    
    // Opportunités cross-sell
    // `ark_recommendations` est un cache écrit PAR utilisateur (l'acquittement
    // `dismissed_at` est personnel) et ne porte pas d'ancre de cabinet : ce
    // filtre reste volontairement par utilisateur (cf. commentaire en tête).
    const opportunitiesResult = await pool.query(
      `SELECT ar.id, ar.kind, ar.title, ar.rationale, ar.priority,
              ar.client_id, CONCAT(c.first_name, ' ', c.last_name) as client_name
       FROM ark_recommendations ar
       JOIN clients c ON c.id = ar.client_id
       WHERE ar.user_id = $1 
         AND ar.dismissed_at IS NULL
         AND (ar.expires_at IS NULL OR ar.expires_at > NOW())
       ORDER BY ar.priority DESC
       LIMIT 5`,
      [userId]
    )
    
    const kpis = kpisResult.rows[0]
    
    return {
      kpi: {
        totalClients: parseInt(kpis.total_clients) || 0,
        clientsActifs: parseInt(kpis.clients_actifs) || 0,
        contratsActifs: parseInt(kpis.contrats_actifs) || 0,
        primeTotaleAnnuelle: parseFloat(kpis.prime_totale_annuelle) || 0
      },
      alerts: {
        contratsExpiring: expiringResult.rows,
        clientsAtRisk: atRiskResult.rows,
        clientsSilent: silentResult.rows
      },
      opportunities: opportunitiesResult.rows,
      estimatedRevenueAtRisk: atRiskResult.rows.reduce((sum, c) => sum + (c.churn_score > 80 ? 500 : 250), 0)
    }
  } catch (err) {
    logger.error({ error: err.message, userId }, 'getPortfolioContext failed')
    throw err
  }
}

/**
 * Récupère le contexte pour le Morning Brief
 * @param {number} userId - ID du courtier
 * @param {Object} [options] - `{ portee }` (portée déjà résolue) ou `{ req }`
 * @returns {Object} Données pour le brief matinal
 */
async function getMorningBriefContext(userId, options = {}) {
  try {
    // Portée du CABINET (lib/porteeCabinet — seule autorité) : le brief d'un
    // collaborateur décrit le portefeuille du cabinet, pas un portefeuille vide.
    const portee = await resoudrePorteeService(userId, options)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    
    // RDV du jour — agenda PERSONNEL (`calendar_events.user_id`, aucune ancre de
    // cabinet) : filtre volontairement par utilisateur (cf. commentaire en tête).
    const todayEventsResult = await pool.query(
      `SELECT ce.id, ce.title, ce.start_time, ce.end_time,
              ce.client_id, CONCAT(c.first_name, ' ', c.last_name) as client_name
       FROM calendar_events ce
       LEFT JOIN clients c ON c.id = ce.client_id
       WHERE ce.user_id = $1 
         AND ce.start_time >= $2 AND ce.start_time <= $3
       ORDER BY ce.start_time ASC`,
      [userId, today, todayEnd]
    )
    
    // Tâches du jour (en retard ou échéance aujourd'hui)
    // `taches` porte `cabinet_id` (migration 113) : la clause de portée remplace
    // `t.courtier_id = $1`. L'affectation PERSONNELLE (`t.user_id = $n`) reste
    // acceptée pour ne faire disparaître aucune donnée existante — SAUF pour un
    // compte dont l'appartenance a été révoquée (`mode === 'revoquee'`) : ce
    // compte ne doit plus rien lire, pas même ses propres lignes.
    const fTaches = porteeCabinet.fragment(portee, {
      cabinet: 't.cabinet_id',
      proprietaire: 't.courtier_id',
      depart: 1,
    })
    const paramsTaches = [...fTaches.params]
    let clauseAffectation = ''
    if (portee.mode !== 'revoquee') {
      paramsTaches.push(userId)
      clauseAffectation = ` OR t.user_id = $${paramsTaches.length}`
    }
    paramsTaches.push(todayEnd)
    const idxEcheance = paramsTaches.length
    const todayTasksResult = await pool.query(
      `SELECT t.id, t.titre, t.priorite, t.echeance,
              t.client_id, CONCAT(c.first_name, ' ', c.last_name) as client_name
       FROM taches t
       LEFT JOIN clients c ON c.id = t.client_id
       WHERE (${fTaches.sql}${clauseAffectation})
         AND t.statut != 'terminee'
         AND (t.echeance <= $${idxEcheance} OR t.echeance IS NULL)
       ORDER BY t.echeance ASC NULLS LAST
       LIMIT 10`,
      paramsTaches
    )
    
    // Relances urgentes (contrats à échéance 7j) — portée du CABINET
    const fContrats = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
    })
    const urgentRelancesResult = await pool.query(
      `SELECT q.id, q.quote_data->>'type_contrat' as type,
              q.quote_data->>'date_echeance' as date_echeance,
              (q.quote_data->>'prime_annuelle')::numeric as prime,
              c.id as client_id,
              CONCAT(c.first_name, ' ', c.last_name) as client_name
       FROM quotes q
       JOIN clients c ON c.id = q.client_id
       WHERE ${fContrats.sql}
         AND q.status = 'actif'
         AND (q.quote_data->>'date_echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
       ORDER BY (q.quote_data->>'date_echeance')::date ASC`,
      fContrats.params
    )
    
    // Messages WhatsApp non lus
    // `whatsapp_threads.user_id` est la SESSION / inbox de l'utilisateur
    // (intégration), pas un actif du cabinet : filtre inchangé.
    const unreadWhatsappResult = await pool.query(
      `SELECT wt.id, wt.client_id, wt.last_message_preview,
              CONCAT(c.first_name, ' ', c.last_name) as client_name
       FROM whatsapp_threads wt
       JOIN clients c ON c.id = wt.client_id
       WHERE wt.user_id = $1 AND wt.unread_count > 0
       ORDER BY wt.last_message_at DESC
       LIMIT 5`,
      [userId]
    )
    
    // Contexte portefeuille pour les KPIs.
    // La portée DÉJÀ résolue est transmise : aucune requête d'appartenance
    // supplémentaire, et surtout une seule et même portée pour les deux écrans.
    const portfolioCtx = await getPortfolioContext(userId, { ...options, portee })
    
    // Courtier info
    const brokerResult = await pool.query(
      `SELECT u.email, bp.cabinet_name, bp.first_name, bp.last_name
       FROM users u
       LEFT JOIN broker_profiles bp ON bp.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    )
    
    const broker = brokerResult.rows[0] || {}
    const brokerName = broker.first_name || broker.email?.split('@')[0] || 'Courtier'
    
    return {
      courtier: {
        name: brokerName,
        cabinet: broker.cabinet_name
      },
      date: today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      todayEvents: todayEventsResult.rows,
      todayTasks: todayTasksResult.rows,
      urgentRelances: urgentRelancesResult.rows,
      unreadMessages: unreadWhatsappResult.rows,
      kpis: portfolioCtx.kpi,
      clientsAtRisk: portfolioCtx.alerts.clientsAtRisk,
      opportunities: portfolioCtx.opportunities.slice(0, 3)
    }
  } catch (err) {
    logger.error({ error: err.message, userId }, 'getMorningBriefContext failed')
    throw err
  }
}

/**
 * Récupère les infos pour la génération de messages
 * @param {number} clientId - ID client
 * @param {number} userId - ID courtier
 * @returns {Object} Contexte pour génération message
 */
async function getMessageContext(clientId, userId, options = {}) {
  const ctx = await getClientContext(clientId, userId, options)
  if (ctx.error) return ctx
  
  // Récupérer nom courtier
  const brokerResult = await pool.query(
    `SELECT bp.first_name, bp.last_name, bp.cabinet_name, bp.phone as cabinet_phone
     FROM broker_profiles bp
     WHERE bp.user_id = $1`,
    [userId]
  )
  
  const broker = brokerResult.rows[0] || {}
  
  return {
    client: ctx.client,
    contracts: ctx.contracts,
    contractsSummary: ctx.contractsSummary,
    broker: {
      prenom: broker.first_name,
      nom: broker.last_name,
      cabinet: broker.cabinet_name,
      telephone: broker.cabinet_phone
    }
  }
}

/**
 * Vérifie la conformité d'un dossier client
 * @param {number} clientId - ID client
 * @param {number} userId - ID courtier
 * @returns {Object} État de conformité
 */
async function getComplianceContext(clientId, userId, options = {}) {
  const ctx = await getClientContext(clientId, userId, options)
  if (ctx.error) return ctx
  
  // Documents DDA du client
  const ddaDocsResult = await pool.query(
    `SELECT id, document_type, status, signed_at, created_at
     FROM dda_documents
     WHERE client_id = $1
     ORDER BY created_at DESC`,
    [clientId]
  )
  
  // Consentements
  const consentsResult = await pool.query(
    `SELECT consent_type, accepted, accepted_at
     FROM client_consents
     WHERE client_id = $1`,
    [clientId]
  )
  
  return {
    client: ctx.client,
    contracts: ctx.contracts,
    ddaDocuments: ddaDocsResult.rows,
    consents: consentsResult.rows,
    lastUpdate: new Date()
  }
}

module.exports = {
  getClientContext,
  getPortfolioContext,
  getMorningBriefContext,
  getMessageContext,
  getComplianceContext
}
