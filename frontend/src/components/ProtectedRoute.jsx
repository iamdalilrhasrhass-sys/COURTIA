import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api'
import Paywall from './Paywall'
import { clearStoredSession } from '../api/sessionPolicy'

export default function ProtectedRoute({ children, requireFeature }) {
  const loc = useLocation()
  const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
  const [me, setMe] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!token) return
    api.get('/auth/me')
      .then(r => setMe(r.data))
      .catch(e => setErr(e))
  }, [token])

  if (!token) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />
  }

  if (!me && !err) {
    return <div className="p-8 text-slate-200">Chargement de votre cockpit...</div>
  }

  if (err) {
    if (err.response?.status === 401) {
      clearStoredSession()
      return <Navigate to="/login?reason=expired" replace />
    }

    return (
      <div className="min-h-screen px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200/70">Session COURTIA</p>
          <h1 className="mt-3 text-2xl font-semibold">Vérification momentanément indisponible</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Votre session n'a pas été supprimée. Le serveur COURTIA n'a pas répondu correctement à la vérification.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (requireFeature && me && !me.features?.includes(requireFeature)) {
    return <Paywall feature={requireFeature} plan={me.plan || 'trial'} />
  }

  return children
}
