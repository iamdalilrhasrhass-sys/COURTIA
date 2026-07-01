import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../api'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import { AUTH_STYLES } from './authStyles'

export default function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!token) {
      setError('Lien invalide : token manquant.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.error || 'Lien invalide ou expiré. Refaites une demande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: AUTH_STYLES }} />
    <div className="auth-root">
      <div className="auth-aurora" />
      <div className="auth-card" style={{ maxWidth: 480, minHeight: 'auto' }}>
        <div className="auth-right" style={{ flex: 1 }}>
          <div className="auth-right-inner">
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
              <CourtiaBubbleLogo size={40} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 8, textAlign: 'center' }}>
              Nouveau mot de passe
            </h1>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginBottom: 24, textAlign: 'center' }}>
              Choisissez un nouveau mot de passe pour votre compte COURTIA.
            </p>

            <div className="auth-form-shell">
              {done ? (
                <div style={{ textAlign: 'center', padding: '12px 4px' }}>
                  <p style={{ color: '#6ee7b7', fontSize: 13.5, lineHeight: 1.5 }}>
                    Mot de passe mis à jour. Redirection vers la connexion...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {error && <div className="auth-error"><span>{error}</span></div>}
                  <div style={{ marginBottom: 10 }}>
                    <input
                      className="auth-input"
                      type="password"
                      placeholder="Nouveau mot de passe (8 caractères min.)"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <input
                      className="auth-input"
                      type="password"
                      placeholder="Confirmer le mot de passe"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
                  </button>
                </form>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Link to="/login" className="auth-link">
                Retour à la <strong>connexion</strong>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
