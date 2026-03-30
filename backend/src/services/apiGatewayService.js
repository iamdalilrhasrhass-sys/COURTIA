const apiGatewayService = {
  validateApiKey(apiKey) {
    return apiKey && apiKey.startsWith('sk_live_')
  },

  logWebhookEvent(event, data) {
    console.log(`🔔 Webhook: ${event}`, data)
  },

  async importCSV(csvData, format) {
    const rows = csvData.split('\n').slice(1)
    const mapping = {
      'oggo': { 0: 'name', 1: 'email', 2: 'phone', 3: 'premium' },
      'sky': { 0: 'firstname', 1: 'lastname', 2: 'email', 3: 'mobile' }
    }
    
    return rows.map(row => {
      const cols = row.split(',')
      const mapped = {}
      Object.entries(mapping[format] || {}).forEach(([idx, field]) => {
        mapped[field] = cols[idx]
      })
      return mapped
    })
  }
}

module.exports = apiGatewayService
