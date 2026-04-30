/**
 * planGating.js — Middleware de feature gating
 * Utilise planService comme source unique de vérité
 * Plans : starter (89€), pro (159€), premium (sur devis)
 */

const pool = require('../db');
const planService = require('../services/planService');

/**
 * Middleware : vérifie qu'un utilisateur a accès à une feature
 * Utilisation : router.get('/route', requireFeature('ark_full'), handler)
 */
function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'non_authentifié', message: 'Utilisateur non authentifié' });
      }

      const r = await pool.query(
        'SELECT id, plan, subscription_status, trial_ends_at FROM users WHERE id=$1',
        [userId]
      );
      const u = r.rows[0];
      if (!u) {
        return res.status(401).json({ error: 'user_not_found', message: 'Utilisateur non trouvé' });
      }

      const onTrial = u.subscription_status === 'trialing' &&
        (!u.trial_ends_at || new Date(u.trial_ends_at) > new Date());

      // En trial : toutes les features Pro sont disponibles
      const hasFeature = onTrial
        ? planService.getFeatureGate('pro', feature)
        : planService.getFeatureGate(u.plan, feature);

      if (!hasFeature) {
        const minPlan = planService.getMinPlanForFeature(feature);
        return res.status(402).json({
          error: 'plan_required',
          feature,
          current_plan: u.plan,
          required_plan: minPlan,
          subscription_status: u.subscription_status,
          on_trial: onTrial,
          message: `Cette fonctionnalité nécessite un plan ${minPlan || 'supérieur'}. Votre plan actuel : ${u.plan || 'gratuit'}`,
        });
      }

      // Vérifier que l'abonnement est actif (sauf si en trial)
      if (!onTrial && !['active', 'trialing'].includes(u.subscription_status)) {
        return res.status(402).json({
          error: 'subscription_inactive',
          status: u.subscription_status,
          message: 'Votre abonnement est inactif. Veuillez le réactiver.',
        });
      }

      next();
    } catch (err) {
      console.error('[planGating] Error:', err.message);
      // Fail open : on laisse passer en cas d'erreur technique
      next();
    }
  };
}

/**
 * Middleware : vérifie les limites d'utilisation
 */
function requireLimit(limitType) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) return next();

      const result = await planService.checkLimit(userId, limitType);
      if (!result.allowed) {
        return res.status(429).json({
          error: 'limit_exceeded',
          limit: limitType,
          current: result.current,
          max: result.max,
          message: `Limite atteinte (${result.current}/${result.max === Infinity ? '∞' : result.max}). Passez à un plan supérieur pour augmenter vos limites.`,
        });
      }
      next();
    } catch (err) {
      console.error('[planGating][limit] Error:', err.message);
      next();
    }
  };
}

module.exports = { requireFeature, requireLimit };
