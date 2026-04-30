import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import api from '../api'
import Logo from '../components/Logo'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const STYLES = `
  .login-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    font-family: -apple-system, 'Inter', BlinkMacSystemFont, sans-serif;
    background:
      radial-gradient(ellipse at 20% 15%, rgba(192,170,255,0.65) 0%, transparent 40%),
      radial-gradient(ellipse at 85% 80%, rgba(255,180,220,0.55) 0%, transparent 38%),
      radial-gradient(ellipse at 60% 35%, rgba(160,215,255,0.5) 0%, transparent 38%),
      radial-gradient(ellipse at 5% 75%, rgba(180,255,210,0.35) 0%, transparent 32%),
      #ede9f5;
  }

  .bubble {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .bubble-inner {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      radial-gradient(
        ellipse at 32% 28%,
        rgba(255,255,255,0.72) 0%,
        rgba(255,255,255,0.12) 35%,
        transparent 65%
      );
    border: 1.5px solid rgba(255,255,255,0.7);
    overflow: hidden;
  }

  .bubble-iris {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    background: conic-gradient(
      from 30deg at 38% 38%,
      rgba(168,85,247,0.27) 0deg,
      rgba(59,130,246,0.33) 55deg,
      rgba(16,185,129,0.23) 110deg,
      rgba(245,158,11,0.19) 165deg,
      rgba(239,68,68,0.21) 210deg,
      rgba(236,72,153,0.27) 260deg,
      rgba(139,92,246,0.25) 310deg,
      rgba(168,85,247,0.27) 360deg
    );
    mix-blend-mode: screen;
    animation: irisRotate 12s linear infinite;
  }

  .bubble-shine {
    position: absolute;
    width: 42%;
    height: 32%;
    top: 8%;
    left: 12%;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
    transform: rotate(-30deg);
    filter: blur(2px);
  }

  .bubble-shine2 {
    position: absolute;
    width: 22%;
    height: 16%;
    bottom: 16%;
    right: 14%;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, transparent 100%);
    filter: blur(1.5px);
  }

  .bubble-rim {
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.25);
  }

  .bubble-shadow {
    position: absolute;
    bottom: -10%;
    left: 8%;
    width: 84%;
    height: 18%;
    background: radial-gradient(ellipse at center, rgba(100,80,140,0.12) 0%, transparent 70%);
    filter: blur(4px);
    border-radius: 50%;
  }

  @keyframes irisRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @keyframes fl1 {
    0%   { transform: translate(0px,0px) scale(1) rotate(0deg); }
    18%  { transform: translate(14px,-24px) scale(1.025) rotate(2deg); }
    42%  { transform: translate(-10px,-36px) scale(0.975) rotate(-1.5deg); }
    68%  { transform: translate(18px,-18px) scale(1.015) rotate(3deg); }
    100% { transform: translate(0px,0px) scale(1) rotate(0deg); }
  }
  @keyframes fl2 {
    0%   { transform: translate(0px,0px) scale(1); }
    25%  { transform: translate(-16px,-20px) scale(1.04); }
    55%  { transform: translate(12px,-38px) scale(0.97); }
    80%  { transform: translate(-8px,-14px) scale(1.02); }
    100% { transform: translate(0px,0px) scale(1); }
  }
  @keyframes fl3 {
    0%   { transform: translate(0px,0px) rotate(0deg); }
    30%  { transform: translate(10px,-18px) rotate(-2.5deg); }
    58%  { transform: translate(-14px,-30px) rotate(1.5deg); }
    78%  { transform: translate(8px,-12px) rotate(-1deg); }
    100% { transform: translate(0px,0px) rotate(0deg); }
  }
  @keyframes fl4 {
    0%   { transform: translate(0px,0px) scale(1); }
    38%  { transform: translate(-12px,-26px) scale(1.055); }
    70%  { transform: translate(16px,-40px) scale(0.955); }
    100% { transform: translate(0px,0px) scale(1); }
  }
  @keyframes fl5 {
    0%   { transform: translate(0px,0px); }
    35%  { transform: translate(20px,-22px); }
    72%  { transform: translate(-8px,-34px); }
    100% { transform: translate(0px,0px); }
  }
  @keyframes fl6 {
    0%   { transform: translate(0px,0px) scale(1) rotate(0deg); }
    28%  { transform: translate(-18px,-20px) scale(1.03) rotate(3.5deg); }
    62%  { transform: translate(12px,-32px) scale(0.97) rotate(-2deg); }
    100% { transform: translate(0px,0px) scale(1) rotate(0deg); }
  }
  @keyframes fl7 {
    0%   { transform: translate(0px,0px) scale(1); }
    48%  { transform: translate(14px,-28px) scale(1.07); }
    100% { transform: translate(0px,0px) scale(1); }
  }
  @keyframes fl8 {
    0%   { transform: translate(0px,0px); }
    52%  { transform: translate(-22px,-24px); }
    100% { transform: translate(0px,0px); }
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(30px) scale(0.965); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pulseDot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%     { opacity: 0.4; transform: scale(0.75); }
  }

  .b1  { width:130px; height:130px; top:3%;    left:2%;    animation: fl1 11s ease-in-out infinite; }
  .b2  { width:75px;  height:75px;  top:6%;    right:6%;   animation: fl2 14s ease-in-out infinite 1.2s; }
  .b3  { width:50px;  height:50px;  top:30%;   left:3%;    animation: fl3 9s ease-in-out infinite 2.1s; }
  .b4  { width:95px;  height:95px;  top:38%;   right:2%;   animation: fl4 13s ease-in-out infinite 0.6s; }
  .b5  { width:60px;  height:60px;  bottom:22%;left:8%;    animation: fl5 10s ease-in-out infinite 1.8s; }
  .b6  { width:145px; height:145px; bottom:2%; right:3%;   animation: fl6 16s ease-in-out infinite 0.9s; }
  .b7  { width:42px;  height:42px;  top:58%;   left:1%;    animation: fl7 8s ease-in-out infinite 3.2s; }
  .b8  { width:68px;  height:68px;  bottom:32%;right:7%;   animation: fl8 12s ease-in-out infinite 2.7s; }

  .card {
    display: flex;
    width: 960px;
    max-width: 96vw;
    min-height: 90vh;
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 0 0 0.5px rgba(255,255,255,0.85), 0 8px 24px rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.04);
    animation: cardIn 0.9s cubic-bezier(0.16,1,0.3,1) both;
    position: relative;
    z-index: 1;
  }

  .left-panel {
    width: 43%;
    background: #0a0a0a;
    padding: 2.5rem;
    position: relative;
    overflow: visible;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .left-panel::before {
    content: '';
    position: absolute;
    top: -70px;
    left: -70px;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(37,99,235,0.16) 0%, transparent 65%);
  }

  .left-panel::after {
    content: '';
    position: absolute;
    bottom: -90px;
    right: -50px;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 65%);
  }

  .geo-ring {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .right-panel {
    flex: 1;
    background: rgba(250,249,246,0.94);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    padding: 3rem 2.75rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .badge-founder {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(37,99,235,0.08);
    border: 0.5px solid rgba(37,99,235,0.18);
    border-radius: 20px;
    padding: 4px 13px;
    color: #2563eb;
    font-size: 10.5px;
    font-weight: 500;
    margin-bottom: 1.5rem;
    width: fit-content;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #2563eb;
    animation: pulseDot 2s ease-in-out infinite;
  }

  .field-wrap {
    position: relative;
    margin-bottom: 14px;
  }

  .field-wrap svg.icon-left {
    position: absolute;
    left: 13px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    pointer-events: none;
  }

  .field-wrap input {
    width: 100%;
    height: 44px;
    border-radius: 12px;
    border: 0.5px solid rgba(0,0,0,0.11);
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 0 40px 0 40px;
    font-size: 13.5px;
    font-family: inherit;
    color: #0a0a0a;
    outline: none;
    transition: all 0.2s ease;
  }

  .field-wrap input:focus {
    border-color: rgba(37,99,235,0.45);
    box-shadow: 0 0 0 3.5px rgba(37,99,235,0.09);
    background: rgba(255,255,255,0.92);
  }

  .field-wrap input::placeholder {
    color: rgba(0,0,0,0.3);
  }

  .eye-toggle {
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
  }

  .eye-toggle:hover { color: rgba(0,0,0,0.6); }

  .btn-primary {
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

  .btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%);
    border-radius: 12px;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1.5px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15);
  }

  .btn-primary:active:not(:disabled) { transform: scale(0.985); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .divider-or {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 18px 0;
  }

  .divider-or::before,
  .divider-or::after {
    content: '';
    flex: 1;
    height: 0.5px;
    background: rgba(0,0,0,0.08);
  }

  .divider-or span {
    font-size: 11.5px;
    color: rgba(0,0,0,0.3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .btn-google {
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
    font-family: inherit;
    transition: all 0.2s ease;
  }

  .btn-google:hover {
    background: rgba(255,255,255,0.85);
    border-color: rgba(0,0,0,0.18);
  }

  .error-msg {
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
    .card { flex-direction: column; min-height: 100vh; max-width: 100vw; border-radius: 0; }
    .left-panel { display: none; }
    .right-panel { width: 100%; padding: 2rem 1.5rem; justify-content: center; min-height: 100vh; }
    .b1 { width:60px; height:60px; top:2%; left:1%; }
    .b2 { width:40px; height:40px; top:4%; right:4%; }
    .b3 { width:28px; height:28px; top:20%; left:2%; }
    .b4 { width:50px; height:50px; top:28%; right:1%; }
    .b5 { width:32px; height:32px; bottom:14%; left:4%; }
    .b6 { width:70px; height:70px; bottom:1%; right:1%; }
    .b7 { width:22px; height:22px; top:45%; left:1%; }
    .b8 { width:36px; height:36px; bottom:20%; right:3%; }
    .login-root { padding: 0.5rem; }
    .badge-founder { font-size: 9px; padding: 3px 10px; margin-bottom: 1rem; }
    .right-panel h1, .right-panel > h1 { font-size: 18px; }
    .right-panel > p { font-size: 12px; }
  }
`

