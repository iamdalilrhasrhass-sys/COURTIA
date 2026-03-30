const crypto = require('crypto');

const inviteService = {
  async generateInviteToken(courtierEmail, targetEmail) {
    const token = crypto.randomBytes(32).toString('hex');
    // TODO: Store token in DB with expiry (24h)
    const inviteLink = `https://courtia.app/accept-invite?token=${token}`;
    
    console.log(`✅ Invite link for ${targetEmail}: ${inviteLink}`);
    // TODO: Send email via nodemailer
    return { token, inviteLink };
  },

  async validateInvite(token) {
    // TODO: Check token in DB, verify not expired
    return true;
  }
};

module.exports = inviteService;
