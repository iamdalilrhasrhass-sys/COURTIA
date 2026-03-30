const demoService = {
  // Create demo account with sample data
  async createDemoAccount(pool) {
    try {
      // Create demo user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('demo2026', 10);
      
      const userResult = await pool.query(
        `INSERT INTO users (email, password, first_name, last_name, role, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
         RETURNING id, email`,
        ['demo@courtia.fr', hashedPassword, 'Demo', 'Account', 'broker']
      );

      const userId = userResult.rows[0].id;

      // Create 10 demo clients
      const demoClients = [
        { first_name: 'Jean', last_name: 'Dupont', email: 'jean@demo.fr', phone: '06 12 34 56 78' },
        { first_name: 'Marie', last_name: 'Martin', email: 'marie@demo.fr', phone: '06 23 45 67 89' },
        { first_name: 'Pierre', last_name: 'Bernard', email: 'pierre@demo.fr', phone: '06 34 56 78 90' },
        { first_name: 'Sophie', last_name: 'Leclerc', email: 'sophie@demo.fr', phone: '06 45 67 89 01' },
        { first_name: 'Luc', last_name: 'Moreau', email: 'luc@demo.fr', phone: '06 56 78 90 12' },
        { first_name: 'Anne', last_name: 'Dubois', email: 'anne@demo.fr', phone: '06 67 89 01 23' },
        { first_name: 'Marc', last_name: 'Garnier', email: 'marc@demo.fr', phone: '06 78 90 12 34' },
        { first_name: 'Céline', last_name: 'Fabre', email: 'celine@demo.fr', phone: '06 89 01 23 45' },
        { first_name: 'Nicolas', last_name: 'Renard', email: 'nicolas@demo.fr', phone: '06 90 12 34 56' },
        { first_name: 'Valérie', last_name: 'Blanc', email: 'valerie@demo.fr', phone: '06 01 23 45 67' }
      ];

      for (const clientData of demoClients) {
        const clientResult = await pool.query(
          `INSERT INTO clients (first_name, last_name, email, phone, status, loyalty_score, risk_score, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id`,
          [clientData.first_name, clientData.last_name, clientData.email, clientData.phone, 'active', Math.random() * 100, Math.random() * 100]
        );

        const clientId = clientResult.rows[0].id;

        // Add demo contracts
        await pool.query(
          `INSERT INTO contracts (client_id, contract_number, type, insurer, start_date, end_date, annual_premium, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [clientId, `CT-${clientId}-2026`, 'Auto', 'AXA', '2025-03-29', '2026-03-29', Math.random() * 2000, 'actif']
        );
      }

      return { success: true, userId, message: 'Demo account created' };
    } catch (error) {
      console.error('Demo creation error:', error);
      throw error;
    }
  },

  // Reset demo account nightly
  async resetDemoAccount(pool) {
    try {
      await pool.query('DELETE FROM clients WHERE email LIKE $1', ['%@demo.fr']);
      await pool.query('DELETE FROM users WHERE email = $1', ['demo@courtia.fr']);
      
      await this.createDemoAccount(pool);
      
      return { success: true, message: 'Demo account reset' };
    } catch (error) {
      console.error('Demo reset error:', error);
      throw error;
    }
  }
};

module.exports = demoService;
