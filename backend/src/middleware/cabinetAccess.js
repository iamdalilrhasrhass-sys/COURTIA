const pool = require('../db')
const cabinetMembershipService = require('../services/cabinetMembershipService')
const { isFeatureEnabled } = require('../lib/featureFlags')

function getUserId(req) {
  return cabinetMembershipService.getSafeUserId(req.user)
}

async function attachCabinet(req, res, next) {
  try {
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required', message: 'Authentification requise.' })
    req.cabinetMembership = await cabinetMembershipService.ensureUserCabinet(pool, req.user)
    req.cabinetId = req.cabinetMembership.cabinet_id
    next()
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'cabinet_context_failed', message: err.message || 'Contexte cabinet indisponible.' })
  }
}

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.cabinetMembership) {
        const userId = getUserId(req)
        if (!userId) return res.status(401).json({ error: 'auth_required', message: 'Authentification requise.' })
        req.cabinetMembership = await cabinetMembershipService.ensureUserCabinet(pool, req.user)
        req.cabinetId = req.cabinetMembership.cabinet_id
      }
      const currentRole = cabinetMembershipService.normalizeCabinetRole(req.user?.role === 'super_admin' ? 'super_admin' : req.cabinetMembership.role)
      const allowed = roles.map(cabinetMembershipService.normalizeCabinetRole)
      if (currentRole === 'super_admin' || allowed.includes(currentRole)) return next()
      return res.status(403).json({ error: 'forbidden_role', message: 'Rôle insuffisant pour cette action cabinet.' })
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.code || 'role_check_failed', message: err.message || 'Vérification du rôle impossible.' })
    }
  }
}

function requireCabinetAccess(req, res, next) {
  return attachCabinet(req, res, next)
}

function requireCabinetFeature(flagKey) {
  return async (req, res, next) => {
    try {
      if (!req.cabinetMembership) {
        await attachCabinet(req, res, () => {})
        if (!req.cabinetMembership) return
      }
      if (req.user?.role === 'super_admin') return next()
      const enabled = await isFeatureEnabled({
        userId: getUserId(req),
        cabinetId: String(req.cabinetId || ''),
        key: flagKey,
      })
      if (enabled) return next()
      return res.status(403).json({
        error: 'feature_disabled',
        message: 'Cette fonctionnalité COURTIA V1 est désactivée pour ce cabinet.',
        feature_flag: flagKey,
      })
    } catch (err) {
      return res.status(503).json({
        error: 'feature_flag_unavailable',
        message: 'Vérification feature flag indisponible.',
      })
    }
  }
}

module.exports = {
  attachCabinet,
  requireCabinetAccess,
  requireRole,
  requireCabinetFeature,
}
