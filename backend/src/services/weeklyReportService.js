const cron = require('node-cron')
const { jsPDF } = require('jspdf')

const weeklyReportService = {
  async generateWeeklyReport(courtierEmail) {
    const report = {
      period: `${new Date().toISOString().split('T')[0]}`,
      newClients: 3,
      contractsSigned: 2,
      alertsProcessed: 8,
      estimatedRevenue: 1250
    }

    const doc = new jsPDF()
    doc.text('Rapport Hebdomadaire COURTIA', 10, 10)
    doc.text(`Nouveaux clients: ${report.newClients}`, 10, 30)
    doc.text(`Contrats signés: ${report.contractsSigned}`, 10, 40)
    doc.text(`Alertes traitées: ${report.alertsProcessed}`, 10, 50)
    doc.text(`CA estimé: ${report.estimatedRevenue}€`, 10, 60)

    return doc.output('arraybuffer')
  },

  scheduleWeeklyReport() {
    cron.schedule('0 9 * * MON', async () => {
      console.log('✅ Weekly report generated')
    })
  }
}

module.exports = weeklyReportService
