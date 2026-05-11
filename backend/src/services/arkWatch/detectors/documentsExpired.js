/**
 * Détecteur Documents Expirés — ARK Watch LOT 7
 * 
 * Détecte les documents avec date d'expiration dépassée ou proche :
 * - Permis de conduire
 * - Carte grise
 * - RIB (validité bancaire)
 * - Carte d'identité
 * - Attestations diverses
 */

module.exports = {
  code: 'documents_expired',
  name: 'Document expiré ou proche expiration',
  severity: 'medium',
  
  /**
   * Détecte les documents expirés ou expirant bientôt
   * @param {number} brokerId 
   * @param {Pool} pool 
   * @returns {Array} Signaux détectés
   */
  async run(brokerId, pool) {
    const signals = []
    
    // Documents avec date d'expiration dans metadata ou analysis_result
    const result = await pool.query(`
      SELECT 
        d.id AS document_id,
        d.client_id,
        d.document_type,
        d.original_filename,
        d.analysis_result,
        d.metadata,
        d.uploaded_at,
        c.first_name, c.last_name, c.company_name, c.email
      FROM client_documents d
      JOIN clients c ON d.client_id = c.id
      WHERE d.broker_id = $1
        AND d.deleted_at IS NULL
        AND d.status != 'rejected'
        AND (
          -- Expiration dans metadata
          (d.metadata->>'expiration_date' IS NOT NULL 
           AND (d.metadata->>'expiration_date')::DATE <= NOW() + INTERVAL '30 days')
          OR
          -- Expiration dans analysis_result (OCR)
          (d.analysis_result->>'expiration_date' IS NOT NULL 
           AND (d.analysis_result->>'expiration_date')::DATE <= NOW() + INTERVAL '30 days')
          OR
          -- Documents > 2 ans sans expiration explicite (CI, permis)
          (d.document_type IN ('permis_conduire', 'carte_identite', 'passeport')
           AND d.uploaded_at < NOW() - INTERVAL '2 years')
        )
    `, [brokerId])
    
    const currentMonth = new Date().getMonth() + 1
    
    for (const row of result.rows) {
      const clientName = row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Client'
      const docType = formatDocType(row.document_type)
      
      // Récupérer date d'expiration
      let expirationDate = null
      let expirationSource = 'estimation'
      
      if (row.metadata?.expiration_date) {
        expirationDate = new Date(row.metadata.expiration_date)
        expirationSource = 'metadata'
      } else if (row.analysis_result?.expiration_date) {
        expirationDate = new Date(row.analysis_result.expiration_date)
        expirationSource = 'ocr'
      } else {
        // Estimation basée sur upload + durée standard
        expirationDate = new Date(row.uploaded_at)
        expirationDate.setFullYear(expirationDate.getFullYear() + 2)
      }
      
      const now = new Date()
      const daysUntil = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24))
      const isExpired = daysUntil < 0
      
      // Score basé sur urgence
      let score = 60
      if (isExpired) score = 90
      else if (daysUntil <= 7) score = 85
      else if (daysUntil <= 15) score = 75
      
      const severity = isExpired ? 'high' : (daysUntil <= 15 ? 'high' : 'medium')
      
      signals.push({
        client_id: row.client_id,
        quote_id: null,
        title: isExpired 
          ? `Document expiré : ${docType}`
          : `Document expire dans ${daysUntil}j : ${docType}`,
        description: `${clientName} — ${docType} ${isExpired ? 'expiré depuis' : 'expire le'} ` +
          `${expirationDate.toLocaleDateString('fr-FR')}.` +
          ` Fichier : ${row.original_filename || 'non spécifié'}.`,
        suggested_action: isExpired
          ? `URGENT : Demander immédiatement un nouveau ${docType} à ${clientName}.`
          : `Rappeler à ${clientName} de renouveler son ${docType} avant expiration.`,
        estimated_value: 0, // Pas de valeur directe mais compliance
        score: Math.min(score, 100),
        dedup_key: `doc_expired:${row.document_id}:${currentMonth}`,
        metadata: {
          document_id: row.document_id,
          document_type: row.document_type,
          expiration_date: expirationDate.toISOString().split('T')[0],
          days_until: daysUntil,
          is_expired: isExpired,
          expiration_source: expirationSource,
          severity
        }
      })
    }
    
    return signals
  }
}

function formatDocType(type) {
  const mapping = {
    'permis_conduire': 'Permis de conduire',
    'carte_identite': 'Carte d\'identité',
    'passeport': 'Passeport',
    'carte_grise': 'Carte grise',
    'rib': 'RIB',
    'attestation_assurance': 'Attestation assurance',
    'kbis': 'Extrait K-bis',
    'justificatif_domicile': 'Justificatif de domicile'
  }
  return mapping[type] || type || 'Document'
}
