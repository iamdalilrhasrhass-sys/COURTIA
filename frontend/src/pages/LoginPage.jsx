import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading, error } = useAuthStore()
  const [email, setEmail] = useState('demo@courtia.fr')
  const [password, setPassword] = useState('Demo2026!')
  const [err, setErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await login(email, password)
      navigate('/dashboard')
      toast.success('Connecté avec succès')
    } catch (err) {
      setErr(err.message || 'Email ou mot de passe incorrect')
      toast.error('Email ou mot de passe incorrect')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      padding: '0 16px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* Logo + Titre */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <span style={{ color: 'white', fontSize: '28px', fontWeight: '700' }}>⚡</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#080808', margin: '0 0 8px 0' }}>
            COURTIA
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Le CRM intelligent pour courtiers d'assurance
          </p>
        </div>

        {/* Card formulaire */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#080808', margin: '0 0 24px 0' }}>
            Connexion
          </h2>

          {(err || error) && (
            <div style={{
              backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '12px', marginBottom: '16px',
              color: '#dc2626', fontSize: '14px'
            }}>
              ⚠️ {err || error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@courtia.fr"
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', color: '#080808',
                  outline: 'none', boxSizing: 'border-box',
                  backgroundColor: 'white'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', color: '#080808',
                  outline: 'none', boxSizing: 'border-box',
                  backgroundColor: 'white'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                backgroundColor: loading ? '#93c5fd' : '#2563eb',
                color: 'white', border: 'none',
                borderRadius: '8px', fontSize: '15px',
                fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px'
              }}
            >
              {loading ? '🔄 Connexion...' : '🔓 Se connecter'}
            </button>
          </form>
        </div>

        {/* Lien créer compte */}
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '16px', marginBottom: 0 }}>
          Pas encore de compte ?{' '}
          <a href="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
            Créer un compte
          </a>
        </p>

        {/* Demo credentials */}
        <div style={{
          marginTop: '16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '16px'
        }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8', margin: '0 0 6px 0' }}>
            🎯 Accès démonstration
          </p>
          <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 2px 0' }}>
            Email : <strong>demo@courtia.fr</strong>
          </p>
          <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
            Mot de passe : <strong>Demo2026!</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
