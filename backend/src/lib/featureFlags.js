const pool = require('../db')

const CACHE_TTL_MS = 60_000
const cache = new Map()

function cacheKey({ userId, cabinetId }) {
  return `${cabinetId || 'no-cabinet'}:${userId || 'no-user'}`
}

function rowsToFlags(rows) {
  return rows.reduce((acc, row) => {
    acc[row.key] = Boolean(row.enabled)
    return acc
  }, {})
}

async function getFeatureFlagsForUser({ userId, cabinetId = null }) {
  const key = cacheKey({ userId, cabinetId })
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.flags
  }

  const result = await pool.query(
    `SELECT
       ff.key,
       COALESCE(uo.enabled, co.enabled, ff.default_enabled) AS enabled
     FROM feature_flags ff
     LEFT JOIN feature_flag_overrides uo
       ON uo.flag_key = ff.key AND uo.user_id = $1
     LEFT JOIN feature_flag_overrides co
       ON co.flag_key = ff.key AND co.cabinet_id = $2
     ORDER BY ff.key`,
    [userId || null, cabinetId || null]
  )

  const flags = rowsToFlags(result.rows)
  cache.set(key, { at: Date.now(), flags })
  return flags
}

async function isFeatureEnabled({ userId, cabinetId = null, key }) {
  const flags = await getFeatureFlagsForUser({ userId, cabinetId })
  return Boolean(flags[key])
}

function clearFeatureFlagCache() {
  cache.clear()
}

module.exports = {
  getFeatureFlagsForUser,
  isFeatureEnabled,
  clearFeatureFlagCache,
}
