/**
 * ARK Compose AI Service
 * Extraction besoins + génération recommandation via Claude
 * 
 * @module compose/composeAi
 */

const { callArkStructured } = require('../arkEngine')
const pool = require('../../db')
const logger = require('../../lib/logger')

// Schémas JSON pour les appels structurés
const SCHEMAS = {
  needsExtraction: {
    type: 'object',
    required: ['besoins', 'situation', 'objectifs'],
    properties: {
      besoins: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['haute', 'moyenne', 'basse'] }
          }
        }
      },
      situation: { type: 'string' },
      objectifs: {
        type: 'array',
        items: { type: 'string' }
      },
      contraintes_budget: { type: 'string' },
      risques_identifies: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  },
  
  recommendation: {
    type: 'object',
    required: ['recommended_product', 'reasoning', 'alternatives_considered'],
    properties: {
      recommended_product: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          insurer: { type: 'string' },
          quote_id: { type: 'number' },
          premium: { type: 'number' }
        }
      },
      reasoning: {
        type: 'array',
        items: { type: 'string' }
      },
      detailed_reasoning: { type: 'string' },
      main_guarantees: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' }
          }
        }
      },
      alternatives_considered: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            insurer: { type: 'string' },
            premium: { type: 'number' },
            why_rejected: { type: 'string' }
          }
        }
      },
      risk_assessment: { type: 'string' },
      confidence_score: { type: 'number' }
    }
  },
  
  ipidContent: {
    type: 'object',
    required: ['product', 'coverage', 'exclusions'],
    properties: {
      product: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          reference: { type: 'string' },
          duration: { type: 'string' },
          cancellation: { type: 'array', items: { type: 'string' } }
        }
      },
      coverage: {
        type: 'object',
        properties: {
          guarantees: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' }
              }
            }
          },
          restrictions: { type: 'array', items: { type: 'string' } },
          obligations: { type: 'array', items: { type: 'string' } }
        }
      },
      exclusions: { type: 'array', items: { type: 'string' } },
      premium: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          frequency: { type: 'string' },
          method: { type: 'string' }
        }
      }
    }
  }
}

/**
 * Extrait les besoins client depuis les données existantes
 * @param {number} clientId - ID du client
 * @param {number} brokerId - ID du courtier
 * @returns {Promise<Object>} Besoins structurés
 */
async function extractNeedsFromClient(clientId, brokerId) {
  // Récupérer données client
  const clientRes = await pool.query(
    `SELECT c.*, 
            json_agg(DISTINCT jsonb_build_object('type', ct.type_contrat, 'compagnie', ct.compagnie, 'prime', ct.prime_annuelle)) FILTER (WHERE ct.id IS NOT NULL) AS contracts
     FROM clients c
     LEFT JOIN contracts ct ON ct.client_id = c.id
     WHERE c.id = $1 AND c.broker_id = $2
     GROUP BY c.id`,
    [clientId, brokerId]
  )
  
  if (clientRes.rows.length === 0) {
    throw new Error('Client non trouvé')
  }
  
  const client = clientRes.rows[0]
  
  // Récupérer notes et échanges récents
  const notesRes = await pool.query(
    `SELECT content, created_at FROM notes 
     WHERE client_id = $1 
     ORDER BY created_at DESC LIMIT 10`,
    [clientId]
  )
  
  // Récupérer questionnaire DDA si existant
  const ddaRes = await pool.query(
    `SELECT answers FROM dda_quizzes 
     WHERE client_id = $1 
     ORDER BY completed_at DESC LIMIT 1`,
    [clientId]
  )
  
  const context = {
    client: {
      type: client.type || 'particulier',
      profession: client.profession,
      situation_familiale: client.situation_familiale,
      revenus: client.revenus,
      patrimoine: client.patrimoine
    },
    contracts: client.contracts || [],
    notes: notesRes.rows.map(n => n.content).join('\n'),
    dda_answers: ddaRes.rows[0]?.answers || null
  }
  
  const result = await callArkStructured({
    system: `Tu es ARK, expert en analyse des besoins assurance.
Analyse les données client et extrais les besoins d'assurance.
Sois précis, professionnel et adapté au profil (particulier ou professionnel).
Identifie les risques non couverts et les opportunités de protection.`,
    user: `Analyse ce client et identifie ses besoins d'assurance :
    
Client: ${JSON.stringify(context.client, null, 2)}

Contrats existants: ${JSON.stringify(context.contracts, null, 2)}

Notes courtier: ${context.notes || 'Aucune note'}

Réponses DDA: ${context.dda_answers ? JSON.stringify(context.dda_answers) : 'Non renseigné'}

Extrais: besoins prioritaires, situation résumée, objectifs de protection, contraintes budget, risques identifiés.`,
    schema: SCHEMAS.needsExtraction,
    userId: brokerId,
    clientId,
    route: 'compose:extract-needs'
  })
  
  if (result.error) {
    logger.warn({ error: result.error }, 'Extraction besoins IA échouée, utilisation fallback')
    return {
      besoins: [{ type: 'Assurance', description: 'À définir avec le client', priority: 'haute' }],
      situation: 'Informations à compléter lors de l\'entretien',
      objectifs: ['Protection adaptée au profil'],
      contraintes_budget: 'À définir',
      risques_identifies: []
    }
  }
  
  return result.structured || result
}

