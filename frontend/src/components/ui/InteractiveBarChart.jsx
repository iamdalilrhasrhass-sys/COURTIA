import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const defaultFormat = v =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

/**
 * Bar chart interactif avec tooltip, sélection au clic et mini-card détail.
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
  const [selectedIdx, setSelectedIdx] = useState(null)

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

  function getDelta(i) {
    const prev = i > 0 ? data[i - 1].value : null
    return prev && prev > 0 ? ((data[i].value - prev) / prev) * 100 : null
  }

  const selDelta = selectedIdx !== null ? getDelta(selectedIdx) : null
  const selPhrase = selDelta === null ? 'Période de référence.'
    : selDelta > 0 ? 'Progression sur cette période.'
    : selDelta < 0 ? 'Baisse à surveiller.'
    : 'Période stable.'

  function handleBarClick(i) {
    setSelectedIdx(prev => prev === i ? null : i)
  }

  return (
    <div style={{ width: '100%', fontFamily: 'Arial, sans-serif' }}>
      {label && (
        <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: '0 0 12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </p>
      )}

      {/* Chart area — overflow visible pour les tooltips */}
      <div style={{ position: 'relative', width: '100%', overflow: 'visible' }}>

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
            const isSelected = selectedIdx === i
            const delta = getDelta(i)

            let barBg
            if (isSelected) barBg = '#1e40af'
            else if (isHovered) barBg = activeBarColor
            else if (i === data.length - 1) barBg = '#1e293b'
            else barBg = barColor

            return (
              <div
                key={i}
                style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', overflow: 'visible' }}
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
                        zIndex: 9999,
                        pointerEvents: 'none',
                        minWidth: 110,
                        textAlign: 'center',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 3px', fontWeight: 600 }}>{d.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: delta !== null ? '0 0 3px' : '0 0 4px' }}>
                        {fmt(d.value)}
                      </p>
                      {delta !== null && (
                        <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 4px', color: delta >= 0 ? '#4ade80' : '#f87171' }}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                        </p>
                      )}
                      <p style={{ fontSize: 9, color: '#555', margin: 0, letterSpacing: 0.3 }}>
                        Cliquer pour détailler
                      </p>
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
                    background: barBg,
                    borderRadius: isSelected ? '4px 4px 0 0' : '4px 4px 0 0',
                    transition: 'background 0.18s ease',
                    cursor: 'pointer',
                    outline: isSelected ? '2px solid #1e40af' : 'none',
                    outlineOffset: 1,
                  }}
                  onHoverStart={() => setHoveredIdx(i)}
                  onHoverEnd={() => setHoveredIdx(null)}
                  onClick={() => handleBarClick(i)}
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
                fontSize: 9,
                color: selectedIdx === i ? '#1e40af' : hoveredIdx === i ? activeBarColor : '#9ca3af',
                fontWeight: selectedIdx === i || hoveredIdx === i ? 700 : 400,
                transition: 'color 0.15s',
              }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>

      {/* Mini-card détail sélectionné */}
      <AnimatePresence>
        {selectedIdx !== null && data[selectedIdx] && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginTop: 12,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderLeft: '3px solid #1e40af',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', margin: '0 0 2px' }}>
                {data[selectedIdx].label}
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>
                {fmt(data[selectedIdx].value)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {selDelta !== null && (
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px', color: selDelta >= 0 ? '#16a34a' : '#dc2626' }}>
                  {selDelta >= 0 ? '+' : ''}{selDelta.toFixed(1)}%
                </p>
              )}
              <p style={{ fontSize: 11, color: '#3b82f6', margin: 0 }}>{selPhrase}</p>
            </div>
            <button
              onClick={() => setSelectedIdx(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: 14, padding: '0 0 0 12px', lineHeight: 1 }}
            >✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
