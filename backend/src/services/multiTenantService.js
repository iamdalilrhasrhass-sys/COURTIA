const multiTenantService = {
  createSandbox(courtierEmail) {
    return { sandboxId: `sandbox_${Date.now()}`, expires: new Date(Date.now() + 30*24*60*60*1000) }
  },

  enableDemoMode(sessionId) {
    return { demoMode: true, dataAnonymized: true, readOnly: true }
  },

  async createMultiCabinet(courtierEmail, cabinetNames) {
    return cabinetNames.map((name, idx) => ({
      cabinetId: `cabinet_${idx}`,
      name,
      ownerId: courtierEmail,
      createdAt: new Date()
    }))
  },

  async transferPortfolio(fromCourtier, toCourtier, clients) {
    return { transferred: clients.length, status: 'success' }
  }
}

module.exports = multiTenantService
