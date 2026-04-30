import { useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useScroll, useVelocity } from 'framer-motion'

/**
 * ArkAuroraOrb V2 — Bulle premium ×3 améliorée
 * Plus grosse, plus lumineuse, plus de particules orbitales
 * Effet 3D souris + scroll parallaxe + anneaux multiples
 */
export default function ArkAuroraOrb({ size = 'lg' }) {
  const bubbleRef = useRef(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const smoothX = useSpring(mouseX, { stiffness: 120, damping: 25 })
  const smoothY = useSpring(mouseY, { stiffness: 120, damping: 25 })

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [12, -12])
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-14, 14])
  const shiftX = useTransform(smoothX, [-0.5, 0.5], [-14, 14])
  const shiftY = useTransform(smoothY, [-0.5, 0.5], [-10, 10])

  // Taille responsive
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const scale = isMobile ? 0.72 : size === 'lg' ? 1 : 0.85

  const handleMouseMove = (event) => {
    if (!bubbleRef.current) return
    const rect = bubbleRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    mouseX.set(Math.max(-0.5, Math.min(0.5, x)))
    mouseY.set(Math.max(-0.5, Math.min(0.5, y)))
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div
      ref={bubbleRef}
      className={`ark-orb-v2 ark-orb-${size}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Orbites externes */}
      <motion.div
        className="ao-orbit ao-orbit-1"
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
      >
        <span className="ao-orbit-dot" />
        <span className="ao-orbit-dot" />
        <span className="ao-orbit-dot" />
      </motion.div>
      <motion.div
        className="ao-orbit ao-orbit-2"
        animate={{ rotate: -360 }}
        transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
      >
        <span className="ao-orbit-dot" />
        <span className="ao-orbit-dot" />
      </motion.div>
      <motion.div
        className="ao-orbit ao-orbit-3"
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
      >
        <span className="ao-orbit-dot" />
        <span className="ao-orbit-dot" />
        <span className="ao-orbit-dot" />
        <span className="ao-orbit-dot" />
      </motion.div>

      {/* Bulle avec parallaxe souris */}
      <motion.div
        className="ao-bubble-core"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          scale,
        }}
        animate={{
          scale: [scale, scale * 1.025, scale * 0.994, scale],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="ao-iridescent-ring" />
        <div className="ao-milk-layer" />
        <div className="ao-liquid-colors" />
        <div className="ao-glass-edge" />

        {/* Mini bulles satellites */}
        <div className="ao-mini-bubbles">
          {[...Array(8)].map((_, i) => (
            <motion.span
              key={i}
              className="ao-mini-bubble"
              animate={{
                x: [0, Math.sin(i * 1.2) * 12, Math.sin(i * 0.8) * -6, 0],
                y: [0, Math.cos(i * 1.4) * -10, Math.cos(i * 0.9) * 8, 0],
                scale: [1, 0.6, 1.3, 1],
                opacity: [0.4, 0.7, 0.3, 0.4],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              }}
            />
          ))}
        </div>

        {/* Reflets */}
        <div className="ao-reflection-main" />
        <div className="ao-reflection-soft" />
        <div className="ao-reflection-bottom" />
        <div className="ao-chromatic-edge" />

        {/* Scan line subtil */}
        <div className="ao-scan-line" />

        {/* Centre ARK */}
        <div className="ao-center">
          <div className="ao-center-blur" />
          <div className="ao-center-label">
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >ARK</motion.span>
            <small>COURTIA AI</small>
          </div>
        </div>
      </motion.div>

      {/* Cartes flottantes améliorées */}
      <motion.div
        className="ao-card ao-card-1"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ x: shiftX, y: useTransform(shiftY, v => v - 6) }}
      >
        <div className="ao-card-icon">📋</div>
        <div className="ao-card-text">
          <strong>Morning Brief</strong>
          <span>Actions prioritaires du jour</span>
        </div>
      </motion.div>

      <motion.div
        className="ao-card ao-card-2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ x: useTransform(shiftX, v => v * -0.5), y: useTransform(shiftY, v => v * 0.5 + 8) }}
      >
        <div className="ao-card-icon">📊</div>
        <div className="ao-card-text">
          <strong>Portefeuille vivant</strong>
          <span>Clients & opportunités</span>
        </div>
      </motion.div>

      <motion.div
        className="ao-card ao-card-3"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ x: useTransform(shiftX, v => v * 0.7), y: useTransform(shiftY, v => v * -0.4 - 4) }}
      >
        <div className="ao-card-icon">🎯</div>
        <div className="ao-card-text">
          <strong>REACH Actif</strong>
          <span>3 relances en préparation</span>
        </div>
      </motion.div>

      <style>{`
        .ark-orb-v2 {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 420px;
          pointer-events: auto;
        }
        .ark-orb-lg { min-height: 480px; }
        .ark-orb-sm { min-height: 320px; }

        /* ── Orbites ── */
        .ao-orbit {
          position: absolute;
          border-radius: 50%;
          border: 0.5px solid rgba(175,169,236,0.12);
          pointer-events: none;
          will-change: transform;
        }
        .ao-orbit-1 {
          width: 340px; height: 340px;
          box-shadow: 0 0 30px rgba(83,74,183,0.06), inset 0 0 30px rgba(83,74,183,0.04);
        }
        .ao-orbit-2 {
          width: 280px; height: 280px;
          border-color: rgba(34,211,238,0.10);
          box-shadow: 0 0 25px rgba(34,211,238,0.04), inset 0 0 25px rgba(34,211,238,0.02);
        }
        .ao-orbit-3 {
          width: 400px; height: 400px;
          border-color: rgba(129,140,248,0.08);
          box-shadow: 0 0 35px rgba(129,140,248,0.04);
        }
        .ao-orbit-dot {
          position: absolute;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: rgba(175,169,236,0.5);
          box-shadow: 0 0 8px rgba(175,169,236,0.3);
        }
        .ao-orbit-dot:nth-child(1) { top: -2.5px; left: 50%; transform: translateX(-50%); }
        .ao-orbit-dot:nth-child(2) { bottom: -2.5px; right: 50%; transform: translateX(50%); }
        .ao-orbit-dot:nth-child(3) { top: 50%; right: -2.5px; transform: translateY(-50%); display: none; }
        .ao-orbit-dot:nth-child(4) { top: 50%; left: -2.5px; transform: translateY(-50%); display: none; }
        .ao-orbit-1 .ao-orbit-dot:nth-child(3) { display: block; }
        .ao-orbit-3 .ao-orbit-dot:nth-child(4) { display: block; }

        /* ── Bulle centrale ── */
        .ao-bubble-core {
          position: relative;
          width: 220px; height: 220px;
          cursor: default;
        }
        .ao-iridescent-ring {
          position: absolute; inset: -4px;
          border-radius: 50%;
          background: conic-gradient(from 140deg, rgba(255,255,255,0.1), rgba(175,169,236,0.2), rgba(34,211,238,0.15), rgba(129,140,248,0.18), rgba(255,255,255,0.1));
          -webkit-mask: radial-gradient(circle, transparent 58%, black 59%, black 100%);
          mask: radial-gradient(circle, transparent 58%, black 59%, black 100%);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: iridescentRotate 8s linear infinite;
        }
        @keyframes iridescentRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ao-milk-layer {
          position: absolute; inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 45%),
            radial-gradient(circle at 70% 75%, rgba(175,169,236,0.10), transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04), rgba(20,10,40,0.2) 70%);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.15);
        }
        .ao-liquid-colors {
          position: absolute; inset: 6px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 25% 20%, rgba(168,85,247,0.08), transparent 40%),
            radial-gradient(circle at 75% 30%, rgba(34,211,238,0.06), transparent 35%),
            radial-gradient(circle at 45% 75%, rgba(129,140,248,0.07), transparent 38%);
          filter: blur(2px);
          animation: liquidDrift 12s ease-in-out infinite;
        }
        @keyframes liquidDrift {
          0%, 100% { transform: scale(1) rotate(0deg); }
          33% { transform: scale(1.04) rotate(2deg); }
          66% { transform: scale(0.97) rotate(-1deg); }
        }
        .ao-glass-edge {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 0.5px solid rgba(255,255,255,0.18);
          box-shadow:
            0 0 30px rgba(175,169,236,0.12),
            0 0 60px rgba(83,74,183,0.08),
            inset 0 -4px 12px rgba(83,74,183,0.10),
            inset 4px 0 12px rgba(34,211,238,0.06);
        }

        /* Mini-bulles */
        .ao-mini-bubbles { position: absolute; inset: -20px; pointer-events: none; }
        .ao-mini-bubble {
          position: absolute;
          width: 10px; height: 10px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5), rgba(175,169,236,0.2) 50%, transparent);
          box-shadow: 0 0 6px rgba(175,169,236,0.2);
        }
        .ao-mini-bubble:nth-child(1) { top: -5px; left: 30%; }
        .ao-mini-bubble:nth-child(2) { top: 15%; right: -8px; }
        .ao-mini-bubble:nth-child(3) { bottom: 10%; right: -5px; }
        .ao-mini-bubble:nth-child(4) { bottom: -4px; left: 40%; }
        .ao-mini-bubble:nth-child(5) { top: -3px; left: 55%; }
        .ao-mini-bubble:nth-child(6) { top: 20%; left: -7px; }
        .ao-mini-bubble:nth-child(7) { bottom: 25%; left: -6px; }
        .ao-mini-bubble:nth-child(8) { bottom: -3px; right: 35%; }

        /* Reflets */
        .ao-reflection-main {
          position: absolute;
          width: 40%; height: 35%;
          top: 10%; left: 14%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.34), transparent 65%);
          filter: blur(4px);
          pointer-events: none;
        }
        .ao-reflection-soft {
          position: absolute;
          width: 55%; height: 25%;
          top: 20%; left: 20%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 60%);
          filter: blur(8px);
          pointer-events: none;
        }
        .ao-reflection-bottom {
          position: absolute;
          width: 30%; height: 18%;
          bottom: 14%; right: 18%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,211,238,0.08), transparent 60%);
          filter: blur(6px);
          pointer-events: none;
        }
        .ao-chromatic-edge {
          position: absolute; inset: -2px;
          border-radius: 50%;
          background: conic-gradient(from 60deg,
            transparent, rgba(175,169,236,0.06), rgba(34,211,238,0.04),
            rgba(129,140,248,0.05), transparent);
          -webkit-mask: radial-gradient(circle, transparent 50%, black 51%);
          mask: radial-gradient(circle, transparent 50%, black 51%);
          pointer-events: none;
        }
        .ao-scan-line {
          position: absolute;
          width: 100%; height: 2px;
          top: 50%; left: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
          filter: blur(1px);
          animation: scanLine 8s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes scanLine {
          0%, 100% { top: 20%; opacity: 0; }
          25% { top: 30%; opacity: 0.3; }
          50% { top: 50%; opacity: 0.5; }
          75% { top: 70%; opacity: 0.3; }
        }

        /* Centre */
        .ao-center {
          position: absolute;
          inset: 25%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(15,5,30,0.6), transparent 70%);
        }
        .ao-center-blur {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(83,74,183,0.06), transparent 60%);
          filter: blur(10px);
        }
        .ao-center-label {
          position: relative;
          text-align: center;
          line-height: 1;
        }
        .ao-center-label span {
          display: block;
          font-size: 28px;
          font-weight: 900;
          background: linear-gradient(135deg, #c4b5fd, #818cf8);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: 3px;
        }
        .ao-center-label small {
          display: block;
          font-size: 7px;
          font-weight: 600;
          color: rgba(175,169,236,0.5);
          letter-spacing: 2.5px;
          text-transform: uppercase;
          margin-top: 3px;
        }

        /* Cartes flottantes premium */
        .ao-card {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background:
            radial-gradient(circle at 20% 15%, rgba(255,255,255,0.10), transparent 40%),
            linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          backdrop-filter: blur(16px) saturate(150%);
          -webkit-backdrop-filter: blur(16px) saturate(150%);
          border: 0.5px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 8px 32px rgba(0,0,0,0.25),
            0 0 20px rgba(175,169,236,0.05);
          pointer-events: none;
          z-index: 5;
          min-width: 160px;
        }
        .ao-card-icon {
          font-size: 18px;
          width: 32px; height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.06);
          border-radius: 10px;
        }
        .ao-card-text strong {
          display: block;
          font-size: 12px;
          color: rgba(255,255,255,0.9);
          font-weight: 700;
        }
        .ao-card-text span {
          display: block;
          font-size: 10px;
          color: rgba(255,255,255,0.45);
          margin-top: 1px;
        }
        .ao-card-1 { top: 10px; right: -10px; }
        .ao-card-2 { bottom: 30px; left: -10px; }
        .ao-card-3 { top: 50%; left: -30px; transform: translateY(-50%); }

        /* Responsive */
        @media (max-width: 768px) {
          .ao-orbit-1 { width: 260px; height: 260px; }
          .ao-orbit-2 { width: 210px; height: 210px; }
          .ao-orbit-3 { width: 310px; height: 310px; }
          .ao-bubble-core { width: 160px; height: 160px; }
          .ao-center-label span { font-size: 20px; }
          .ao-center-label small { font-size: 6px; }
          .ao-card { display: none; }
          .ark-orb-v2 { min-height: 300px; }
        }
        @media (max-width: 480px) {
          .ao-orbit-1 { width: 200px; height: 200px; }
          .ao-orbit-2 { width: 160px; height: 160px; }
          .ao-orbit-3 { width: 240px; height: 240px; }
          .ao-bubble-core { width: 120px; height: 120px; }
          .ao-center-label span { font-size: 16px; }
          .ao-center-label small { font-size: 5px; }
          .ao-mini-bubble { display: none; }
          .ark-orb-v2 { min-height: 240px; }
        }
      `}</style>
    </div>
  )
}
