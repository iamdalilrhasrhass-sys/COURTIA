const leadManagementService = {
  async qualifyLead(leadData) {
    return {
      score: 85,
      tier: 'hot',
      recommendation: 'Call within 24h',
      estimatedValue: 2500
    }
  },

  distributeLead(lead, courtiers) {
    const best = courtiers.sort((a, b) => b.score - a.score)[0]
    return { assignedTo: best.email, notified: true }
  },

  trackCustomerJourney(clientId) {
    return {
      stages: ['awareness', 'consideration', 'decision', 'retention'],
      currentStage: 'retention',
      daysInStage: 45,
      nextAction: 'renewal reminder'
    }
  },

  detectOpportunities(clientData) {
    const opps = []
    if (!clientData.life_insurance) opps.push({ type: 'life', value: 1200 })
    if (!clientData.disability) opps.push({ type: 'disability', value: 800 })
    return opps.sort((a, b) => b.value - a.value)
  }
}

module.exports = leadManagementService
