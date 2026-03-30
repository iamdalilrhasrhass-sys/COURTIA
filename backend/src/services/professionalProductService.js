const professionalProductService = {
  manageProfessionalInsurance(professional) {
    return { businessType: professional.type, coverage: 'RC_full', premium: 500 }
  },

  detectCoverageGaps(professional, activities) {
    const gaps = []
    if (professional.activities.includes('digital') && !professional.cyber_coverage) gaps.push('cyber')
    if (professional.employees > 10 && !professional.payroll_coverage) gaps.push('payroll')
    return gaps
  },

  calculateFinancialGuarantee(professional) {
    const volumeThreshold = 500000
    const required = professional.annualVolume > volumeThreshold ? professional.annualVolume * 0.05 : 0
    return { required, current: professional.guarantee || 0, gap: Math.max(0, required - (professional.guarantee || 0)) }
  },

  manageLeaseholdCoverage(realtor) {
    return { guarantee: realtor.annualVolume * 0.05, premium: realtor.annualVolume * 0.001 }
  },

  calculateRetrocessions(volume, tier) {
    const rates = { starter: 0.1, pro: 0.15, enterprise: 0.2 }
    return { retrocession: volume * (rates[tier] || 0.1) }
  },

  esgScoring(company) {
    return {
      environmental: 0.7,
      social: 0.8,
      governance: 0.75,
      overallScore: 0.75,
      recommendation: 'ESG compliant'
    }
  }
}

module.exports = professionalProductService
