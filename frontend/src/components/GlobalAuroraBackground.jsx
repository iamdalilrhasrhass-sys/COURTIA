import { useEffect, useRef } from 'react'

/**
 * GlobalAuroraBackground — nappes lumineuses FULL PAGE fixes, scroll-aware
 * 3 couches aurore + vignette + bruit + grid subtile
 * Parallaxe scroll douce via JS RAF (pas framer pour perf)
 */
export default function GlobalAuroraBackground({ children }) {
  const layersRef = useRef([])

  useEffect(() => {
    const layers = layersRef.current
    if (!layers.length) return

    let currentScroll = window.scrollY
    let targetScroll = window.scrollY
    let mouseX = 0, mouseY = 0
    let animId

    const speeds = [0.015, 0.025, 0.035] // chaque couche à sa vitesse

    function frame() {
      targetScroll = window.scrollY
      currentScroll += (targetScroll - currentScroll) * 0.045

      layers.forEach((layer, i) => {
        if (!layer) return
        const speed = speeds[i % speeds.length]
        const driftX = Math.sin(Date.now() * 0.00008 + i * 2) * 1.5 + mouseX * 0.3
        const driftY = Math.sin(Date.now() * 0.00006 + i * 3) * 1.2 + mouseY * 0.2 - currentScroll * speed
        layer.style.transform = `translate3d(${driftX}%, ${driftY}%, 0) scale(${1 + Math.sin(Date.now() * 0.00004 + i) * 0.02})`
      })

      animId = requestAnimationFrame(frame)
    }

    const onMouse = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }

    window.addEventListener('mousemove', onMouse, { passive: true })
    animId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return (
    <div className="global-aurora-root">
      <div className="global-aurora-fixed">
        {/* Fond base — violet très foncé */}
        <div className="ga-base" />

        {/* 3 nappes aurore */}
        <div
          ref={el => { if (el) layersRef.current[0] = el }}
          className="ga-layer ga-layer-1"
          style={{
            background: 'linear-gradient(125deg, transparent 0%, rgba(83,74,183,0) 18%, rgba(83,74,183,0.28) 28%, rgba(34,211,238,0.18) 40%, rgba(175,169,236,0.20) 55%, rgba(83,74,183,0.10) 68%, transparent 85%)',
          }}
        />
        <div
          ref={el => { if (el) layersRef.current[1] = el }}
          className="ga-layer ga-layer-2"
          style={{
            background: 'linear-gradient(140deg, transparent 0%, rgba(99,102,241,0) 22%, rgba(99,102,241,0.18) 34%, rgba(14,165,233,0.14) 48%, rgba(168,85,247,0.16) 62%, transparent 86%)',
          }}
        />
        <div
          ref={el => { if (el) layersRef.current[2] = el }}
          className="ga-layer ga-layer-3"
          style={{
            background: 'linear-gradient(105deg, transparent 0%, rgba(45,212,191,0) 24%, rgba(45,212,191,0.12) 36%, rgba(129,140,248,0.14) 52%, rgba(175,169,236,0.10) 66%, transparent 88%)',
          }}
        />

        {/* Grille subtile */}
        <div className="ga-grid" />

        {/* Vignette (coins sombres) */}
        <div className="ga-vignette" />

        {/* Bruit cinématographique */}
        <div className="ga-noise" />
      </div>

      {children}

      <style>{`
        .global-aurora-root {
          position: relative;
          min-height: 100vh;
        }
        .global-aurora-fixed {
          position: fixed;
          inset: 0;
          z-index: -20;
          pointer-events: none;
          overflow: hidden;
          background: #05030a;
        }
        .ga-base {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 5%, rgba(83,74,183,0.12), transparent 38%),
            radial-gradient(circle at 80% 20%, rgba(34,211,238,0.06), transparent 30%),
            radial-gradient(circle at 15% 70%, rgba(99,102,241,0.05), transparent 34%),
            linear-gradient(180deg, #05030a 0%, #07040d 28%, #0a0612 58%, #05030a 100%);
        }
        .ga-layer {
          position: absolute;
          inset: -30%;
          mix-blend-mode: screen;
          filter: blur(68px) saturate(1.2);
          opacity: 0.50;
          will-change: transform;
        }
        .ga-layer-1 { opacity: 0.55; filter: blur(64px) saturate(1.3); }
        .ga-layer-2 { opacity: 0.40; filter: blur(78px) saturate(1.1); }
        .ga-layer-3 { opacity: 0.30; filter: blur(92px) saturate(1.0); }
        .ga-grid {
          position: absolute;
          inset: 0;
          opacity: 0.018;
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 80px 80px;
        }
        .ga-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,0.42) 100%),
            radial-gradient(ellipse at 50% 0%, transparent 60%, rgba(0,0,0,0.28) 100%);
        }
        .ga-noise {
          position: absolute;
          inset: 0;
          opacity: 0.035;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          background-size: 180px 180px;
        }
        @media (max-width: 768px) {
          .ga-layer { filter: blur(48px); opacity: 0.32; }
          .ga-layer-1 { opacity: 0.38; }
          .ga-layer-2 { opacity: 0.28; }
          .ga-layer-3 { opacity: 0.20; }
        }
      `}</style>
    </div>
  )
}
