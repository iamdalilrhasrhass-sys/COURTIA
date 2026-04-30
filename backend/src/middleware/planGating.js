const pool = require('../db');

const FEATURES = {
  starter: ['clients_basic', 'quotes_basic', 'ark_chat_limited'],
  pro: ['clients_basic', 'quotes_basic', 'ark_chat_unlimited', 'dashboard_kpi', 'appointments', 'onboarding_advanced'],
  premium: ['clients_basic', 'quotes_basic', 'ark_chat_unlimited', 'dashboard_kpi', 'appointments', 'onboarding_advanced', 'ark_reach', 'priority_support', 'custom_branding'],
};

const TRIAL_FEATURES = FEATURES.pro; // Essai 30j = features Pro

function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const r = await pool.query(
        'SELECT plan, subscription_status, trial_ends_at FROM users WHERE id=$1',
        [req.user.id || req.user.userId]
      );
      const u = r.rows[0];
      if (!u) return res.status(401).json({ error: 'user_not_found' });

      const onTrial = u.subscription_status === 'trialing' && (!u.trial_ends_at || new Date(u.trial_ends_at) > new Date());
      const features = onTrial ? TRIAL_FEATURES : (FEATURES[u.plan] || []);

      if (!features.includes(feature)) {
        return res.status(402).json({
          error: 'plan_required',
          feature,
          current_plan: u.plan,
          status: u.subscription_status,
          message: `Cette fonctionnalité nécessite un plan supérieur. Votre plan actuel : ${u.plan || 'trial'}`
        });
      }
      if (!onTrial && !['active', 'trialing'].includes(u.subscription_status)) {
        return res.status(402).json({
          error: 'subscription_inactive',
          status: u.subscription_status,
          message: 'Votre abonnement est inactif. Veuillez le réactiver.'
        });
      }
      next();
    } catch (err) {
      console.error('[planGating]', err.message);
      next();
    }
  };
}

module.exports = { requireFeature, FEATURES };
