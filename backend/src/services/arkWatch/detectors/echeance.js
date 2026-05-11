/**
 * Détecteur Échéances Contractuelles — ARK Watch LOT 7
 * 
 * Alerte 30/60/90 jours avant échéance des contrats.
 * Permet d'anticiper les renouvellements et renégociations.
 */

module.exports = {
  code: 'echeance',
  name: 'Échéance contractuelle proche',
  severity: 'medium',
  
  /**
   * Détecte les contrats avec échéance dans 30/60/90 jours
   * @param {number} brokerId 
   * @param {Pool} pool 
   * @returns {Array} Signaux détectés
   */
  async run(brokerId, pool) {
    const signals = []
    
    // Définir les fenêtres d'alerte
    const windows = [
      { days: 30, severity: 'high', label: '30 jours' },
      { days: 60, severity: 'medium', label: '60 jours' },
      { days: 90, severity: 'low', label: '90 jours' }
    ]
    
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
        ) AS echeance_date,
        EXTRACT(DAY FROM (
          COALESCE(
            (q.quote_data->>'date_echeance')::DATE,
            (q.created_at + INTERVAL '1 year')::DATE
          ) - NOW()
        )) AS days_until
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE c.courtier_id = $1
        AND q.status = 'actif'
        AND COALESCE(
          (q.quote_data->>'date_echeance')::DATE,
          (q.created_at + INTERVAL '1 year')::DATE
        ) > NOW()
        AND COALESCE(
          (q.quote_data->>'date_echeance')::DATE,
          (q.created_at + INTERVAL '1 year')::DATE
        ) <= NOW() + INTERVAL '90 days'
    `, [brokerId])
    
    const currentMonth = new Date().getMonth() + 1
    
    for (const row of result.rows) {
      const daysUntil = Math.floor(row.days_until || 90)
      
      // Trouver la fenêtre appropriée
      let window = windows.find(w => daysUntil <= w.days)
      if (!window) continue
      
      // Éviter les doublons avec Chatel (60-75j)
      if (daysUntil >= 60 && daysUntil <= 75) continue
      
      const productType = row.quote_data?.product_type || row.quote_data?.type || 'Assurance'
      const clientName = row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Client'
      const echeanceDate = new Date(row.echeance_date)
      const prime = row.quote_data?.prime_annuelle || row.quote_data?.prix || 0
      const compagnie = row.quote_data?.compagnie || row.quote_data?.insurer || 'Compagnie'
      
      // Score basé sur proximité et prime
      let score = 50
      if (daysUntil <= 30) score = 85
      else if (daysUntil <= 60) score = 70
      if (parseFloat(prime) > 1500) score += 10
      
      signals.push({
        client_id: row.client_id,
        quote_id: row.quote_id,
        title: `Échéance ${productType} dans ${daysUntil}j`,
        description: `${clientName} — Contrat ${productType.toLowerCase()} (${compagnie}) expire le ${echeanceDate.toLocaleDateString('fr-FR')}.` +
          ` Prime actuelle : ${prime}€/an.`,
        suggested_action: daysUntil <= 30
          ? `URGENT : Contacter ${clientName} immédiatement pour renouvellement.`
          : `Planifier un appel avec ${clientName} pour anticiper le renouvellement.`,
        estimated_value: parseFloat(prime) * 0.05,
        score: Math.min(score, 100),
        dedup_key: `echeance:${row.quote_id}:${window.days}:${currentMonth}`,
        metadata: {
          product_type: productType,
          echeance_date: echeanceDate.toISOString().split('T')[0],
          days_until: daysUntil,
          window: window.label,
          current_premium: prime,
          insurer: compagnie
        }
      })
    }
    
    return signals
  }
}
