/**
 * Détecteur Reconquête — ARK Watch LOT 7
 * 
 * Détecte les anciens clients résiliés depuis 6+ mois
 * pour une campagne de reconquête.
 * 
 * Critères :
 * - Status = 'perdu' ou 'résilie' ou resigned_at > 6 mois
 * - Pas de contact récent (< 30 jours)
 * - Historique de valeur significative
 * 
 * Utilise ARK IA pour scoring et approche personnalisée.
 */

const { callArkStructured } = require('../../arkEngine')

const SCHEMA_RECONQUETE = {
  type: 'object',
  properties: {
    candidats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          client_id: { type: 'number' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          approach: { type: 'string' },
          timing: { type: 'string' },
          offer_suggestion: { type: 'string' }
        },
        required: ['client_id', 'score', 'approach']
      }
    }
  },
  required: ['candidats']
}

module.exports = {
  code: 'reconquete',
  name: 'Reconquête ex-client',
  severity: 'low',
  
  /**
   * Détecte les ex-clients à reconquérir
   * @param {number} brokerId 
   * @param {Pool} pool 
   * @returns {Array} Signaux détectés
   */
  async run(brokerId, pool) {
    const signals = []
    
    // Ex-clients résiliés depuis 6-24 mois avec historique
    const result = await pool.query(`
      SELECT 
        c.id AS client_id,
        c.first_name, c.last_name, c.company_name, c.email, c.phone,
        c.type, c.profession, c.status,
        c.lifetime_value, c.last_contact, c.resigned_at,
        c.created_at, c.notes,
        COALESCE(c.resigned_at, c.updated_at) AS exit_date,
        EXTRACT(MONTH FROM AGE(NOW(), COALESCE(c.resigned_at, c.updated_at))) AS months_since_exit,
        COUNT(q.id) AS historical_quotes,
        ARRAY_AGG(DISTINCT COALESCE(q.quote_data->>'product_type', q.quote_data->>'type', '')) 
          FILTER (WHERE q.quote_data IS NOT NULL) AS past_products
      FROM clients c
      LEFT JOIN quotes q ON q.client_id = c.id
      WHERE c.courtier_id = $1
        AND (
          c.status IN ('perdu', 'résilie', 'resilie', 'churned', 'inactif')
          OR c.resigned_at IS NOT NULL
        )
        AND COALESCE(c.resigned_at, c.updated_at) < NOW() - INTERVAL '6 months'
        AND COALESCE(c.resigned_at, c.updated_at) > NOW() - INTERVAL '24 months'
        AND (c.last_contact IS NULL OR c.last_contact < NOW() - INTERVAL '30 days')
        AND COALESCE(c.lifetime_value, 0) > 0
      GROUP BY c.id
      ORDER BY c.lifetime_value DESC NULLS LAST
      LIMIT 50
    `, [brokerId])
    
    if (result.rows.length === 0) return signals
    
    const currentMonth = new Date().getMonth() + 1
    const candidates = result.rows.map(row => ({
      client_id: row.client_id,
      name: row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      type: row.type,
      profession: row.profession,
      email: row.email,
      phone: row.phone,
      lifetime_value: parseFloat(row.lifetime_value || 0),
      months_since_exit: parseInt(row.months_since_exit || 6),
      past_products: (row.past_products || []).filter(Boolean),
      historical_quotes: parseInt(row.historical_quotes || 0),
      notes: row.notes ? row.notes.substring(0, 200) : null
    }))
    
    // ARK scoring pour approche personnalisée
    let arkResults = null
    const limitedCandidates = candidates.slice(0, 20)
    
    try {
      const arkResponse = await callArkStructured({
        system: `Tu es un expert en reconquête client assurance. Analyse ces ex-clients et évalue leur potentiel de reconquête.

Pour chaque client viable (score > 50), fournis:
- client_id
- score (0-100, probabilité de reconquête)
- approach (stratégie d'approche en 1-2 phrases)
- timing (meilleur moment pour contacter)
- offer_suggestion (offre recommandée)

Critères de scoring:
- Lifetime value élevée (+25)
- Départ récent 6-12 mois (+15, mémoire fraîche)
- Départ 12-18 mois (+5, opportunité renouvellement)
- Plusieurs produits passés (+10, potentiel multi-équipement)
- Client pro (+15, valeur récurrente)

Évite les clients probablement insatisfaits (notes négatives).`,
        user: `Ex-clients à évaluer:\n${JSON.stringify(limitedCandidates, null, 2)}`,
        schema: SCHEMA_RECONQUETE,
        userId: brokerId,
        route: 'ark-watch/reconquete'
      })
      
      if (arkResponse.structured?.candidats) {
        arkResults = arkResponse.structured.candidats
      }
    } catch (err) {
      console.warn('[ARK Watch] Reconquête fallback SQL:', err.message)
    }
    
    // Générer les signaux
    if (arkResults && arkResults.length > 0) {
      for (const opp of arkResults) {
        const client = candidates.find(c => c.client_id === opp.client_id)
        if (!client || opp.score < 50) continue
        
        signals.push({
          client_id: opp.client_id,
          quote_id: null,
          title: `Reconquête : ${client.name} (parti il y a ${client.months_since_exit} mois)`,
          description: `Ex-client ${client.type || 'particulier'} avec ${client.lifetime_value}€ de valeur historique.` +
            ` Anciens produits : ${client.past_products.join(', ') || 'non spécifié'}.`,
          suggested_action: opp.approach || `Contacter ${client.name} avec une offre personnalisée.`,
          estimated_value: client.lifetime_value * 0.15, // 15% de récupération estimée
          score: opp.score,
          dedup_key: `reconquete:${opp.client_id}:${currentMonth}`,
          metadata: {
            months_since_exit: client.months_since_exit,
            lifetime_value: client.lifetime_value,
            past_products: client.past_products,
            ai_approach: opp.approach,
            ai_timing: opp.timing,
            ai_offer: opp.offer_suggestion,
            source: 'ark'
          }
        })
      }
    } else {
      // Fallback SQL simple
      for (const client of limitedCandidates.slice(0, 10)) {
        let score = 50
        if (client.lifetime_value > 1000) score += 15
        if (client.lifetime_value > 3000) score += 10
        if (client.months_since_exit <= 12) score += 10
        if (client.type === 'professionnel') score += 10
        if (client.historical_quotes >= 2) score += 5
        
        if (score < 55) continue
        
        signals.push({
          client_id: client.client_id,
          quote_id: null,
          title: `Reconquête : ${client.name}`,
          description: `Ex-client parti il y a ${client.months_since_exit} mois. Valeur historique : ${client.lifetime_value}€.`,
          suggested_action: `Envoyer un email de prise de contact avec offre promotionnelle.`,
          estimated_value: client.lifetime_value * 0.1,
          score,
          dedup_key: `reconquete:${client.client_id}:${currentMonth}`,
          metadata: {
            months_since_exit: client.months_since_exit,
            lifetime_value: client.lifetime_value,
            source: 'sql_fallback'
          }
        })
      }
    }
    
    return signals
  }
}
