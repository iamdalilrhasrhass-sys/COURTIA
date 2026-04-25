import React from 'react'
export default function Logo({ size = 80, dark = false, animated = true, withText = true, textSize = 24 }) {
  const w = size
  const h = Math.round(size * 0.9)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.22) }}>
      <span style={{ display: 'inline-block', animation: animated ? 'logoFloat 5s ease-in-out infinite' : 'none' }}>
        <svg width={w} height={h} viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="bubbleC-tube" cx="32%" cy="22%" r="85%">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="12%" stopColor="rgba(255,255,255,0.92)" />
              <stop offset="28%" stopColor="rgba(232,247,255,0.75)" />
              <stop offset="48%" stopColor="rgba(186,230,253,0.6)" />
              <stop offset="68%" stopColor={dark ? "rgba(167,139,250,0.7)" : "rgba(196,181,253,0.55)"} />
              <stop offset="88%" stopColor={dark ? "rgba(124,58,237,0.75)" : "rgba(167,139,250,0.6)"} />
              <stop offset="100%" stopColor={dark ? "rgba(124,58,237,0.8)" : "rgba(124,58,237,0.65)"} />
            </radialGradient>
            <radialGradient id="bubbleC-sat" cx="30%" cy="25%" r="80%">
              <stop offset="0%" stopColor="rgba(255,255,255,1)" />
              <stop offset="35%" stopColor="rgba(232,247,255,0.7)" />
              <stop offset="70%" stopColor="rgba(186,230,253,0.55)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0.55)" />
            </radialGradient>
            <linearGradient id="bubbleC-iris" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(186,230,253,0.4)" />
              <stop offset="33%" stopColor="rgba(196,181,253,0.35)" />
              <stop offset="66%" stopColor="rgba(253,186,116,0.3)" />
              <stop offset="100%" stopColor="rgba(236,72,153,0.4)" />
            </linearGradient>
            <filter id="bubbleC-soft"><feGaussianBlur stdDeviation="0.5" /></filter>
          </defs>
          {dark && (
            <ellipse cx="32" cy="34" rx="36" ry="36" fill="rgba(96,165,250,0.18)" />
          )}
          <path d="M 56 22 A 22 22 0 1 0 56 46" fill="none" stroke="rgba(80,60,140,0.16)" strokeWidth="16" strokeLinecap="round" transform="translate(0,3)" filter="url(#bubbleC-soft)" opacity="0.5" />
          <path d="M 56 22 A 22 22 0 1 0 56 46" fill="none" stroke="url(#bubbleC-tube)" strokeWidth="14" strokeLinecap="round" />
          <path d="M 56 22 A 22 22 0 1 0 56 46" fill="none" stroke="url(#bubbleC-iris)" strokeWidth="13.5" strokeLinecap="round" opacity="0.32" style={{ mixBlendMode: 'screen' }} />
          <path d="M 24 16 Q 14 24 11 34" fill="none" stroke="rgba(255,255,255,0.93)" strokeWidth="3.5" strokeLinecap="round" filter="url(#bubbleC-soft)" />
          <ellipse cx="34" cy="11" rx="3.2" ry="2" fill="rgba(255,255,255,0.85)" transform="rotate(-12 34 11)" filter="url(#bubbleC-soft)" />
          <ellipse cx="14" cy="44" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.65)" filter="url(#bubbleC-soft)" />
          <ellipse cx="50" cy="52" rx="2.8" ry="1.6" fill="rgba(255,255,255,0.6)" filter="url(#bubbleC-soft)" />
          <ellipse cx="50" cy="16" rx="2.5" ry="1.4" fill="rgba(255,255,255,0.6)" filter="url(#bubbleC-soft)" />
          <circle cx="28" cy="9" r="1" fill="rgba(255,255,255,0.6)" />
          <circle cx="11" cy="28" r="0.8" fill="rgba(255,255,255,0.55)" />
          <g style={{ animation: animated ? 'satFloat 6s ease-in-out infinite' : 'none', transformOrigin: 'center' }}>
            <circle cx="68" cy="20" r="6.5" fill="url(#bubbleC-sat)" stroke="rgba(96,165,250,0.45)" strokeWidth="0.6" />
            <circle cx="68" cy="20" r="6.5" fill="url(#bubbleC-iris)" opacity="0.3" style={{ mixBlendMode: 'screen' }} />
            <ellipse cx="65.5" cy="17.5" rx="2.2" ry="1.5" fill="rgba(255,255,255,0.92)" transform="rotate(-25 65.5 17.5)" filter="url(#bubbleC-soft)" />
            <ellipse cx="71" cy="23" rx="0.9" ry="0.5" fill="rgba(255,255,255,0.55)" />
          </g>
        </svg>
      </span>
      {withText && (
        <span style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: textSize, fontWeight: 700, letterSpacing: '0.06em', color: dark ? '#ffffff' : '#0a0a0a' }}>COURTIA</span>
      )}
      <style>{`
        @keyframes logoFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        @keyframes satFloat  { 0%,100% { transform: translate(0,0) } 50% { transform: translate(1.5px,-3px) } }
      `}</style>
    </span>
  )
}
