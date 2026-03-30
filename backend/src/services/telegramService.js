const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const telegramService = {
  // Generic send message
  async sendMessage(chatId, text) {
    try {
      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      });
      return { success: true };
    } catch (error) {
      console.error(`Telegram send error: ${error.message}`);
      throw error;
    }
  },

  // Send onboarding questionnaire
  async sendOnboardingQuestionnaire(chatId, clientName, clientId) {
    const questions = [
      `📋 Questionnaire Onboarding - ${clientName}\n\n` +
      `Bonjour! Pour mieux connaître ${clientName}, peux-tu répondre à ces 5 questions rapides?\n\n` +
      `1️⃣ A-t-il des enfants? (oui/non + nombre si oui)`,
      
      `2️⃣ Quel(s) sport(s) pratique-t-il? (ex: Tennis, Football, Yoga...)`,
      
      `3️⃣ Est-il propriétaire ou locataire? (propriétaire/locataire)`,
      
      `4️⃣ A-t-il des animaux? (oui/non + type si oui)`,
      
      `5️⃣ Quelle est sa profession? (ex: Ingénieur, Comptable...)`
    ];

    for (const question of questions) {
      try {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
          chat_id: chatId,
          text: question,
          parse_mode: 'HTML'
        });
        // Wait between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Telegram send error for question: ${error.message}`);
        throw error;
      }
    }

    return { success: true, questionnaire_sent: true };
  },

  // Send daily brief before meeting
  async sendDailyBrief(chatId, clientData) {
    const brief = this.buildDailyBrief(clientData);
    
    try {
      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text: brief,
        parse_mode: 'HTML'
      });
      return { success: true };
    } catch (error) {
      console.error(`Telegram brief error: ${error.message}`);
      throw error;
    }
  },

  // Build daily brief content
  buildDailyBrief(clientData) {
    const {
      first_name,
      last_name,
      email,
      phone,
      contracts = [],
      alerts = [],
      loyalty_score = 0,
      personal_profile = {}
    } = clientData;

    const contractList = contracts
      .map(c => `• ${c.type}: Expire ${c.endDate}`)
      .join('\n');

    const alertList = alerts
      .map(a => `🔔 ${a.message}`)
      .join('\n');

    const suggestions = this.generateConversationTopics(clientData);

    return `📌 <b>BRIEF - ${first_name} ${last_name}</b>

📞 ${phone} | 📧 ${email}

<b>📋 Contrats:</b>
${contractList || 'Aucun'}

<b>⚠️ Alertes:</b>
${alertList || 'Aucune'}

<b>❤️ Fidélité:</b> ${loyalty_score}/100

<b>👤 Profil:</b>
${personal_profile.profession ? `Profession: ${personal_profile.profession}` : ''}
${personal_profile.housing_type ? `Logement: ${personal_profile.housing_type}` : ''}
${personal_profile.sports ? `Sports: ${personal_profile.sports}` : ''}

<b>💡 Sujets de conversation recommandés:</b>
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  },

  // Generate conversation topics
  generateConversationTopics(clientData) {
    const topics = [];
    
    // Based on expiring contracts
    clientData.contracts?.forEach(c => {
      if (c.daysUntilExpiry < 90) {
        topics.push(`Renouvellement ${c.type} (expire ${c.endDate})`);
      }
    });

    // Based on alerts
    clientData.alerts?.forEach(a => {
      topics.push(a.message);
    });

    // Based on personal profile
    if (clientData.personal_profile?.has_children) {
      topics.push(`Couverture familiale pour enfants`);
    }
    if (clientData.personal_profile?.pets) {
      topics.push(`Assurance responsabilité civile pour animaux`);
    }
    if (clientData.personal_profile?.sports?.includes('extrême')) {
      topics.push(`Couverture sports à risque`);
    }

    // Return top 3 unique topics
    return [...new Set(topics)].slice(0, 3);
  },

  // Send weekly reminder for inactive clients
  async sendWeeklyReminder(chatId, inactiveClients) {
    const clientList = inactiveClients
      .map((c, i) => `${i + 1}. <b>${c.first_name} ${c.last_name}</b> - Dernier contact: ${c.lastContactDate || 'Jamais'}\n   💬 Accroche: ${this.generateHook(c)}`)
      .join('\n\n');

    const message = `📞 <b>RELANCES HEBDOMADAIRES - LUNDI</b>

Clients à contacter cette semaine (inactifs >60j):

${clientList}

🎯 Objectif: Rétention + cross-sell`;

    try {
      await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      });
      return { success: true };
    } catch (error) {
      console.error(`Telegram reminder error: ${error.message}`);
      throw error;
    }
  },

  // Generate personalized hook for client
  generateHook(client) {
    if (client.contracts?.some(c => new Date(c.endDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))) {
      return `"Bonjour ${client.first_name}, j'ai une bonne nouvelle sur votre renouvellement..."`;
    }
    if (client.loyalty_score > 80) {
      return `"${client.first_name}, j'ai des conditions spéciales pour vous cette année..."`;
    }
    return `"Bonjour ${client.first_name}, je vous appelle pour faire un point sur vos couvertures..."`;
  }
};

module.exports = telegramService;
