/**
 * @file dateUtils.js — Date formatting utilities.
 */

export function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function timeAgo(dateString) {
  if (!dateString) return 'Jamais'
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return "À l'instant"
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`
  const days = Math.floor(seconds / 86400)
  if (days < 30) return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `Il y a ${months} mois`
  return `Il y a ${Math.floor(days / 365)} an${Math.floor(days/365) > 1 ? 's' : ''}`
}

export function daysBetween(d1, d2) {
  if (!d1) return null
  const ref = d2 || new Date()
  return Math.floor((new Date(d1).getTime() - new Date(ref).getTime()) / 86400000)
}
