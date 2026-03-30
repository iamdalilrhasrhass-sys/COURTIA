const lifeEventService = {
  detectEvents(notes) {
    const events = [];
    const keywords = {
      marriage: ['mariage', 'marié', 'wedding'],
      birth: ['naissance', 'bébé', 'nouveau-né', 'enfant'],
      relocation: ['déménagement', 'nouveau logement', 'emménagement'],
      promotion: ['promotion', 'nouveau poste', 'changement job'],
      retirement: ['retraite', 'partir retraite']
    };

    for (const [event, words] of Object.entries(keywords)) {
      if (words.some(w => notes.toLowerCase().includes(w))) {
        events.push(event);
      }
    }

    return events.map(e => ({
      type: e,
      recommendation: this.getRecommendation(e),
      urgency: 'high'
    }));
  },

  getRecommendation(eventType) {
    const recommendations = {
      marriage: 'Proposer assurance responsabilité civile couple',
      birth: 'Assurance enfant + prévoyance parent',
      relocation: 'Assurance habitation neuve + déménagement',
      promotion: 'Augmentation couverture RC + épargne',
      retirement: 'Rente retraite + patrimoniale'
    };
    return recommendations[eventType];
  }
};

module.exports = lifeEventService;
