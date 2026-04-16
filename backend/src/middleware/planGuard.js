/**
 * planGuard.js
 * Deux middlewares Express pour le bridage par plan.
 *
 * requireFeature('kanban')
 *   → 402 si le plan courant n'a pas cette feature
 *
 * requireUnderLimit('clients')
 *   → 402 si la limite quantitative est atteinte
 *
 * En cas de blocage, le frontend reçoit une réponse structurée
 * qu'il peut intercepter pour afficher la PaywallModal.
 *
 * Note : req.user.userId (JWT généré par auth.js) OU req.user.id
 * (certaines routes inline) — on gère les deux.
 */

const { checkFeatureAccess, checkLimit } = require('../services/planService');

// Mapping feature → plan minimum requis (pour le message d'erreur frontend)
// SOURCE DE VÉRITÉ : aligné avec 003d_plan_features_complete_reset.sql
// 34 clés booléennes canoniques — NE PAS modifier sans mise à jour SQL simultanée.
const FEATURE_PLAN_MAP = {
  // Morning Brief / Portfolio
  morning_brief:                    'start',
  morning_brief_full:               'pro',
  morning_brief_advanced_insights:  'elite',

  // Scoring client
  client_score_basic:               'start',
  client_score_breakdown:           'pro',
  client_ark_action_plan:           'elite',

  // Organisation
  tags:                             'start',
  kanban:                           'pro',
  calendar_sync:                    'pro',
  calendar_multi:                   'elite',

  // Communication
  email_templates_ai:               'pro',
  automations:                      'pro',
  newsletters:                      'pro',

  // Documents & Conformité
  generated_docs:                   'start',
  dda_quiz:                         'start',

  // Analytics & Reporting
  lead_scoring:                     'pro',
  benchmarks:                       'elite',
  executive_dashboard:              'pro',
  analytics_advanced:               'pro',
  compliance_dashboard:             'pro',
  compliance_report:                'pro',
  monthly_reports:                  'pro',
  profitability_analysis:           'elite',
  regulatory_assistant:             'pro',

  // Export & Intégrations
  csv_import:                       'pro',
  data_export:                      'pro',
  data_export_advanced:             'elite',
  public_api:                       'elite',

  // Agence / White Label
  white_label:                      'elite',
  multi_agencies:                   'elite',

  // IA & Support
  ark_premium:                      'pro',
  sales_coach_waitlist:             'start',
  support_priority:                 'pro',
  dedicated_manager:                'elite',
};

function getRequiredPlan(featureKey) {
  return FEATURE_PLAN_MAP[featureKey] || 'pro';
}

/**
 * Middleware : exige qu'un utilisateur ait accès à une feature.
 *
 * Usage :
 *   router.get('/kanban', requireFeature('kanban'), handler)
 *
 * Réponse 402 si bloqué :
 *   { error: 'plan_upgrade_required', feature, required_plan, message }
 */
function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId || req.user.id;
      const hasAccess = await checkFeatureAccess(userId, featureKey);

      if (!hasAccess) {
        const required = getRequiredPlan(featureKey);
        return res.status(402).json({
          error: 'plan_upgrade_required',
          feature: featureKey,
          required_plan: required,
          message: `Cette fonctionnalité nécessite le plan ${required.charAt(0).toUpperCase() + required.slice(1)}.`,
        });
      }

      next();
    } catch (err) {
      console.error('[planGuard.requireFeature] Erreur:', err.message);
      next(); // En cas d'erreur technique, on laisse passer (fail open)
    }
  };
}

/**
 * Middleware : exige que l'utilisateur soit sous sa limite pour un type de ressource.
 *
 * Usage :
 *   router.post('/', requireUnderLimit('clients'), handler)
 *
 * Réponse 402 si limite atteinte :
 *   { error: 'limit_reached', limit_type, current, max, required_plan, message }
 *
 * Si sous la limite, attache req.usageCheck pour usage optionnel dans le handler.
 */
function requireUnderLimit(limitType) {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId || req.user.id;
      const check = await checkLimit(userId, limitType);

      if (!check.allowed) {
        return res.status(402).json({
          error: 'limit_reached',
          limit_type: limitType,
          current: check.current,
          max: check.max,
          required_plan: 'pro',
          message: `Limite atteinte (${check.current}/${check.max}). Passez au plan Pro pour augmenter votre limite.`,
        });
      }

      // Expose le check pour usage éventuel dans le handler
      req.usageCheck = check;
      next();
    } catch (err) {
      console.error('[planGuard.requireUnderLimit] Erreur:', err.message);
      next(); // Fail open
    }
  };
}

module.exports = { requireFeature, requireUnderLimit };
