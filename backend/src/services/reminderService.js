const telegramService = require('./telegramService');

const reminderService = {
  // Get clients not contacted in >60 days
  async getInactiveClients(pool) {
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
        WHERE c.status = 'active'
        AND (c.last_contact_date IS NULL OR c.last_contact_date < NOW() - INTERVAL '60 days')
        ORDER BY c.last_contact_date ASC NULLS FIRST
        LIMIT 20
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching inactive clients:', error);
      // If last_contact_date doesn't exist, return all clients
      const fallback = await pool.query(`
        SELECT id, first_name, last_name, email, phone, loyalty_score, risk_score, created_at
        FROM clients
        WHERE status = 'active'
        LIMIT 10
      `);
      return fallback.rows;
    }
  },

  // Send weekly reminder to courtier
  async sendWeeklyReminder(pool, telegramChatId) {
    try {
      const inactiveClients = await this.getInactiveClients(pool);
      
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
