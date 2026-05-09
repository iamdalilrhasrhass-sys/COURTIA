import { useState } from 'react'
import { Bell, AlertCircle, Info, Check } from 'lucide-react'
import api from '../api'

export default function NotificationBell() {
  const [showPanel, setShowPanel] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  async function loadNotifications() {
    setLoading(true)
    try {
      const res = await api.get('/notifications?limit=8')
      setAlerts(Array.isArray(res?.data?.rows) ? res.data.rows : [])
      setUnread(Number(res?.data?.unread || 0))
    } catch {
      setAlerts([])
      setUnread(0)
    } finally {
      setLoading(false)
    }
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all')
      await loadNotifications()
    } catch {
      // Non bloquant: le panneau restera consultable.
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowPanel(!showPanel)
          if (!showPanel) loadNotifications()
        }}
        className="relative rounded-xl border border-white/10 bg-white/[0.06] p-2 text-white shadow-lg shadow-black/20 backdrop-blur-xl transition hover:bg-white/[0.1]"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-12 z-50 max-h-96 w-80 overflow-y-auto rounded-2xl border border-white/12 bg-[#090b1d]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <p className="text-[11px] text-white/45">{unread} non lue{unread > 1 ? 's' : ''}</p>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/75 hover:bg-white/10">
                <Check size={12} />
                Tout lu
              </button>
            )}
          </div>
          <div className="space-y-2">
            {loading && <p className="rounded-xl bg-white/5 p-3 text-xs text-white/55">Chargement…</p>}
            {!loading && alerts.length === 0 && (
              <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center text-xs text-white/55">
                Aucune notification pour le moment. COURTIA fera remonter les échéances, tâches et signaux ARK ici.
              </p>
            )}
            {!loading && alerts.map(alert => {
              const urgent = ['urgent', 'danger', 'error'].includes(String(alert.severity || alert.type).toLowerCase())
              const warning = ['warning', 'warn'].includes(String(alert.severity || alert.type).toLowerCase())
              return (
                <a
                  key={alert.id}
                  href={alert.link || '#'}
                  className={`block rounded-xl border p-3 no-underline ${
                    urgent ? 'border-rose-400/30 bg-rose-500/10' : warning ? 'border-amber-300/30 bg-amber-400/10' : 'border-cyan-300/20 bg-cyan-400/10'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {urgent || warning ? <AlertCircle size={15} className={urgent ? 'mt-0.5 text-rose-300' : 'mt-0.5 text-amber-200'} /> : <Info size={15} className="mt-0.5 text-cyan-200" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">{alert.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/58">{alert.body || alert.message || alert.msg}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/35">{alert.kind || alert.type || 'info'}</p>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
