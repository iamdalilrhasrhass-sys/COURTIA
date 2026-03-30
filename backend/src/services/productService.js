const productService = {
  getReviewSchedule(contractType) {
    const schedules = {
      auto: 12, home: 24, life: 12, business: 12, health: 12
    }
    return schedules[contractType] || 12
  },

  flagBeneficiaryUpdate(clientData) {
    const lastUpdate = new Date(clientData.beneficiary_last_update)
    const daysSince = Math.floor((new Date() - lastUpdate) / (1000*60*60*24))
    return daysSince > 730 ? { alert: true, daysSince } : { alert: false }
  },

  calculateTaxImpact(product, amount) {
    if (product === 'life_insurance') return amount * 0.08
    if (product === 'pension') return amount * 0.12
    return 0
  },

  compareHistoricalRates(contractType, clientId) {
    return [
      { year: 2024, rate: 450 },
      { year: 2025, rate: 480 },
      { year: 2026, rate: 520 }
    ]
  },

  instantQuote(type, profile) {
    const baseRates = { auto: 400, home: 800, health: 50 }
    const multiplier = profile.riskScore / 100
    return baseRates[type] * multiplier
  }
}

module.exports = productService
