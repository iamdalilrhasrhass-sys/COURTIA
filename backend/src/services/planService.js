/**
 * planService.js — Source unique de vérité pour les plans COURTIA
 * Plans V1 : starter (89€), pro (199€), cabinet (399€), premium (sur devis)
 */

const pool = require('../db');
const logger = require('../lib/logger');
const BILLING_MODE = process.env.BILLING_MODE || 'test';

function stripePriceFor(planCode) {
  if (BILLING_MODE === 'test') {
    if (planCode === 'starter') return process.env.STRIPE_STARTER_PRICE_ID_TEST || process.env.STRIPE_PRICE_STARTER || null;
    if (planCode === 'pro') return process.env.STRIPE_PRO_PRICE_ID_TEST || process.env.STRIPE_PRICE_PRO || null;
    if (planCode === 'cabinet') return process.env.STRIPE_CABINET_PRICE_ID_TEST || process.env.STRIPE_PRICE_CABINET || null;
    if (planCode === 'premium') return null;
  }
  if (planCode === 'starter') return process.env.STRIPE_PRICE_STARTER || null;
  if (planCode === 'pro') return process.env.STRIPE_PRICE_PRO || null;
  if (planCode === 'cabinet') return process.env.STRIPE_PRICE_CABINET || null;
  if (planCode === 'premium') return null;
  return null;
}

const PLANS = {
  starter: {
    name: 'Starter',
    price: 89,
    currency: 'EUR',
    interval: 'month',
    description: 'Pour les courtiers indépendants qui démarrent',
    highlighted: false,
    features: {
      ark_basic: true,
      ark_full: false,
      reach: false,
      automations: false,
      advanced_reports: false,
      premium_support: false,
      multi_user: false,
      csv_import: true,
      crm_full: false,
      scoring: false,
      morning_brief: false,
      integrations_google_calendar: false,
      integrations_whatsapp: false,
      integrations_email_sync: false,
      admin_costs: false,
    },
    limits: {
      max_clients: 3,
      max_contrats: 50,
      max_ark_messages: 200,
      max_pdf_generations: 20,
      max_users: 1,
    },
    stripe_price_id: stripePriceFor('starter'),
  },
  pro: {
    name: 'Pro',
    price: 199,
    currency: 'EUR',
    interval: 'month',
    description: 'La solution complète pour les courtiers qui veulent ARK, les intégrations et les documents métier.',
    highlighted: true,
    features: {
      ark_basic: true,
      ark_full: true,
      reach: true,
      automations: true,
      advanced_reports: true,
      premium_support: false,
      multi_user: true,
      csv_import: true,
      crm_full: true,
      scoring: true,
      morning_brief: true,
      integrations_google_calendar: true,
      integrations_whatsapp: true,
      integrations_email_sync: true,
      admin_costs: true,
    },
    limits: {
      max_clients: 1500,
      max_contrats: Infinity,
      max_ark_messages: 2000,
      max_pdf_generations: 200,
      max_users: 3,
    },
    stripe_price_id: stripePriceFor('pro'),
  },
  cabinet: {
    name: 'Cabinet',
    price: 399,
    currency: 'EUR',
    interval: 'month',
    description: 'Pour les cabinets structurés avec plusieurs collaborateurs et pilotage avancé.',
    highlighted: false,
    features: {
      ark_basic: true,
      ark_full: true,
      reach: true,
      automations: true,
      advanced_reports: true,
      premium_support: true,
      multi_user: true,
      csv_import: true,
      crm_full: true,
      scoring: true,
      morning_brief: true,
      integrations_google_calendar: true,
      integrations_whatsapp: true,
      integrations_email_sync: true,
      admin_costs: true,
    },
    limits: {
      max_clients: Infinity,
      max_contrats: Infinity,
      max_ark_messages: 5000,
      max_pdf_generations: Infinity,
      max_users: 10,
    },
    stripe_price_id: stripePriceFor('cabinet'),
  },
  premium: {
    name: 'Premium',
    price: null,
    currency: 'EUR',
    interval: 'month',
    description: 'Solution sur-mesure pour les cabinets et agences',
    highlighted: false,
    features: {
      ark_basic: true,
      ark_full: true,
      reach: true,
      automations: true,
      advanced_reports: true,
      premium_support: true,
      multi_user: true,
      csv_import: true,
      crm_full: true,
      scoring: true,
      morning_brief: true,
      integrations_google_calendar: true,
      integrations_whatsapp: true,
      integrations_email_sync: true,
      admin_costs: true,
    },
    limits: {
      max_clients: Infinity,
      max_contrats: Infinity,
      max_ark_messages: Infinity,
      max_pdf_generations: Infinity,
      max_users: Infinity,
    },
    stripe_price_id: stripePriceFor('premium'),
  },
};

const DEFAULT_PLAN = 'starter';
const TRIAL_FEATURES = PLANS.pro.features; // Essai 30j = features Pro

/**
 * Retourne un plan complet par son nom
 */
function getPlan(name) {
  return PLANS[name] || null;
}

/**
 * Retourne tous les plans (sans secrets Stripe pour les routes publiques)
 */
function getAllPlans() {
  return Object.entries(PLANS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    description: plan.description,
    highlighted: plan.highlighted,
    features: plan.features,
    limits: plan.limits,
    has_stripe_price: !!plan.stripe_price_id,
  }));
}

/**
 * Vérifie si un plan a accès à une fonctionnalité donnée
 */
function getFeatureGate(planName, feature) {
  const plan = PLANS[planName];
  if (!plan) return false;
  return !!plan.features[feature];
}

/**
 * Retourne la limite d'utilisation pour un plan donné
 */
