/**
 * Détecteur Loi Hamon — ARK Watch LOT 7
 * 
 * Loi Hamon (2015) : Les contrats auto, habitation et santé sont résiliables
 * à tout moment après 1 an sans frais ni pénalités.
 * 
 * Opportunité : renégociation ou changement compagnie.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * MARCHÉS OÙ CE DÉTECTEUR S'APPLIQUE : LA FRANCE UNIQUEMENT (défaut P1 CH-016)
 * ────────────────────────────────────────────────────────────────────────────
 * La loi Hamon est une loi FRANÇAISE. Elle n'a aucune existence en Suisse :
 * elle y était pourtant exécutée pour tous les cabinets, et un cabinet suisse
 * recevait donc des signaux « Loi Hamon : Auto résiliable (3 ans) » qui
 * affirment un droit de résiliation qu'il ne peut pas invoquer. Un signal faux
 * coûte plus cher qu'un signal absent : le courtier appelle un client sur un
 * fondement inexistant.
 *
 * Nous DÉSACTIVONS la règle hors de France et NOUS LE DISONS (voir
 * `detectors/index.js` : le détecteur apparaît « désactivé hors marché » dans
 * le compte rendu du run — il n'est jamais retiré en silence).
 * AUCUNE règle suisse de remplacement n'est inventée ici : la résiliation en
 * droit suisse ne se résume pas à un seuil d'ancienneté, et un équivalent non
 * validé serait exactement le défaut qu'on corrige.
 *
 * PORTÉE (correction du 21/09/2026, défaut P1) : la surveillance porte sur le
 * CABINET (`lib/porteeCabinet`, seule autorité), pas sur la seule personne qui la
 * déclenche. Sans cabinet, la clause reste exactement `c.courtier_id = $1`.
 */

const porteeCabinet = require('../../../lib/porteeCabinet')

module.exports = {
  code: 'hamon',
  name: 'Loi Hamon - Résiliation possible',
  severity: 'high',
  // Marchés où la règle a un sens juridique. Liste ABSENTE = tous les marchés.
  marches: ['FR'],
  motifHorsMarche:
    "La loi Hamon est une loi française : elle n'est pas appliquée hors du marché français.",
  
  /**
   * Détecte les contrats éligibles à la Loi Hamon
   * @param {number} brokerId 
   * @param {Pool} pool 
   * @param {Object} [options] `{ portee }` déjà résolue (aucune requête en plus)
   * @returns {Array} Signaux détectés
   */
  async run(brokerId, pool, options = {}) {
    const signals = []
    const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, brokerId, options)
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
    })
    
    // Récupère les quotes actives > 1 an avec type éligible Hamon
    const result = await pool.query(`
      SELECT 
        q.id AS quote_id,
        q.client_id,
        q.quote_data,
        q.created_at AS quote_date,
        c.first_name, c.last_name, c.company_name, c.email,
        EXTRACT(MONTH FROM q.created_at) AS anniversary_month,
        DATE_PART('year', AGE(NOW(), q.created_at)) AS years_active
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE ${f.sql}
        AND q.status = 'actif'
        AND q.created_at < NOW() - INTERVAL '1 year'
        AND (
          q.quote_data->>'product_type' ILIKE '%auto%' OR
          q.quote_data->>'product_type' ILIKE '%habitation%' OR
          q.quote_data->>'product_type' ILIKE '%santé%' OR
          q.quote_data->>'product_type' ILIKE '%mrh%' OR
          q.quote_data->>'product_type' ILIKE '%sante%' OR
          q.quote_data->>'type' ILIKE '%auto%' OR
          q.quote_data->>'type' ILIKE '%habitation%' OR
          q.quote_data->>'type' ILIKE '%mrh%'
        )
    `, f.params)
    
    const currentMonth = new Date().getMonth() + 1
    
    for (const row of result.rows) {
      const productType = row.quote_data?.product_type || row.quote_data?.type || 'Assurance'
      const clientName = row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Client'
      const yearsActive = Math.floor(row.years_active || 1)
      const prime = row.quote_data?.prime_annuelle || row.quote_data?.prix || 0
      
      // Estimer économie potentielle (10-15% du marché)
      const estimatedSaving = parseFloat(prime) * 0.12
      
      // Score basé sur ancienneté et prime
      let score = 70
      if (yearsActive > 2) score += 10
      if (yearsActive > 3) score += 5
      if (parseFloat(prime) > 1000) score += 5
      
      signals.push({
        client_id: row.client_id,
        quote_id: row.quote_id,
        title: `Loi Hamon : ${productType} résiliable (${yearsActive} an${yearsActive > 1 ? 's' : ''})`,
        description: `${clientName} — Contrat ${productType.toLowerCase()} de ${yearsActive} an(s) résiliable sans frais.` +
          ` Prime actuelle : ${prime}€/an. Opportunité de renégociation ou changement compagnie.`,
        suggested_action: `Proposer une comparaison tarifaire. Économie potentielle estimée : ${estimatedSaving.toFixed(0)}€/an.`,
        estimated_value: estimatedSaving,
        score: Math.min(score, 100),
        dedup_key: `hamon:${row.quote_id}:${currentMonth}`,
        metadata: {
          product_type: productType,
          years_active: yearsActive,
          current_premium: prime,
          anniversary_month: row.anniversary_month
        }
      })
    }
    
    return signals
  }
}
