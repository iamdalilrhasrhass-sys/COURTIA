import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import api from '../api'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const STYLES = `
  .auth-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #050510;
  }

  .auth-aurora {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .auth-aurora::before {
    content: '';
    position: absolute;
    width: 600px;
    height: 600px;
    top: -200px;
    left: -150px;
    background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%);
    border-radius: 50%;
  }
  .auth-aurora::after {
    content: '';
    position: absolute;
    width: 500px;
    height: 500px;
    bottom: -150px;
    right: -100px;
    background: radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%);
    border-radius: 50%;
  }

  .auth-card {
    position: relative;
    z-index: 1;
    display: flex;
    width: 100%;
    max-width: 880px;
    min-height: 520px;
    border-radius: 20px;
    overflow: hidden;
    background: rgba(10,10,18,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .auth-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid rgba(167,139,250,0.22);
    background: rgba(139,92,246,0.10);
    color: #ddd6fe;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .auth-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 40px;
    background: rgba(255,255,255,0.015);
    border-right: 1px solid rgba(255,255,255,0.04);
    position: relative;
    overflow: hidden;
  }

  .auth-left-halo {
    position: absolute;
    width: 300px;
    height: 300px;
    top: -80px;
    left: -80px;
    background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }

  .auth-left-content {
    position: relative;
    z-index: 1;
  }

  .auth-benefit {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 12px;
  }
  .auth-benefit-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: linear-gradient(135deg, #a78bfa, #8b5cf6);
    margin-top: 7px;
    flex-shrink: 0;
    box-shadow: 0 0 8px rgba(139,92,246,0.4);
  }

  .auth-preview {
    margin-top: 28px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 16px 18px;
    position: relative;
  }

  .auth-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 40px;
  }

  .auth-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    background: rgba(255,255,255,0.03);
    color: #e5e5e5;
    font-size: 13.5px;
    font-family: inherit;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }
  .auth-input:focus {
    border-color: rgba(139,92,246,0.4);
    box-shadow: 0 0 0 3px rgba(139,92,246,0.08);
    background: rgba(255,255,255,0.05);
  }
  .auth-input::placeholder {
    color: rgba(255,255,255,0.2);
  }

  .auth-btn {
    width: 100%;
    padding: 11px 20px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
    color: #fff;
    font-size: 13.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: -0.01em;
  }
  .auth-btn:hover {
    background: linear-gradient(135deg, #9b6dff, #7c3aed);
    box-shadow: 0 4px 16px rgba(139,92,246,0.25);
  }
  .auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auth-btn-google {
    width: 100%;
    padding: 10px 20px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.7);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .auth-btn-google:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.18);
  }

  .auth-error {
    background: rgba(239,68,68,0.06);
    border: 1px solid rgba(239,68,68,0.15);
    color: #fca5a5;
    font-size: 12.5px;
    padding: 10px 14px;
    border-radius: 10px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.4;
  }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 18px 0;
  }
  .auth-divider::before,
  .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.06);
  }

  .auth-link {
    color: rgba(255,255,255,0.35);
    font-size: 12.5px;
    text-decoration: none;
    transition: color 0.2s;
  }
  .auth-link:hover {
    color: rgba(255,255,255,0.7);
  }
  .auth-link strong {
    color: #a78bfa;
    font-weight: 600;
  }

  .auth-plan-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(139,92,246,0.1);
    border: 1px solid rgba(139,92,246,0.2);
    color: #c4b5fd;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 20px;
  }

  .auth-trial-panel {
    border: 1px solid rgba(110,231,183,0.18);
    background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(139,92,246,0.06));
    border-radius: 14px;
    padding: 12px;
    margin-bottom: 18px;
  }
  .auth-trial-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .auth-trial-cell {
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(0,0,0,0.16);
    border-radius: 10px;
    padding: 9px 8px;
  }
  .auth-trial-value {
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.1;
  }
  .auth-trial-label {
    color: rgba(255,255,255,0.40);
    font-size: 9.5px;
    margin-top: 3px;
    line-height: 1.25;
  }

  @media (max-width: 768px) {
    .auth-card { flex-direction: column; min-height: 100vh; max-width: 100vw; border-radius: 0; }
    .auth-left { display: none; }
    .auth-right { width: 100%; padding: 1.75rem 1.5rem; justify-content: center; min-height: 100vh; }
    .auth-root { padding: 0; }
    .auth-trial-grid { grid-template-columns: 1fr; }
  }
`

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [errorLink, setErrorLink] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isRegister = location.pathname === '/register'
  const params = new URLSearchParams(location.search)
  const selectedPlan = params.get('plan')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.')
      return
    }
    if (isRegister && (!firstName || !lastName)) {
      setError('Veuillez renseigner votre prénom et votre nom.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const body = isRegister ? { email, password, firstName, lastName } : { email, password }
      const res = await api.post(endpoint, body)
      const { token, user } = res.data
      localStorage.setItem('courtia_token', token)
      if (user) localStorage.setItem('courtia_user', JSON.stringify(user))
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data || {}
      const status = err.response?.status

      if (data.error === 'duplicate_email' || data.message?.includes('déjà utilisée')) {
        setError(data.message || 'Cette adresse email est déjà utilisée. Connectez-vous ou utilisez une autre adresse.')
        setErrorLink('/login')
        return
      }

      if (status === 401) {
        setError('Email ou mot de passe incorrect.')
      } else if (status === 403) {
        setError('Votre compte est suspendu. Contactez le support COURTIA.')
      } else if (status >= 500) {
        setError('Connexion impossible pour le moment. Réessayez dans quelques instants.')
      } else if (!err.response) {
        setError('Impossible de joindre le serveur COURTIA. Vérifiez votre connexion.')
      } else {
        const msg = isRegister
          ? (data.message || 'Création du compte impossible pour le moment.')
          : (data.message || 'Une erreur est survenue. Vérifiez vos identifiants.')
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        }).then(r => r.json())

        const res = await axios.post(`${API_URL}/api/auth/google`, {
          googleId: userInfo.sub,
          email: userInfo.email,
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          picture: userInfo.picture
        })

        localStorage.setItem('courtia_token', res.data.token)
        if (res.data.user) localStorage.setItem('courtia_user', JSON.stringify(res.data.user))
        navigate('/dashboard')
      } catch (err) {
        setError('Erreur lors de la connexion Google.')
      }
    },
    onError: () => setError('Connexion Google annulée ou refusée.')
  })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="auth-root">
        <div className="auth-aurora" />

        <div className="auth-card">
          {/* LEFT — Brand panel */}
          <div className="auth-left">
            <div className="auth-left-halo" />
            <div className="auth-left-content">
              {/* Logo */}
              <div style={{ marginBottom: 24 }}>
                <CourtiaBubbleLogo size={44} />
              </div>

              {/* Brand message */}
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>
                Cockpit IA · Courtiers ORIAS
              </p>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, lineHeight: 1.35, marginBottom: 8, letterSpacing: '-0.02em' }}>
                Le cockpit IA des courtiers.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.5, marginBottom: 24, lineHeight: 1.5 }}>
                Connectez-vous à votre portefeuille intelligent. ARK analyse, détecte et priorise pour vous.
              </p>

              {/* Benefits */}
              <div style={{ marginBottom: 8 }}>
                {[
                  'Priorités détectées par ARK',
                  'Relances et échéances centralisées',
                  'Portefeuille piloté en temps réel',
                ].map((t, i) => (
                  <div key={i} className="auth-benefit">
                    <div className="auth-benefit-dot" />
                    <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: 12.5 }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* Mini product preview */}
              <div className="auth-preview">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>ARK ACTIF</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Alertes', value: '3', color: '#f59e0b' },
                    { label: 'Clients à relancer', value: '7', color: '#3b82f6' },
                    { label: 'Score santé', value: '82%', color: '#10b981' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px', textAlign: 'center', minWidth: 70 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.08)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: 10.5, color: '#6ee7b7', fontWeight: 500 }}>Portefeuille sous contrôle</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="auth-right">
            {/* Plan badge for register */}
            {isRegister && selectedPlan && (
              <div className="auth-plan-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                Offre {selectedPlan === 'pro' ? 'Pro' : selectedPlan} sélectionnée — Essai gratuit 7 jours
              </div>
            )}

            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 4, letterSpacing: '-0.02em' }}>
              {isRegister
                ? selectedPlan === 'pro'
                  ? 'Activez votre cockpit Pro'
                  : 'Créez votre cockpit courtier'
                : 'Ouvrez votre cockpit'}
            </h1>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
              {isRegister
                ? selectedPlan === 'pro'
                  ? '7 jours pour voir vos priorités, vos relances et votre portefeuille sous contrôle.'
                  : 'Démarrez avec un espace sérieux pour piloter votre portefeuille.'
                : 'Retrouvez vos priorités, vos clients et votre brief ARK.'}
            </p>

            {isRegister && selectedPlan === 'pro' && (
              <div className="auth-trial-panel">
                <div className="auth-trial-grid">
                  <div className="auth-trial-cell">
                    <div className="auth-trial-value">0 €</div>
                    <div className="auth-trial-label">aujourd’hui</div>
                  </div>
                  <div className="auth-trial-cell">
                    <div className="auth-trial-value">7 jours</div>
                    <div className="auth-trial-label">pour tester Pro</div>
                  </div>
                  <div className="auth-trial-cell">
                    <div className="auth-trial-value">En ligne</div>
                    <div className="auth-trial-label">annulation simple</div>
                  </div>
                </div>
                <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.46)', fontSize: 11.5, lineHeight: 1.45 }}>
                  Votre carte sera demandée dans l’étape de paiement sécurisée dédiée. COURTIA ne collecte pas vos coordonnées bancaires ici.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Error */}
              {error && (
                <div className="auth-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                  {errorLink && (
                    <Link to={errorLink} style={{ marginLeft: 8, color: '#a78bfa', fontWeight: 600, fontSize: 'inherit', textDecoration: 'underline' }}>
                      Connectez-vous
                    </Link>
                  )}
                </div>
              )}

              {/* Register fields */}
              {isRegister && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <input
                    className="auth-input"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                  />
                  <input
                    className="auth-input"
                    placeholder="Nom"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Email */}
              <div style={{ marginBottom: 10 }}>
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

              {/* Password */}
              <div style={{ marginBottom: 14, position: 'relative' }}>
                <input
                  className="auth-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer',
                    padding: 4, fontSize: 11,
                  }}
                >
                  {showPw ? 'Cacher' : 'Voir'}
                </button>
              </div>

              {/* Remember me (login only) */}
              {!isRegister && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <input type="checkbox" id="remember" style={{ accentColor: '#8b5cf6', width: 14, height: 14 }} />
                  <label htmlFor="remember" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                    Se souvenir de moi
                  </label>
                </div>
              )}

              {/* Submit */}
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CourtiaMiniLogo size={16} />
                    {isRegister ? 'Création...' : 'Connexion...'}
                  </span>
                ) : (
                  isRegister
                    ? selectedPlan === 'pro'
                      ? 'Activer mon essai Pro'
                      : 'Créer mon cockpit'
                    : 'Ouvrir mon cockpit'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider">
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontWeight: 500 }}>OU</span>
            </div>

            {/* Google */}
            <button type="button" onClick={handleGoogleLogin} className="auth-btn-google">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuer avec Google
            </button>

            {/* Bottom link */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              {isRegister ? (
                <Link to="/login" className="auth-link">
                  Déjà un compte ? <strong>Connectez-vous</strong>
                </Link>
              ) : (
                <Link to="/register" className="auth-link">
                  Pas encore de compte ? <strong>Inscrivez-vous gratuitement</strong>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
