import React, { _useEffect, _useRef } from 'react'

/**
 * COURTIA — Aurora Bubble C
 * Logo officiel — Bulle iridescente en forme de C
 * Référence : /public/courtia-bubble-C-reference.html
 */

// ─── SVG GRADIENTS (définis une seule fois) ───
const Gradients = ({ animated = true }) => (
  <defs>
    {/* Liquid film filter */}
    <filter id="liquidFilm" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="3" seed="7" result="noise">
        {animated && <animate attributeName="baseFrequency" values="0.008;0.014;0.008" dur="18s" repeatCount="indefinite" />}
        {animated && <animate attributeName="seed" values="7;25;7" dur="22s" repeatCount="indefinite" />}
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" />
    </filter>

    <filter id="softBlur"><feGaussianBlur stdDeviation="2" /></filter>
    <filter id="hardBlur"><feGaussianBlur stdDeviation="6" /></filter>

    {/* Iridescent gradients */}
    <linearGradient id="iris1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#ff80e0" stopOpacity="0.95" />
      <stop offset="18%" stopColor="#c080ff" stopOpacity="0.95" />
      <stop offset="36%" stopColor="#80a8ff" stopOpacity="0.95" />
      <stop offset="54%" stopColor="#80f0d8" stopOpacity="0.95" />
      <stop offset="72%" stopColor="#fff080" stopOpacity="0.95" />
      <stop offset="90%" stopColor="#ff80b0" stopOpacity="0.95" />
      <stop offset="100%" stopColor="#ff80e0" stopOpacity="0.95" />
      {animated && <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="20s" repeatCount="indefinite" />}
    </linearGradient>

    <linearGradient id="iris2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#80ffe0" stopOpacity="0.7" />
      <stop offset="33%" stopColor="#ff80c0" stopOpacity="0.7" />
      <stop offset="66%" stopColor="#a080ff" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#ffd080" stopOpacity="0.7" />
      {animated && <animateTransform attributeName="gradientTransform" type="rotate" from="360 0.5 0.5" to="0 0.5 0.5" dur="28s" repeatCount="indefinite" />}
    </linearGradient>

    <linearGradient id="iris3" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
      <stop offset="40%" stopColor="#ffb0e8" stopOpacity="0.5" />
      <stop offset="70%" stopColor="#a0c8ff" stopOpacity="0.5" />
      <stop offset="100%" stopColor="#80ffd0" stopOpacity="0.4" />
      {animated && <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="-360 0.5 0.5" dur="35s" repeatCount="indefinite" />}
    </linearGradient>

    <radialGradient id="membrane" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
      <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
      <stop offset="92%" stopColor="#ffd0ff" stopOpacity="0.18" />
      <stop offset="100%" stopColor="#a080ff" stopOpacity="0.35" />
    </radialGradient>

    <radialGradient id="spec1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
      <stop offset="40%" stopColor="#ffffff" stopOpacity="0.4" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </radialGradient>

    <radialGradient id="spec2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </radialGradient>

    {/* The C shape */}
    <clipPath id="cClip">
      <path d="M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z" />
    </clipPath>
  </defs>
)

// ─── BUBBLE C SHAPE PATH ───
const C_PATH = "M 473 200 A 200 200 0 1 0 473 400 L 413 365 A 130 130 0 1 1 413 235 Z"

