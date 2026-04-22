const pool = require('../db');

const PLANS = {
  starter: {
    name: 'Starter',
    price: 39,
    limits: {
      // TODO: Définir les limites réelles pour le plan starter
      clients: 100,
    },
    features: {
      // TODO: Définir les fonctionnalités réelles pour le plan starter
      dashboardAccess: true,
    },
  },
  pro: {
    name: 'Pro',
    price: 69,
    limits: {
      // TODO: Définir les limites réelles pour le plan pro
      clients: 500,
    },
    features: {
      dashboardAccess: true,
      advancedAnalytics: true,
    },
  },
  elite: {
    name: 'Elite',
    price: 129,
    limits: {
      clients: Infinity,
    },
    features: {
      dashboardAccess: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
  },
};

const DEFAULT_PLAN = 'starter';

async function getUserPlanInfo(userId) {
  try {
    const { rows } = await pool.query('SELECT plan FROM courtiers WHERE id = $1', [userId]);
    if (rows.length > 0) {
      const planKey = rows[0].plan && PLANS[rows[0].plan] ? rows[0].plan : DEFAULT_PLAN;
      return { plan: planKey, ...PLANS[planKey] };
    }
    // Si l'utilisateur n'est pas trouvé, retourner le plan par défaut
    return { plan: DEFAULT_PLAN, ...PLANS[DEFAULT_PLAN] };
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du plan utilisateur:', error);
    // En cas d'erreur de base de données, retourner le plan par défaut (fail open)
    return { plan: DEFAULT_PLAN, ...PLANS[DEFAULT_PLAN] };
  }
}

async function checkFeatureAccess(userId, featureKey) {
  const planInfo = await getUserPlanInfo(userId);
  return !!planInfo.features[featureKey];
}

async function checkLimit(userId, limitType) {
  const planInfo = await getUserPlanInfo(userId);
  const max = planInfo.limits[limitType] || 0;

  // TODO: Implémenter le suivi de l'utilisation actuelle.
  // Cela nécessitera d'interroger d'autres tables (par exemple, compter les clients de l'utilisateur).
  // Pour l'instant, l'utilisation est considérée comme nulle.
  const current = 0;

  return { allowed: current < max, current, max };
}

async function incrementUsage(userId, usageType, amount = 1) {
  // TODO: Implémenter la logique d'incrémentation de l'utilisation.
  // Cela nécessitera une table pour stocker les données d'utilisation par utilisateur.
  return null;
}

module.exports = { getUserPlanInfo, checkFeatureAccess, checkLimit, incrementUsage };
