const inviteService = {
  async generateInviteToken() {
    return {
      success: false,
      error: 'legacy_invite_service_disabled',
      message: 'Use the database-backed team invitation routes and emailService.',
    };
  },

  async validateInvite() {
    return {
      valid: false,
      error: 'legacy_invite_service_disabled',
      message: 'Use the database-backed team invitation routes.',
    };
  },
};

module.exports = inviteService;