const Bubble = ({ className }) => (
  <div className={`bubble ${className}`}>
    <div className="bubble-iris" />
    <div className="bubble-inner">
      <div className="bubble-shine" />
      <div className="bubble-shine2" />
      <div className="bubble-rim" />
    </div>
    <div className="bubble-shadow" />
  </div>
)

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isRegister = location.pathname === '/register'

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
      const msg = isRegister
        ? (err.response?.data?.error || 'Une erreur est survenue lors de l\'inscription.')
        : (err.response?.data?.message || 'Une erreur est survenue. Vérifiez vos identifiants.')
      setError(msg)
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

        localStorage.setItem('token', res.data.token)
        if (res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user))
        navigate('/dashboard')
      } catch (err) {
        setError('Erreur lors de la connexion Google')
      }
    },
    onError: () => setError('Connexion Google annulée ou refusée')
  })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="login-root">
        <Bubble className="b1" />
        <Bubble className="b2" />
        <Bubble className="b3" />
        <Bubble className="b4" />
        <Bubble className="b5" />
        <Bubble className="b6" />
        <Bubble className="b7" />
        <Bubble className="b8" />

        <div className="card">
          {/* LEFT */}
          <div className="left-panel">
            <div className="geo-ring" style={{ width:200,height:200,top:-80,left:-80,border:'0.5px solid rgba(255,255,255,0.04)' }} />
            <div className="geo-ring" style={{ width:120,height:120,top:-30,left:-30,border:'0.5px solid rgba(37,99,235,0.15)' }} />
            <div className="geo-ring" style={{ width:180,height:180,bottom:-70,right:-50,border:'0.5px solid rgba(255,255,255,0.04)' }} />
            <div className="geo-ring" style={{ width:90,height:90,bottom:-20,right:-10,border:'0.5px solid rgba(139,92,246,0.12)' }} />
            <div className="geo-ring" style={{ width:60,height:60,top:'46%',right:-20,border:'0.5px solid rgba(255,255,255,0.05)' }} />

            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ marginBottom:28 }}>
                <Logo size={48} dark={true} withText={true} textSize={18} />
              </div>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:12 }}>
                CRM · IA Native · Courtiers ORIAS
              </p>
              <h2 style={{ color:'#fff', fontSize:'19px', fontWeight:500, lineHeight:1.38, marginBottom:8 }}>
                Votre portefeuille, analysé en temps réel.
              </h2>
              <p style={{ color:'rgba(255,255,255,0.36)', fontSize:'12.5px', marginBottom:28 }}>
                ARK travaille pendant que vous travaillez. L'IA native qui détecte les opportunités, anticipe les résiliations et prépare vos rendez-vous.
              </p>
              <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px' }}>
                {['Analyse IA de votre portefeuille en continu','Détection des opportunités cross-sell et up-sell','Alertes proactives avant chaque échéance'].map((t,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<2?10:0 }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:'#2563eb',flexShrink:0 }} />
                    <span style={{ color:'rgba(255,255,255,0.28)', fontSize:'12px' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position:'relative', zIndex:1, marginTop:'auto' }}>
          </div>
          <div style={{ position:'absolute', bottom:'1.25rem', left:'2.5rem', fontFamily:'Arial, Helvetica, sans-serif', fontSize:'9.5px', fontWeight:400, letterSpacing:'0.14em', color:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', gap:'4px' }}>
            <span>RHASRHASS</span>
            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:'11px', height:'11px', border:'0.5px solid rgba(255,255,255,0.22)', borderRadius:'50%', fontSize:'7px', lineHeight:1, paddingTop:'1px' }}>R</span>
          </div>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            <div className="badge-founder">
              <span className="badge-dot" />
              Offre Fondateur — 50 places
            </div>

            <h1 style={{ fontSize:'21px', fontWeight:500, color:'#0a0a0a', margin:0, marginBottom:4 }}>
              {isRegister ? 'Inscription' : 'Connexion'}
            </h1>
            <p style={{ fontSize:'13px', color:'rgba(0,0,0,0.42)', marginBottom:24 }}>
              {isRegister ? 'Créez votre espace courtier' : 'Accédez à votre espace courtier'}
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="error-msg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {isRegister && (
                <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                  <div className="field-wrap" style={{ flex:1 }}>
                    <input id="firstName" type="text" autoComplete="given-name" required value={firstName}
                      onChange={e => setFirstName(e.target.value)} placeholder="Prénom" />
                  </div>
                  <div className="field-wrap" style={{ flex:1 }}>
                    <input id="lastName" type="text" autoComplete="family-name" required value={lastName}
                      onChange={e => setLastName(e.target.value)} placeholder="Nom" />
                  </div>
                </div>
              )}

              <div className="field-wrap">
                <svg className="icon-left" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="4"/>
                  <path d="M2 7l10 6 10-6"/>
                </svg>
                <input id="email" type="email" autoComplete="email" required value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="votre@email.fr" />
              </div>

              <div className="field-wrap">
                <svg className="icon-left" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="3"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                  <circle cx="12" cy="16" r="1"/>
                </svg>
                <input id="password" type={showPw?'text':'password'} autoComplete="current-password" required
                  value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" className="eye-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? (
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

              <div style={{ display:'flex',alignItems:'center',gap:8,margin:'10px 0 18px' }}>
                <input type="checkbox" id="remember" style={{ width:17,height:17,borderRadius:5,border:'0.5px solid rgba(0,0,0,0.14)',accentColor:'#2563eb',cursor:'pointer' }} />
                <label htmlFor="remember" style={{ fontSize:'12.5px',color:'rgba(0,0,0,0.5)',cursor:'pointer' }}>Se souvenir de moi</label>
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (isRegister ? 'Inscription...' : 'Connexion...') : (isRegister ? 'Créer mon compte' : 'Se connecter')}
              </button>
            </form>

            <div className="divider-or"><span>ou</span></div>

            <button type="button" className="btn-google" onClick={handleGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </button>

            <p style={{ textAlign:'center', fontSize:'12.5px', color:'rgba(0,0,0,0.4)', marginTop:20 }}>
              {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
              <Link to={isRegister ? '/login' : '/register'} style={{ color:'#2563eb', fontWeight:500, textDecoration:'none' }}>
                {isRegister ? 'Connectez-vous' : 'Inscrivez-vous gratuitement'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
