// Score de risque client assurance — Formule détaillée
// Base 50 + bonus-malus + sinistres + expérience + zone

function calculateRiskScore(client) {
  let score = 50; // Base neutre

  // 1. Bonus-malus CRM auto (impact +/- sur le score)
  if (client.bonus_malus) {
    if (client.bonus_malus <= 0.80) {
      score -= 15; // Excellent conducteur
    } else if (client.bonus_malus <= 1.00) {
      score -= 5; // Bon conducteur
    } else if (client.bonus_malus <= 1.25) {
      score += 5; // Neutre
    } else if (client.bonus_malus <= 1.75) {
      score += 15; // Mauvais
    } else {
      score += 25; // Très mauvais
    }
  }

  // 2. Sinistres sur 3 ans (+12 par sinistre)
  if (client.nb_sinistres_3ans) {
    score += client.nb_sinistres_3ans * 12;
  }

  // 3. Expérience de conduite (ancienneté permis)
  if (client.annees_permis) {
    if (client.annees_permis >= 10) {
      score -= 10; // Expérimenté
    } else if (client.annees_permis >= 5) {
      score -= 5; // Assez expérimenté
    } else if (client.annees_permis <= 2) {
      score += 15; // Jeune conducteur = risque élevé
    }
  }

  // 4. Zone géographique
  if (client.zone_geographique === 'urbain') {
    score += 10; // Plus de sinistres en ville
  } else if (client.zone_geographique === 'periurbain') {
    score += 3; // Risque moyen
  } else if (client.zone_geographique === 'rural') {
    score -= 5; // Moins de sinistres
  }

  // Clamper entre 0 et 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { calculateRiskScore };
