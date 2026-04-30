import { useState, useEffect, useMemo } from 'react'
import { Check, Plus, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleButton from '../components/BubbleButton'
import BubbleBackground from '../components/BubbleBackground'

const PRIORITY_SECTIONS = [
  { id: 'urgente',   label: 'Urgentes',   color: '#dc2626', bgLight: 'rgba(220,38,38,0.04)', border: '0.5px solid rgba(220,38,38,0.15)' },
  { id: 'haute',     label: 'Hautes',     color: '#d97706', bgLight: 'rgba(217,119,6,0.04)',  border: '0.5px solid rgba(217,119,6,0.15)' },
  { id: 'normale',   label: 'Normales',   color: '#2563eb', bgLight: 'rgba(37,99,235,0.04)',  border: '0.5px solid rgba(37,99,235,0.15)' },
  { id: 'basse',     label: 'Basses',     color: '#6b7280', bgLight: 'rgba(107,114,128,0.04)', border: '0.5px solid rgba(107,114,128,0.15)' },
]

const MOCK_TASKS = [
  { id: 1, titre: 'Relancer client Dubois pour signature', priorite: 'urgente', echeance: '2026-04-26', statut: 'a_faire', client_nom: 'Dubois', client_prenom: 'Marc' },
  { id: 2, titre: 'Finaliser rapport mensuel Q1', priorite: 'urgente', echeance: '2026-04-27', statut: 'en_cours', client_nom: null, client_prenom: null },
  { id: 3, titre: 'Appel prospection secteur Lyon', priorite: 'haute', echeance: '2026-04-28', statut: 'a_faire', client_nom: 'Petit', client_prenom: 'Chloe' },
  { id: 4, titre: 'Mise à jour contrat Prevoyance', priorite: 'haute', echeance: '2026-04-25', statut: 'a_faire', client_nom: 'Martin', client_prenom: 'Julie' },
  { id: 5, titre: 'Vérifier éligibilité nouveau prospect', priorite: 'normale', echeance: '2026-04-30', statut: 'terminee', client_nom: 'Leroy', client_prenom: 'Sophie' },
  { id: 6, titre: 'Préparer dossier sinistre Bernard', priorite: 'normale', echeance: '2026-05-02', statut: 'a_faire', client_nom: 'Bernard', client_prenom: 'Pierre' },
  { id: 7, titre: 'Envoyer devis auto client Moreau', priorite: 'basse', echeance: '2026-05-05', statut: 'en_cours', client_nom: 'Moreau', client_prenom: 'Luc' },
  { id: 8, titre: 'Archiver contrats 2025', priorite: 'basse', echeance: '2026-05-10', statut: 'a_faire', client_nom: null, client_prenom: null },
  { id: 9, titre: 'Reunion equipe commerciale', priorite: 'normale', echeance: '2026-04-29', statut: 'terminee', client_nom: null, client_prenom: null },
  { id: 10, titre: 'Correction bug import CSV', priorite: 'haute', echeance: '2026-04-26', statut: 'terminee', client_nom: null, client_prenom: null },
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

function TaskRow({ task, priorityColor, onComplete }) {
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
          <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2, display: 'block' }}>
            {clientName}
          </span>
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
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const { data } = await api.get('/taches')
      setTasks(Array.isArray(data) ? data : [])
      setUseMock(false)
    } catch {
      // Fallback to mock data if API fails
      setTasks(MOCK_TASKS)
      setUseMock(true)
    } finally {
      setLoading(false)
    }
  }

  // Group tasks by priority
  const tasksByPriority = useMemo(() => {
    const grouped = {}
    PRIORITY_SECTIONS.forEach((s) => { grouped[s.id] = [] })
    tasks.forEach((t) => {
      const p = t.priorite || 'normale'
      if (grouped[p]) grouped[p].push(t)
      else grouped['normale'].push(t)
    })
    return grouped
  }, [tasks])

  async function handleComplete(id) {
    if (useMock) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, statut: 'terminee' } : t
        )
      )
      toast.success('Tâche complétée ✓')
      return
    }
    try {
      await api.put(`/api/taches/${id}`, { statut: 'terminee' })
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

      <div className="px-4 md:px-10" style={{ position: 'relative', zIndex: 1, padding: '32px 40px', maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="text-2xl md:text-3xl" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 28, color: '#0a0a0a', margin: 0 }}>
            Tâches
          </h1>
          <p className="text-xs md:text-sm" style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: 4, marginBottom: 16 }}>
            Gérez vos actions et rappels quotidiens.
          </p>

          {/* Stats badges */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <BubbleBadge color="#2563eb" size="md">
              {pendingCount} en attente
            </BubbleBadge>
            <BubbleBadge color="#10b981" size="md">
              {completedCount} complétées
            </BubbleBadge>
            <BubbleBadge color="rgba(0,0,0,0.4)" size="md">
              {totalCount} total
            </BubbleBadge>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{
              width: 32, height: 32,
              border: '3px solid rgba(0,0,0,0.06)',
              borderTopColor: '#0a0a0a',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
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

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, paddingBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.2)' }}>Rhasrhass®</p>
        </div>
      </div>

      {/* Keyframes for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
