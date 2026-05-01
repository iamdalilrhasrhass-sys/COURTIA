import React from 'react'
import CourtiaBubbleLogo from './CourtiaBubbleLogo'

/**
 * COURTIA — Mini Logo (sidebar compact)
 * Version réduite sans mousse ni specular pour sidebar
 */

export default function CourtiaMiniLogo({ size = 32, className, style }) {
  return (
    <div className={className} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      ...style
    }}>
      <CourtiaBubbleLogo 
        size={size} 
        animated={false}
        showHalo={false}
        showFoam={false}
        showSpecular={true}
      />
      <span style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontWeight: 600,
        fontSize: Math.max(12, size * 0.35),
        color: '#ffffff',
        letterSpacing: '-0.5px',
      }}>
        COURTIA
      </span>
    </div>
  )
}
