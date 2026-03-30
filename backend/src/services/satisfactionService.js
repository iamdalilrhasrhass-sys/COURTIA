const satisfactionService = {
  calculateScore(clientData) {
    let score = 100
    const now = new Date()
    const lastContact = new Date(clientData.last_contact)
    const daysSinceContact = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24))

    if (daysSinceContact > 30) score -= 20
    if (daysSinceContact > 60) score -= 15
    if (clientData.claims && clientData.claims.length > 2) score -= 10
    if (clientData.loyalty_score < 60) score -= 15

    return Math.max(0, score)
  }
}

module.exports = satisfactionService
