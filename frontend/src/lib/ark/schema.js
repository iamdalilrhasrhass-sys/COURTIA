/**
 * Validation et normalisation des réponses ARK.
 * Schéma attendu : { resume, points[], actions[] }
 */

const MAX_RESUME = 200
const MAX_POINTS = 3
const MAX_POINT_LEN = 100
const MAX_ACTIONS = 3
const VALID_PRIORITIES = ['haute', 'moyenne', 'basse']

/**
 * Parse et valide la réponse brute d'ARK.
 * En cas d'échec : fallback avec resume tronqué, listes vides.
 * @param {string} raw
 * @returns {{ resume: string, points: string[], actions: {label, priorite, impact}[] }}
 */
export function validateArkResponse(raw) {
  if (!raw || typeof raw !== 'string') return fallback('')
  const trimmed = raw.trim()

  let parsed
  try {
    // Extraire le JSON s'il est entouré de markdown
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, trimmed]
    parsed = JSON.parse(match[1] || trimmed)
  } catch {
    return fallback(trimmed)
  }

  if (typeof parsed !== 'object' || parsed === null) return fallback(trimmed)

  const resume = typeof parsed.resume === 'string'
    ? parsed.resume.slice(0, MAX_RESUME)
    : trimmed.slice(0, MAX_RESUME)

  const points = Array.isArray(parsed.points)
    ? parsed.points.slice(0, MAX_POINTS).map(p => String(p).slice(0, MAX_POINT_LEN))
    : []

  const actions = Array.isArray(parsed.actions)
    ? parsed.actions.slice(0, MAX_ACTIONS).map(a => ({
        label:    String(a?.label || '').slice(0, 80),
        priorite: VALID_PRIORITIES.includes(a?.priorite) ? a.priorite : 'moyenne',
        impact:   String(a?.impact || '').slice(0, 100),
      }))
    : []

  return { resume, points, actions }
}

function fallback(raw) {
  return { resume: raw.slice(0, MAX_RESUME), points: [], actions: [] }
}
