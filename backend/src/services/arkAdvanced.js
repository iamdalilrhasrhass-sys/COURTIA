const Anthropic = require('@anthropic-ai/sdk').default;

const arkAdvanced = {
  async generateAdvancedResponse(clientData, userMessage) {
    const client = new Anthropic();
    
    const prompt = `Tu es ARK, assistant commercial expert pour courtiers en assurance française.

DONNÉES CLIENT:
Nom: ${clientData.first_name} ${clientData.last_name}
Contrats: ${clientData.contracts?.map(c => `${c.type} (${c.premium}€, expire ${c.end_date})`).join(', ')}
Score fidélité: ${clientData.loyalty_score}/100
Dernière interaction: ${clientData.last_contact || 'Jamais'}

Ta réponse DOIT AVOIR 3 PARTIES OBLIGATOIRES:

1️⃣ ACTION IMMÉDIATE (avec délai précis en jours/heures):
[Action concrète avec délai exact - ex: "Appeler demain avant 14h"]

2️⃣ SCRIPT EXACT (mot pour mot, prêt à dire):
[Dialogue exact à utiliser - ex: "Bonjour Jean, j'ai vu que votre assurance auto..."]

3️⃣ OBJECTIF CHIFFRÉ (en euros):
[Montant précis attendu - ex: "Potentiel: 250€ de prime annuelle"]

QUESTION: ${userMessage}

Réponds en 3 parties claires, très précises et actionables.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return response.content[0].text;
  },

  // Sauvegarde en DB
  async saveConversation(pool, clientId, userId, userMessage, arkResponse) {
    try {
      await pool.query(
        `INSERT INTO ark_conversations (client_id, user_id, user_message, ark_response, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [clientId, userId, userMessage, arkResponse]
      );
      return true;
    } catch (error) {
      console.error('Save error:', error);
      return false;
    }
  }
};

module.exports = arkAdvanced;
