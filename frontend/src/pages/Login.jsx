// COURTIA Login — Bulles de savon physiques — Ark x Dalil — v2 force rebuild
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const DiamondLogo = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
    <path d="M15 2L28 9V21L15 28L2 21V9L15 2Z" fill="#2563eb" opacity="0.9"/>
    <path d="M15 7L23 11.5V19.5L15 24L7 19.5V11.5L15 7Z" fill="#0a0a0a"/>
    <path d="M15 11.5L20 14.3V19.7L15 22.5L10 19.7V14.3L15 11.5Z" fill="#2563eb" opacity="0.5"/>
    <path d="M15 14.5L17.5 16V18.5L15 20L12.5 18.5V16L15 14.5Z" fill="rgba(255,255,255,0.18)"/>
  </svg>
)

const Bubble = ({ size, style, animName, delay = 0 }) => (
  <div className="bubble" style={{ width: size, height: size, ...style, animationDelay: `${delay}s` }}>
    <div className="bubble-iris" />
    <div className="bubble-body" />
    <div className="bubble-highlight" />
    <div className="bubble-highlight2" />
    <div className="bubble-shadow" />
  </div>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/auth/login', { email, password })
      const { token, user } = res.data
      localStorage.setItem('courtia_token', token)
      if (user) localStorage.setItem('courtia_user', JSON.stringify(user))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, 'Inter', sans-serif;
          overflow: hidden;
          position: relative;
        }

        .scene {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 30% 20%, #e8e4ff 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, #fce4f3 0%, transparent 45%),
            radial-gradient(ellipse at 60% 40%, #dff0ff 0%, transparent 40%),
            linear-gradient(160deg, #ede9fe 0%, #f7f6f2 35%, #fdf2ff 70%, #f0f9ff 100%);
        }

        @keyframes b1 { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 20%{transform:translate(12px,-18px) rotate(2deg) scale(1.02)} 45%{transform:translate(-8px,-30px) rotate(-1deg) scale(0.98)} 70%{transform:translate(16px,-14px) rotate(3deg) scale(1.03)} 100%{transform:translate(0,0) rotate(0deg) scale(1)} }
        @keyframes b2 { 0%{transform:translate(0,0) scale(1)} 30%{transform:translate(-14px,-22px) scale(1.04)} 60%{transform:translate(10px,-35px) scale(0.97)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes b3 { 0%{transform:translate(0,0) rotate(0deg)} 25%{transform:translate(8px,-15px) rotate(-2deg)} 50%{transform:translate(-12px,-28px) rotate(1deg)} 75%{transform:translate(6px,-10px) rotate(-1deg)} 100%{transform:translate(0,0) rotate(0deg)} }
        @keyframes b4 { 0%{transform:translate(0,0) scale(1)} 35%{transform:translate(-10px,-20px) scale(1.05)} 65%{transform:translate(14px,-32px) scale(0.96)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes b5 { 0%{transform:translate(0,0)} 40%{transform:translate(18px,-25px)} 80%{transform:translate(-6px,-38px)} 100%{transform:translate(0,0)} }
        @keyframes b6 { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 30%{transform:translate(-16px,-18px) rotate(3deg) scale(1.03)} 70%{transform:translate(10px,-30px) rotate(-2deg) scale(0.98)} 100%{transform:translate(0,0) rotate(0deg) scale(1)} }
        @keyframes b7 { 0%{transform:translate(0,0) scale(1)} 45%{transform:translate(12px,-22px) scale(1.06)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes b8 { 0%{transform:translate(0,0)} 55%{transform:translate(-20px,-28px)} 100%{transform:translate(0,0)} }
        @keyframes irisShift { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }

        .bubble {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          transform-origin: center;
        }

        .bubble-body {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 40%, transparent 70%);
          border: 1px solid rgba(255,255,255,0.5);
        }

        .bubble-iris {
          position: absolute;
          inset: -1px;
          border-radius: 50%;
          background: conic-gradient(from 45deg at 40% 40%, rgba(167,139,250,0.18) 0deg, rgba(96,165,250,0.22) 60deg, rgba(52,211,153,0.14) 120deg, rgba(251,191,36,0.12) 180deg, rgba(251,113,133,0.18) 240deg, rgba(167,139,250,0.18) 360deg);
          mix-blend-mode: screen;
          animation: irisShift 10s linear infinite;
        }

        .bubble-highlight {
          position: absolute;
          width: 38%;
          height: 30%;
          top: 10%;
          left: 15%;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255,255,255,0.75) 0%, transparent 100%);
          transform: rotate(-25deg);
          filter: blur(1.5px);
        }

        .bubble-highlight2 {
          position: absolute;
          width: 20%;
          height: 14%;
          bottom: 14%;
          right: 18%;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 100%);
          filter: blur(1px);
        }

        .bubble-shadow {
          position: absolute;
          bottom: -8%;
          left: 10%;
          width: 80%;
          height: 20%;
          background: radial-gradient(ellipse, rgba(0,0,0,0.07) 0%, transparent 70%);
          filter: blur(3px);
        }

        .b-1 { animation: b1 11s ease-in-out infinite; }
        .b-2 { animation: b2 14s ease-in-out infinite 1s; }
        .b-3 { animation: b3 9s ease-in-out infinite 2s; }
        .b-4 { animation: b4 13s ease-in-out infinite 0.5s; }
        .b-5 { animation: b5 10s ease-in-out infinite 1.5s; }
        .b-6 { animation: b6 16s ease-in-out infinite 0.8s; }
        .b-7 { animation: b7 8s ease-in-out infinite 3s; }
        .b-8 { animation: b8 12s ease-in-out infinite 2.5s; }

        .card {
          display: flex;
          width: 900px;
          max-width: 96vw;
          min-height: 560px;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.8), 0 8px 20px rgba(0,0,0,0.07), 0 30px 60px rgba(0,0,0,0.05);
          animation: cardIn 0.8s cubic-bezier(0.16,1,0.3,1) both;
          position: relative;
          z-index: 1;
        }

        .left-col {
          width: 43%;
          background: #0a0a0a;
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .left-col::before {
          content: '';
          position: absolute;
          top: -60px;
          left: -60px;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(37,99,235,0.18) 0%, transparent 65%);
        }

        .left-col::after {
          content: '';
          position: absolute;
          bottom: -80px;
          right: -40px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 65%);
        }

        .geo {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .right-col {
          flex: 1;
          background: rgba(250,249,246,0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          padding: 3rem 2.75rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .founder-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(37,99,235,0.08);
          border: 0.5px solid rgba(37,99,235,0.18);
          border-radius: 20px;
          padding: 4px 12px;
          color: #2563eb;
          font-size: 10.5px;
          font-weight: 500;
          margin-bottom: 1.5rem;
          width: fit-content;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2563eb;
          animation: pulseDot 2s ease-in-out infinite;
        }

        .input-group {
          position: relative;
          margin-bottom: 14px;
        }

        .input-group svg.input-icon {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
          pointer-events: none;
        }

        .input-group input {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: 0.5px solid rgba(0,0,0,0.11);
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 0 40px 0 40px;
          font-size: 13.5px;
          font-family: -apple-system, 'Inter', sans-serif;
          color: #0a0a0a;
          outline: none;
          transition: all 0.2s ease;
        }

        .input-group input:focus {
          border-color: rgba(37,99,235,0.45);
          box-shadow: 0 0 0 3.5px rgba(37,99,235,0.09);
          background: rgba(255,255,255,0.92);
        }

        .input-group input::placeholder {
          color: rgba(0,0,0,0.3);
        }

        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          z-index: 1;
          color: rgba(0,0,0,0.3);
          transition: color 0.15s;
        }

        .eye-btn:hover {
          color: rgba(0,0,0,0.6);
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 10px 0 18px;
        }

        .checkbox-group input[type="checkbox"] {
          width: 17px;
          height: 17px;
          border-radius: 5px;
          border: 0.5px solid rgba(0,0,0,0.14);
          accent-color: #2563eb;
          cursor: pointer;
        }

        .checkbox-group label {
          font-size: 12.5px;
          color: rgba(0,0,0,0.5);
          cursor: pointer;
        }

        .submit-btn {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          background: #1a1a1a;
          color: #fff;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.12);
          transition: all 0.2s ease;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%);
          border-radius: 12px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15);
        }

        .submit-btn:active:not(:disabled) {
          transform: scale(0.985);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 0.5px;
          background: rgba(0,0,0,0.08);
        }

        .divider span {
          font-size: 11.5px;
          color: rgba(0,0,0,0.3);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .google-btn {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          background: rgba(255,255,255,0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 0.5px solid rgba(0,0,0,0.1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 13.5px;
          color: rgba(0,0,0,0.7);
          font-family: -apple-system, 'Inter', sans-serif;
          transition: all 0.2s ease;
        }

        .google-btn:hover {
          background: rgba(255,255,255,0.85);
          border-color: rgba(0,0,0,0.18);
        }

        .error-banner {
          background: rgba(239,68,68,0.06);
          border: 0.5px solid rgba(239,68,68,0.2);
          color: #dc2626;
          font-size: 12.5px;
          padding: 10px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .card {
            flex-direction: column;
            min-height: 100vh;
            max-width: 100vw;
            border-radius: 0;
          }

          .left-col {
            display: none;
          }

          .right-col {
            width: 100%;
            padding: 2rem 1.5rem;
            justify-content: center;
            min-height: 100vh;
          }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="scene">
          <Bubble size="110px" style={{ top: '2%', left: '2%' }} animName="b1" />
          <Bubble size="70px" style={{ top: '8%', right: '8%' }} animName="b2" delay={1} />
          <Bubble size="45px" style={{ top: '28%', left: '4%' }} animName="b3" delay={2} />
          <Bubble size="88px" style={{ top: '35%', right: '3%' }} animName="b4" delay={0.5} />
          <Bubble size="55px" style={{ bottom: '20%', left: '7%' }} animName="b5" delay={1.5} />
          <Bubble size="130px" style={{ bottom: '3%', right: '2%' }} animName="b6" delay={0.8} />
          <Bubble size="38px" style={{ top: '55%', left: '2%' }} animName="b7" delay={3} />
          <Bubble size="62px" style={{ bottom: '30%', right: '6%' }} animName="b8" delay={2.5} />
        </div>

        <div className="card">
          {/* Colonne gauche — Branding */}
          <div className="left-col">
            <div className="geo" style={{ width:200,height:200,top:-80,left:-80,border:'0.5px solid rgba(255,255,255,0.04)' }} />
            <div className="geo" style={{ width:120,height:120,top:-30,left:-30,border:'0.5px solid rgba(37,99,235,0.15)' }} />
            <div className="geo" style={{ width:180,height:180,bottom:-70,right:-50,border:'0.5px solid rgba(255,255,255,0.04)' }} />
            <div className="geo" style={{ width:90,height:90,bottom:-20,right:-10,border:'0.5px solid rgba(139,92,246,0.12)' }} />
            <div className="geo" style={{ width:60,height:60,top:'46%',right:-20,border:'0.5px solid rgba(255,255,255,0.05)' }} />

            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28 }}>
                <DiamondLogo />
                <span style={{ color:'#fff', fontSize:'13.5px', fontWeight:600, letterSpacing:'0.12em' }}>COURTIA</span>
              </div>

              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:12 }}>
                CRM · IA Native · Courtiers ORIAS
              </p>

              <h2 style={{ color:'#fff', fontSize:'21px', fontWeight:500, lineHeight:1.38, marginBottom:8 }}>
                Votre portefeuille, analysé en temps réel.
              </h2>

              <p style={{ color:'rgba(255,255,255,0.36)', fontSize:'12.5px', marginBottom:28 }}>
                ARK travaille pendant que vous travaillez. L'IA native qui détecte les opportunités, anticipe les résiliations et prépare vos rendez-vous.
              </p>

              <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#2563eb', flexShrink:0 }} />
                    <span style={{ color:'rgba(255,255,255,0.28)', fontSize:'12px' }}>Analyse IA de votre portefeuille en continu</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#2563eb', flexShrink:0 }} />
                    <span style={{ color:'rgba(255,255,255,0.28)', fontSize:'12px' }}>Détection des opportunités cross-sell et up-sell</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#2563eb', flexShrink:0 }} />
                    <span style={{ color:'rgba(255,255,255,0.28)', fontSize:'12px' }}>Alertes proactives avant chaque échéance</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ position:'relative', zIndex:1, marginTop:'auto' }}>
              <p style={{ color:'rgba(255,255,255,0.15)', fontSize:'10px', letterSpacing:'0.1em' }}>Rhasrhass®</p>
            </div>
          </div>

          {/* Colonne droite — Formulaire */}
          <div className="right-col">
            <div className="founder-badge">
              <span className="dot" />
              Offre Fondateur — 50 places
            </div>

            <h1 style={{ fontSize:'21px', fontWeight:500, color:'#0a0a0a', marginBottom:4 }}>
              Connexion ✦
            </h1>
            <p style={{ fontSize:'13px', color:'rgba(0,0,0,0.42)', marginBottom:24 }}>
              Accédez à votre espace courtier
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="error-banner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="input-group">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="4"/>
                  <path d="M2 7l10 6 10-6"/>
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                />
              </div>

              <div className="input-group">
                <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="3"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                  <circle cx="12" cy="16" r="1"/>
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              <div className="checkbox-group">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Se souvenir de moi</label>
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="divider">
              <span>ou</span>
            </div>

            <button type="button" className="google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </button>

            <p style={{ textAlign:'center', fontSize:'12.5px', color:'rgba(0,0,0,0.4)', marginTop:20 }}>
              Pas encore de compte ?{' '}
              <a href="/register" style={{ color:'#2563eb', fontWeight:500, textDecoration:'none' }}>
                Inscrivez-vous gratuitement
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
