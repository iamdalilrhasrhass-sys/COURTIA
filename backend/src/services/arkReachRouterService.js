/**
 * ARK REACH — Router Service
 * Intelligence routing layer for ARK REACH acquisition engine.
 * Routes AI tasks to the appropriate backend (Ollama, Claude, Gemini, DeepSeek, Mock)
 *
 * Current state: Mock mode (no external APIs configured)
 * Ready for future integration with ARK GPU / Ollama / Cloud APIs
 */

const AVAILABLE_TASKS = [
  'scoring',
  'email',
  'sms',
  'call_script',
  'reply',
  'analysis',
  'playbook',
];

function getProviderStatus() {
  return {
    brand: 'ARK REACH',
    environment: {
      node_env: process.env.NODE_ENV || 'development',
      mock_mode: !process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY && !process.env.DEEPSEEK_API_KEY,
    },
    providers: {
      ollama_local: {
        configured: !!process.env.ARK_ROUTER_URL,
        ready: false,
        url: process.env.ARK_ROUTER_URL || null,
        note: process.env.ARK_ROUTER_URL ? 'URL configurée — test de connexion nécessaire' : 'Non configuré — ARK_ROUTER_URL manquant',
      },
      ark_gpu: {
        configured: !!process.env.ARK_ROUTER_URL && !!process.env.ARK_ROUTER_TOKEN,
        ready: false,
        note: !process.env.ARK_ROUTER_URL ? 'URL manquante' : !process.env.ARK_ROUTER_TOKEN ? 'Token manquant' : 'Configuré — prêt à activer',
      },
      claude: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        ready: !!process.env.ANTHROPIC_API_KEY,
        note: process.env.ANTHROPIC_API_KEY ? 'Clé configurée' : 'ANTHROPIC_API_KEY manquante',
      },
      gemini: {
        configured: !!process.env.GEMINI_API_KEY,
        ready: !!process.env.GEMINI_API_KEY,
        note: process.env.GEMINI_API_KEY ? 'Clé configurée' : 'GEMINI_API_KEY manquante',
      },
      deepseek: {
        configured: !!process.env.DEEPSEEK_API_KEY,
        ready: !!process.env.DEEPSEEK_API_KEY,
        note: process.env.DEEPSEEK_API_KEY ? 'Clé configurée' : 'DEEPSEEK_API_KEY manquante',
      },
    },
    google_places: {
      configured: !!process.env.GOOGLE_PLACES_API_KEY,
      ready: !!process.env.GOOGLE_PLACES_API_KEY,
      note: process.env.GOOGLE_PLACES_API_KEY ? 'Clé configurée' : 'GOOGLE_PLACES_API_KEY manquante',
    },
    available_tasks: AVAILABLE_TASKS,
    active_provider: null,
    fallback: 'mock',
  };
}

/**
 * Route an AI task to the best available provider.
 * Falls back to mock if nothing is configured.
 */
async function routeTask(taskType, payload) {
  if (!AVAILABLE_TASKS.includes(taskType)) {
    return { success: false, error: `Task type inconnu: ${taskType}. Disponible: ${AVAILABLE_TASKS.join(', ')}` };
  }

  // Priority: Claude > Gemini > DeepSeek > Ollama > Mock
  if (process.env.ANTHROPIC_API_KEY) {
    return await callClaude(taskType, payload);
  }
  if (process.env.GEMINI_API_KEY) {
    return await callGemini(taskType, payload);
  }
  if (process.env.DEEPSEEK_API_KEY) {
    return await callDeepSeek(taskType, payload);
  }
  if (process.env.ARK_ROUTER_URL) {
    return await callOllama(taskType, payload);
  }

  // Fallback to mock
  return generateMockResponse(taskType, payload);
}

async function callClaude(taskType, payload) {
  // Future: call Anthropic API
  return {
    success: true,
    provider: 'claude',
    mock: false,
    note: 'Intégration Claude en attente de déploiement',
    ...generateMockResponse(taskType, payload),
  };
}

async function callGemini(taskType, payload) {
  // Future: call Gemini API
  return {
    success: true,
    provider: 'gemini',
    mock: false,
    note: 'Intégration Gemini en attente de déploiement',
    ...generateMockResponse(taskType, payload),
  };
}

async function callDeepSeek(taskType, payload) {
  // Future: call DeepSeek API
  return {
    success: true,
    provider: 'deepseek',
    mock: false,
    note: 'Intégration DeepSeek en attente de déploiement',
    ...generateMockResponse(taskType, payload),
  };
}

