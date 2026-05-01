import React, { useEffect, useRef } from 'react'
import CourtiaBubbleLogo from './CourtiaBubbleLogo'
import CourtiaWordmark from './CourtiaWordmark'

/**
 * COURTIA — Brand Intro (Hero)
 * Version complète avec fond cosmique, particules, grille
 */

function createParticles(container, count = 35) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div')
    p.style.cssText = `
      position: absolute;
      width: 2px; height: 2px;
      background: white;
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      opacity: 0;
      animation: courtiaDrift ${10 + Math.random() * 20}s linear infinite;
      animation-delay: ${Math.random() * -20}s;
    `
    container.appendChild(p)
  }
}

const keyframeStyle = `
@keyframes courtiaDrift {
  0% { transform: translateY(100vh) translateX(0); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { transform: translateY(-10vh) translateX(40px); opacity: 0; }
}
`

export default function CourtiaBrandIntro({
  bubbleSize = 520,
  showGrid = true,
  showParticles = true,
  showKicker = true,
  showTagline = true,
  className,
  style
}) {
  const particlesRef = useRef(null)

  useEffect(() => {
    // Inject keyframes once
    if (!document.getElementById('courtia-intro-keyframes')) {
      const style = document.createElement('style')
      style.id = 'courtia-intro-keyframes'
      style.textContent = keyframeStyle
      document.head.appendChild(style)
    }

    // Create particles
    if (showParticles && particlesRef.current) {
      createParticles(particlesRef.current)
    }
  }, [showParticles])

  return (
    <div className={className} style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      background: `
        radial-gradient(ellipse at 25% 30%, rgba(120,60,255,0.18) 0%, transparent 50%),
        radial-gradient(ellipse at 75% 70%, rgba(255,80,180,0.12) 0%, transparent 55%),
        radial-gradient(ellipse at 50% 100%, rgba(0,200,255,0.08) 0%, transparent 60%),
        linear-gradient(180deg, #020108 0%, #08051A 50%, #060211 100%)
      `,
      overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      ...style
    }}>
      {/* Grid floor */}
      {showGrid && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%) perspective(800px) rotateX(70deg)',
          width: '140vw',
          height: '60vh',
          backgroundImage: `
            linear-gradient(rgba(180,100,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(180,100,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'linear-gradient(to top, black 0%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 80%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Particles */}
      {showParticles && (
        <div ref={particlesRef} style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
        }} />
      )}

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Kicker */}
        {showKicker && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '60px',
          }}>
            Courtia{' '}
            <span style={{
              display: 'inline-block',
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff4d9d, #a142f4)',
              margin: '0 10px',
              verticalAlign: 'middle',
              animation: 'courtiaPulse 2s ease-in-out infinite',
            }} />{' '}
            L'IA Compagnon des Courtiers
          </div>
        )}

        {/* Bubble C */}
        <CourtiaBubbleLogo size={bubbleSize} animated={true} />

        {/* Wordmark */}
        <CourtiaWordmark style={{ marginTop: 0 }} />

        {/* Tagline */}
        {showTagline && (
          <p style={{
            fontFamily: "'Instrument Serif', 'Georgia', serif",
            fontStyle: 'italic',
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '-.2px',
            textAlign: 'center',
            maxWidth: 420,
            margin: '14px 0 0',
          }}>
            Une bulle d'intelligence pour celui qui protège.
          </p>
        )}
      </div>
    </div>
  )
}
