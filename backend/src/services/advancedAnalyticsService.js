const advancedAnalyticsService = {
  calculateFinancialCapacity(clientData) {
    const income = clientData.annual_income || 0
    const expenses = clientData.monthly_expenses || 0
    const maxPremium = (income / 12 - expenses) * 0.15
    return { maxAffordable: maxPremium, recommended: maxPremium * 0.8 }
  },

  detectDuplicateContracts(contracts) {
    const duplicates = []
    for (let i = 0; i < contracts.length; i++) {
      for (let j = i+1; j < contracts.length; j++) {
        if (contracts[i].type === contracts[j].type && 
            new Date(contracts[i].end_date) > new Date(contracts[j].start_date)) {
          duplicates.push({ contract1: i, contract2: j })
        }
      }
    }
    return duplicates
  },

  recommendProducts(clientData) {
    const recommendations = []
    if (!clientData.has_life_insurance) recommendations.push({ product: 'Life', urgency: 'high' })
    if (clientData.has_mortgage && !clientData.has_mortgage_insurance) recommendations.push({ product: 'Mortgage Insurance', urgency: 'high' })
    if (clientData.age > 50 && !clientData.has_retirement) recommendations.push({ product: 'Retirement Plan', urgency: 'medium' })
    return recommendations
  },

  scenarioAnalysis(contracts) {
    return { worstCase: 0.3, bestCase: 0.9, probabilityOfLoss: 0.15 }
  }
}

module.exports = advancedAnalyticsService
