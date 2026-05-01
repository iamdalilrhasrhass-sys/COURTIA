import React from 'react'

/**
 * COURTIA — Wordmark
 * "courtia." avec point dégradé
 */

export default function CourtiaWordmark({ 
  size = 'clamp(48px, 8vw, 82px)', 
  color = '#ffffff',
  className,
  style 
}) {
  return (
    <h1 className={className} style={{
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: 200,
      fontSize: size,
      letterSpacing: '-3px',
      lineHeight: 1,
      background: `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.7) 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      margin: 0,
      ...style
    }}>
      courtia
      <em style={{
        fontFamily: "'Fraunces', 'Georgia', serif",
        fontStyle: 'italic',
        fontWeight: 300,
        background: 'linear-gradient(90deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>.</em>
    </h1>
  )
}