async function callOllama(taskType, payload) {
  // Future: call local Ollama
  return {
    success: true,
    provider: 'ollama',
    mock: false,
    note: 'Intégration Ollama en attente de déploiement',
    ...generateMockResponse(taskType, payload),
  };
}

function generateMockResponse(taskType, payload) {
  const prospect = payload?.prospect || {};
  const company = prospect.company_name || 'Prospect';

  switch (taskType) {
    case 'scoring':
      return {
        mock: true,
        provider: 'mock',
        result: {
          opportunity_score: 72,
          urgency_score: 65,
          ease_score: 58,
          premium_potential_score: 80,
          conversion_likelihood: 62,
          estimated_annual_premium: 8500,
          estimated_commission: 1020,
          recommended_product: 'RC Pro + Multirisque',
          best_angle: `Protection sur-mesure pour ${company}`,
          likely_objection: 'Déjà assuré',
          next_best_action: `Appeler ${company} pour un audit gratuit`,
          reasoning: 'Score basé sur les signaux du marché local et le secteur',
          confidence_level: 'medium',
          tags: ['prioritaire', 'fort_potentiel', 'a_contacter_j0'],
        },
      };

    case 'email':
      return {
        mock: true,
        provider: 'mock',
        result: {
          subject: `${company} — Optimisation de votre couverture assurance`,
          body: `Bonjour,\n\nJe suis courtier spécialisé et j'accompagne des professionnels comme ${company} dans l'optimisation de leur couverture assurance.\n\nJe vous propose un audit gratuit de 10 minutes pour vérifier vos garanties actuelles, sans engagement.\n\nQuand seriez-vous disponible pour un échange ?\n\nCordialement,\nVotre courtier COURTIA`,
          channel: 'email',
          compliance_note: 'Validation humaine obligatoire avant envoi',
        },
      };

    case 'sms':
      return {
        mock: true,
        provider: 'mock',
        result: {
          body: `Bonjour, audit gratuit assurance pro pour ${company} ? Répondez OUI pour échanger 5 min.`,
          channel: 'sms',
          compliance_note: 'Validation humaine obligatoire avant envoi',
        },
      };

    case 'call_script':
      return {
        mock: true,
        provider: 'mock',
        result: {
          intro: `Bonjour, je suis courtier spécialisé. Je travaille avec des professionnels comme ${company}.`,
          discovery: 'Comment gérez-vous actuellement vos assurances professionnelles ?',
          value_prop: 'Je propose un audit gratuit de 10 minutes pour vérifier que vous êtes bien couvert, sans engagement.',
          objection_handling: {
            'Déjà assuré': "C'est une bonne chose. Mon audit permet juste de vérifier que vos garanties sont toujours adaptées.",
            'Pas le temps': '10 minutes suffisent. Je m\'adapte à votre agenda.',
            'Trop cher': "L'audit est gratuit. Souvent on découvre des économies de 20-30%.",
          },
          close: 'Quand seriez-vous disponible cette semaine pour un échange de 10 minutes ?',
          compliance_note: 'Script d\'appel — validation humaine obligatoire',
        },
      };

    case 'reply':
      return {
        mock: true,
        provider: 'mock',
        result: {
          sentiment: 'neutral',
          suggested_reply: `Bonjour, merci pour votre retour. Je comprends tout à fait. Si jamais vous souhaitez faire un point sur vos couvertures plus tard, je reste disponible. Bonne journée.`,
          action: 'follow_up_j30',
          compliance_note: 'Validation humaine obligatoire avant envoi',
        },
      };

    case 'analysis':
      return {
        mock: true,
        provider: 'mock',
        result: {
          summary: `${company} — potentiel d'acquisition élevé`,
          market_position: 'Acteur local avec forte présence',
          risk_factors: ['Concurrence locale modérée', 'Sensibilité prix'],
          recommendations: ['Approche valeur plutôt que prix', 'Mettre en avant la réactivité'],
          estimated_close_time: '2-4 semaines',
        },
      };

    case 'playbook':
      return {
        mock: true,
        provider: 'mock',
        result: {
          recommended_playbook: payload?.category || 'garage',
          confidence: 0.85,
          alternative_playbooks: ['artisan', 'commerce_local'],
        },
      };

    default:
      return {
        mock: true,
        provider: 'mock',
        result: { message: `Mock response for ${taskType}` },
      };
  }
}

module.exports = {
  getProviderStatus,
  routeTask,
  generateMockResponse,
  AVAILABLE_TASKS,
};
