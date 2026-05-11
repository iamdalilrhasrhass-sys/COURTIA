import { useEffect, useRef, useMemo } from 'react';

/**
 * CosmosBackground — the signature COURTIA universe.
 * - Deep black canvas (#020108 → #08051A)
 * - Three radial gradients (violet, pink, cyan) that breathe slowly
 * - A 3D perspective grid floor in violet
 * - 35 floating particles (CSS animated)
 *
 * Use as a positioned background, e.g.:
 *   <CosmosBackground />        // fixed full-screen
 *   <CosmosBackground variant="subtle" /> // 30% opacity for app shell
 */
export function CosmosBackground({
  variant = 'full',
  particleCount = 35,
  showGrid = true,
  showParticles = true,
  className = '',
  style = {},
}) {
  const rootRef = useRef(null);

  const opacity = variant === 'subtle' ? 0.35 : 1;
  const gridOpacity = variant === 'subtle' ? 0.4 : 1;

  // Pre-compute particle positions/delays so they stay stable across renders.
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 10,
      hue: Math.floor(Math.random() * 3), // 0 pink, 1 violet, 2 cyan
    }));
  }, [particleCount]);

  return (
    <div
      ref={rootRef}
      className={`la-bulle-cosmos ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 0%, #08051A 0%, #020108 70%)',
        pointerEvents: 'none',
        opacity,
        ...style,
      }}
    >
      {/* Radial cosmic glows */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '70vw',
          height: '70vw',
          background: 'radial-gradient(circle, rgba(161,66,244,0.25) 0%, rgba(161,66,244,0) 60%)',
          filter: 'blur(40px)',
          animation: 'la-bulle-cosmos-pulse-a 18s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '-15%',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(255,77,157,0.22) 0%, rgba(255,77,157,0) 60%)',
          filter: 'blur(50px)',
          animation: 'la-bulle-cosmos-pulse-b 22s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '20%',
          width: '70vw',
          height: '70vw',
          background: 'radial-gradient(circle, rgba(128,240,216,0.16) 0%, rgba(128,240,216,0) 60%)',
          filter: 'blur(60px)',
          animation: 'la-bulle-cosmos-pulse-c 26s ease-in-out infinite',
        }}
      />

      {/* 3D grid floor */}
      {showGrid && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '-20%',
            width: '220vw',
            height: '80vh',
            transform: 'translateX(-50%) perspective(900px) rotateX(70deg)',
            transformOrigin: '50% 100%',
            backgroundImage:
              'linear-gradient(rgba(180,100,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(180,100,255,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            opacity: gridOpacity,
            maskImage: 'linear-gradient(to top, black 0%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 80%)',
          }}
        />
      )}

      {/* Particles */}
      {showParticles && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {particles.map((p) => {
            const colors = [
              'rgba(255,128,224,0.9)',
              'rgba(192,128,255,0.9)',
              'rgba(128,240,216,0.9)',
            ];
            const shadow = [
              '0 0 8px rgba(255,128,224,0.8)',
              '0 0 8px rgba(192,128,255,0.8)',
              '0 0 8px rgba(128,240,216,0.8)',
            ];
            return (
              <span
                key={p.id}
                style={{
                  position: 'absolute',
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  background: colors[p.hue],
                  boxShadow: shadow[p.hue],
                  animation: `la-bulle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
                  opacity: 0.7,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Local keyframes (scoped so they always exist even without tokens.css) */}
      <style>{`
        @keyframes la-bulle-cosmos-pulse-a {
          0%, 100% { transform: translate(0,0) scale(1); opacity: 0.9; }
          50%      { transform: translate(4%, 6%) scale(1.08); opacity: 1; }
        }
        @keyframes la-bulle-cosmos-pulse-b {
          0%, 100% { transform: translate(0,0) scale(1); opacity: 0.85; }
          50%      { transform: translate(-3%, 4%) scale(1.1); opacity: 1; }
        }
        @keyframes la-bulle-cosmos-pulse-c {
          0%, 100% { transform: translate(0,0) scale(1); opacity: 0.7; }
          50%      { transform: translate(2%, -3%) scale(1.08); opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}

export default CosmosBackground;
