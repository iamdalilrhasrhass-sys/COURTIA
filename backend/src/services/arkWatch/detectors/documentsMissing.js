/**
 * Détecteur Documents Manquants — ARK Watch LOT 7
 * 
 * Détecte les dossiers clients incomplets selon le type de contrat :
 * - Auto : permis, carte grise, RIB
 * - Habitation : justificatif domicile, RIB
 * - Santé/Prévoyance : carte identité, RIB
 * - Pro : Kbis, statuts, RIB
 */

const REQUIRED_DOCS = {
  auto: ['permis_conduire', 'carte_grise', 'rib'],
  habitation: ['justificatif_domicile', 'rib'],
  mrh: ['justificatif_domicile', 'rib'],
  sante: ['carte_identite', 'rib'],
  prevoyance: ['carte_identite', 'rib'],
  pro: ['kbis', 'rib'],
  rc_pro: ['kbis', 'rib'],
  multirisque_pro: ['kbis', 'rib']
}

module.exports = {
  code: 'documents_missing',
  name: 'Dossier incomplet - Documents manquants',
  severity: 'low',
  
  /**
   * Détecte les clients avec dossier incomplet
   * @param {number} brokerId 
   * @param {Pool} pool 
   * @returns {Array} Signaux détectés
   */
  async run(brokerId, pool) {
    const signals = []
    
    // Clients avec contrats actifs
    const clientsResult = await pool.query(`
      SELECT 
        c.id AS client_id,
        c.first_name, c.last_name, c.company_name, c.email, c.type,
        ARRAY_AGG(DISTINCT LOWER(COALESCE(q.quote_data->>'product_type', q.quote_data->>'type', ''))) AS product_types
      FROM clients c
      JOIN quotes q ON q.client_id = c.id
      WHERE c.courtier_id = $1
        AND q.status = 'actif'
        AND c.status != 'inactif'
      GROUP BY c.id
    `, [brokerId])
    
    // Documents par client
    const docsResult = await pool.query(`
      SELECT 
        client_id,
        ARRAY_AGG(DISTINCT document_type) AS doc_types
      FROM client_documents
      WHERE broker_id = $1
        AND deleted_at IS NULL
        AND status NOT IN ('rejected', 'expired')
      GROUP BY client_id
    `, [brokerId])
    
    const docsByClient = {}
    for (const row of docsResult.rows) {
      docsByClient[row.client_id] = row.doc_types || []
    }
    
    const currentWeek = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
    
    for (const client of clientsResult.rows) {
      const clientDocs = docsByClient[client.client_id] || []
      const clientName = client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client'
      
      // Déterminer les documents requis selon les produits
      const requiredDocs = new Set()
      for (const productType of client.product_types) {
        if (!productType) continue
        const normalizedType = normalizeProductType(productType)
        const required = REQUIRED_DOCS[normalizedType] || []
        required.forEach(doc => requiredDocs.add(doc))
      }
      
      if (requiredDocs.size === 0) continue
      
      // Trouver les documents manquants
      const missingDocs = []
      for (const required of requiredDocs) {
        const found = clientDocs.some(doc => 
          doc && (doc.toLowerCase().includes(required) || required.includes(doc.toLowerCase()))
        )
        if (!found) {
          missingDocs.push(formatDocType(required))
        }
      }
      
      if (missingDocs.length === 0) continue
      
      // Score basé sur nombre de docs manquants
      let score = 50
      if (missingDocs.length >= 3) score = 70
      else if (missingDocs.length >= 2) score = 60
      
      // Plus urgent si client pro
      if (client.type === 'professionnel') score += 10
      
      signals.push({
        client_id: client.client_id,
        quote_id: null,
        title: `Dossier incomplet : ${missingDocs.length} doc(s) manquant(s)`,
        description: `${clientName} — Documents manquants : ${missingDocs.join(', ')}.` +
          ` Produits détenus : ${client.product_types.filter(Boolean).join(', ') || 'non spécifié'}.`,
        suggested_action: `Envoyer une demande de documents à ${clientName} : ${missingDocs.join(', ')}.`,
        estimated_value: 0,
        score: Math.min(score, 100),
        dedup_key: `docs_missing:${client.client_id}:${currentWeek}`,
        metadata: {
          missing_docs: missingDocs,
          required_docs: Array.from(requiredDocs),
          existing_docs: clientDocs,
          product_types: client.product_types.filter(Boolean),
          client_type: client.type
        }
      })
    }
    
    return signals
  }
}

function normalizeProductType(type) {
  if (!type) return null
  const lower = type.toLowerCase()
  if (lower.includes('auto') || lower.includes('voiture') || lower.includes('vehicule')) return 'auto'
  if (lower.includes('habitation') || lower.includes('mrh')) return 'habitation'
  if (lower.includes('sante') || lower.includes('santé') || lower.includes('mutuelle')) return 'sante'
  if (lower.includes('prevoyance') || lower.includes('prévoyance')) return 'prevoyance'
  if (lower.includes('pro') || lower.includes('entreprise')) return 'pro'
  if (lower.includes('rc')) return 'rc_pro'
  return null
}

function formatDocType(type) {
  const mapping = {
    'permis_conduire': 'permis de conduire',
    'carte_identite': 'carte d\'identité',
    'carte_grise': 'carte grise',
    'rib': 'RIB',
    'kbis': 'extrait K-bis',
    'justificatif_domicile': 'justificatif de domicile'
  }
  return mapping[type] || type || 'document'
}
