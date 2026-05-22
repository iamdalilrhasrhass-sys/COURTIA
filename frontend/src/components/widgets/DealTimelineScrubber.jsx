// DealTimelineScrubber.jsx
// Timeline draggable du dossier. Voyager dans l'historique du deal.
// Props :
//   events {Array} — [{id, label, date, type: 'past'|'current'|'future', icon?, note?}]
//   onEventClick {function(event)}

import { useRef, useState, useEffect } from 'react'

const EVENT_TYPES = {
  past:    { dot: '#534AB7', line: '#EEEDFE', textColor: '#534AB7' },
  current: { dot: '#EF9F27', line: '#FAEEDA', textColor: '#854F0B' },
  future:  { dot: '#D1D5DB', line: '#F1EFE8', textColor: '#888780' },
  success: { dot: '#1D9E75', line: '#E1F5EE', textColor: '#0F6E56' },
}

const DEFAULT_EVENTS = [
  { id: '1', label: 'Prospect créé',        date: '12 jan 2025', type: 'past',    icon: '👤', note: 'Via formulaire site' },
  { id: '2', label: 'Documents reçus',       date: '15 jan 2025', type: 'past',    icon: '📁', note: 'Carte grise + permis' },
  { id: '3', label: 'ARK analyse dossier',   date: '15 jan 2025', type: 'past',    icon: '🔍', note: 'Complétude 78%' },
  { id: '4', label: 'Devis envoyé',          date: '17 jan 2025', type: 'past',    icon: '📨', note: '3 offres comparées' },
  { id: '5', label: 'Relance J+3',           date: '20 jan 2025', type: 'current', icon: '🔔', note: 'Pas de réponse' },
  { id: '6', label: 'Signature prévue',      date: '25 jan 2025', type: 'future',  icon: '✍️',  note: 'Prédiction ARK: 71%' },
  { id: '7', label: 'Mise en vigueur',       date: '1 fév 2025',  type: 'future',  icon: '🚀', note: 'Date effet souhaitée' },
]

export default function DealTimelineScrubber({
  events = DEFAULT_EVENTS,
  onEventClick,
  width = 560,
}) {
  const [selected, setSelected] = useState(events.find(e => e.type === 'current') ?? events[0])
  const [scrollX, setScrollX] = useState(0)
  const containerRef = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startScroll: 0 })

  const NODE_W = 120
  const totalW = events.length * NODE_W
  const overflow = Math.max(0, totalW - width)

  const onMouseDown = (e) => {
    dragRef.current = { dragging: true, startX: e.clientX, startScroll: scrollX }
    e.preventDefault()
  }

  const onMouseMove = (e) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    setScrollX(Math.max(0, Math.min(overflow, dragRef.current.startScroll - dx)))
  }

  const onMouseUp = () => { dragRef.current.dragging = false }

  const handleSelect = (event) => {
    setSelected(event)
    onEventClick?.(event)
  }

  // Scroll to current event on mount
  useEffect(() => {
    const curIdx = events.findIndex(e => e.type === 'current')
    if (curIdx > 0) {
      const targetX = curIdx * NODE_W - width / 2 + NODE_W / 2
      setScrollX(Math.max(0, Math.min(overflow, targetX)))
    }
  }, [events, width, overflow])

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Chronologie du dossier</p>
        <p className="text-xs text-slate-400">← Glisser pour naviguer →</p>
      </div>

      {/* Timeline scroller */}
      <div
        ref={containerRef}
        className="overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ width, height: 120 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          style={{
            width: totalW,
            height: 120,
            transform: `translateX(-${scrollX}px)`,
            transition: dragRef.current.dragging ? 'none' : 'transform 0.15s',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Connector line */}
          <div style={{
            position: 'absolute',
            top: 52,
            left: NODE_W / 2,
            width: totalW - NODE_W,
            height: 2,
            background: 'linear-gradient(to right, #534AB7, #EF9F27 60%, #D1D5DB)',
            borderRadius: 1,
          }} />

          {events.map((event, i) => {
            const col = EVENT_TYPES[event.type] ?? EVENT_TYPES.future
            const isSelected = selected?.id === event.id
            const isFuture = event.type === 'future'

            return (
              <div
                key={event.id}
                style={{ width: NODE_W, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', paddingTop: 4 }}
                onClick={() => handleSelect(event)}
              >
                {/* Top label */}
                <div style={{
                  fontSize: 10,
                  color: col.textColor,
                  fontWeight: isSelected ? 600 : 400,
                  opacity: isFuture ? 0.6 : 1,
                  maxWidth: NODE_W - 8,
                  textAlign: 'center',
                  lineHeight: 1.3,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {event.label}
                </div>

                {/* Node */}
                <div style={{
                  width: isSelected ? 22 : 16,
                  height: isSelected ? 22 : 16,
                  borderRadius: '50%',
                  backgroundColor: isSelected ? col.dot : (isFuture ? '#E2E8F0' : col.dot),
                  border: `2px solid ${col.dot}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isSelected ? 11 : 8,
                  transition: 'all 0.15s',
                  zIndex: 1,
                  boxShadow: isSelected ? `0 0 0 3px ${col.dot}30` : 'none',
                }}>
                  {isSelected ? event.icon : ''}
                </div>

                {/* Date */}
                <div style={{
                  fontSize: 9,
                  color: '#94A3B8',
                  opacity: isFuture ? 0.6 : 1,
                  fontStyle: isFuture ? 'italic' : 'normal',
                }}>
                  {event.date}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scroll indicator */}
      {overflow > 0 && (
        <div className="mt-1 h-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
          <div
            className="h-0.5 bg-violet-400 rounded-full transition-all"
            style={{ width: `${(width / totalW) * 100}%`, marginLeft: `${(scrollX / totalW) * 100}%` }}
          />
        </div>
      )}

      {/* Selected event detail */}
      {selected && (
        <div className="mt-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">{selected.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.label}</p>
            <p className="text-xs text-slate-400">{selected.date}</p>
            {selected.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selected.note}</p>}
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
            style={{
              backgroundColor: (EVENT_TYPES[selected.type]?.dot ?? '#888') + '18',
              color: EVENT_TYPES[selected.type]?.dot ?? '#888'
            }}
          >
            {selected.type === 'past' ? 'Passé' : selected.type === 'current' ? 'En cours' : selected.type === 'success' ? 'Signé' : 'Prévu'}
          </span>
        </div>
      )}
    </div>
  )
}
