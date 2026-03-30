const segmentationService = {
  segmentClients(clients) {
    const segments = { vip: [], atRisk: [], toDevelop: [], dormant: [] }

    clients.forEach(c => {
      if (c.loyalty_score > 85 && c.contracts.length > 2) segments.vip.push(c)
      else if (c.loyalty_score < 50 || (new Date() - new Date(c.last_contact)) / (1000 * 60 * 60 * 24) > 90) segments.atRisk.push(c)
      else if (c.contracts.length === 1) segments.toDevelop.push(c)
      else if ((new Date() - new Date(c.last_contact)) / (1000 * 60 * 60 * 24) > 180) segments.dormant.push(c)
    })

    return segments
  }
}

module.exports = segmentationService
