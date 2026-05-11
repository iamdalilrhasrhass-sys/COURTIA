/**
 * ARK Chat Service
 * LOT 21 — Chatbot FAQ pour portail client
 * Répond aux questions sur contrats et sinistres via Claude API
 */

const Anthropic = require('@anthropic-ai/sdk')

const MAX_CONTEXT_MESSAGES = 10
const MAX_TOKENS_RESPONSE = 1024

/**
 * Génère le prompt système pour ARK Chat
 */
function buildSystemPrompt(context) {
  const { cabinetName, clientName, contracts, claims, upcomingDeadlines } = context

  let contractsInfo = ''
  if (contracts && contracts.length > 0) {
    contractsInfo = contracts.map(c => 
      `- ${c.type || 'Contrat'} n°${c.numero || c.id} (${c.compagnie || 'N/A'}) - Échéance: ${c.echeance || 'N/A'} - Prime: ${c.prime || 'N/A'}€`
    ).join('\n')
  } else {
    contractsInfo = 'Aucun contrat actif trouvé.'
  }

  let claimsInfo = ''
  if (claims && claims.length > 0) {
    claimsInfo = claims.map(s =>
      `- Sinistre ${s.type} du ${new Date(s.opened_at).toLocaleDateString('fr-FR')} - Statut: ${s.status} - Montant: ${s.amount || 'N/A'}€`
    ).join('\n')
  } else {
    claimsInfo = 'Aucun sinistre en cours.'
  }

  let deadlinesInfo = ''
  if (upcomingDeadlines && upcomingDeadlines.length > 0) {
    deadlinesInfo = upcomingDeadlines.map(d =>
      `- ${d.type}: ${d.description} le ${new Date(d.date).toLocaleDateString('fr-FR')}`
    ).join('\n')
  }

  return `Tu es ARK, l'assistant intelligent du cabinet d'assurance "${cabinetName || 'votre courtier'}".
Tu parles à ${clientName || 'un client'}. 

RÔLE:
- Répondre aux questions sur les contrats d'assurance du client
- Aider pour les démarches sinistres
- Donner des informations sur les échéances et renouvellements
- Orienter vers le courtier si besoin

CONTRATS DU CLIENT:
${contractsInfo}

SINISTRES EN COURS:
${claimsInfo}

${deadlinesInfo ? `ÉCHÉANCES À VENIR:\n${deadlinesInfo}` : ''}

RÈGLES:
1. Réponds TOUJOURS en français
2. Sois précis, professionnel et empathique
3. Ne donne JAMAIS de conseils juridiques ou médicaux
4. Pour les modifications de contrat, oriente vers le courtier
5. Pour un sinistre urgent, indique de contacter le courtier directement
6. Reste concis (3-4 phrases max sauf si détail demandé)
7. Si tu ne sais pas, dis-le honnêtement

EXEMPLES DE QUESTIONS FRÉQUENTES:
- "Quels sont mes contrats ?" → Liste les contrats
- "Mon contrat auto arrive quand à échéance ?" → Donne la date d'échéance
- "Comment déclarer un sinistre ?" → Explique la procédure
- "Quel est le statut de mon sinistre ?" → Donne le statut actuel`
}

/**
 * Récupère le contexte client pour ARK
 */
