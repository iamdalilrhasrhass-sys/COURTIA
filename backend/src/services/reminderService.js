/**
 * reminderService — rappel hebdomadaire des clients sans contact.
 *
 * DEUX DÉFAUTS CORRIGÉS LE 21/09/2026 (revue « reliquats » avant les pilotes) :
 *  1. La requête ne portait AUCUNE portée : elle lisait `clients` en entier, tous
 *     cabinets confondus. Un rappel qui cite le nom et l'e-mail de clients d'un
 *     AUTRE cabinet est une fuite inter-cabinets, même envoyée par Telegram.
 *     La portée est désormais un paramètre obligatoire (fragment de
 *     lib/porteeCabinet), exactement comme les routes.
 *  2. Elle filtrait `c.status = 'active'` alors que le produit ÉCRIT « actif » :
 *     la requête ne renvoyait donc jamais rien, sans lever d'erreur.
 * Le service n'était appelé par personne (`getInactiveClients` n'a aucun
 * appelant) : c'est justement pourquoi la correction est faite ici — du code
 * mort qui fuit redevient dangereux le jour où quelqu'un le rebranche.
 */
const telegramService = require('./telegramService');
const porteeCabinet = require('../lib/porteeCabinet');

/** Statuts d'un client ACTIF (le produit écrit « actif » ; « active » reste accepté). */
const STATUTS_CLIENT_ACTIF = "('actif', 'active')";

const reminderService = {
  // Get clients not contacted in >60 days
  async getInactiveClients(pool, portee) {
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
    });
    try {
      const result = await pool.query(`
        SELECT 
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.loyalty_score,
          c.risk_score,
          c.last_contact_date,
          c.created_at
        FROM clients c
        WHERE ${f.sql}
        AND c.status IN ${STATUTS_CLIENT_ACTIF}
        AND (c.last_contact_date IS NULL OR c.last_contact_date < NOW() - INTERVAL '60 days')
        ORDER BY c.last_contact_date ASC NULLS FIRST
        LIMIT 20
      `, [...f.params]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching inactive clients:', error);
      // Repli : mêmes colonnes de base, MÊME portée — une panne ne doit pas
      // élargir le périmètre (c'est le sens du repli, pas l'inverse).
      const fallback = await pool.query(`
        SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.loyalty_score, c.risk_score, c.created_at
        FROM clients c
        WHERE ${f.sql} AND c.status IN ${STATUTS_CLIENT_ACTIF}
        LIMIT 10
      `, [...f.params]);
      return fallback.rows;
    }
  },

  // Send weekly reminder to courtier
  async sendWeeklyReminder(pool, telegramChatId, portee) {
    try {
      const inactiveClients = await this.getInactiveClients(pool, portee);
      
      if (inactiveClients.length === 0) {
        console.log('No inactive clients to remind');
        return { success: true, clients_reminded: 0 };
      }

      // Sort by risk (highest priority)
      const sorted = inactiveClients.sort((a, b) => {
        const aExpiring = a.contracts?.some(c => c.daysUntilExpiry < 90) ? 0 : 1;
        const bExpiring = b.contracts?.some(c => c.daysUntilExpiry < 90) ? 0 : 1;
        return aExpiring - bExpiring || (b.loyalty_score - a.loyalty_score);
      });

      // Send via Telegram
      await telegramService.sendWeeklyReminder(telegramChatId, sorted);

      return {
        success: true,
        clients_reminded: inactiveClients.length,
        message: 'Weekly reminder sent'
      };
    } catch (error) {
      console.error('Error sending weekly reminder:', error);
      throw error;
    }
  }
};

module.exports = reminderService;
