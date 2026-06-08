const { getAgent } = require('./agentRegistry')

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function anthropicClient() {
  const AnthropicModule = require('@anthropic-ai/sdk')
  const Anthropic = AnthropicModule.default || AnthropicModule
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function buildAgentFallback(cleAgent, consigne = '', contexte = {}) {
  const cible = contexte.sector || contexte.secteur || 'professionnels'
  const valeur = contexte.valueProp || contexte.proposition_valeur || consigne || 'Courtia simplifie le suivi client et les relances.'

  if (cleAgent === 'ark_prospection') {
    return {
      resume_cible: `Prospection B2B auprès de ${cible}.`,
      sequence: [
        {
          etape: 1,
          canal: 'email',
          objectif: 'Créer une réponse simple',
          contenu: `Bonjour,\n\nJe vous contacte parce que ${valeur}\n\nEst-ce que ça vaut le coup d’en parler 10 minutes cette semaine ?`,
        },
        {
          etape: 2,
          canal: 'email',
          objectif: 'Relance courte',
          contenu: `Bonjour,\n\nJe me permets une relance rapide. Si le suivi client et les relances vous prennent du temps, Courtia peut vous aider à centraliser le process.\n\nOuvert à un échange court ?`,
        },
      ],
      script_appel: `Bonjour, je vous appelle au sujet de votre suivi clients. L'idée : voir si Courtia peut vous faire gagner du temps sur les relances et le suivi des opportunités.`,
      donnees_manquantes: ['ANTHROPIC_API_KEY non configurée : brouillon local, à personnaliser avant envoi.'],
    }
  }

  const commun = {
    synthese: `Brouillon local généré pour : ${consigne}`,
    donnees_manquantes: ['ANTHROPIC_API_KEY non configurée : active Claude pour une génération complète.'],
  }

  if (cleAgent === 'ark_marketing') {
    return {
      publications: [{ plateforme: 'LinkedIn', contenu: `${valeur}\n\nMessage à personnaliser avant publication.`, hashtags: ['Courtia', 'Assurance', 'IA'] }],
      calendrier_editorial: [{ jour: 'J1', theme: 'Problème métier', angle: 'temps perdu sur les relances' }],
      brief_visuel: 'Visuel simple avant/après : dossiers éparpillés vs cockpit Courtia.',
      ...commun,
    }
  }

  if (cleAgent === 'ark_visibilite') {
    return {
      titre_article: `Comment ${cible} peuvent mieux suivre leurs clients`,
      meta_titre: 'Courtia — suivi client et relances IA',
      mots_cles_cibles: ['courtier assurance', 'relance client', 'CRM assurance'],
      plan: ['Problème', 'Coût caché', 'Méthode', 'Exemple Courtia'],
      ...commun,
    }
  }

  if (cleAgent === 'ark_finances') return { indicateurs: [], alertes: [], ...commun }
  if (cleAgent === 'ark_juridique') return { type_document: 'brouillon', clauses: [], a_valider_avec_juriste: ['Validation juridique requise.'], ...commun }
  if (cleAgent === 'ark_recrutement') return { annonce: String(consigne), criteres_tri: [], questions_entretien: [], ...commun }
  if (cleAgent === 'ark_accueil') return { intention: 'à qualifier', urgence: 'moyenne', resume: String(consigne), transfert_humain: true, ...commun }

  return commun
}

function buildProspectionActions(clientId, cleAgent, sortie) {
  const sequence = Array.isArray(sortie?.sequence) ? sortie.sequence : []
  return sequence
    .filter((step) => ['email', 'whatsapp'].includes(step.canal))
    .map((step) => ({
      client_id: clientId,
      agent_key: cleAgent,
      action_type: step.canal === 'email' ? 'send_email' : 'send_whatsapp_message',
      title: `Prospection · étape ${step.etape || 1}`,
      rationale: 'Message préparé par ARK Prospection, en attente de validation humaine.',
      payload: {
        suggested_reply: step.contenu,
        message: step.contenu,
        agent_source: cleAgent,
        etape: step.etape || 1,
        canal: step.canal,
      },
      priority: 'medium',
      requires_approval: true,
    }))
}

async function materialiserActionsProspection(tenantId, clientId, cleAgent, sortie) {
  const { createAction } = require('./actionService')
  const actions = []

  for (const action of buildProspectionActions(clientId, cleAgent, sortie)) {
    actions.push(await createAction(tenantId, action))
  }

  return actions
}

async function runAgent(tenantId, cleAgent, {
  consigne = '',
  contexte = {},
  actorId = null,
  clientId = null,
  materialiser = false,
} = {}) {
  const agent = getAgent(cleAgent)
  if (!String(consigne || '').trim()) throw httpError(422, 'Donne une consigne à l’agent.')

  let sortie
  let mode = 'claude'
  if (!process.env.ANTHROPIC_API_KEY) {
    sortie = buildAgentFallback(cleAgent, consigne, contexte)
    mode = 'local_fallback_configuration_required'
  } else {
    const message = await anthropicClient().messages.create({
      model: process.env.ARK_MODEL || 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: agent.prompt,
      tools: [agent.outil],
      tool_choice: { type: 'tool', name: agent.outil.name },
      messages: [{
        role: 'user',
        content: [
          `Consigne : ${consigne}`,
          Object.keys(contexte || {}).length ? `Contexte : ${JSON.stringify(contexte, null, 2)}` : '',
          "Réponds via l'outil.",
        ].filter(Boolean).join('\n'),
      }],
    })

    const bloc = message.content.find((item) => item.type === 'tool_use')
    sortie = bloc?.input
    if (!sortie) throw httpError(502, 'L’agent n’a pas produit de résultat structuré.')
  }

  const { emitEvent } = require('./events')
  await emitEvent({
    tenantId,
    aggregateType: 'agent',
    aggregateId: cleAgent,
    eventType: 'agent.execution',
    actorType: 'ark',
    actorId,
      payload: {
        agent: cleAgent,
        client_id: clientId,
        mode,
        apercu_consigne: String(consigne).slice(0, 200),
      },
    })

  const actions = materialiser && agent.produit_des_actions && clientId
    ? await materialiserActionsProspection(tenantId, clientId, cleAgent, sortie)
    : []

  if (actions.length > 0) {
    await emitEvent({
      tenantId,
      aggregateType: 'agent',
      aggregateId: cleAgent,
      eventType: 'agent.actions_preparees',
      actorType: 'ark',
      actorId,
      payload: { agent: cleAgent, client_id: clientId, nombre: actions.length },
    })
  }

  return { agent: cleAgent, mode, sortie, actions }
}

module.exports = {
  buildAgentFallback,
  buildProspectionActions,
  runAgent,
}