/**
 * Génère une recommandation basée sur les besoins et devis disponibles
 * @param {Object} params - Paramètres
 * @returns {Promise<Object>} Recommandation structurée
 */
async function buildRecommendation({ clientId, brokerId, needs, availableQuotes = [] }) {
  // Si pas de quotes fournis, les récupérer
  let quotes = availableQuotes
  if (quotes.length === 0) {
    const quotesRes = await pool.query(
      `SELECT q.*, ip.name AS provider_name, ip.logo_url
       FROM quotes q
       LEFT JOIN insurance_providers ip ON ip.id = q.provider_id
       WHERE q.client_id = $1 AND q.broker_id = $2 AND q.status != 'rejected'
       ORDER BY q.created_at DESC`,
      [clientId, brokerId]
    )
    quotes = quotesRes.rows
  }
  
  // Récupérer client pour contexte
  const clientRes = await pool.query(
    'SELECT * FROM clients WHERE id = $1 AND broker_id = $2',
    [clientId, brokerId]
  )
  const client = clientRes.rows[0] || {}
  
  const context = {
    client: {
      type: client.type,
      nom: client.nom,
      profession: client.profession,
      situation_familiale: client.situation_familiale
    },
    needs,
    quotes: quotes.map(q => ({
      id: q.id,
      product_name: q.product_name || q.product_type,
      insurer: q.provider_name || q.compagnie,
      premium: q.premium_annual || q.prime_annuelle,
      guarantees: q.guarantees || q.garanties,
      coverage_data: q.coverage_data
    }))
  }
  
  const result = await callArkStructured({
    system: `Tu es ARK, conseiller expert en assurance.
Ton rôle est de recommander le meilleur produit pour le client parmi les devis disponibles.
Base ta recommandation sur:
1. L'adéquation avec les besoins exprimés
2. Le rapport garanties/prix
3. La solidité de la compagnie
4. Les exclusions et limitations

Sois objectif et argumente ta recommandation.`,
    user: `Client: ${JSON.stringify(context.client, null, 2)}

Besoins identifiés: ${JSON.stringify(context.needs, null, 2)}

Devis disponibles: ${JSON.stringify(context.quotes, null, 2)}

${context.quotes.length === 0 ? 'Aucun devis disponible - recommande de lancer une recherche de devis.' : ''}

Génère une recommandation personnalisée avec:
- Le produit recommandé (ou indication si aucun devis)
- Les raisons de ce choix
- Les garanties principales
- Les alternatives considérées et pourquoi écartées
- Une évaluation du risque
- Un score de confiance (0-100)`,
    schema: SCHEMAS.recommendation,
    userId: brokerId,
    clientId,
    route: 'compose:build-recommendation'
  })
  
  if (result.error) {
    logger.warn({ error: result.error }, 'Génération recommandation IA échouée, utilisation fallback')
    
    // Fallback: recommander le moins cher si quotes disponibles
    if (quotes.length > 0) {
      const sorted = [...quotes].sort((a, b) => (a.premium_annual || a.prime_annuelle || 0) - (b.premium_annual || b.prime_annuelle || 0))
      const best = sorted[0]
      return {
        recommended_product: {
          name: best.product_name || best.product_type,
          insurer: best.provider_name || best.compagnie,
          quote_id: best.id,
          premium: best.premium_annual || best.prime_annuelle
        },
        reasoning: ['Meilleur rapport qualité/prix parmi les devis disponibles'],
        detailed_reasoning: 'Recommandation basée sur le tarif. Une analyse approfondie est conseillée.',
        main_guarantees: [],
        alternatives_considered: sorted.slice(1, 4).map(q => ({
          name: q.product_name || q.product_type,
          insurer: q.provider_name || q.compagnie,
          premium: q.premium_annual || q.prime_annuelle,
          why_rejected: 'Tarif plus élevé'
        })),
        risk_assessment: 'À évaluer',
        confidence_score: 50
      }
    }
    
    return {
      recommended_product: null,
      reasoning: ['Aucun devis disponible pour ce client'],
      detailed_reasoning: 'Veuillez d\'abord générer des devis via le comparateur.',
      main_guarantees: [],
      alternatives_considered: [],
      risk_assessment: 'Non évaluable',
      confidence_score: 0
    }
  }
  
  return result.structured || result
}

