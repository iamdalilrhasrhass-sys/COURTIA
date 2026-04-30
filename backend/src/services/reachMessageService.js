/**
 * COURTIA REACH — Message Service
 * Génération de messages (email, SMS, script appel, LinkedIn assisté).
 * TOUS les envois réels nécessitent validation humaine.
 */

/**
 * Génère un email personnalisé pour un prospect.
 */
function generateEmail(prospect, analysis, tone = 'professional') {
  const name = prospect.contact_first_name || prospect.contact_last_name || 'Madame, Monsieur';
  const productLabel = analysis.recommended_product_label || 'assurance professionnelle';

  return {
    subject: `Optimisation de votre ${productLabel} — ${prospect.company_name || ''}`,
    body: `Bonjour ${name},

Je me permets de vous contacter car j'accompagne des professionnels comme vous dans l'optimisation de leur couverture d'assurance.

${analysis.approach_angle || ''}

Je vous propose un audit gratuit de 10 minutes de votre situation actuelle. Sans engagement, cela peut vous faire économiser jusqu'à 30% sur vos contrats.

Quand seriez-vous disponible pour un échange ?

Cordialement,
Votre courtier COURTIA`,
    channel: 'email',
  };
}

/**
 * Génère un SMS court.
 */
function generateSMS(prospect, analysis) {
  return {
    body: (analysis.sms_template || `Bonjour, audit assurance gratuit 10 min ? Répondez OUI.`).substring(0, 160),
    channel: 'sms',
  };
}

/**
 * Génère un script d'appel.
 */
function generateCallScript(prospect, analysis) {
  return {
    body: analysis.call_script || `Bonjour, je suis courtier spécialisé. ${analysis.approach_angle || ''} Je vous propose un audit gratuit de 10 minutes.`,
    channel: 'call',
  };
}

/**
 * Génère un message LinkedIn assisté (à copier manuellement).
 */
function generateLinkedInMessage(prospect, analysis) {
  const firstName = (prospect.contact_first_name || '').split(' ')[0] || '';

  return {
    body: analysis.linkedin_message || `Bonjour ${firstName}, je suis courtier spécialisé en assurance professionnelle. ${analysis.approach_angle || 'Échangeons 5 minutes ?'}`,
    channel: 'linkedin_assisted',
    disclaimer: 'Ce message est généré par ARK. Vous devez le copier manuellement dans LinkedIn. L\'automatisation LinkedIn est interdite par leurs conditions d\'utilisation.',
  };
}

/**
 * Génère une réponse à une objection.
 */
function generateObjectionReply(prospect, objection) {
  const replies = {
    'Déjà assuré': "C'est une bonne chose d'être couvert. Mon audit est gratuit et sans engagement — il permet juste de vérifier que vos garanties sont toujours adaptées à votre activité actuelle.",
    'Pas le temps': "Je comprends parfaitement. L'audit prend 10 minutes, et je m'adapte à votre agenda, même en début de matinée ou fin de journée.",
    'Trop cher': "L'audit est entièrement gratuit. Et dans 80% des cas, nous découvrons des économies de 20 à 30% sans réduire les garanties.",
    'Pas intéressé': "Je comprends. Je vous laisse mes coordonnées au cas où vos besoins évoluent. Bonne continuation.",
  };

  return {
    body: replies[objection] || 'Merci pour votre retour. Je reste disponible si vos besoins évoluent.',
    channel: 'email',
  };
}

module.exports = {
  generateEmail,
  generateSMS,
  generateCallScript,
  generateLinkedInMessage,
  generateObjectionReply,
};
