const { jsPDF } = require('jspdf')

const attestationService = {
  generateAttestation(contract) {
    const doc = new jsPDF()
    doc.text('Attestation d\'Assurance', 10, 10)
    doc.text(`Client: ${contract.client_name}`, 10, 30)
    doc.text(`Type: ${contract.type}`, 10, 40)
    doc.text(`Période: ${contract.start_date} au ${contract.end_date}`, 10, 50)
    doc.text(`Prime: ${contract.premium}€`, 10, 60)
    return doc.output('arraybuffer')
  },

  detectUnderinsurance(contract, estimatedValue) {
    const coverage = contract.value_insured || 0
    const gap = estimatedValue - coverage
    return {
      isUnderinsured: gap > 0,
      gap: gap,
      recommendation: gap > estimatedValue * 0.1 ? `Augmenter couverture de ${gap}€` : null
    }
  }
}

module.exports = attestationService
