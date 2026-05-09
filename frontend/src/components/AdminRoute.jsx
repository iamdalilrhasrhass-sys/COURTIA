import { Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'
import CourtiaLogoLoader from './brand/CourtiaLogoLoader'
import CourtiaMiniLogo from './brand/CourtiaMiniLogo'
import AuroraButton from './brand/AuroraButton'
import { getCourtiaAdminToken } from '../lib/adminApi'
import { getSessionUser } from '../api/sessionUser'

function decodeRoleFromToken(token = '') {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return String(payload?.role || '').toLowerCase()
  } catch {
    return ''
  }
}

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading') // loading | granted | forbidden | unauthenticated

  useEffect(() => {
    const check = async () => {
      const token = getCourtiaAdminToken()
      if (!token) {
        setStatus('unauthenticated')
        return
      }

      let role = ''
      try {
        const sessionUser = await getSessionUser({ allowStaleOn429: true })
        role = String(sessionUser?.role || '').toLowerCase()
      } catch {
        // fallback decode when auth/me is temporarily unavailable
      }
      if (!role) role = decodeRoleFromToken(token)

      if (role === 'admin' || role === 'super_admin') {
        setStatus('granted')
        return
      }

      if (!role) {
        setStatus('unauthenticated')
        return
      }

      setStatus('forbidden')
    }
    check().catch(() => setStatus('forbidden'))
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
        <CourtiaLogoLoader size={48} text="Vérification des accès..." />
      </div>
    )
  }

  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (status === 'forbidden') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'radial-gradient(circle at 50% 20%, rgba(124,58,237,0.22), transparent 34%), radial-gradient(circle at 70% 65%, rgba(6,182,212,0.14), transparent 34%), #07070b',
        color: '#fff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <div style={{
          width: 'min(100%, 520px)',
          padding: '34px 32px',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))',
          boxShadow: '0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
          backdropFilter: 'blur(22px)',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <CourtiaMiniLogo size={34} />
          </div>
          <div style={{
            width: 54,
            height: 54,
            margin: '0 auto 18px',
            borderRadius: 18,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.22)',
            color: '#fbbf24',
          }}>
            <ShieldAlert size={24} />
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#93c5fd', fontWeight: 700 }}>
            Accès administrateur requis
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: 28, lineHeight: 1.08, letterSpacing: '-0.04em' }}>
            Admin Center protégé
          </h1>
          <p style={{ margin: '0 auto 24px', maxWidth: 410, fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.66)' }}>
            Votre session COURTIA est valide, mais elle ne dispose pas des droits administrateur nécessaires pour piloter cette zone.
          </p>
          <AuroraButton href="/dashboard" variant="secondary" size="md">
            Retour au cockpit
          </AuroraButton>
        </div>
      </div>
    )
  }
  return children
}
