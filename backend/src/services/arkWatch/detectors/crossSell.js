/**
 * Détecteur Cross-Sell — ARK Watch LOT 7
 * 
 * Détecte les opportunités de vente croisée :
 * - Client auto seul → habitation manquante
 * - Client habitation seul → auto potentiel
 * - Particulier → santé/prévoyance
 * - Pro mono-produit → multi-produits
 * 
 * Utilise ARK IA pour scoring et reasoning avancé.
 */

const { callArkStructured } = require('../../arkEngine')

const CROSS_SELL_MATRIX = {
  auto: ['habitation', 'mrh', 'moto', '2_roues'],
  habitation: ['auto', 'pno', 'garantie_accidents_vie'],
  mrh: ['auto', 'pno', 'garantie_accidents_vie'],
  sante: ['prevoyance', 'deces', 'dependance'],
  prevoyance: ['sante', 'epargne', 'retraite'],
  pro: ['rc_pro', 'multirisque_pro', 'protection_juridique', 'cyber'],
  rc_pro: ['multirisque_pro', 'flotte_auto', 'homme_cle']
}

const SCHEMA_CROSSSELL = {
  type: 'object',
  properties: {
    opportunites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          client_id: { type: 'number' },
          product_target: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          reasoning: { type: 'string' },
          estimated_premium: { type: 'number' }
        },
        required: ['client_id', 'product_target', 'score', 'reasoning']
      }
    }
  },
  required: ['opportunites']
}

