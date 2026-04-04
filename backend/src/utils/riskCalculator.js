// Score de risque client assurance
// Formule: base 50 + (nb_sinistres_3ans × 15) - (annees_permis × 2) + malus zone

function calculateRiskScore(client) {
  let score = 50; // Base
  
  // Sinistres (+15 par sinistre)
  if (client.nb_sinistres_3ans) {
    score += client.nb_sinistres_3ans * 15;
  }
  
  // Ancienneté du permis (-2 par année)
  if (client.annees_permis) {
    score -= Math.min(client.annees_permis * 2, 30); // Cap à -30
  }
  
  // Bonus-malus CRM (multiplicateur)
  const bonusMalus = parseFloat(client.bonus_malus) || 1.0;
  score = Math.round(score * bonusMalus);
  
  // Malus zone
  const zoneMultiplier = {
    'urbain': 1.0,
    'periurbain': 1.1,
    'rural': 0.95
  };
  const zoneCoef = zoneMultiplier[client.zone_geographique] || 1.0;
  score = Math.round(score * zoneCoef);
  
  // Clamp entre 0 et 100
  return Math.min(Math.max(score, 0), 100);
}

module.exports = { calculateRiskScore };
