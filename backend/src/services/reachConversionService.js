/**
 * COURTIA REACH — Conversion Service
 * Convertit un prospect REACH en client COURTIA.
 * Ne casse JAMAIS le schéma clients existant.
 */

/**
 * Convertir un prospect REACH en client COURTIA.
 * @param {Object} prospect - le prospect reach_prospects
 * @param {number} userId - l'ID du courtier connecté
 * @param {Object} pool - pg Pool
 */
async function convertToClient(prospect, userId, pool) {
  try {
    // Insérer dans la table clients existante (respect du schéma actuel)
    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, email, phone, company_name, type, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'prospect', NOW(), NOW())
       RETURNING id, first_name, last_name, email, phone, company_name`,
      [
        prospect.contact_first_name || prospect.company_name || '',
        prospect.contact_last_name || '',
        prospect.email || '',
        prospect.phone || '',
        prospect.company_name || '',
        'professionnel',
      ]
    );
    const client = result.rows[0];

    // Mettre à jour le prospect REACH avec la référence client
    try {
      await pool.query(
        `UPDATE reach_prospects SET converted_client_id = $1, converted_at = NOW(), status = 'signe', updated_at = NOW() WHERE id = $2`,
        [client.id, prospect.id]
      );
    } catch (e) {
      // Table REACH pas encore migrée — OK
    }

    // Ajouter une note si possible
    try {
      await pool.query(
        `INSERT INTO reach_notes (prospect_id, user_id, content) VALUES ($1, $2, $3)`,
        [prospect.id, userId, 'Prospect converti en client COURTIA. Source : COURTIA REACH.']
      );
    } catch (e) { /* table pas encore migrée */ }

    // Logger l'activité
    try {
      await pool.query(
        `INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, 'converted', $3)`,
        [prospect.id, userId, JSON.stringify({ client_id: client.id, source: 'reach' })]
      );
    } catch (e) { /* table pas encore migrée */ }

    return { success: true, client, prospect_id: prospect.id };
  } catch (err) {
    console.error('[reachConversion] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { convertToClient };
