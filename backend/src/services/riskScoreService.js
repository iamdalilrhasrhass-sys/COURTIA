const riskScoreService = {
  async calculateRiskScore(clientData) {
    let score = 50;
    const reasons = [];

    // Facteur 1 : délai depuis dernier contact (jusqu'à 30 pts)
    if (clientData.last_contact_date) {
      const daysSince = Math.floor(
        (Date.now() - new Date(clientData.last_contact_date)) / 86400000
      );
      if (daysSince > 180) {
        score += 30;
        reasons.push({ code: 'NO_CONTACT_180D', label: `Aucun contact depuis ${daysSince} jours`, points: 30 });
      } else if (daysSince > 90) {
        score += 20;
        reasons.push({ code: 'NO_CONTACT_90D', label: `Aucun contact depuis ${daysSince} jours`, points: 20 });
      } else if (daysSince > 30) {
        score += 10;
        reasons.push({ code: 'NO_CONTACT_30D', label: `Aucun contact depuis ${daysSince} jours`, points: 10 });
      }
    } else {
      score += 25;
      reasons.push({ code: 'NEVER_CONTACTED', label: 'Client jamais contacté', points: 25 });
    }

    // Facteur 2 : contrats expirant dans les 30 jours (jusqu'à 25 pts)
    if (clientData.contracts && clientData.contracts.length > 0) {
      const expiringIn30 = clientData.contracts.filter(c => {
        if (!c.end_date) return false;
        const days = Math.floor((new Date(c.end_date) - Date.now()) / 86400000);
        return days > 0 && days <= 30;
      }).length;
      if (expiringIn30 > 0) {
        score += 25;
        reasons.push({ code: 'CONTRACT_EXPIRING', label: `${expiringIn30} contrat(s) expirant dans 30 jours`, points: 25 });
      }
    }

    // Facteur 3 : sinistres récents (jusqu'à 20 pts)
    if (clientData.recent_claims && clientData.recent_claims > 0) {
      const pts = Math.min(clientData.recent_claims * 5, 20);
      score += pts;
      reasons.push({ code: 'RECENT_CLAIMS', label: `${clientData.recent_claims} sinistre(s) récent(s)`, points: pts });
    }

    // Facteur 4 : score fidélité bas (jusqu'à 15 pts)
    if (clientData.loyalty_score != null && clientData.loyalty_score < 40) {
      score += 15;
      reasons.push({ code: 'LOW_LOYALTY', label: `Score fidélité faible (${clientData.loyalty_score}/100)`, points: 15 });
    }

    score = Math.min(score, 100);
    const level = score >= 70 ? 'élevé' : score >= 40 ? 'modéré' : 'faible';

    return { score: Math.round(score), level, reasons };
  }
};

module.exports = riskScoreService;
