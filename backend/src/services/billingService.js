const billingService = {
  calculateMonthlyRevenue() {
    const plans = {
      'Starter': 99,
      'Pro': 299,
      'Enterprise': 599
    };
    
    const subscriptions = [
      { plan: 'Pro', courtiers: 5 },
      { plan: 'Starter', courtiers: 2 },
      { plan: 'Enterprise', courtiers: 1 }
    ];

    return subscriptions.reduce((total, sub) => {
      return total + (plans[sub.plan] * sub.courtiers);
    }, 0);
  },

  generateInvoice(courtierEmail, plan, amount) {
    const invoice = {
      id: `INV-${Date.now()}`,
      courtierEmail,
      plan,
      amount,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    };
    return invoice;
  }
};

module.exports = billingService;