module.exports = {
  code: 'cross_sell',
  name: 'Opportunité cross-sell détectée',
  severity: 'medium',
  
  /**
   * Détecte les opportunités cross-sell (SQL pré-filtre + ARK scoring)
   * @param {number} brokerId 
   * @param {Pool} pool 
   * @returns {Array} Signaux détectés
   */
  async run(brokerId, pool) {
    const signals = []
    
    // Pré-filtre SQL : clients avec 1-2 produits actifs
    const clientsResult = await pool.query(`
      SELECT 
        c.id AS client_id,
        c.first_name, c.last_name, c.company_name, c.email, c.type,
        c.profession, c.situation_familiale, c.lifetime_value,
        c.city, c.postal_code,
        ARRAY_AGG(DISTINCT LOWER(COALESCE(q.quote_data->>'product_type', q.quote_data->>'type', ''))) 
          FILTER (WHERE q.status = 'actif') AS product_types,
        COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'actif') AS active_quotes,
        SUM(COALESCE((q.quote_data->>'prime_annuelle')::NUMERIC, 0)) 
          FILTER (WHERE q.status = 'actif') AS total_premium
      FROM clients c
      LEFT JOIN quotes q ON q.client_id = c.id
      WHERE c.courtier_id = $1
        AND c.status NOT IN ('inactif', 'perdu')
      GROUP BY c.id
      HAVING COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'actif') BETWEEN 1 AND 3
      LIMIT 100
    `, [brokerId])
    
    const currentMonth = new Date().getMonth() + 1
    const candidates = []
    
    for (const client of clientsResult.rows) {
      const existingProducts = (client.product_types || []).map(normalizeProductType).filter(Boolean)
      if (existingProducts.length === 0) continue
      
      // Trouver les produits manquants via matrice
      const potentialProducts = new Set()
      for (const existing of existingProducts) {
        const suggestions = CROSS_SELL_MATRIX[existing] || []
        for (const suggestion of suggestions) {
          if (!existingProducts.includes(suggestion)) {
            potentialProducts.add(suggestion)
          }
        }
      }
      
      if (potentialProducts.size === 0) continue
      
      candidates.push({
        client_id: client.client_id,
        name: client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        type: client.type,
        profession: client.profession,
        situation: client.situation_familiale,
        city: client.city,
        existing_products: existingProducts,
        potential_products: Array.from(potentialProducts),
        current_premium: parseFloat(client.total_premium || 0),
        lifetime_value: parseFloat(client.lifetime_value || 0)
      })
    }
    
    if (candidates.length === 0) return signals
    
    // Limiter à 30 candidats pour éviter timeout
    const limitedCandidates = candidates.slice(0, 30)
    
    // Appel ARK pour scoring intelligent (avec fallback SQL)
    let arkResults = null
    try {
      const arkResponse = await callArkStructured({
        system: `Tu es un expert en assurance française. Analyse ces clients et identifie les meilleures opportunités de cross-sell.
        
Pour chaque opportunité viable (score > 60), fournis:
- client_id
- product_target (le produit à proposer)
- score (0-100 basé sur probabilité de conversion)
- reasoning (en français, 1-2 phrases max)
- estimated_premium (prime annuelle estimée en €)

Critères de scoring:
- Cohérence profil/produit (+20 si match profession ou situation)
- Valeur client (+15 si lifetime_value > 2000€)
- Complément logique (+25 si auto+habitation ou santé+prévoyance)
- Zone géographique (+10 si zone urbaine pour auto)

Retourne uniquement les opportunités avec score > 60.`,
        user: `Candidats cross-sell:\n${JSON.stringify(limitedCandidates, null, 2)}`,
        schema: SCHEMA_CROSSSELL,
        userId: brokerId,
        route: 'ark-watch/cross-sell'
      })
      
      if (arkResponse.structured?.opportunites) {
        arkResults = arkResponse.structured.opportunites
      }
    } catch (err) {
      // Fallback : scoring SQL simple sans ARK
      console.warn('[ARK Watch] Cross-sell fallback SQL:', err.message)
    }
    
    // Générer les signaux
    if (arkResults && arkResults.length > 0) {
      // Résultats ARK
      for (const opp of arkResults) {
        const client = candidates.find(c => c.client_id === opp.client_id)
        if (!client) continue
        
        signals.push({
          client_id: opp.client_id,
          quote_id: null,
          title: `Cross-sell : ${formatProductType(opp.product_target)} pour ${client.name}`,
          description: opp.reasoning || `Opportunité de vendre ${formatProductType(opp.product_target)} à ${client.name}.` +
            ` Produits actuels : ${client.existing_products.map(formatProductType).join(', ')}.`,
          suggested_action: `Proposer une offre ${formatProductType(opp.product_target)}. Prime estimée : ${opp.estimated_premium || 500}€/an.`,
          estimated_value: (opp.estimated_premium || 500) * 0.08, // 8% commission estimée
          score: opp.score,
          dedup_key: `crosssell:${opp.client_id}:${opp.product_target}:${currentMonth}`,
          metadata: {
            product_target: opp.product_target,
            existing_products: client.existing_products,
            ai_reasoning: opp.reasoning,
            estimated_premium: opp.estimated_premium,
            source: 'ark'
          }
        })
      }
    } else {
      // Fallback SQL : scoring basique
      for (const client of limitedCandidates.slice(0, 15)) {
        const bestProduct = client.potential_products[0]
        if (!bestProduct) continue
        
        let score = 55
        if (client.lifetime_value > 2000) score += 10
        if (client.existing_products.includes('auto') && bestProduct === 'habitation') score += 15
        if (client.existing_products.includes('habitation') && bestProduct === 'auto') score += 10
        
        if (score < 60) continue
        
        signals.push({
          client_id: client.client_id,
          quote_id: null,
          title: `Cross-sell : ${formatProductType(bestProduct)} potentiel`,
          description: `${client.name} possède ${client.existing_products.map(formatProductType).join(', ')} mais pas de ${formatProductType(bestProduct)}.`,
          suggested_action: `Proposer ${formatProductType(bestProduct)} à ${client.name}.`,
          estimated_value: 400 * 0.08,
          score,
          dedup_key: `crosssell:${client.client_id}:${bestProduct}:${currentMonth}`,
          metadata: {
            product_target: bestProduct,
            existing_products: client.existing_products,
            source: 'sql_fallback'
          }
        })
      }
    }
    
    return signals
  }
}

function normalizeProductType(type) {
  if (!type) return null
  const lower = type.toLowerCase()
  if (lower.includes('auto') || lower.includes('voiture')) return 'auto'
  if (lower.includes('habitation') || lower.includes('mrh')) return 'habitation'
  if (lower.includes('sante') || lower.includes('santé') || lower.includes('mutuelle')) return 'sante'
  if (lower.includes('prevoyance') || lower.includes('prévoyance')) return 'prevoyance'
  if (lower.includes('moto') || lower.includes('2_roue') || lower.includes('deux_roue')) return 'moto'
  if (lower.includes('pno')) return 'pno'
  if (lower.includes('rc') && lower.includes('pro')) return 'rc_pro'
  if (lower.includes('pro') || lower.includes('entreprise') || lower.includes('multirisque')) return 'pro'
  return lower
}

function formatProductType(type) {
  const mapping = {
    auto: 'Auto',
    habitation: 'Habitation',
    mrh: 'MRH',
    sante: 'Santé',
    prevoyance: 'Prévoyance',
    moto: 'Moto/2 roues',
    pno: 'PNO',
    rc_pro: 'RC Pro',
    pro: 'Multirisque Pro',
    garantie_accidents_vie: 'GAV',
    protection_juridique: 'Protection Juridique',
    cyber: 'Cyber',
    flotte_auto: 'Flotte Auto'
  }
  return mapping[type] || type || 'Assurance'
}