/**
 * Génère le contenu IPID enrichi par IA
 * @param {Object} params - Données produit/couverture
 * @returns {Promise<Object>} Contenu IPID structuré
 */
async function generateIpidContent({ productData, coverageData, brokerId, clientId }) {
  const result = await callArkStructured({
    system: `Tu es ARK, expert en rédaction de documents d'assurance.
Génère le contenu d'un IPID (Insurance Product Information Document) conforme au règlement UE 2017/1469.
Le document doit être clair, précis et compréhensible par un non-expert.
Utilise un langage simple et évite le jargon technique.`,
    user: `Produit: ${JSON.stringify(productData, null, 2)}

Couverture: ${JSON.stringify(coverageData, null, 2)}

Génère un contenu IPID complet avec:
- Informations produit (nom, type, référence, durée, conditions résiliation)
- Couverture (garanties, restrictions, obligations)
- Exclusions
- Prime (montant, fréquence, moyens de paiement)`,
    schema: SCHEMAS.ipidContent,
    userId: brokerId,
    clientId,
    route: 'compose:generate-ipid'
  })
  
  if (result.error) {
    logger.warn({ error: result.error }, 'Génération IPID IA échouée, utilisation données brutes')
    return {
      product: productData || {},
      coverage: coverageData || {},
      exclusions: [],
      premium: {}
    }
  }
  
  return result.structured || result
}

/**
 * Enrichit les données d'un devis incomplet
 * @param {Object} quote - Devis à enrichir
 * @param {number} brokerId - ID courtier
 * @returns {Promise<Object>} Devis enrichi
 */
async function enrichQuoteData(quote, brokerId) {
  const result = await callArkStructured({
    system: `Tu es ARK, expert en produits d'assurance.
Complète les données manquantes d'un devis assurance de manière réaliste et professionnelle.
Base-toi sur les standards du marché français.`,
    user: `Devis à compléter:
${JSON.stringify(quote, null, 2)}

Complète les champs manquants (garanties, exclusions, conditions) de manière réaliste.`,
    schema: {
      type: 'object',
      properties: {
        guarantees: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } } },
        exclusions: { type: 'array', items: { type: 'string' } },
        restrictions: { type: 'array', items: { type: 'string' } },
        obligations: { type: 'array', items: { type: 'string' } }
      }
    },
    userId: brokerId,
    route: 'compose:enrich-quote'
  })
  
  if (result.error) {
    return quote
  }
  
  return { ...quote, ...(result.structured || {}) }
}

module.exports = {
  extractNeedsFromClient,
  buildRecommendation,
  generateIpidContent,
  enrichQuoteData,
  SCHEMAS
}