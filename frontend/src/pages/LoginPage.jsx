import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

function Logo({ size = 'md' }) {
  const s = size === 'lg' ? { box: 36, diamond: 16 } : { box: 28, diamond: 12 }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
      <div style={{
        width: s.box, height: s.box, background: '#0a0a0a', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <div style={{ width: s.diamond, height: s.diamond, background: 'white', transform: 'rotate(45deg)' }} />
      </div>
      <span style={{ color: '#0a0a0a', fontSize: size === 'lg' ? 18 : 15, fontWeight: 500, letterSpacing: -0.3 }}>COURTIA</span>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading } = useAuthStore()
  const [email, setEmail] = useState('demo@courtia.fr')
  const [password, setPassword] = useState('Demo2026!')
  const [err, setErr] = useState('')
  const isRegister = window.location.pathname === '/register'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await login(email, password)
      navigate('/dashboard')
      toast.success('Connecté avec succès')
    } catch (e) {
      setErr(e.message || 'Email ou mot de passe incorrect')
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'white', border: '0.5px solid #e8e6e0',
    borderRadius: 8, fontSize: 14, color: '#0a0a0a',
    fontFamily: 'Arial, sans-serif', boxSizing: 'border-box',
    transition: 'border-color 0.15s'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f6f2',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, sans-serif', padding: '0 16px'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 16,
          border: '0.5px solid #e8e6e0', padding: 48
        }}>
          <h1 style={{ fontSize: 32, fontWeight: 500, color: '#0a0a0a', margin: '0 0 6px', letterSpacing: -1 }}>
            Bonjour.
          </h1>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 32px' }}>
            {isRegister ? 'Créez votre espace courtier.' : 'Connectez-vous à votre espace courtier.'}
          </p>

          {err && (
            <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: '#dc2626', fontSize: 13 }}>
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6, letterSpacing: 0.3 }}>EMAIL</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.fr" required style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 6, letterSpacing: 0.3 }}>MOT DE PASSE</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#555' : '#0a0a0a',
                color: 'white', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8, fontFamily: 'Arial, sans-serif', letterSpacing: -0.2
              }}
            >
              {loading ? 'Connexion...' : (isRegister ? 'Créer mon compte' : 'Connexion')}
            </button>
          </form>
        </div>

        {/* Lien switch */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 20 }}>
          {isRegister ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          <span
            onClick={() => navigate(isRegister ? '/login' : '/register')}
            style={{ color: '#0a0a0a', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {isRegister ? 'Se connecter' : 'Démarrer'}
          </span>
        </p>

        {/* Demo */}
        {!isRegister && (
          <div style={{
            marginTop: 16, background: 'white', border: '0.5px solid #e8e6e0',
            borderRadius: 10, padding: '14px 16px'
          }}>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 6px', letterSpacing: 0.5 }}>ACCÈS DÉMONSTRATION</p>
            <p style={{ fontSize: 13, color: '#0a0a0a', margin: 0 }}>
              <span style={{ color: '#9ca3af' }}>Email : </span>demo@courtia.fr
            </p>
            <p style={{ fontSize: 13, color: '#0a0a0a', margin: '2px 0 0' }}>
              <span style={{ color: '#9ca3af' }}>Mot de passe : </span>Demo2026!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
