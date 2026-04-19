// Stub — plan management not yet implemented. All access granted (fail open).

async function getUserPlanInfo(userId) {
  return { plan: 'start', limits: { features: {} } };
}

async function checkFeatureAccess(userId, featureKey) {
  return true;
}

async function checkLimit(userId, limitType) {
  return { allowed: true, current: 0, max: 9999 };
}

async function incrementUsage(userId, usageType, amount = 1) {
  return null;
}

module.exports = { getUserPlanInfo, checkFeatureAccess, checkLimit, incrementUsage };
