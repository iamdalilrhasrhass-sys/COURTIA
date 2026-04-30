import React from 'react'

/**
 * GlassPanel — Carte vitrée avec effet glassmorphism et backdrop-blur
 * Props: { children, className, blur, opacity, border, padding }
 */
export default function GlassPanel({
  children,
  className = '',
  blur = 'md',
  opacity = 70,
  border = true,
  padding = 'p-6',
}) {
  const blurClass = blur === 'xl' ? 'backdrop-blur-xl' : blur === 'lg' ? 'backdrop-blur-lg' : 'backdrop-blur-md'
  const bgClass = `bg-white/${opacity}`
  
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        ${blurClass}
        ${border ? 'border border-white/20' : ''}
        ${bgClass}
        ${padding}
        shadow-lg shadow-black/5
        transition-all duration-300
        ${className}
      `}
      style={{ backgroundColor: `rgba(255,255,255,${opacity / 100})` }}
    >
      {children}
    </div>
  )
}
