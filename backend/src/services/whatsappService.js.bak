const whatsappService = {
  templates: {
    renewal: `Bonjour {{firstName}}, votre assurance {{type}} expire le {{expiryDate}}. Je vous propose de faire un point ensemble pour voir comment optimiser votre couverture. Quand êtes-vous disponible cette semaine?`,
    crossSell: `Bonjour {{firstName}}, vous êtes assuré chez moi pour votre {{current}}. J'ai une excellente opportunité pour vous sur une {{suggested}} avec une réduction de {{discount}}%. Pouvons-nous en discuter?`,
    followUp: `Bonjour {{firstName}}, suite à notre conversation du {{date}}, voici les documents pour {{action}}. N'hésitez pas si vous avez des questions!`
  },

  personalize(template, clientData) {
    let result = template;
    result = result.replace('{{firstName}}', clientData.first_name);
    result = result.replace('{{type}}', clientData.contracts?.[0]?.type || 'assurance');
    result = result.replace('{{expiryDate}}', clientData.contracts?.[0]?.end_date || '');
    return result;
  },

  generateWhatsAppLink(phone, message) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
};

module.exports = whatsappService;
