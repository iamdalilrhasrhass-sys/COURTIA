const telegramService = require('./telegramService');

const notificationService = {
  // Contract expiring in less than 30 days
  async notifyExpiringContract(pool, contractData, telegramChatId) {
    try {
      const daysUntilExpiry = Math.ceil((new Date(contractData.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      const message = `
⚠️ ALERTE CONTRAT EXPIRANT

Client: ${contractData.client_name}
Type: ${contractData.type}
Expire le: ${new Date(contractData.end_date).toLocaleDateString('fr-FR')}
Jours restants: ${daysUntilExpiry}
Prime: ${contractData.premium}€

📞 Action recommandée: Contacter le client pour le renouvellement
      `;
      
      await telegramService.sendMessage(telegramChatId, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending expiring contract notification:', error);
      throw error;
    }
  },

  // Prospect stagnating for 15+ days
  async notifyStagnantProspect(pool, prospectData, telegramChatId) {
    try {
      const daysSinceMove = Math.ceil((new Date() - new Date(prospectData.last_moved)) / (1000 * 60 * 60 * 24));
      
      const message = `
🟡 PROSPECT STAGNANT

Nom: ${prospectData.name}
Colonne: ${prospectData.stage}
Stagne depuis: ${daysSinceMove} jours
Valeur: ${prospectData.value}€
Notes: ${prospectData.notes || 'Aucune'}

📌 Action: Relancer le prospect ou reconsidérer la stratégie
      `;
      
      await telegramService.sendMessage(telegramChatId, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending stagnant prospect notification:', error);
      throw error;
    }
  },

  // New client created
  async notifyNewClient(pool, clientData, telegramChatId) {
    try {
      const message = `
✅ NOUVEAU CLIENT

Nom: ${clientData.first_name} ${clientData.last_name}
Email: ${clientData.email}
Téléphone: ${clientData.phone}
Créé le: ${new Date().toLocaleDateString('fr-FR')}

🎯 Prochaine étape: Lancer le questionnaire d'onboarding
      `;
      
      await telegramService.sendMessage(telegramChatId, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending new client notification:', error);
      throw error;
    }
  },

  // Conversion rate drop
  async notifyConversionDrop(pool, stats, telegramChatId) {
    try {
      const message = `
📉 ALERTE CONVERSION

Taux de conversion: ${stats.conversionRate}%
Baisse vs. semaine dernière: ${stats.weeklyDrop}%
Prospects en pipeline: ${stats.totalProspects}
Convertis cette semaine: ${stats.convertedThisWeek}

📊 Recommandations:
- Analyser les prospects abandonnés
- Relancer les prospects en attente
- Optimiser le process de suivi
      `;
      
      await telegramService.sendMessage(telegramChatId, message);
      return { success: true };
    } catch (error) {
      console.error('Error sending conversion drop notification:', error);
      throw error;
    }
  }
};

module.exports = notificationService;
