import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, CheckSquare, Sparkles } from 'lucide-react'
import api from '../../api'

/**
 * CreateTaskModal — Modale premium de création rapide de tâche.
 * Ouverte depuis une bulle client avec contexte prérempli.
 */
export default function CreateTaskModal({
  isOpen,
  onClose,
  client,
  intelligence,
  onCreated,
}) {
  const getDefaultDate = () => {
    const now = new Date()
    const level = intelligence?.priorityLevel || 'medium'
    if (level === 'urgent') return now.toISOString().slice(0, 10)
    if (level === 'high') {
      const d = new Date(now)
      d.setDate(d.getDate() + 1)
      return d.toISOString().slice(0, 10)
    }
    if (level === 'medium') {
      const d = new Date(now)
      d.setDate(d.getDate() + 3)
      return d.toISOString().slice(0, 10)
    }
    const d = new Date(now)
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  }

  const getDefaultTime = () => {
    const now = new Date()
    if (now.getHours() < 12) return '09:00'
    return '14:00'
  }

  const [form, setForm] = useState({
    titre: '',
    description: '',
    echeance: getDefaultDate(),
    heure: getDefaultTime(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && client) {
      const name = client.prenom || client.first_name || client.nom || 'client'
      const reason = intelligence?.reasons?.[0] || intelligence?.nextBestAction || 'Suivi'
      setForm({
        titre: `Relancer ${name}`,
        description: `Action recommandée : ${reason}. Contact via WhatsApp ou appel pour faire le point.`,
        echeance: getDefaultDate(),
        heure: getDefaultTime(),
      })
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, client])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const startTime = `${form.echeance}T${form.heure}:00`
      await api.post('/taches', {
        titre: form.titre,
        description: form.description,
        client_id: client?.id,
        echeance: startTime,
        statut: 'a_faire',
      })

      setSuccess(true)
      setTimeout(() => {
        onCreated?.()
        onClose()
      }, 800)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Erreur création tâche'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="relative w-full max-w-md z-10"
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(32px) saturate(180%)',
              border: '0.5px solid rgba(0,0,0,0.06)',
              borderRadius: 24,
              boxShadow: '0 24px 80px -20px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(255,255,255,0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Halo */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 30% 0%, rgba(139,92,246,0.04), transparent 60%)',
                borderRadius: 24,
              }}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <CheckSquare size={14} style={{ color: '#8b5cf6' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Nouvelle tâche</p>
                  {client && (
                    <p className="text-xs text-gray-400">{client.prenom || ''} {client.nom || ''}</p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 transition-colors">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {success ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-900">Tâche créée</p>
                  <p className="text-xs text-gray-400 mt-1">{form.titre}</p>
                </motion.div>
              ) : (
                <>
                  {/* Titre */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                      Titre
                    </label>
                    <input
                      type="text"
                      value={form.titre}
                      onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm font-semibold text-gray-900 outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-500/20"
                      style={{
                        background: 'rgba(0,0,0,0.03)',
                        border: '0.5px solid rgba(0,0,0,0.06)',
                      }}
                      placeholder="Titre de la tâche"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-500/20 resize-none"
                      style={{
                        background: 'rgba(0,0,0,0.03)',
                        border: '0.5px solid rgba(0,0,0,0.06)',
                      }}
                      placeholder="Description de la tâche"
                    />
                  </div>

                  {/* Date + Heure */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                        <Calendar size={10} className="inline mr-1" />
                        Date
                      </label>
                      <input
                        type="date"
                        value={form.echeance}
                        onChange={e => setForm(f => ({ ...f, echeance: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-500/20"
                        style={{
                          background: 'rgba(0,0,0,0.03)',
                          border: '0.5px solid rgba(0,0,0,0.06)',
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                        <Clock size={10} className="inline mr-1" />
                        Heure
                      </label>
                      <input
                        type="time"
                        value={form.heure}
                        onChange={e => setForm(f => ({ ...f, heure: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-500/20"
                        style={{
                          background: 'rgba(0,0,0,0.03)',
                          border: '0.5px solid rgba(0,0,0,0.06)',
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Intelligence context */}
                  {intelligence?.reasons?.length > 0 && (
                    <div
                      className="rounded-xl px-3 py-2 flex items-start gap-2"
                      style={{ background: 'rgba(139,92,246,0.04)' }}
                    >
                      <Sparkles size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        <span className="font-semibold text-gray-600">ARK :</span>{' '}
                        {intelligence.reasons.slice(0, 2).join(' · ')}
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <p className="text-xs text-red-500 font-medium">{error}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 transition-all duration-200 hover:bg-black/[0.03]"
                      style={{
                        background: 'rgba(0,0,0,0.03)',
                        border: '0.5px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        boxShadow: '0 4px 16px rgba(139,92,246,0.25)',
                      }}
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Créer la tâche'
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