// ─── MAIN COMPONENT ───
export default function CourtiaBubbleLogo({ 
  size = 520, 
  animated = true, 
  showHalo = true,
  showFoam = true,
  showSpecular = true,
  style,
  className
}) {
  return (
    <div className={className} style={{ 
      position: 'relative',
      width: size,
      height: size,
      ...(animated ? { animation: 'courtiaBreathe 7s ease-in-out infinite' } : {}),
      ...style
    }}>
      {/* Halo outer glow */}
      {showHalo && (
        <div style={{
          position: 'absolute',
          inset: '-10%',
          background: `
            radial-gradient(circle at 30% 30%, rgba(255,100,200,0.25) 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, rgba(100,200,255,0.2) 0%, transparent 45%),
            radial-gradient(circle at 50% 80%, rgba(180,100,255,0.18) 0%, transparent 50%)
          `,
          filter: 'blur(50px)',
          animation: animated ? 'courtiaHaloShift 8s ease-in-out infinite' : 'none',
          zIndex: -1,
          pointerEvents: 'none',
        }} />
      )}

      {/* Main SVG Bubble C */}
      <svg viewBox="0 0 600 600" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
        <Gradients animated={animated} />

        {/* Layer 0 — Outer iridescent halo (behind) */}
        <path d={C_PATH} fill="url(#iris1)" opacity="0.4" filter="url(#hardBlur)" transform="scale(1.08) translate(-22,-22)" />

        {/* Layer 1 — Main C body (iridescent membrane) */}
        <g filter={animated ? "url(#liquidFilm)" : undefined}>
          <path d={C_PATH} fill="url(#iris1)" opacity="0.55" />
          <path d={C_PATH} fill="url(#iris2)" opacity="0.45" style={{ mixBlendMode: 'screen' }} />
          <path d={C_PATH} fill="url(#iris3)" opacity="0.4" style={{ mixBlendMode: 'overlay' }} />
          <path d={C_PATH} fill="url(#membrane)" />
        </g>

        {/* Layer 2 — Edge highlights */}
        <path d="M 473 200 A 200 200 0 1 0 473 400" fill="none" stroke="url(#iris1)" strokeWidth="3" opacity="0.95" />
        <path d="M 473 200 A 200 200 0 1 0 473 400" fill="none" stroke="white" strokeWidth="1.2" opacity="0.6" />
        <path d="M 413 235 A 130 130 0 1 1 413 365" fill="none" stroke="url(#iris2)" strokeWidth="2.5" opacity="0.9" />
        <path d="M 413 235 A 130 130 0 1 1 413 365" fill="none" stroke="white" strokeWidth="1" opacity="0.5" />
        <line x1="473" y1="200" x2="413" y2="235" stroke="url(#iris1)" strokeWidth="2.5" opacity="0.85" />
        <line x1="473" y1="400" x2="413" y2="365" stroke="url(#iris1)" strokeWidth="2.5" opacity="0.85" />

        {/* Layer 3 — Specular highlights */}
        {showSpecular && (
          <g clipPath="url(#cClip)">
            <ellipse cx="170" cy="220" rx="55" ry="90" fill="url(#spec1)" transform="rotate(-25 170 220)" opacity="0.85" />
            <ellipse cx="140" cy="320" rx="22" ry="55" fill="url(#spec2)" opacity="0.6" />
            <ellipse cx="200" cy="430" rx="40" ry="25" fill="url(#spec2)" transform="rotate(15 200 430)" opacity="0.5" />
            <circle cx="150" cy="190" r="3" fill="white" opacity="0.95" />
            <circle cx="150" cy="190" r="8" fill="white" opacity="0.3" filter="url(#softBlur)" />
            <circle cx="120" cy="330" r="2" fill="white" opacity="0.9" />
            <circle cx="120" cy="330" r="5" fill="white" opacity="0.25" filter="url(#softBlur)" />
          </g>
        )}

        {/* Layer 4 — Foam bubbles */}
        {showFoam && (
          <g opacity="0.92">
            <circle cx="445" cy="155" r="22" fill="url(#membrane)" stroke="url(#iris1)" strokeWidth="1.5" opacity="0.85" />
            <ellipse cx="438" cy="148" rx="6" ry="4" fill="white" opacity="0.7" />
            <circle cx="478" cy="135" r="16" fill="url(#membrane)" stroke="url(#iris2)" strokeWidth="1.2" opacity="0.85" />
            <ellipse cx="473" cy="130" rx="4" ry="3" fill="white" opacity="0.65" />
            <circle cx="420" cy="138" r="11" fill="url(#membrane)" stroke="url(#iris1)" strokeWidth="1" opacity="0.8" />
            <ellipse cx="417" cy="135" rx="3" ry="2" fill="white" opacity="0.6" />
            <circle cx="500" cy="158" r="7" fill="url(#membrane)" stroke="white" strokeWidth="0.8" opacity="0.7" />
            <circle cx="460" cy="120" r="5" fill="url(#membrane)" stroke="white" strokeWidth="0.6" opacity="0.6" />
          </g>
        )}

        {/* Layer 5 — Top rim light */}
        <path d="M 200 180 A 180 180 0 0 1 350 130" fill="none" stroke="white" strokeWidth="2" opacity="0.4" filter="url(#softBlur)" />
      </svg>
    </div>
  )
}

// ─── CSS keyframes (inject once) ───
const styleId = 'courtia-bubble-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @keyframes courtiaBreathe {
      0%, 100% { transform: scale(1) translateY(0); }
      50% { transform: scale(1.025) translateY(-6px); }
    }
    @keyframes courtiaHaloShift {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
      50% { transform: scale(1.15) rotate(180deg); opacity: 1; }
    }
  `
  document.head.appendChild(style)
}
