/**
 * ARK Context - Récupération contexte client/portefeuille depuis la DB
 * LOT 3: Backend ARK Réel
 * 
 * @module arkContext
 */

const pool = require('../db')
const logger = require('../lib/logger')

/**
 * Récupère le contexte complet d'un client
 * @param {number} clientId - ID du client
 * @param {number} userId - ID du courtier (pour vérification sécurité)
 * @returns {Object} Contexte client enrichi
 */
async function getClientContext(clientId, userId) {
  try {
    // Vérifier que le client appartient bien au courtier
    const clientResult = await pool.query(
      `SELECT c.*, bp.cabinet_name, bp.specialites
       FROM clients c
       LEFT JOIN broker_profiles bp ON bp.user_id = c.courtier_id
       WHERE c.id = $1 AND c.courtier_id = $2`,
      [clientId, userId]
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
    const appointmentsResult = await pool.query(
      `SELECT id, title, start_time, end_time, location, notes, status
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
    const interactionsResult = await pool.query(
      `SELECT id, provider, direction, summary, occurred_at
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
 * @returns {Object} KPIs et alertes portefeuille
 */
async function getPortfolioContext(userId) {
  try {
    // KPIs généraux
    const kpisResult = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM clients WHERE courtier_id = $1) as total_clients,
        (SELECT COUNT(*) FROM clients WHERE courtier_id = $1 AND status = 'actif') as clients_actifs,
        (SELECT COUNT(*) FROM quotes q 
         JOIN clients c ON c.id = q.client_id 
         WHERE c.courtier_id = $1 AND q.status = 'actif') as contrats_actifs,
        (SELECT COALESCE(SUM((q.quote_data->>'prime_annuelle')::numeric), 0)
         FROM quotes q 
         JOIN clients c ON c.id = q.client_id 
         WHERE c.courtier_id = $1 AND q.status = 'actif') as prime_totale_annuelle`,
      [userId]
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
       WHERE c.courtier_id = $1 
         AND q.status = 'actif'
         AND (q.quote_data->>'date_echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '45 days'
       ORDER BY (q.quote_data->>'date_echeance')::date ASC
       LIMIT 10`,
      [userId]
    )
    
    // Clients à risque (score >= 70)
    const atRiskResult = await pool.query(
      `SELECT c.id, CONCAT(c.first_name, ' ', c.last_name) as name,
              crs.churn_score, crs.factors
       FROM client_risk_scores crs
       JOIN clients c ON c.id = crs.client_id
       WHERE c.courtier_id = $1 AND crs.churn_score >= 70
       ORDER BY crs.churn_score DESC
       LIMIT 5`,
      [userId]
    )
    
    // Clients silencieux (pas de contact > 45 jours)
    const silentResult = await pool.query(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name,
              last_contact,
              EXTRACT(days FROM NOW() - last_contact) as days_silent
       FROM clients
       WHERE courtier_id = $1 
         AND last_contact < NOW() - INTERVAL '45 days'
       ORDER BY last_contact ASC
       LIMIT 5`,
      [userId]
    )
    
    // Opportunités cross-sell
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
 * @returns {Object} Données pour le brief matinal
 */
async function getMorningBriefContext(userId) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    
    // RDV du jour
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
    const todayTasksResult = await pool.query(
      `SELECT t.id, t.titre, t.priorite, t.echeance,
              t.client_id, CONCAT(c.first_name, ' ', c.last_name) as client_name
       FROM taches t
       LEFT JOIN clients c ON c.id = t.client_id
       WHERE (t.courtier_id = $1 OR t.user_id = $1)
         AND t.statut != 'terminee'
         AND (t.echeance <= $2 OR t.echeance IS NULL)
       ORDER BY t.echeance ASC NULLS LAST
       LIMIT 10`,
      [userId, todayEnd]
    )
    
    // Relances urgentes (contrats à échéance 7j)
    const urgentRelancesResult = await pool.query(
      `SELECT q.id, q.quote_data->>'type_contrat' as type,
              q.quote_data->>'date_echeance' as date_echeance,
              (q.quote_data->>'prime_annuelle')::numeric as prime,
              c.id as client_id,
              CONCAT(c.first_name, ' ', c.last_name) as client_name
       FROM quotes q
       JOIN clients c ON c.id = q.client_id
       WHERE c.courtier_id = $1 
         AND q.status = 'actif'
         AND (q.quote_data->>'date_echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
       ORDER BY (q.quote_data->>'date_echeance')::date ASC`,
      [userId]
    )
    
    // Messages WhatsApp non lus
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
    
    // Contexte portefeuille pour les KPIs
    const portfolioCtx = await getPortfolioContext(userId)
    
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
async function getMessageContext(clientId, userId) {
  const ctx = await getClientContext(clientId, userId)
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
async function getComplianceContext(clientId, userId) {
  const ctx = await getClientContext(clientId, userId)
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
