import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleBackground from '../components/BubbleBackground'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import AuroraButton from '../components/brand/AuroraButton'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'

const PRIORITY_SECTIONS = [
  { id: 'urgente',   label: 'Urgentes',   color: '#dc2626', bgLight: 'rgba(220,38,38,0.04)', border: '0.5px solid rgba(220,38,38,0.15)' },
  { id: 'haute',     label: 'Hautes',     color: '#d97706', bgLight: 'rgba(217,119,6,0.04)',  border: '0.5px solid rgba(217,119,6,0.15)' },
  { id: 'normale',   label: 'Normales',   color: '#2563eb', bgLight: 'rgba(37,99,235,0.04)',  border: '0.5px solid rgba(37,99,235,0.15)' },
  { id: 'basse',     label: 'Basses',     color: '#6b7280', bgLight: 'rgba(107,114,128,0.04)', border: '0.5px solid rgba(107,114,128,0.15)' },
]

const fmtDate = (d) => {
  if (!d) return null
  const date = new Date(d)
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const isOverdue = (d) => {
  if (!d) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date < today
}

function TaskRow({ task, priorityColor, onComplete, onOpenClient }) {
  const clientName = task.client_nom
    ? `${task.client_nom} ${task.client_prenom || ''}`.trim()
    : null
  const overdue = isOverdue(task.echeance)
  const completed = task.statut === 'terminee'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 'var(--r-md, 12px)',
        background: completed ? 'rgba(16,185,129,0.04)' : 'transparent',
        border: '0.5px solid rgba(0,0,0,0.04)',
        transition: 'background 0.2s',
        opacity: completed ? 0.6 : 1,
      }}
      onMouseEnter={(e) => { if (!completed) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
      onMouseLeave={(e) => { if (!completed) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Color dot */}
      <div
        style={{
          width: 10,
          height: 10,
          minWidth: 10,
          borderRadius: '50%',
          background: completed ? '#10b981' : priorityColor,
          opacity: completed ? 0.5 : 1,
        }}
      />

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: completed ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.85)',
            textDecoration: completed ? 'line-through' : 'none',
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {task.titre}
        </span>
        {clientName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', display: 'block' }}>
              {clientName}
            </span>
            {task.client_id && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenClient(task.client_id) }}
                style={{
                  border: 'none',
                  background: 'rgba(37,99,235,0.08)',
                  color: '#1d4ed8',
                  borderRadius: 9999,
                  padding: '1px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Ouvrir client
              </button>
            )}
            {String(task.source || task.origin || '').toLowerCase().includes('ark') && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', borderRadius: 9999, padding: '1px 7px' }}>
                Source ARK
              </span>
            )}
          </div>
        )}
      </div>

      {/* Due date */}
      {task.echeance && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: overdue ? '#dc2626' : 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
            background: overdue ? 'rgba(220,38,38,0.08)' : 'transparent',
            padding: overdue ? '2px 8px' : '2px 0',
            borderRadius: 9999,
          }}
        >
          <Clock size={11} />
          {fmtDate(task.echeance)}
        </span>
      )}

      {/* Complete button */}
      {!completed && (
        <button
          onClick={(e) => { e.stopPropagation(); onComplete(task.id) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '0.5px solid rgba(0,0,0,0.1)',
            background: 'rgba(255,255,255,0.8)',
            cursor: 'pointer',
            color: '#10b981',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)' }}
        >
          <Check size={14} />
        </button>
      )}
    </motion.div>
  )
}

