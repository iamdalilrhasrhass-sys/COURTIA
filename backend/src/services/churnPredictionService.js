const churnPredictionService = {
  predictChurn(clientData) {
    let riskScore = 0
    const daysSinceContact = Math.floor((new Date() - new Date(clientData.last_contact)) / (1000 * 60 * 60 * 24))
    
    if (daysSinceContact > 90) riskScore += 30
    if (clientData.loyalty_score < 50) riskScore += 25
    if (clientData.claims && clientData.claims.length > 3) riskScore += 20
    if (daysSinceContact > 180) riskScore += 25

    const probability = Math.min(100, riskScore)
    return {
      churnProbability: probability,
      riskLevel: probability > 70 ? 'high' : probability > 40 ? 'medium' : 'low',
      recommendations: probability > 60 ? ['Appeler immédiatement', 'Proposer cross-sell', 'Offrir reduction'] : []
    }
  }
}

module.exports = churnPredictionService
