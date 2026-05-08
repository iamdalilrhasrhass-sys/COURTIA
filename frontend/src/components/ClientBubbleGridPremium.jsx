import React from 'react'

/**
 * ClientBubbleGridPremium — Vue bulles Aurora premium.
 * Pure presentational. No API calls, no auth, no business logic.
 * Props:
 *   clients: Array of client objects
 *   loading: boolean
 *   onClientClick: (clientId: number) => void
 *   onAskArk: (clientId: number) => void
 *   onCreateTask: (clientId: number) => void
 */

/* ---- Helpers ---- */
function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getStatusLabel(client) {
  const st = (client.status || client.statut || '').toLowerCase()
  const map = {
    prospect: 'Prospect',
    actif: 'Actif',
    inactif: 'Inactif',
    résilié: 'Résilié',
    resilié: 'Résilié',
    perdu: 'Perdu',
    a_risque: 'À risque',
    opportunite: 'Opportunité',
  }
  return map[st] || 'Inconnu'
}

function getStatusRingColor(client) {
  const st = (client.status || client.statut || '').toLowerCase()
  const ring = {
    a_risque: 'rgba(244,114,182,0.60)',
    prospect: 'rgba(147,197,253,0.40)',
    actif: 'rgba(94,196,167,0.35)',
    inactif: 'rgba(168,180,192,0.25)',
    résilié: 'rgba(168,180,192,0.20)',
    resilié: 'rgba(168,180,192,0.20)',
    perdu: 'rgba(239,68,68,0.25)',
    opportunite: 'rgba(180,160,230,0.45)',
  }
  return ring[st] || 'rgba(168,180,192,0.20)'
}

function getHaloColor(client) {
  const st = (client.status || client.statut || '').toLowerCase()
  const halo = {
    a_risque: 'rgba(244,114,182,0.12)',
    prospect: 'rgba(147,197,253,0.08)',
    actif: 'rgba(94,196,167,0.08)',
    inactif: 'rgba(168,180,192,0.04)',
    résilié: 'rgba(168,180,192,0.03)',
    resilié: 'rgba(168,180,192,0.03)',
    perdu: 'rgba(239,68,68,0.05)',
    opportunite: 'rgba(180,160,230,0.10)',
  }
  return halo[st] || 'rgba(168,180,192,0.03)'
}

function getMicroBadge(client) {
  const riskScore = client.riskScore ?? client.score_risque ?? 0
  const st = (client.status || client.statut || '').toLowerCase()

  if (st === 'a_risque' || riskScore >= 70) return { show: true, symbol: '!', bg: 'rgba(244,114,182,0.90)' }
  if (riskScore >= 40) return { show: true, symbol: '●', bg: 'rgba(251,191,36,0.85)' }
  return { show: false, symbol: '', bg: '' }
}

function getClientName(client) {
  const full = client.name || `${client.nom || ''} ${client.prenom || ''}`.trim()
  if (full && full.length > 16) return full.slice(0, 14) + '…'
  return full || '—'
}

/* ---- Aurora Glass SVG (uniform for all clients) ---- */
function AuroraBubbleSVG({ size, ringColor }) {
  const c = size / 2
  const r = size * 0.40
  const strokeW = Math.max(1, size * 0.012)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Status ring glow */}
      <circle cx={c} cy={c} r={r + 4} fill="none" stroke={ringColor} strokeWidth={strokeW * 1.5} opacity="0.5" filter="url(#auroraBlur)" />
      {/* Status ring */}
      <circle cx={c} cy={c} r={r + 2} fill="none" stroke={ringColor} strokeWidth={strokeW} opacity="0.85" />
      {/* Glass body */}
      <circle cx={c} cy={c} r={r} fill="url(#auroraGlass)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" opacity="0.95" />
      {/* Specular highlight */}
      <ellipse cx={c - r * 0.35} cy={c - r * 0.38} rx={r * 0.32} ry={r * 0.18} fill="rgba(255,255,255,0.55)" transform={`rotate(-14 ${c - r * 0.35} ${c - r * 0.38})`} />
      <ellipse cx={c - r * 0.43} cy={c - r * 0.42} rx={r * 0.08} ry={r * 0.04} fill="rgba(255,255,255,0.80)" transform={`rotate(-14 ${c - r * 0.43} ${c - r * 0.42})`} />
      {/* Defs */}
      <defs>
        <radialGradient id="auroraGlass" cx="28%" cy="25%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="15%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="40%" stopColor="rgba(220,210,240,0.45)" />
          <stop offset="70%" stopColor="rgba(200,210,230,0.25)" />
          <stop offset="100%" stopColor="rgba(180,190,215,0.15)" />
        </radialGradient>
        <filter id="auroraBlur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
    </svg>
  )
}

