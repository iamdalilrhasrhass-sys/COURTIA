/**
 * ARK Compose AI Service
 * Extraction besoins + génération recommandation via Claude
 * 
 * @module compose/composeAi
 */

const { callArkStructured } = require('../arkEngine')
const {
  MESSAGE_IA_INDISPONIBLE,
  MESSAGE_IA_NON_CONFIGUREE,
  journaliserErreurIa,
} = require('../iaErreurs')
const pool = require('../../db')

/**
 * FAIL-CLOSED — pourquoi cette fonction existe.
 *
 * Avant : quand l'appel IA échouait (moteur absent, erreur fournisseur, réponse
 * non-JSON), chaque fonction de ce module « utilisait un fallback » qui
 * INVENTAIT du contenu : besoins client « À définir avec le client »,
 * « Informations à compléter lors de l'entretien », « Protection adaptée au
 * profil », recommandation « confidence_score: 50 », IPID avec
 * `exclusions: []`. Ce repli partait ensuite dans un document de conformité
 * (devoir de conseil, DDA, IPID) : le cabinet croyait lire une analyse IA alors
 * qu'aucune analyse n'avait été produite — et un document réglementaire
 * factice est un risque, pas un dépannage.
 *
 * Désormais : une IA absente ou une réponse sans JSON exploitable LÈVE une
 * erreur typée. Aucune donnée inventée n'est renvoyée, aucun document n'est
 * écrit, et l'appelant peut répondre 503 `configuration_required` (moteur
 * absent) ou `ia_indisponible` (moteur KO / réponse inexploitable).
 *
 * @param {Object} result résultat de callArkStructured
 * @param {string} route libellé de la fonctionnalité (journalisation)
 * @param {string[]} champsRequis champs que le schéma déclare obligatoires
 */
function exigerContenuIa(result, route, champsRequis = []) {
  const refuser = (code, message, motif) => {
    journaliserErreurIa(new Error(motif), { route, motif, code_ia: result?.error || null })
    const erreur = new Error(message)
    erreur.code = code
    erreur.erreurIa = true
    erreur.route = route
    erreur.motif = motif
    throw erreur
  }

  if (!result) return refuser('ia_indisponible', MESSAGE_IA_INDISPONIBLE, 'aucune réponse du moteur IA')
  if (result.error === 'configuration_required') {
    return refuser('configuration_required', MESSAGE_IA_NON_CONFIGUREE, 'moteur IA non configuré')
  }
  if (result.error) {
    return refuser('ia_indisponible', MESSAGE_IA_INDISPONIBLE, `erreur du moteur IA : ${result.error}`)
  }

  const contenu = result.structured
  if (!contenu || typeof contenu !== 'object' || Array.isArray(contenu)) {
    return refuser('ia_indisponible', MESSAGE_IA_INDISPONIBLE, 'réponse IA sans JSON exploitable')
  }

  const manquants = champsRequis.filter((champ) => contenu[champ] === undefined || contenu[champ] === null)
  if (manquants.length > 0) {
    return refuser('ia_indisponible', MESSAGE_IA_INDISPONIBLE, `réponse IA incomplète : ${manquants.join(', ')}`)
  }

  return contenu
}

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
  
  // CORRECTION 20/09/2026 : plus AUCUN besoin de repli. Avant, une IA en échec
  // produisait {besoins:[{type:'Assurance',description:'À définir avec le
  // client'}], situation:'Informations à compléter lors de l'entretien',
  // objectifs:['Protection adaptée au profil']} — du texte inventé qui partait
  // ensuite dans le devoir de conseil / DDA / IPID. Un besoin fabriqué dans un
  // document réglementaire est un faux document : exigerContenuIa lève une
  // erreur typée (503 configuration_required / ia_indisponible côté route) et
  // rien n'est écrit.
  return exigerContenuIa(result, 'compose:extract-needs', ['besoins', 'situation', 'objectifs'])
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
  
  // CORRECTION 20/09/2026 : le repli « recommandation la moins chère » (avec
  // reasoning: ['Meilleur rapport qualité/prix…'], why_rejected: 'Tarif plus
  // élevé' et confidence_score: 50) était présenté comme l'analyse ARK du
  // cabinet dans le devoir de conseil. Une recommandation sans analyse est une
  // donnée fabriquée : refus explicite, aucune recommandation inventée.
  return exigerContenuIa(result, 'compose:build-recommendation', [
    'recommended_product',
    'reasoning',
    'alternatives_considered',
  ])
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
  
  // CORRECTION 20/09/2026 : l'IPID de repli `{product: productData, coverage:
  // coverageData, exclusions: [], premium: {}}` produisait un document IPID
  // INCOMPLET (aucune exclusion, aucune prime) marqué `ai_generated: true` et
  // présenté comme complet au client. Le règlement UE 2017/1469 impose les
  // exclusions : pas de contenu inventé, pas de document tronqué — refus.
  return exigerContenuIa(result, 'compose:generate-ipid', ['product', 'coverage', 'exclusions'])
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
  
  // CORRECTION 20/09/2026 : sur échec IA, cette fonction renvoyait le devis
  // INCHANGÉ sans le signaler — l'appelant (composeIpid) croyait le devis
  // enrichi et produisait un IPID « complet » sans garanties ni exclusions.
  // Un échec silencieux est un faux succès : on lève une erreur typée.
  const enrichissement = exigerContenuIa(result, 'compose:enrich-quote')

  const champsRenseignes = ['guarantees', 'exclusions', 'restrictions', 'obligations'].filter((champ) => {
    const valeur = enrichissement[champ]
    return Array.isArray(valeur) ? valeur.length > 0 : Boolean(valeur)
  })
  if (champsRenseignes.length === 0) {
    journaliserErreurIa(new Error('enrichissement vide'), {
      route: 'compose:enrich-quote',
      motif: 'aucun champ enrichi par l’IA',
    })
    const erreur = new Error(MESSAGE_IA_INDISPONIBLE)
    erreur.code = 'ia_indisponible'
    erreur.erreurIa = true
    erreur.route = 'compose:enrich-quote'
    throw erreur
  }

  return { ...quote, ...enrichissement }
}

module.exports = {
  extractNeedsFromClient,
  buildRecommendation,
  generateIpidContent,
  enrichQuoteData,
  SCHEMAS
}