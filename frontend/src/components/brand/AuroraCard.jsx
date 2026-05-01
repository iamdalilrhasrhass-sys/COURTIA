/**
 * AuroraCard — Carte glassmorphism premium inspirée du logo Aurora
 * Avec reflet circulaire subtil et halo
 */
import React, { useState } from 'react'

export default function AuroraCard({
  children,
  hover = true,
  padding = 24,
  glow = 'subtle',
  className,
  style,
  onClick
}) {
  const [isHovered, setIsHovered] = useState(false)

  const glowStyles = {
    subtle: {
      boxShadow: isHovered && hover
        ? '0 4px 12px rgba(15,23,42,0.06), 0 28px 80px rgba(15,23,42,0.10), 0 0 40px rgba(120,60,255,0.04)'
        : '0 1px 2px rgba(15,23,42,0.04), 0 20px 60px rgba(15,23,42,0.06)',
      borderColor: isHovered && hover ? 'rgba(120,60,255,0.15)' : 'rgba(15,23,42,0.08)',
    },
    medium: {
      boxShadow: isHovered && hover
        ? '0 4px 16px rgba(15,23,42,0.08), 0 32px 80px rgba(15,23,42,0.12), 0 0 60px rgba(120,60,255,0.08)'
        : '0 2px 4px rgba(15,23,42,0.04), 0 24px 64px rgba(15,23,42,0.08)',
      borderColor: isHovered && hover ? 'rgba(120,60,255,0.20)' : 'rgba(15,23,42,0.10)',
    }
  }

  const g = glowStyles[glow] || glowStyles.subtle

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => hover && setIsHovered(false)}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRadius: 24,
        border: `0.5px solid ${g.borderColor}`,
        padding,
        boxShadow: g.boxShadow,
        transform: isHovered && hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 220ms cubic-bezier(0.16,1,0.3,1), border-color 220ms cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* Reflet circulaire subtil inspiré du C */}
      <div style={{
        position: 'absolute',
        top: '-30%',
        right: '-20%',
        width: '60%',
        height: '80%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(120,60,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
        opacity: isHovered ? 0.6 : 0.3,
        transition: 'opacity 400ms ease',
      }} />
      
      {/* Second reflet */}
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '40%',
        height: '50%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(100,200,255,0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
        opacity: isHovered ? 0.5 : 0.2,
        transition: 'opacity 400ms ease',
      }} />

      {children}
    </div>
  )
}
