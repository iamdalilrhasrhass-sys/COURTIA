const legalAlertService = {
  checkPrescriptionDeadlines(clients) {
    const alerts = []
    const today = new Date()

    clients.forEach(c => {
      if (c.claims && c.claims.length > 0) {
        c.claims.forEach(claim => {
          const prescriptionDate = new Date(claim.opening_date)
          prescriptionDate.setFullYear(prescriptionDate.getFullYear() + 2) // 2 year prescription

          const daysUntil = Math.floor((prescriptionDate - today) / (1000 * 60 * 60 * 24))
          if (daysUntil < 30 && daysUntil > 0) {
            alerts.push({ client: c.id, claim: claim.id, daysRemaining: daysUntil })
          }
        })
      }
    })

    return alerts
  }
}

module.exports = legalAlertService
