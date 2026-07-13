const pool = require('../db')
const { ROLES, normalizeRole, isSalesRole } = require('../constants/roles')

async function requireSalesAccess(req, res, next) {
  try {
    const userId = Number(req.user?.id || req.user?.userId)
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'sales_auth_required' })
    }

    const result = await pool.query(
      `SELECT id, email, username, first_name, last_name, role, status,
              suspended_at, deleted_at, must_change_password
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    )
    const user = result.rows[0]
    if (!user || user.deleted_at) {
      return res.status(401).json({ error: 'sales_user_inactive' })
    }
    if (user.suspended_at || String(user.status || 'active').toLowerCase() === 'suspended') {
      return res.status(403).json({ error: 'sales_user_suspended' })
    }

    user.role = normalizeRole(user.role)
    if (!isSalesRole(user.role)) {
      return res.status(403).json({ error: 'sales_access_forbidden' })
    }

    req.salesUser = user
    next()
  } catch (error) {
    next(error)
  }
}

function requireSalesSuperAdmin(req, res, next) {
  if (normalizeRole(req.salesUser?.role) !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({ error: 'super_admin_required' })
  }
  next()
}

function isSalesSuperAdmin(req) {
  return normalizeRole(req.salesUser?.role) === ROLES.SUPER_ADMIN
}

module.exports = {
  requireSalesAccess,
  requireSalesSuperAdmin,
  isSalesSuperAdmin,
}
