import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlanStore } from '../stores/planStore'
import api from '../api'

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}

/**
 * Bandeau rouge fixed top quand un admin impersonne un utilisateur.
 * Lit impersonation depuis usePlanStore.
 */
export default function ImpersonationBanner() {
  const impersonation = usePlanStore(s => s.impersonation)

  if (!impersonation) return null

  const target = impersonation.target || {}

  const handleStop = async () => {
    try {
      const res = await api.post('/api/admin/impersonate/stop', {
        log_id: impersonation.log_id
      })
      if (res.data.token) {
        localStorage.setItem('courtia_token', res.data.token)
        localStorage.setItem('token', res.data.token)
      }
      window.location.reload()
    } catch (err) {
      console.error('Erreur arrêt impersonation:', err)
      window.location.reload()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        exit={{ y: -50 }}
        className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-2 shadow-lg"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-sm">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              ⚠️ Mode admin : vous êtes connecté en tant que{' '}
              <strong>{target.first_name} {target.last_name}</strong>
              {target.id && <span className="opacity-70"> (id {target.id})</span>}
            </span>
            <span className="text-xs opacity-80">
              {formatRelativeTime(impersonation.started_at)}
            </span>
          </div>
          <button
            onClick={handleStop}
            className="bg-white text-red-600 px-3 py-1 rounded font-semibold hover:bg-gray-100 transition-colors text-sm shrink-0"
          >
            Arrêter l'impersonation
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
