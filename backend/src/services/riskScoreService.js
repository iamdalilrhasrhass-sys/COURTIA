const riskScoreService = {
  // Calculate risk score based on real data
  async calculateRiskScore(clientData, pool) {
    try {
      let score = 50; // Base score

      // Factor 1: Days since last contact (up to 30 points)
      if (clientData.last_contact_date) {
        const daysSince = Math.floor((new Date() - new Date(clientData.last_contact_date)) / (1000 * 60 * 60 * 24));
        if (daysSince > 180) score += 30;
        else if (daysSince > 90) score += 20;
        else if (daysSince > 30) score += 10;
      } else {
        score += 25; // Never contacted
      }

      // Factor 2: Expiring contracts (up to 25 points)
      if (clientData.contracts && clientData.contracts.length > 0) {
        const expiringIn30 = clientData.contracts.filter(c => {
          const days = Math.floor((new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24));
          return days > 0 && days <= 30;
        }).length;
        
        if (expiringIn30 > 0) score += 25;
      }

      // Factor 3: Recent claims (up to 20 points)
      if (clientData.recent_claims && clientData.recent_claims > 0) {
        score += Math.min(clientData.recent_claims * 5, 20);
      }

      // Factor 4: Low loyalty score (up to 15 points)
      if (clientData.loyalty_score && clientData.loyalty_score < 40) {
        score += 15;
      }

      // Cap at 100
      score = Math.min(score, 100);

      return Math.round(score);
    } catch (error) {
      console.error('Risk score calculation error:', error);
      return 50; // Default
    }
  },

  // Recalculate all clients (nightly job)
  async recalculateAll(pool) {
    try {
      const result = await pool.query('SELECT * FROM clients WHERE status = $1', ['active']);
      const clients = result.rows;

      for (const client of clients) {
        const score = await this.calculateRiskScore(client, pool);
        await pool.query('UPDATE clients SET risk_score = $1 WHERE id = $2', [score, client.id]);
      }

      return { updated: clients.length };
    } catch (error) {
      console.error('Bulk recalculation error:', error);
      throw error;
    }
  }
};

module.exports = riskScoreService;
