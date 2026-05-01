import React from 'react'
import { Link } from 'react-router-dom'

/**
 * AuroraButton — Bouton premium COURTIA
 * 
 * Variants :
 *   primary   — dégradé Aurora (cyan → indigo), glow hover
 *   secondary — glassmorphism, bordure iridescente
 *   ghost     — transparent, glow au hover
 * 
 * Props :
 *   variant   — 'primary' | 'secondary' | 'ghost' (default: 'primary')
 *   size      — 'sm' | 'md' | 'lg' (default: 'md')
 *   icon      — ReactNode optionnel (gauche)
 *   loading   — boolean, affiche un spinner discret
 *   disabled  — boolean
 *   href      — si fourni, rend un <Link> react-router
 *   ...props  — transmis au <button> ou <Link>
 */

const SIZE_CLASSES = {
  sm: 'px-4 py-2 text-xs rounded-lg gap-1.5',
  md: 'px-6 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-8 py-3.5 text-base rounded-xl gap-2.5',
}

const VARIANT_CLASSES = {
  primary: `
    text-white font-semibold
    bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500
    bg-[length:200%_100%] bg-[position:0%_50%]
    shadow-lg shadow-violet-500/20
    hover:shadow-xl hover:shadow-violet-500/30
    hover:bg-[position:100%_50%]
    active:scale-[0.98]
    transition-all duration-300
    border border-transparent
  `,
  secondary: `
    text-gray-200 font-medium
    bg-white/[0.04] backdrop-blur-xl
    border border-white/[0.08]
    shadow-md shadow-black/10
    hover:bg-white/[0.08] hover:border-white/[0.16] hover:text-white
    hover:shadow-lg hover:shadow-violet-500/10
    active:scale-[0.98]
    transition-all duration-200
  `,
  ghost: `
    text-gray-400 font-medium
    bg-transparent
    border border-transparent
    hover:text-white hover:bg-white/[0.05]
    active:scale-[0.98]
    transition-all duration-200
  `,
}

const LOADING_DOT = (
  <span className="inline-flex gap-1 items-center">
    {[0, 1, 2].map(i => (
      <span key={i} className="inline-block w-1 h-1 rounded-full bg-current opacity-60"
        style={{ animation: `auroraBtnDot 1.4s ease-in-out ${i * 0.2}s infinite` }}
      />
    ))}
    <style>{`
      @keyframes auroraBtnDot {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
        40% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  </span>
)

export default function AuroraButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  href,
  children,
  className = '',
  ...props
}) {
  const baseClasses = `
    inline-flex items-center justify-center
    font-sans tracking-[0.01em]
    cursor-pointer select-none
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
    ${SIZE_CLASSES[size]}
    ${VARIANT_CLASSES[variant]}
    ${className}
  `.replace(/\s+/g, ' ').trim()

  const content = (
    <>
      {loading ? LOADING_DOT : icon && <span className="shrink-0">{icon}</span>}
      {loading ? null : children}
    </>
  )

  if (href && !disabled) {
    return (
      <Link to={href} className={baseClasses} {...props}>
        {content}
      </Link>
    )
  }

  return (
    <button className={baseClasses} disabled={disabled || loading} {...props}>
      {content}
    </button>
  )
}