function getUsageLimit(planName, limitKey) {
  const plan = PLANS[planName];
  if (!plan) return 0;
  return plan.limits[limitKey] || 0;
}

/**
 * Récupère les infos plan d'un utilisateur depuis la DB
 */
async function getUserPlanInfo(userId) {
  try {
    const { rows } = await pool.query(
      'SELECT id, plan, subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) {
      return { plan: DEFAULT_PLAN, ...PLANS[DEFAULT_PLAN], subscription_status: null };
    }
    const user = rows[0];
    const planKey = PLANS[user.plan] ? user.plan : DEFAULT_PLAN;
    const plan = { ...PLANS[planKey] };

    // Vérifier si l'utilisateur est en période d'essai
    const onTrial = user.subscription_status === 'trialing' &&
      (!user.trial_ends_at || new Date(user.trial_ends_at) > new Date());

    // Si en essai, on donne les features Pro
    const activeFeatures = onTrial ? TRIAL_FEATURES : plan.features;

    return {
      plan: planKey,
      plan_name: plan.name,
      price: plan.price,
      subscription_status: user.subscription_status,
      on_trial: onTrial,
      trial_ends_at: user.trial_ends_at,
      stripe_customer_id: user.stripe_customer_id,
      stripe_subscription_id: user.stripe_subscription_id,
      features: activeFeatures,
      limits: plan.limits,
    };
  } catch (error) {
    logger.warn({ error: error.message }, 'planService.getUserPlanInfo failed');
    return { plan: DEFAULT_PLAN, ...PLANS[DEFAULT_PLAN], subscription_status: null };
  }
}

/**
 * Vérifie si un utilisateur a accès à une feature
 */
async function checkFeatureAccess(userId, featureKey) {
  const planInfo = await getUserPlanInfo(userId);
  return !!planInfo.features[featureKey];
}

/**
 * Retourne le nom simple du plan d'un utilisateur
 */
async function getPlanName(user) {
  if (!user) return DEFAULT_PLAN;
  const id = user.id || user.userId;
  if (!id) return DEFAULT_PLAN;
  const planInfo = await getUserPlanInfo(id);
  return planInfo.plan || DEFAULT_PLAN;
}

/**
 * Vérifie les limites d'utilisation
 */
async function checkLimit(userId, limitType) {
  // Les super_admin contournent les limites
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  if (rows[0]?.role === 'super_admin') {
    return { allowed: true, current: 0, max: Infinity };
  }

  const planInfo = await getUserPlanInfo(userId);
  const max = planInfo.limits[limitType] !== undefined ? planInfo.limits[limitType] : Infinity;

  // TODO: Implémenter le comptage réel selon le type de limite
  let current = 0;
  if (limitType === 'max_clients') {
    const count = await pool.query('SELECT COUNT(*) FROM clients WHERE courtier_id = $1', [userId]);
    current = parseInt(count.rows[0].count, 10);
  } else if (limitType === 'max_contrats') {
    const count = await pool.query('SELECT COUNT(*) FROM contracts WHERE courtier_id = $1', [userId]);
    current = parseInt(count.rows[0].count, 10);
  }

  return { allowed: current < max, current, max };
}

/**
 * Incrémente un compteur d'utilisation
 */
async function incrementUsage(userId, usageType, amount = 1) {
  // TODO: Implémenter le suivi d'utilisation dans une table dédiée
  return null;
}

/**
 * Calcule les limites restantes pour l'affichage
 */
async function getUsageWithLimits(userId) {
  const planInfo = await getUserPlanInfo(userId);
  const limits = planInfo.limits || {};
  const usage = {};

  for (const [key, max] of Object.entries(limits)) {
    if (key === 'max_users') continue;
    const limitType = key;
    let current = 0;
    try {
      if (limitType === 'max_clients') {
        const count = await pool.query('SELECT COUNT(*) FROM clients WHERE courtier_id = $1', [userId]);
        current = parseInt(count.rows[0].count, 10);
      } else if (limitType === 'max_contrats') {
        const count = await pool.query('SELECT COUNT(*) FROM contracts WHERE courtier_id = $1', [userId]);
        current = parseInt(count.rows[0].count, 10);
      }
    } catch (e) {
      // Ignorer les erreurs de comptage
    }
    usage[key.replace('max_', '')] = {
      current,
      max: max === Infinity ? null : max,
      percent: max === Infinity ? 0 : Math.round((current / max) * 100),
    };
  }

  return usage;
}

// Feature gating — mapping feature key -> plan minimum requis
const FEATURE_GATES = {
  ark_basic: 'starter',
  ark_full: 'pro',
  reach: 'pro',
  automations: 'pro',
  advanced_reports: 'pro',
  premium_support: 'premium',
  multi_user: 'premium',
  csv_import: 'starter',
  crm_full: 'pro',
  scoring: 'pro',
  morning_brief: 'pro',
  integrations_google_calendar: 'pro',
  integrations_whatsapp: 'pro',
  integrations_email_sync: 'pro',
  admin_costs: 'pro',
};

/**
 * Retourne le plan minimum requis pour une feature
 */
function getMinPlanForFeature(feature) {
  return FEATURE_GATES[feature] || null;
}

module.exports = {
  PLANS,
  TRIAL_FEATURES,
  DEFAULT_PLAN,
  getPlan,
  getAllPlans,
  getFeatureGate,
  getUsageLimit,
  getUserPlanInfo,
  checkFeatureAccess,
  checkLimit,
  incrementUsage,
  getUsageWithLimits,
  getPlanName,
  getMinPlanForFeature,
  FEATURE_GATES,
};
