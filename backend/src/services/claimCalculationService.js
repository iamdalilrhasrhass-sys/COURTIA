const claimCalculationService = {
  calculateIndemnity(contract, claimDetails) {
    let indemnity = 0
    const { coverage, deductible, value_insured } = contract
    const { damage_amount } = claimDetails

    if (coverage === 'full') {
      indemnity = Math.min(damage_amount - deductible, value_insured)
    } else if (coverage === 'tiers') {
      indemnity = damage_amount * 0.7 - deductible
    }

    return Math.max(0, indemnity)
  },

  detectDuplicates(clients) {
    const duplicates = []
    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        if (clients[i].email === clients[j].email || clients[i].phone === clients[j].phone) {
          duplicates.push({ client1: clients[i].id, client2: clients[j].id })
        }
      }
    }
    return duplicates
  }
}

module.exports = claimCalculationService
