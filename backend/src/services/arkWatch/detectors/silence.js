/**
 * Détecteur Silence Anormal — ARK Watch LOT 7
 * 
 * Clients sans contact depuis X jours selon leur profil :
 * - Client particulier : > 90 jours
 * - Client professionnel : > 60 jours
 * - Client VIP (lifetime_value > 5000) : > 45 jours
 * 
 * Risque de churn élevé.
 */

module.exports = {
  code: 'silence',
  name: 'Silence anormal - Risque churn',
  severity: 'medium',
  
  /**
   * Détecte les clients inactifs selon leur profil
   * @param {number} brokerId 
   * @param {Pool} pool 
   * @returns {Array} Signaux détectés
   */
  async run(brokerId, pool) {
    const signals = []
    
    const result = await pool.query(`
      SELECT 
        c.id AS client_id,
        c.first_name, c.last_name, c.company_name, c.email, c.phone,
        c.type, c.status, c.lifetime_value, c.risk_score, c.last_contact,
        EXTRACT(DAY FROM NOW() - COALESCE(c.last_contact, c.created_at)) AS days_silent,
        COUNT(q.id) AS quote_count,
        SUM(COALESCE((q.quote_data->>'prime_annuelle')::NUMERIC, 0)) AS total_premium
      FROM clients c
      LEFT JOIN quotes q ON q.client_id = c.id AND q.status = 'actif'
      WHERE c.courtier_id = $1
        AND c.status != 'inactif'
        AND c.status != 'perdu'
        AND (
          -- VIP (lifetime > 5000) : 45j
          (COALESCE(c.lifetime_value, 0) > 5000 AND (NOW() - COALESCE(c.last_contact, c.created_at)) > INTERVAL '45 days')
          OR
          -- Pro : 60j
          (c.type = 'professionnel' AND (NOW() - COALESCE(c.last_contact, c.created_at)) > INTERVAL '60 days')
          OR
          -- Particulier standard : 90j
          ((c.type IS NULL OR c.type = 'particulier') AND COALESCE(c.lifetime_value, 0) <= 5000 
           AND (NOW() - COALESCE(c.last_contact, c.created_at)) > INTERVAL '90 days')
        )
      GROUP BY c.id
    `, [brokerId])
    
    const currentWeek = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
    
    for (const row of result.rows) {
      const clientName = row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Client'
      const daysSilent = Math.floor(row.days_silent || 90)
      const isVip = parseFloat(row.lifetime_value || 0) > 5000
      const isPro = row.type === 'professionnel'
      
      // Calcul du score de risque
      let score = 60
      if (isVip) score += 20
      if (isPro) score += 10
      if (daysSilent > 120) score += 10
      if (parseFloat(row.total_premium || 0) > 2000) score += 5
      
      let urgency = 'standard'
      if (isVip && daysSilent > 60) urgency = 'élevée'
      else if (isPro && daysSilent > 90) urgency = 'élevée'
      else if (daysSilent > 150) urgency = 'critique'
      
      const profileLabel = isVip ? 'VIP' : (isPro ? 'Professionnel' : 'Particulier')
      
      signals.push({
        client_id: row.client_id,
        quote_id: null,
        title: `Silence anormal : ${clientName} (${daysSilent}j)`,
        description: `Client ${profileLabel} sans contact depuis ${daysSilent} jours.` +
          ` ${row.quote_count} contrat(s) actif(s). Prime totale : ${row.total_premium || 0}€/an.` +
          ` Urgence : ${urgency}.`,
        suggested_action: isPro
          ? `Appeler ${clientName} pour un point commercial. Vérifier satisfaction et besoins évolutifs.`
          : `Envoyer un email de prise de nouvelles ou appeler ${clientName}.`,
        estimated_value: parseFloat(row.total_premium || 0) * 0.3, // 30% risque de perte
        score: Math.min(score, 100),
        dedup_key: `silence:${row.client_id}:${currentWeek}`,
        metadata: {
          days_silent: daysSilent,
          client_type: row.type,
          is_vip: isVip,
          quote_count: parseInt(row.quote_count || 0),
          total_premium: parseFloat(row.total_premium || 0),
          risk_score: row.risk_score,
          urgency
        }
      })
    }
    
    return signals
  }
}
