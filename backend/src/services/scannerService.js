const scannerService = {
  async scanBusinessCard(imageBuffer) {
    return {
      name: 'Jean Dupont',
      email: 'jean@test.com',
      phone: '+33612345678',
      company: 'ABC Corp',
      title: 'Manager'
    }
  },

  async scanDrivingLicense(imageBuffer) {
    return {
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: '1985-03-15',
      licenseNumber: 'ABC123456',
      expiryDate: '2030-01-01'
    }
  },

  async scanHealthCard(imageBuffer) {
    return {
      socialSecurityNumber: '123456789012345',
      firstName: 'Jean',
      lastName: 'Dupont',
      birthDate: '1985-03-15'
    }
  },

  async biometricLogin(faceData) {
    return { authenticated: true, userId: 'user_123' }
  }
}

module.exports = scannerService