async function getClientContext(pool, clientId) {
  // Infos client
  const clientRes = await pool.query(`
    SELECT c.*, u.first_name AS courtier_prenom, u.last_name AS courtier_nom, u.cabinet_name
    FROM clients c
    LEFT JOIN users u ON u.id = c.courtier_id
    WHERE c.id = $1
  `, [clientId])

  if (clientRes.rows.length === 0) {
    return null
  }

  const client = clientRes.rows[0]

  // Contrats actifs
  const contractsRes = await pool.query(`
    SELECT q.id, q.quote_data->>'type_contrat' AS type, 
           q.quote_data->>'numero' AS numero,
           q.quote_data->>'compagnie' AS compagnie,
           q.quote_data->>'echeance' AS echeance,
           q.quote_data->>'prime_ttc' AS prime,
           q.status
    FROM quotes q
    WHERE q.client_id = $1 AND q.status IN ('accepted', 'active', 'en_cours')
    ORDER BY q.created_at DESC
    LIMIT 10
  `, [clientId])

  // Sinistres
  const claimsRes = await pool.query(`
    SELECT * FROM claims 
    WHERE client_id = $1 AND status NOT IN ('closed', 'rejected')
    ORDER BY opened_at DESC
    LIMIT 5
  `, [clientId])

  // Échéances à venir (30 jours)
  const deadlinesRes = await pool.query(`
    SELECT 'Renouvellement' AS type, 
           q.quote_data->>'type_contrat' || ' n°' || q.quote_data->>'numero' AS description,
           (q.quote_data->>'echeance')::date AS date
    FROM quotes q
    WHERE q.client_id = $1 
      AND q.status IN ('accepted', 'active')
      AND (q.quote_data->>'echeance')::date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    ORDER BY date ASC
    LIMIT 5
  `, [clientId])

  return {
    cabinetName: client.cabinet_name || `${client.courtier_prenom} ${client.courtier_nom}`,
    clientName: `${client.first_name} ${client.last_name}`,
    contracts: contractsRes.rows,
    claims: claimsRes.rows,
    upcomingDeadlines: deadlinesRes.rows
  }
}

/**
 * Traite un message client et génère une réponse ARK
 */
async function processMessage(pool, clientId, userMessage, sessionId = null) {
  // Récupérer le contexte client
  const context = await getClientContext(pool, clientId)
  if (!context) {
    throw new Error('Client introuvable')
  }

  // Récupérer l'historique de conversation (si session)
  let history = []
  if (sessionId) {
    const historyRes = await pool.query(`
      SELECT role, content FROM ark_chat_messages
      WHERE client_id = $1 AND session_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `, [clientId, sessionId, MAX_CONTEXT_MESSAGES])
    history = historyRes.rows.reverse()
  }

  // Préparer les messages pour Claude
  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage }
  ]

  // Mode mock si pas de clé Claude
  if (!process.env.ANTHROPIC_API_KEY) {
    const mockResponse = generateMockResponse(userMessage, context)
    
    // Sauvegarder les messages
    const insertSession = sessionId || (await pool.query(`
      INSERT INTO ark_chat_sessions (client_id) VALUES ($1) RETURNING id
    `, [clientId])).rows[0]?.id

    await pool.query(`
      INSERT INTO ark_chat_messages (client_id, session_id, role, content, tokens_used)
      VALUES ($1, $2, 'user', $3, 0), ($1, $2, 'assistant', $4, 0)
    `, [clientId, insertSession, userMessage, mockResponse])

    return {
      response: mockResponse,
      sessionId: insertSession,
      mock: true
    }
  }

  // Appel Claude API
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  
  try {
    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: MAX_TOKENS_RESPONSE,
      system: buildSystemPrompt(context),
      messages
    })

    const responseText = completion.content[0]?.text || 'Je suis désolé, je n\'ai pas pu générer de réponse.'
    const tokensUsed = completion.usage?.output_tokens || 0

    // Créer ou récupérer la session
    let activeSessionId = sessionId
    if (!activeSessionId) {
      const sessionRes = await pool.query(`
        INSERT INTO ark_chat_sessions (client_id) VALUES ($1) RETURNING id
      `, [clientId])
      activeSessionId = sessionRes.rows[0].id
    }

    // Sauvegarder les messages
    await pool.query(`
      INSERT INTO ark_chat_messages (client_id, session_id, role, content, tokens_used, context_data)
      VALUES ($1, $2, 'user', $3, 0, $5::jsonb), ($1, $2, 'assistant', $4, $6, '{}'::jsonb)
    `, [clientId, activeSessionId, userMessage, responseText, JSON.stringify(context), tokensUsed])

    // Mettre à jour le compteur de la session
    await pool.query(`
      UPDATE ark_chat_sessions 
      SET message_count = message_count + 2, updated_at = NOW()
      WHERE id = $1
    `, [activeSessionId])

    return {
      response: responseText,
      sessionId: activeSessionId,
      tokensUsed
    }
  } catch (error) {
    console.error('[ARK Chat] Erreur Claude:', error.message)
    throw new Error('Erreur lors de la génération de la réponse')
  }
}

