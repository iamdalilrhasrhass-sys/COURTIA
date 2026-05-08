/**
 * @file clientBubbleVariants.js — Visual variant mapping for client bubbles (V2).
 * Refonte mai 2026 : bulles Aurora premium, plus petites, plus denses, status-driven.
 * Fini les billes bleues. Glass uniforme, anneau différenciateur par signal.
 */

// ─── AURORA GLASS (base uniforme pour toutes les bulles) ───
export const AURORA_GLASS = {
  light: 'rgba(255,255,255,0.92)',
  mid: 'rgba(245,242,252,0.70)',
  dark: 'rgba(230,225,242,0.60)',
  halo: 'rgba(160,140,220,0.10)',
  border: 'rgba(255,255,255,0.45)',
  film: 'rgba(200,180,255,0.06)',
}

// ─── STATUS STYLES (anneau + halo + label) ───
// Basé sur le mainSignal de computeClientIntelligence
export const STATUS_STYLES = {
  // Urgence / Alerte → rose-rouge subtil
  Alerte: {
    ring: 'rgba(228,140,155,0.55)',
    haloColor: 'rgba(228,140,155,0.14)',
    label: 'Alerte',
    pulse: true,
  },
  'Alerte urgente': {
    ring: 'rgba(228,140,155,0.65)',
    haloColor: 'rgba(228,140,155,0.18)',
    label: 'Alerte urgente',
    pulse: true,
  },
  // Échéance → ambre
  'Échéance': {
    ring: 'rgba(210,170,90,0.50)',
    haloColor: 'rgba(210,170,90,0.12)',
    label: 'Échéance',
    pulse: false,
  },
  // À relancer → ambre doux
  'À relancer': {
    ring: 'rgba(210,170,90,0.35)',
    haloColor: 'rgba(210,170,90,0.08)',
    label: 'À relancer',
    pulse: false,
  },
  // Opportunité → violet/cyan
  'Opportunité': {
    ring: 'rgba(130,120,200,0.40)',
    haloColor: 'rgba(130,120,200,0.10)',
    label: 'Opportunité',
    pulse: false,
  },
  // Risque seul → rose doux
  'Risque': {
    ring: 'rgba(200,145,160,0.35)',
    haloColor: 'rgba(200,145,160,0.08)',
    label: 'Risque',
    pulse: false,
  },
  // Dossier incomplet → gris moyen
  'Incomplet': {
    ring: 'rgba(160,170,185,0.35)',
    haloColor: 'rgba(160,170,185,0.06)',
    label: 'Incomplet',
    pulse: false,
  },
  // Stable → vert menthe
  'Stable': {
    ring: 'rgba(94,196,167,0.30)',
    haloColor: 'rgba(94,196,167,0.07)',
    label: 'Stable',
    pulse: false,
  },
  // Prospect → bleu glacier très doux
  'Prospect': {
    ring: 'rgba(140,175,220,0.35)',
    haloColor: 'rgba(140,175,220,0.08)',
    label: 'Prospect',
    pulse: false,
  },
  // Inactif → gris froid
  'Inactif': {
    ring: 'rgba(168,180,192,0.25)',
    haloColor: 'rgba(168,180,192,0.05)',
    label: 'Inactif',
    pulse: false,
  },
  // Résilié → gris froid plus discret
  'Résilié': {
    ring: 'rgba(168,180,192,0.18)',
    haloColor: 'rgba(168,180,192,0.04)',
    label: 'Résilié',
    pulse: false,
  },
}

// ─── FALLBACK par statut (si le signal n'est pas mappé) ───
const STATUS_FALLBACK = {
  actif: STATUS_STYLES['Stable'],
  prospect: STATUS_STYLES['Prospect'],
  inactif: STATUS_STYLES['Inactif'],
  resilié: STATUS_STYLES['Résilié'],
  en_attente: STATUS_STYLES['Incomplet'],
}

// ─── BUBBLE SIZE (réduit pour densité premium) ───
export function getBubbleSize(priorityLevel) {
  switch (priorityLevel) {
    case 'urgent': return 88
    case 'high':   return 82
    case 'medium': return 76
    default:       return 72
  }
}

// ─── MICRO BADGE (uniquement pour les signaux critiques) ───
export function getMicroBadge(intelligence) {
  if (!intelligence) return null
  const sig = intelligence.mainSignal
  const prio = intelligence.priorityLevel
  // Badge "!" pour alerte
  if (sig === 'Alerte' || prio === 'urgent') {
    return { symbol: '!', color: 'rgba(228,140,155,0.9)' }
  }
  // Badge "⏱" pour échéance proche
  if (sig === 'Échéance') {
    return { symbol: '⏱', color: 'rgba(210,170,90,0.85)' }
  }
  return null
}

// ─── COMPUTE FULL BUBBLE CONFIG (V2) ───
export function getBubbleConfigV2(intelligence) {
  if (!intelligence) return null

  const signal = intelligence.mainSignal || 'Stable'
  const status = intelligence.status || 'prospect'
  const priority = intelligence.priorityLevel || 'low'

  // Trouver le style de statut (signal d'abord, fallback status)
  const statusStyle = STATUS_STYLES[signal] || STATUS_FALLBACK[status] || STATUS_STYLES['Stable']
  const size = getBubbleSize(priority)
  const microBadge = getMicroBadge(intelligence)

  return {
    // Verre uniforme
    glass: AURORA_GLASS,
    // Anneau + halo basé sur le signal
    statusStyle,
    // Taille réduite
    size,
    // Micro badge (null si aucun)
    microBadge,
    // Priorité pour tri
    priorityLevel: priority,
    // Signal principal comme label sous la bulle
    statusLabel: statusStyle.label,
  }
}

// ─── LEGACY (pour ne pas casser les autres usages) ───
export const TYPE_COLORS = {}
export const STATUS_RING = {}
export const PRIORITY_HALO = {}
export const BADGE_COLORS = {}
export function getBubbleConfig() { return null }
