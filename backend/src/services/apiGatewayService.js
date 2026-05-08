const apiGatewayService = {
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return false
    const configuredPrefix = process.env.API_GATEWAY_KEY_PREFIX || 'courtia_'
    return apiKey.startsWith(configuredPrefix)
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
