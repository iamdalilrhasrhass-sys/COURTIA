import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * ClientBubbleGridPremium — Bulles clients "cockpit intelligent" COURTIA.
 * 
 * Direction visuelle : verre sombre irisé, halos Aurora Bubble C,
 * reflets cristal, profondeur premium. Pure presentational.
 * No API calls, no auth, no business logic.
 */

/* ═══════════ SAFE HELPERS (no .split crash) ═══════════ */
function safeName(client) {
  const raw = client?.name || `${client?.nom || ''} ${client?.prenom || ''}`.trim()
  return raw || 'Client'
}

function safeInitials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function safeStatus(client) {
  const raw = ((client?.status || client?.statut || 'prospect') + '').toLowerCase()
  const map = {
    prospect:'Prospect', actif:'Actif', inactif:'Inactif',
    résilié:'Résilié', resilié:'Résilié', perdu:'Perdu',
    a_risque:'À risque', opportunite:'Opportunité',
  }
  return map[raw] || 'Prospect'
}

function statusRingColor(client) {
  const st = ((client?.status || client?.statut || '') + '').toLowerCase()
  const map = {
    a_risque:    ['rgba(244,114,182,0.7)', 'rgba(236,72,153,0.3)'],
    prospect:    ['rgba(147,197,253,0.6)', 'rgba(59,130,246,0.3)'],
    actif:       ['rgba(94,196,167,0.5)',  'rgba(16,185,129,0.25)'],
    inactif:     ['rgba(156,163,175,0.3)', 'rgba(156,163,175,0.12)'],
    résilié:     ['rgba(156,163,175,0.2)', 'rgba(156,163,175,0.08)'],
    resilié:     ['rgba(156,163,175,0.2)', 'rgba(156,163,175,0.08)'],
    perdu:       ['rgba(239,68,68,0.35)',  'rgba(239,68,68,0.15)'],
    opportunite: ['rgba(167,139,250,0.65)','rgba(124,58,237,0.3)'],
  }
  return map[st] || ['rgba(156,163,175,0.3)', 'rgba(156,163,175,0.12)']
}

function riskBadge(client) {
  const risk = Number(client?.riskScore ?? client?.score_risque ?? 0) || 0
  if (risk >= 70) return { show: true, label: 'URG', color: '#f43f5e' }
  if (risk >= 40) return { show: true, label: 'À FAIRE', color: '#f59e0b' }
  return { show: false }
}

function clientOpacity(client) {
  const st = ((client?.status || client?.statut || '') + '').toLowerCase()
  return ['inactif','résilié','resilié','perdu'].includes(st) ? 0.45 : 1
}

/* ═══════════ AURORA HALO (ring around bubble) ═══════════ */
function AuroraRing({ colors, _size, selected }) {
  const [outer] = colors
  return (
    <div style={{
      position: 'absolute',
      inset: selected ? -5 : -3,
      borderRadius: '50%',
      border: `${selected ? 2 : 1.5}px solid transparent`,
      background: `conic-gradient(from 0deg, ${outer}, rgba(124,58,237,0.15), rgba(6,182,212,0.2), ${outer}) border-box`,
      WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
      filter: selected ? 'blur(0.5px)' : 'blur(0.3px)',
      transition: 'inset 0.3s ease, border-width 0.3s ease',
    }} />
  )
}

/* ═══════════ BUBBLE AVATAR ═══════════ */
const avatarAnim = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.85 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
}

