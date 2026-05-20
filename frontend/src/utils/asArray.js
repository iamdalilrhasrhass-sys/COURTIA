// /root/courtia/frontend/src/utils/asArray.js
// Safe array extraction from API payloads — prevents "r.map is not a function" crashes

/**
 * Ensures the value is a real array. Handles common API response shapes.
 */
export function asArray(value) {
  if (Array.isArray(value)) return value
  if (value == null) return []
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.results)) return value.results
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.renewals)) return value.renewals
  if (Array.isArray(value?.policies)) return value.policies
  if (Array.isArray(value?.contracts)) return value.contracts
  if (Array.isArray(value?.quotes)) return value.quotes
  if (Array.isArray(value?.messages)) return value.messages
  if (Array.isArray(value?.leads)) return value.leads
  if (Array.isArray(value?.notifications)) return value.notifications
  return []
}

/**
 * Returns the first non-empty array from a list of values.
 */
export function firstArray(...values) {
  for (const value of values) {
    const arr = asArray(value)
    if (arr.length > 0) return arr
  }
  return []
}

export default asArray
