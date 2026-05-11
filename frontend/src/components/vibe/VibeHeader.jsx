/**
 * VibeHeader — entête de page V2 connecté.
 * - BubbleC mini en accent
 * - Kicker JetBrains Mono
 * - Titre Fraunces italic
 * - Sous-titre Plus Jakarta Sans
 *
 * Usage:
 *   <VibeHeader kicker="COCKPIT" title="Tableau de bord" subtitle="..." />
 */
import { motion } from 'framer-motion'
import { BubbleC } from '../../design'

export default function VibeHeader({
  kicker,
  title,
  subtitle,
  actions,
  bubbleSize = 50,
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 22,
        flexWrap: 'wrap',
      }}
    >
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          width: bubbleSize,
          height: bubbleSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BubbleC size={bubbleSize} showHalo={false} animated breathe />
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        {kicker && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#A78BFA',
              marginBottom: 4,
            }}
          >
            {kicker}
          </div>
        )}
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(26px, 3.2vw, 38px)',
            lineHeight: 1.1,
            margin: 0,
            color: '#FFFFFF',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: 'rgba(255,255,255,0.6)',
              margin: '6px 0 0',
              fontSize: 14,
              maxWidth: 720,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </motion.header>
  )
}
