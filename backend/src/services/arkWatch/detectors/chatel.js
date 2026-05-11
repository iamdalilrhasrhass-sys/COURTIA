/**
 * Détecteur Chatel — ARK Watch LOT 7
 * 
 * Loi Chatel : L'assureur doit informer l'assuré au moins 2 mois avant
 * l'échéance de son droit de ne pas reconduire. Si l'info arrive < 15j
 * avant la date limite ou après, résiliation possible 20j après réception.
 * 
 * Action courtier : relance obligatoire 60-75 jours avant échéance.
 */

module.exports = {
  code: 'chatel',
  name: 'Préavis Chatel - Relance obligatoire',
  severity: 'high',
  
  /**
   * Détecte les contrats avec échéance dans 60-75 jours
   * @param {number} brokerId 
   * @param {Pool} pool 
   * @returns {Array} Signaux détectés
   */
  async run(brokerId, pool) {
    const signals = []
    
    // Quotes avec échéance (date_echeance dans quote_data ou basée sur created_at + 1 an)
    const result = await pool.query(`
      SELECT 
        q.id AS quote_id,
        q.client_id,
        q.quote_data,
        q.created_at,
        c.first_name, c.last_name, c.company_name, c.email,
        COALESCE(
          (q.quote_data->>'date_echeance')::DATE,
          (q.created_at + INTERVAL '1 year')::DATE
        ) AS echeance_date
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE c.courtier_id = $1
        AND q.status = 'actif'
        AND COALESCE(
          (q.quote_data->>'date_echeance')::DATE,
          (q.created_at + INTERVAL '1 year')::DATE
        ) BETWEEN NOW() + INTERVAL '60 days' AND NOW() + INTERVAL '75 days'
    `, [brokerId])
    
    const currentMonth = new Date().getMonth() + 1
    
    for (const row of result.rows) {
      const productType = row.quote_data?.product_type || row.quote_data?.type || 'Assurance'
      const clientName = row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Client'
      const echeanceDate = new Date(row.echeance_date)
      const daysRemaining = Math.ceil((echeanceDate - new Date()) / (1000 * 60 * 60 * 24))
      const prime = row.quote_data?.prime_annuelle || row.quote_data?.prix || 0
      
      signals.push({
        client_id: row.client_id,
        quote_id: row.quote_id,
        title: `Chatel : échéance ${productType} dans ${daysRemaining}j`,
        description: `${clientName} — Échéance du contrat ${productType.toLowerCase()} le ${echeanceDate.toLocaleDateString('fr-FR')}.` +
          ` Préavis Chatel : relance à envoyer avant le ${new Date(echeanceDate - 60*24*60*60*1000).toLocaleDateString('fr-FR')}.`,
        suggested_action: `Contacter ${clientName} pour renouvellement ou renégociation. Prime actuelle : ${prime}€/an.`,
        estimated_value: parseFloat(prime) * 0.05, // 5% commission potentielle
        score: 85 + Math.max(0, (75 - daysRemaining)), // Plus urgent = plus haut score
        dedup_key: `chatel:${row.quote_id}:${currentMonth}`,
        metadata: {
          product_type: productType,
          echeance_date: echeanceDate.toISOString().split('T')[0],
          days_remaining: daysRemaining,
          current_premium: prime
        }
      })
    }
    
    return signals
  }
}
