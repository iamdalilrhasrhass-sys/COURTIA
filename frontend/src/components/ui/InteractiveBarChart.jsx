import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const defaultFormat = v =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

/**
 * Bar chart interactif avec tooltip au hover.
 * Props: { data, height, barColor, activeBarColor, formatValue, label }
 * data: Array<{ label: string, value: number }>
 */
export default function InteractiveBarChart({
  data,
  height = 180,
  barColor = '#e8e6e0',
  activeBarColor = '#2563eb',
  formatValue,
  label,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data?.length) {
    return (
      <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '24px 0', fontFamily: 'Arial, sans-serif' }}>
        Pas de données disponibles
      </p>
    )
  }

  const fmt = formatValue || defaultFormat
  const vals = data.map(d => d.value)
  const max = Math.max(...vals, 1)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const avgPct = avg / max

  return (
    <div style={{ width: '100%', fontFamily: 'Arial, sans-serif' }}>
      {label && (
        <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '0 0 12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </p>
      )}

      {/* Chart area */}
      <div style={{ position: 'relative', width: '100%' }}>

        {/* Average dashed line */}
        <div
          style={{
            position: 'absolute',
            bottom: avgPct * height,
            left: 0, right: 0,
            borderTop: '1.5px dashed #d1d5db',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <span style={{
            position: 'absolute', right: 0, top: -9,
            fontSize: 9, color: '#9ca3af', fontWeight: 600,
            background: 'white', padding: '0 4px',
          }}>
            moy.
          </span>
        </div>

        {/* Bars */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 5,
            height,
            overflow: 'visible',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {data.map((d, i) => {
            const barH = Math.max(4, Math.round((d.value / max) * height))
            const isHovered = hoveredIdx === i
            const prev = i > 0 ? data[i - 1].value : null
            const delta = prev && prev > 0 ? ((d.value - prev) / prev) * 100 : null
            const isLast = i === data.length - 1

            return (
              <div
                key={i}
                style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}
              >
                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12 }}
                      style={{
                        position: 'absolute',
                        bottom: barH + 10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#080808',
                        borderRadius: 8,
                        padding: '8px 12px',
                        zIndex: 50,
                        pointerEvents: 'none',
                        minWidth: 90,
                        textAlign: 'center',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                      }}
                    >
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 3px', fontWeight: 600, letterSpacing: '0.03em' }}>
                        {d.label}
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: delta !== null ? '0 0 3px' : 0 }}>
                        {fmt(d.value)}
                      </p>
                      {delta !== null && (
                        <p style={{
                          fontSize: 11, fontWeight: 600, margin: 0,
                          color: delta >= 0 ? '#4ade80' : '#f87171',
                        }}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                        </p>
                      )}
                      {/* Arrow */}
                      <div style={{
                        position: 'absolute', bottom: -4, left: '50%', marginLeft: -5,
                        width: 0, height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid #080808',
                      }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bar */}
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.04 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scaleX: 1.06 }}
                  style={{
                    width: '100%',
                    height: barH,
                    transformOrigin: '50% 100%',
                    background: isHovered
                      ? activeBarColor
                      : isLast
                        ? '#1e293b'
                        : barColor,
                    borderRadius: '4px 4px 0 0',
                    transition: 'background 0.18s ease',
                    cursor: 'default',
                  }}
                  onHoverStart={() => setHoveredIdx(i)}
                  onHoverEnd={() => setHoveredIdx(null)}
                />
              </div>
            )
          })}
        </div>

        {/* Labels row */}
        <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
          {data.map((d, i) => (
            <span
              key={i}
              style={{
                flex: 1, textAlign: 'center',
                fontSize: 9, color: hoveredIdx === i ? '#2563eb' : '#9ca3af',
                fontWeight: hoveredIdx === i ? 700 : 400,
                transition: 'color 0.15s, font-weight 0.15s',
              }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
