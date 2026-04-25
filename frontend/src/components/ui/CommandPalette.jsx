import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Sun, Users, UserPlus, FileText, BarChart2,
  Sparkles, CheckSquare, PieChart, Settings, Zap, Search, Command
} from 'lucide-react'

const ACTIONS = [
  { id: 'dashboard',     label: 'Tableau de bord',  desc: 'Vue d\'ensemble de votre activité',   path: '/dashboard',     icon: LayoutDashboard, cat: 'Navigation' },
  { id: 'morning-brief', label: 'Morning Brief',     desc: 'Agenda et actions du jour',           path: '/morning-brief', icon: Sun,             cat: 'Navigation' },
  { id: 'clients',       label: 'Clients',           desc: 'Portefeuille clients',                path: '/clients',       icon: Users,           cat: 'Navigation' },
  { id: 'new-client',    label: 'Nouveau client',    desc: 'Créer une nouvelle fiche client',     path: '/clients/new',   icon: UserPlus,        cat: 'Action' },
  { id: 'contrats',      label: 'Contrats',          desc: 'Contrats actifs et à renouveler',     path: '/contrats',      icon: FileText,        cat: 'Navigation' },
  { id: 'analytics',     label: 'Analyses dirigeants',         desc: 'KPIs et performance portefeuille',    path: '/analytics',     icon: BarChart2,       cat: 'Navigation' },
  { id: 'capitia',       label: 'CAPITIA',           desc: 'Module financement IOBSP',            path: '/capitia',       icon: Sparkles,        cat: 'Navigation' },
  { id: 'taches',        label: 'Tâches',            desc: 'Suivi des tâches en cours',           path: '/taches',        icon: CheckSquare,     cat: 'Navigation' },
  { id: 'rapports',      label: 'Rapports',          desc: 'Rapports et exports PDF',             path: '/rapports',      icon: PieChart,        cat: 'Navigation' },
  { id: 'parametres',    label: 'Paramètres',        desc: 'Configuration du compte',             path: '/parametres',    icon: Settings,        cat: 'Navigation' },
  { id: 'ark',           label: 'Ouvrir ARK',        desc: 'Lancer l\'assistant IA COURTIA',      action: () => window.dispatchEvent(new Event('ark:open')), icon: Zap, cat: 'Action' },
]

function fuzzy(query, text) {
  if (!query) return true
  return text.toLowerCase().includes(query.toLowerCase())
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const filtered = ACTIONS.filter(a =>
    fuzzy(query, a.label) || fuzzy(query, a.desc)
  )

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Keep selectedIdx in bounds when filter changes
  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const execute = useCallback((action) => {
    onClose()
    if (action.path) navigate(action.path)
    else if (action.action) action.action()
  }, [navigate, onClose])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && filtered[selectedIdx]) {
      execute(filtered[selectedIdx])
    }
  }, [filtered, selectedIdx, execute, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(8,8,8,0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 9990,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              top: '15vh',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 640,
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(18px)',
              border: '1px solid #e8e6e0',
              borderRadius: 18,
              boxShadow: '0 24px 80px rgba(8,8,8,0.18), 0 4px 16px rgba(8,8,8,0.08)',
              zIndex: 9991,
              overflow: 'hidden',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {/* Search input */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px',
              borderBottom: '1px solid #f0ede8',
            }}>
              <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher une page, une action..."
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 15, color: '#080808', background: 'transparent',
                  fontFamily: 'Arial, sans-serif',
                }}
              />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '3px 7px', background: '#f0ede8',
                borderRadius: 6, flexShrink: 0,
              }}>
                <Command size={10} color="#9ca3af" />
                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>K</span>
              </div>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 0' }}
            >
              {filtered.length === 0 ? (
                <div style={{
                  padding: '28px 20px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                    Aucun résultat pour <strong style={{ color: '#6b7280' }}>"{query}"</strong>
                  </p>
                </div>
              ) : (
                filtered.map((action, i) => {
                  const Icon = action.icon
                  const isSelected = i === selectedIdx
                  return (
                    <div
                      key={action.id}
                      data-selected={isSelected}
                      onClick={() => execute(action)}
                      onMouseEnter={() => setSelectedIdx(i)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 18px', cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : 'transparent',
                        borderLeft: isSelected ? '2px solid #2563eb' : '2px solid transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: isSelected ? '#dbeafe' : '#f7f6f2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.1s',
                      }}>
                        <Icon size={15} color={isSelected ? '#2563eb' : '#6b7280'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#080808', margin: 0, lineHeight: 1.3 }}>
                          {action.label}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, marginTop: 1 }}>
                          {action.desc}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                        padding: '2px 7px', borderRadius: 20,
                        background: action.cat === 'Action' ? '#fef3c7' : '#f0ede8',
                        color: action.cat === 'Action' ? '#92400e' : '#9ca3af',
                        flexShrink: 0,
                      }}>
                        {action.cat}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: '8px 18px',
              borderTop: '1px solid #f0ede8',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {[
                ['↑↓', 'naviguer'],
                ['↵', 'ouvrir'],
                ['Échap', 'fermer'],
              ].map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#9ca3af',
                    background: '#f0ede8', padding: '2px 5px', borderRadius: 4,
                    fontFamily: 'monospace',
                  }}>{key}</span>
                  <span style={{ fontSize: 10, color: '#c4bfb8' }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
