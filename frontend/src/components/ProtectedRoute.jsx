import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api'
import Paywall from './Paywall'

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
    return <div className="p-8 text-slate-500">Chargement…</div>
  }

  if (err) {
    localStorage.removeItem('courtia_token')
    localStorage.removeItem('token')
    return <Navigate to="/login?reason=expired" replace />
  }

  if (requireFeature && me && !me.features?.includes(requireFeature)) {
    return <Paywall feature={requireFeature} plan={me.plan || 'trial'} />
  }

  return children
}