function BubbleAvatar({ client, selected, onClick }) {
  const name   = useMemo(() => safeName(client), [client])
  const init   = useMemo(() => safeInitials(name), [name])
  const status = useMemo(() => safeStatus(client), [client])
  const ring   = useMemo(() => statusRingColor(client), [client])
  const badge  = useMemo(() => riskBadge(client), [client])
  const opacity = useMemo(() => clientOpacity(client), [client])
  const shortName = name.length > 18 ? name.slice(0, 16) + '…' : name
  const size = 'clamp(72px, 11vw, 96px)'

  return (
    <motion.button
      {...avatarAnim}
      onClick={() => onClick(client?.id)}
      aria-label={`${name}, ${status}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        cursor: 'pointer', background: 'none', border: 'none',
        padding: '6px 2px', opacity,
        width: '100%',
        outline: 'none',
      }}
      whileHover={{ y: -3, transition: { duration: 0.25 } }}
      whileTap={{ scale: 0.97 }}
    >
      {/* --- Avatar circle --- */}
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Aurora ring */}
        <AuroraRing colors={ring} size={size} selected={selected} />

        {/* Glow halo behind bubble */}
        <div style={{
          position: 'absolute', inset: -10,
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 45%, ${ring[1]}, transparent 68%)`,
          filter: 'blur(8px)',
        }} />

        {/* Main glass sphere */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: `
            radial-gradient(ellipse 65% 45% at 40% 28%, rgba(255,255,255,0.10) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(15,23,42,0.35), rgba(8,9,13,0.65) 70%, rgba(2,4,8,0.80) 100%)
          `,
          boxShadow: selected
            ? `0 0 20px ${ring[1]}, 0 0 40px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.08)`
            : '0 4px 20px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          transition: 'box-shadow 0.35s ease',
        }}>
          {/* Specular highlight (top-left arc) */}
          <div style={{
            position: 'absolute',
            top: '8%', left: '14%',
            width: '34%', height: '22%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 35% 30%, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 70%, transparent)',
            filter: 'blur(2px)',
            transform: 'rotate(-15deg)',
          }} />
          {/* Secondary highlight (bottom-right) */}
          <div style={{
            position: 'absolute',
            bottom: '10%', right: '12%',
            width: '22%', height: '12%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 60% 70%, rgba(200,180,255,0.05), transparent)',
            filter: 'blur(3px)',
          }} />
          {/* Initials */}
          <span style={{
            fontSize: 'clamp(20px, 3.5vw, 27px)',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.88)',
            letterSpacing: '-0.01em',
            textShadow: '0 1px 3px rgba(0,0,0,0.40)',
            zIndex: 1,
          }}>
            {init}
          </span>
        </div>

        {/* Risk badge */}
        {badge.show && (
          <div style={{
            position: 'absolute', top: -6, right: -4,
            background: badge.color,
            color: '#fff',
            fontSize: 9, fontWeight: 800,
            padding: '2px 7px', borderRadius: 999,
            letterSpacing: '0.05em',
            boxShadow: '0 2px 6px rgba(0,0,0,0.30)',
            lineHeight: 1.3,
            zIndex: 2,
          }}>
            {badge.label}
          </div>
        )}
      </div>

      {/* --- Name --- */}
      <span style={{
        fontSize: 'clamp(10px, 1.3vw, 12px)',
        fontWeight: 600,
        color: 'rgba(255,255,255,0.82)',
        maxWidth: 100, textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}>
        {shortName}
      </span>

      {/* --- Status dot + label --- */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 10, fontWeight: 500,
        color: 'rgba(255,255,255,0.45)',
        lineHeight: 1,
      }}>
        <span style={{
          width: 4, height: 4, borderRadius: '50%',
          background: ring[0],
          flexShrink: 0,
        }} />
        {status}
      </span>
    </motion.button>
  )
}

/* ═══════════ SKELETON ═══════════ */
function SkeletonBubble() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      padding: '6px 2px', opacity: 0.3,
    }}>
      <div style={{
        width: 'clamp(72px, 11vw, 96px)', height: 'clamp(72px, 11vw, 96px)',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.04)',
      }} />
      <div style={{ width: 60, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
      <div style={{ width: 36, height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
    </div>
  )
}

/* ═══════════ EMPTY ═══════════ */
function EmptyCockpit() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 20px', opacity: 0.6,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'radial-gradient(circle at 35% 30%, rgba(124,58,237,0.06), transparent 60%)',
        marginBottom: 16,
      }} />
      <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 14 }}>Aucun client trouvé</p>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>Ajustez vos filtres ou ajoutez un nouveau client.</p>
    </div>
  )
}

/* ═══════════ COCKPIT HEADER ═══════════ */
function CockpitHeader({ total, _mode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10,
      padding: '6px 8px',
      borderRadius: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        <span>{total} contacts</span>
        <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'rgba(244,114,182,0.65)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(244,114,182,0.7)', boxShadow: '0 0 4px rgba(244,114,182,0.4)' }} />
          Urgent
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'rgba(245,158,11,0.55)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(245,158,11,0.5)' }} />
          À faire
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'rgba(94,196,167,0.40)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(94,196,167,0.35)' }} />
          Stable
        </span>
      </div>
    </div>
  )
}

/* ═══════════ MAIN GRID ═══════════ */
export default function ClientBubbleGridPremium({ clients = [], loading = false, onClientClick }) {
  const [selectedId, setSelectedId] = React.useState(null)

  const safeClients = useMemo(() =>
    (Array.isArray(clients) ? clients : []).filter(Boolean),
  [clients])

  const handleClick = (id) => {
    setSelectedId(id)
    onClientClick?.(id)
  }

  if (loading) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px 6px', justifyContent: 'center',
        }} className="sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonBubble key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'rgba(8,9,13,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 20,
        border: '0.5px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25), 0 0 60px rgba(124,58,237,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
        padding: '18px 16px 14px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle aurora background inside cockpit */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 50% 40% at 20% 20%, rgba(124,58,237,0.06), transparent 60%),
          radial-gradient(ellipse 40% 35% at 70% 30%, rgba(6,182,212,0.04), transparent 55%),
          radial-gradient(ellipse 60% 50% at 50% 80%, rgba(236,72,153,0.03), transparent 60%)
        `,
      }} />

      <CockpitHeader total={safeClients.length} />

      {safeClients.length === 0 ? (
        <EmptyCockpit />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px 6px',
            }}
            className="sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {safeClients.map((client) => (
              <BubbleAvatar
                key={client?.id ?? Math.random()}
                client={client}
                selected={selectedId === client?.id}
                onClick={handleClick}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