/* ---- Skeleton Loader ---- */
function SkeletonBubble() {
  return (
    <div className="flex flex-col items-center gap-2 animate-pulse">
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.06)' }} />
      <div className="w-14 h-2.5 bg-gray-200/20 rounded" />
      <div className="w-10 h-2 bg-gray-200/10 rounded-full" />
    </div>
  )
}

/* ---- Single Bubble ---- */
function BubbleItem({ client, onClick }) {
  const ringColor = getStatusRingColor(client)
  const haloColor = getHaloColor(client)
  const badge = getMicroBadge(client)

  return (
    <button
      onClick={() => onClick(client.id)}
      aria-label={`${getClientName(client)}, ${getStatusLabel(client)}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: '4px 2px',
        transition: 'transform 180ms ease, filter 180ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.filter = 'brightness(1.05)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'brightness(1)' }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {/* Bubble wrapper */}
      <div style={{ position: 'relative', width: 84, height: 84 }}>
        {/* Halo */}
        <div style={{
          position: 'absolute', inset: '-8px', borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${haloColor}, transparent 70%)`,
          filter: 'blur(6px)',
        }} />
        {/* SVG */}
        <AuroraBubbleSVG size={84} ringColor={ringColor} />
        {/* Initials */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700,
          color: 'rgba(15,23,42,0.85)',
          textShadow: '0 1px 2px rgba(255,255,255,0.3)',
        }}>
          {getInitials(getClientName(client))}
        </div>
        {/* Micro badge */}
        {badge.show && (
          <div style={{
            position: 'absolute', top: 4, right: 4,
            background: badge.bg, color: 'white',
            fontSize: 9, fontWeight: 800,
            minWidth: 16, height: 16, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            lineHeight: 1,
          }}>
            {badge.symbol}
          </div>
        )}
      </div>
      {/* Labels */}
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.2 }}>
        {getClientName(client)}
      </span>
      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', lineHeight: 1 }}>
        {getStatusLabel(client)}
      </span>
    </button>
  )
}

/* ---- Main Grid ---- */
export default function ClientBubbleGridPremium({ clients, loading, onClientClick }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3 justify-items-center">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonBubble key={i} />)}
        </div>
      </div>
    )
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: '0.5px solid rgba(255,255,255,0.10)', marginBottom: 20 }}>
          <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(160,140,220,0.07), transparent 70%)', filter: 'blur(10px)' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Aucun client dans ce segment</p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Ajoutez votre premier client pour activer le cockpit.</p>
      </div>
    )
  }

  return (
    <>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, paddingLeft: 4, fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span>Priorité ARK</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(244,114,182,0.8)' }} /> Urgent
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(251,191,36,0.7)' }} /> Relance
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(94,196,167,0.5)' }} /> Stable
        </span>
      </div>
      {/* Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 8px', paddingLeft: 4, paddingRight: 4, paddingTop: 8, paddingBottom: 8 }}>
        {clients.map(client => (
          <BubbleItem key={client.id} client={client} onClick={onClientClick} />
        ))}
      </div>
    </>
  )
}