/**
 * Génère une réponse mock pour les tests
 */
function generateMockResponse(message, context) {
  const msgLower = message.toLowerCase()

  if (msgLower.includes('contrat') || msgLower.includes('police')) {
    if (context.contracts.length > 0) {
      const list = context.contracts.map(c => 
        `• ${c.type || 'Contrat'} n°${c.numero || c.id}`
      ).join('\n')
      return `Voici vos contrats actifs :\n${list}\n\nSouhaitez-vous des détails sur l'un d'entre eux ?`
    }
    return 'Je ne trouve pas de contrat actif associé à votre compte. Souhaitez-vous que je transfère votre demande à votre courtier ?'
  }

  if (msgLower.includes('sinistre') || msgLower.includes('accident') || msgLower.includes('déclar')) {
    if (context.claims.length > 0) {
      const claim = context.claims[0]
      return `Votre sinistre ${claim.type} est actuellement en statut "${claim.status}". Si vous avez des questions spécifiques ou des documents à fournir, n'hésitez pas à me le dire.`
    }
    return 'Pour déclarer un sinistre, vous pouvez :\n1. Me décrire les circonstances ici\n2. Contacter directement votre courtier\n3. Utiliser le formulaire de déclaration en ligne\n\nComment puis-je vous aider ?'
  }

  if (msgLower.includes('échéance') || msgLower.includes('renouvellement')) {
    if (context.upcomingDeadlines && context.upcomingDeadlines.length > 0) {
      const deadline = context.upcomingDeadlines[0]
      return `Votre prochaine échéance est le ${new Date(deadline.date).toLocaleDateString('fr-FR')} pour ${deadline.description}. Souhaitez-vous être recontacté pour discuter du renouvellement ?`
    }
    return 'Je ne vois pas d\'échéance imminente dans votre dossier. Souhaitez-vous que je vérifie avec votre courtier ?'
  }

  if (msgLower.includes('bonjour') || msgLower.includes('salut')) {
    return `Bonjour ${context.clientName.split(' ')[0]} ! Je suis ARK, votre assistant ${context.cabinetName}. Comment puis-je vous aider aujourd'hui ?`
  }

  return `Je comprends votre demande. Pour vous aider au mieux, pourriez-vous me donner plus de détails ? Je peux vous renseigner sur :\n• Vos contrats d'assurance\n• Vos sinistres en cours\n• Les échéances à venir\n\nN'hésitez pas à me poser votre question !`
}

/**
 * Récupère l'historique d'un client
 */
async function getHistory(pool, clientId, options = {}) {
  const { sessionId, limit = 50 } = options

  let query = `
    SELECT m.*, s.started_at AS session_started
    FROM ark_chat_messages m
    LEFT JOIN ark_chat_sessions s ON s.id = m.session_id
    WHERE m.client_id = $1
  `
  const params = [clientId]

  if (sessionId) {
    query += ` AND m.session_id = $2`
    params.push(sessionId)
  }

  query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`
  params.push(limit)

  const result = await pool.query(query, params)
  return result.rows.reverse()
}

/**
 * Supprime l'historique d'un client
 */
async function clearHistory(pool, clientId) {
  await pool.query(`DELETE FROM ark_chat_messages WHERE client_id = $1`, [clientId])
  await pool.query(`DELETE FROM ark_chat_sessions WHERE client_id = $1`, [clientId])
  return { success: true }
}

/**
 * Génère des suggestions contextuelles
 */
function getSuggestions(context) {
  const suggestions = []

  if (context.contracts && context.contracts.length > 0) {
    suggestions.push('Quels sont mes contrats ?')
    suggestions.push('Quand arrive mon échéance ?')
  }

  if (context.claims && context.claims.length > 0) {
    suggestions.push('Quel est le statut de mon sinistre ?')
  } else {
    suggestions.push('Comment déclarer un sinistre ?')
  }

  suggestions.push('Contacter mon courtier')

  return suggestions.slice(0, 4)
}

module.exports = {
  processMessage,
  getHistory,
  clearHistory,
  getClientContext,
  getSuggestions,
  buildSystemPrompt
}
