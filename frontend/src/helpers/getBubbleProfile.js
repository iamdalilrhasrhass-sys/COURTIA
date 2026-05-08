/**
 * COURTIA — Bubble Visual Profile Mapper
 * Calcule le profil visuel d'une bulle client selon :
 * - status (prospect/actif/inactif/résilié)
 * - segment (particulier/professionnel)
 * - risk_score
 * - silent_alert
 *
 * Palette premium désaturée — pas de couleurs criardes.
 */

// ─── PALETTE PREMIUM ───
const PALETTE = {
  prospect: {
    base: '#5E9EFF',        // bleu glacier
    light: 'rgba(148,190,255,0.80)',
    mid: 'rgba(94,158,255,0.55)',
    dark: 'rgba(56,116,219,0.85)',
    halo: 'rgba(94,158,255,0.25)',
    label: 'Prospect',
  },
  actif: {
    base: '#5EC4A7',        // vert sauge
    light: 'rgba(140,217,189,0.80)',
    mid: 'rgba(94,196,167,0.55)',
    dark: 'rgba(56,157,131,0.85)',
    halo: 'rgba(94,196,167,0.25)',
    label: 'Actif',
  },
  inactif: {
    base: '#A8B4C0',        // gris argent
    light: 'rgba(195,202,209,0.80)',
    mid: 'rgba(168,180,192,0.55)',
    dark: 'rgba(119,131,144,0.85)',
    halo: 'rgba(168,180,192,0.18)',
    label: 'Inactif',
  },
  resilié: {
    base: '#C4828A',        // bordeaux doux
    light: 'rgba(219,160,167,0.80)',
    mid: 'rgba(196,130,138,0.55)',
    dark: 'rgba(156,88,96,0.85)',
    halo: 'rgba(196,130,138,0.18)',
    label: 'Résilié',
  },
  opportunite: {
    base: '#A896D4',        // violet doux
    light: 'rgba(194,179,224,0.80)',
    mid: 'rgba(168,150,212,0.55)',
    dark: 'rgba(128,108,176,0.85)',
    halo: 'rgba(168,150,212,0.25)',
    label: 'Opportunité',
  },
  a_risque: {
    base: '#E895A3',        // rose corail désaturé
    light: 'rgba(244,187,193,0.80)',
    mid: 'rgba(232,149,163,0.55)',
    dark: 'rgba(200,100,115,0.85)',
    halo: 'rgba(232,149,163,0.22)',
    label: 'À risque',
  },
}

// ─── RISK LEVEL ───
function getRiskLevel(score) {
  const s = Number(score) || 0
  if (s >= 70) return 'high'
  if (s >= 40) return 'medium'
  return 'low'
}

function getRiskConfig(level) {
  switch (level) {
    case 'high':
      return {
        ringOpacity: 0.7,
        ringWidth: 1.8,
        ringPulse: true,
        ringColor: 'rgba(232,149,163,0.6)',
        badgeBg: 'rgba(232,149,163,0.15)',
        badgeColor: '#D47788',
      }
    case 'medium':
      return {
        ringOpacity: 0.4,
        ringWidth: 1.2,
        ringPulse: false,
        ringColor: 'rgba(200,180,140,0.4)',
        badgeBg: 'rgba(200,180,140,0.10)',
        badgeColor: '#B8A060',
      }
    case 'low':
    default:
      return {
        ringOpacity: 0.15,
        ringWidth: 0.6,
        ringPulse: false,
        ringColor: 'rgba(255,255,255,0.15)',
        badgeBg: 'transparent',
        badgeColor: '#9CA3AF',
      }
  }
}

// ─── SEGMENT STYLE ───
function getSegmentConfig(segment) {
  const s = (segment || '').toLowerCase()
  if (['professionnel', 'entreprise', 'tpe', 'pme'].includes(s)) {
    return {
      borderStyle: '1px solid rgba(255,255,255,0.25)',
      cornerRadius: '20%', // légèrement plus carré = corporate
      initialsWeight: 800,
    }
  }
  return {
    borderStyle: '0.5px solid rgba(255,255,255,0.18)',
    cornerRadius: '50%',
    initialsWeight: 700,
  }
}

// ─── MAIN EXPORT ───
export default function getBubbleProfile(client) {
  // Normalize status
  const rawStatus = (client.status || client.statut || 'prospect').toLowerCase()
  const status = ['resilié', 'perdu'].includes(rawStatus) ? 'résilié' : rawStatus
  const colors = PALETTE[status] || PALETTE.prospect

  // Risk
  const riskScore = client.riskScore ?? client.score_risque ?? 0
  const riskLevel = getRiskLevel(riskScore)
  const riskCfg = getRiskConfig(riskLevel)

  // Segment
  const segment = client.segment || client.type || 'particulier'
  const segCfg = getSegmentConfig(segment)

  // Silent alert
  const hasAlert = !!(client.silent_alert)

  // Bonus malus
  const bonusMalus = client.bonus_malus != null ? Number(client.bonus_malus) : null
  const bmGood = bonusMalus !== null && bonusMalus <= 0.8 // bon conducteur

  return {
    // Colors
    ...colors,
    // Risk
    riskScore,
    riskLevel,
    ring: riskCfg,
    // Segment
    segment,
    segmentStyle: segCfg,
    // Indicators
    hasAlert,
    bonusMalus,
    bmGood,
    // Computed
    intensity: riskLevel === 'high' ? 'high' : riskLevel === 'medium' ? 'medium' : 'subtle',
  }
}
