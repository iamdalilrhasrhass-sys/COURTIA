const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock')

const stripeService = {
  async createSubscription(courtierEmail, plan) {
    const plans = { starter: 'price_starter', pro: 'price_pro', enterprise: 'price_enterprise' }
    return { subscriptionId: 'sub_mock', status: 'active', trialEndsAt: new Date(Date.now() + 30*24*60*60*1000) }
  },

  async createInvoice(courtierEmail, amount) {
    return { invoiceId: `inv_${Date.now()}`, amount, status: 'draft', url: 'https://invoice.pdf' }
  },

  async applyPromoCode(code) {
    const codes = { LAUNCH50: 0.5, NEWBIE20: 0.2 }
    return { discount: codes[code] || 0, valid: !!codes[code] }
  }
}

module.exports = stripeService