export default function Taches() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [urgencyFilter, setUrgencyFilter] = useState('toutes')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/taches')
      setTasks(Array.isArray(data) ? data : [])
    } catch {
      setTasks([])
      setError('Impossible de charger les tâches pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const status = String(task.statut || task.status || '').toLowerCase()
      const priority = String(task.priorite || '').toLowerCase()
      const due = task.echeance ? new Date(task.echeance) : null
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      if (due) due.setHours(0, 0, 0, 0)

      const statusOk = statusFilter === 'tous'
        ? true
        : statusFilter === 'terminee'
          ? status === 'terminee'
          : status !== 'terminee'

      const urgencyOk = urgencyFilter === 'toutes'
        ? true
        : urgencyFilter === 'retard'
          ? Boolean(due && due < now && status !== 'terminee')
          : urgencyFilter === 'urgente'
            ? priority === 'urgente' || priority === 'haute'
            : true

      return statusOk && urgencyOk
    })
  }, [tasks, statusFilter, urgencyFilter])

  // Group tasks by priority
  const tasksByPriority = useMemo(() => {
    const grouped = {}
    PRIORITY_SECTIONS.forEach((s) => { grouped[s.id] = [] })
    filteredTasks.forEach((t) => {
      const p = t.priorite || 'normale'
      if (grouped[p]) grouped[p].push(t)
      else grouped['normale'].push(t)
    })
    return grouped
  }, [filteredTasks])

  async function handleComplete(id) {
    try {
      await api.put(`/taches/${id}`, { statut: 'terminee' })
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, statut: 'terminee' } : t
        )
      )
      toast.success('Tâche complétée ✓')
    } catch {
      toast.error('Erreur lors de la complétion.')
    }
  }

  // Stats
  const totalCount = tasks.length
  const completedCount = tasks.filter((t) => t.statut === 'terminee').length
  const pendingCount = totalCount - completedCount

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BubbleBackground intensity="subtle" />

      <div className="px-4 md:px-10 taches-container" style={{ position: 'relative', zIndex: 1, padding: '24px 16px', maxWidth: 960, margin: '0 auto' }}>
        <style>{`@media (min-width: 768px) { .taches-container { padding: 32px 40px !important; } }`}</style>
        <AuroraPageHeader
          title="Tâches"
          subtitle="Priorisez les relances, pièces manquantes, échéances et actions commerciales."
          badge="Pilotage quotidien"
          dark
          actions={
            <AuroraButton variant="secondary" size="sm" icon={<Plus size={16} />} onClick={fetchAll}>
              Rafraîchir
            </AuroraButton>
          }
        />

        <div className="mb-5 flex flex-wrap gap-3">
          <BubbleBadge color="#2563eb" size="md">{pendingCount} en attente</BubbleBadge>
          <BubbleBadge color="#10b981" size="md">{completedCount} complétées</BubbleBadge>
          <BubbleBadge color="rgba(0,0,0,0.4)" size="md">{totalCount} total</BubbleBadge>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('tous')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusFilter === 'tous' ? 'bg-black text-white border-black' : 'bg-white/70 text-gray-700 border-gray-200'}`}
          >
            Tous statuts
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ouvert')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusFilter === 'ouvert' ? 'bg-black text-white border-black' : 'bg-white/70 text-gray-700 border-gray-200'}`}
          >
            À traiter
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('terminee')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusFilter === 'terminee' ? 'bg-black text-white border-black' : 'bg-white/70 text-gray-700 border-gray-200'}`}
          >
            Terminées
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('toutes')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${urgencyFilter === 'toutes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 text-gray-700 border-gray-200'}`}
          >
            Toutes urgences
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('urgente')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${urgencyFilter === 'urgente' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 text-gray-700 border-gray-200'}`}
          >
            Priorité haute/urgente
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter('retard')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${urgencyFilter === 'retard' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 text-gray-700 border-gray-200'}`}
          >
            En retard
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200/40 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <CourtiaLogoLoader fullScreen={false} message="Chargement des tâches..." />
          </div>
        )}

        {/* Priority sections */}
        {!loading && (
          <div className="gap-4 md:gap-5" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {PRIORITY_SECTIONS.map((section) => {
              const sectionTasks = tasksByPriority[section.id] || []
              const activeTasks = sectionTasks.filter((t) => t.statut !== 'terminee')
              const completedInSection = sectionTasks.filter((t) => t.statut === 'terminee')

              if (sectionTasks.length === 0) return null

              return (
                <BubbleCard key={section.id} hover={false} padding={0}>
                  {/* Section header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '14px 18px',
                      borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                      background: section.bgLight,
                      borderRadius: 'var(--r-lg, 16px) var(--r-lg, 16px) 0 0',
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: section.color,
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0a0a0a', flex: 1 }}>
                      {section.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,0,0,0.4)', background: 'rgba(0,0,0,0.04)', padding: '2px 10px', borderRadius: 9999 }}>
                      {activeTasks.length} restante{activeTasks.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Tasks list */}
                  <div style={{ padding: '6px 12px' }}>
                    <AnimatePresence>
                      {activeTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          priorityColor={section.color}
                          onComplete={handleComplete}
                          onOpenClient={(clientId) => navigate(`/clients/${clientId}`)}
                        />
                      ))}
                    </AnimatePresence>

                    {activeTasks.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>
                        Toutes les tâches sont complétées ✓
                      </div>
                    )}

                    {/* Show completed tasks in a collapsed style */}
                    {completedInSection.length > 0 && (
                      <details style={{ marginTop: 4 }}>
                        <summary style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'rgba(0,0,0,0.35)',
                          cursor: 'pointer',
                          padding: '4px 14px',
                          userSelect: 'none',
                        }}>
                          {completedInSection.length} complétée{completedInSection.length > 1 ? 's' : ''}
                        </summary>
                        <div style={{ marginTop: 4 }}>
                          {completedInSection.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              priorityColor={section.color}
                              onComplete={() => {}}
                              onOpenClient={(clientId) => navigate(`/clients/${clientId}`)}
                            />
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </BubbleCard>
              )
            })}
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <AuroraEmptyState
            title="Aucune tâche pour le moment."
            description="Ajoutez vos clients et contrats pour faire remonter les relances, pièces manquantes et échéances dans le cockpit."
            action={{ label: 'Voir les clients', href: '/clients' }}
          />
        )}

      </div>

      {/* Keyframes for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
