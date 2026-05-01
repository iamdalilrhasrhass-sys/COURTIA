import React from 'react'
import CourtiaBubbleLogo from './CourtiaBubbleLogo'

/**
 * COURTIA — Loader animé
 * Écran de chargement complet
 */

export default function CourtiaLogoLoader({ 
  message = "Un instant, l'intelligence se prépare…",
  fullScreen = true 
}) {
  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 30,
      padding: 40,
    }}>
      <CourtiaBubbleLogo 
        size={160} 
        animated={true}
        showHalo={true}
        showFoam={false}
        showSpecular={true}
      />
      
      {/* Loading spinner dots */}
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff80e0, #80a8ff)',
            animation: `courtiaLoaderDot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <p style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '1px',
        textAlign: 'center',
      }}>
        {message}
      </p>
    </div>
  )

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020108',
      }}>
        <style>{`
          @keyframes courtiaLoaderDot {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        {content}
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes courtiaLoaderDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      {content}
    </>
  )
}
