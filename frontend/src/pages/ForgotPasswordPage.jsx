import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import { AUTH_STYLES } from './authStyles'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) {
      setError('Veuillez renseigner votre email.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError('Une erreur est survenue. Réessayez dans quelques instants.')
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
              Mot de passe oublié
            </h1>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginBottom: 24, textAlign: 'center' }}>
              Entrez votre email, nous vous enverrons un lien pour créer un nouveau mot de passe.
            </p>

            <div className="auth-form-shell">
              {sent ? (
                <div style={{ textAlign: 'center', padding: '12px 4px' }}>
                  <p style={{ color: '#6ee7b7', fontSize: 13.5, lineHeight: 1.5 }}>
                    Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte de réception (et vos spams).
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {error && <div className="auth-error"><span>{error}</span></div>}
                  <div style={{ marginBottom: 14 }}>
                    <input
                      className="auth-input"
                      type="email"
                      placeholder="votre@email.fr"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
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
