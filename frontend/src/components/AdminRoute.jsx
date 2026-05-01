import { Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import CourtiaLogoLoader from './brand/CourtiaLogoLoader'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('loading') // loading | granted | forbidden | unauthenticated

  useEffect(() => {
    const check = async () => {
      const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
      if (!token) {
        setStatus('unauthenticated')
        return
      }
      try {
        const res = await fetch(`${API_URL}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          setStatus('granted')
        } else if (res.status === 401) {
          setStatus('unauthenticated')
        } else if (res.status === 403) {
          setStatus('forbidden')
        } else {
          setStatus('forbidden')
        }
      } catch {
        setStatus('forbidden')
      }
    }
    check()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
        <CourtiaLogoLoader size={48} text="Vérification des accès..." />
      </div>
    )
  }

  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (status === 'forbidden') return <Navigate to="/app/dashboard" replace />
  return children
}
