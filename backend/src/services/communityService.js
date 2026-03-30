const communityService = {
  async sendMessage(fromCourtier, toCourtier, message) {
    return { messageId: `msg_${Date.now()}`, status: 'delivered', timestamp: new Date() }
  },

  async postBestPractice(courtierEmail, title, description) {
    return { postId: `post_${Date.now()}`, votes: 0, status: 'published' }
  },

  async findComplementaryCourtiers(courtierEmail, specialty) {
    return [
      { email: 'courtier1@test.com', specialty: 'RC', zone: 'IDF', score: 95 },
      { email: 'courtier2@test.com', specialty: 'Santé', zone: 'IDF', score: 88 }
    ]
  }
}

module.exports = communityService
