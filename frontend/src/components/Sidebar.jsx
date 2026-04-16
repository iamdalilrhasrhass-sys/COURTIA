import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Sun, Users, FileText, BarChart2,
  Sparkles, CheckSquare, PieChart, Settings, LogOut
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { usePlanStore } from '../stores/planStore'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, background: 'white', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <div style={{ width: 12, height: 12, background: '#0a0a0a', transform: 'rotate(45deg)' }} />
      </div>
      <span style={{ color: 'white', fontSize: 15, fontWeight: 500, letterSpacing: -0.3 }}>COURTIA</span>
    </div>
  )
}

// Drawer ARK global
function ArkDrawerPanel({ onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [slowWarning, setSlowWarning] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(msg) {
    if (!msg?.trim()) return
    const text = msg.trim()
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    setSlowWarning(false)
    const tid = setTimeout(() => setSlowWarning(true), 28000)
    try {
      const res = await api.post('/api/ark/chat', {
        message: text,
        clientData: null,
        conversationHistory: messages.slice(-10)
      }, { timeout: 90000 })
      const reply = res.data?.reply || res.data?.message || JSON.stringify(res.data)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      const errMsg = err.code === 'ECONNABORTED'
        ? 'ARK se réveille... réessayez dans quelques secondes.'
        : err.response?.data?.error || 'ARK temporairement indisponible.'
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
    } finally {
      setLoading(false)
      clearTimeout(tid)
      setSlowWarning(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#0a0a0a', zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        animation: 'slideIn 0.25s ease'
      }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}} @keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}} @keyframes arkPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s ease infinite' }} />
            <span style={{ color: 'white', fontWeight: 600, fontSize: 15, letterSpacing: -0.2 }}>ARK — Assistant IA</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 && (
            <div style={{ marginTop: 32, textAlign: 'center', padding: '0 16px' }}>
              <p style={{ color: '#555', fontSize: 13, lineHeight: 1.7 }}>
                Bonjour. Je suis ARK, votre conseiller IA spécialisé en assurance française.<br />
                Posez-moi une question sur votre portefeuille.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              padding: '10px 14px', borderRadius: 10, maxWidth: '85%',
              background: m.role === 'user' ? '#1d4ed8' : '#1a1a1a',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              border: m.role === 'assistant' ? '0.5px solid #222' : 'none'
            }}>
              <p style={{ color: 'white', fontSize: 13, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{m.content}</p>
            </div>
          ))}
          {loading && (
            <div style={{ padding: '12px 16px', background: '#1a1a1a', borderRadius: 10, alignSelf: 'flex-start', border: '0.5px solid #222' }}>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#2563eb',
                    animation: `dotBounce 1.2s ease ${i * 0.2}s infinite`
                  }} />
                ))}
              </div>
              {slowWarning && <p style={{ color: '#555', fontSize: 11, marginTop: 6 }}>Serveur en démarrage... encore quelques secondes</p>}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: 16, borderTop: '0.5px solid #1a1a1a', display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Demandez à ARK..."
            style={{
              flex: 1, padding: '10px 14px',
              background: '#111', border: '0.5px solid #2a2a2a',
              borderRadius: 8, color: 'white', fontSize: 14
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 16px', background: !input.trim() || loading ? '#222' : '#2563eb',
              color: 'white', border: 'none', borderRadius: 8,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontSize: 16
            }}
          >→</button>
        </div>
      </div>
    </>
  )
}

const NAV_ITEMS = [
  { path: '/dashboard',      label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/morning-brief',  label: 'Morning Brief',   icon: Sun },
  { path: '/clients',        label: 'Clients',         icon: Users },
  { path: '/contrats',       label: 'Contrats',        icon: FileText },
  { path: '/analytics',      label: 'Analytics',       icon: BarChart2 },
  { separator: true, label: 'MODULES' },
  { path: '/capitia',        label: 'CAPITIA',         icon: Sparkles },
  { path: '/taches',         label: 'Tâches',          icon: CheckSquare },
  { path: '/rapports',       label: 'Rapports',        icon: PieChart },
  { path: '/parametres',     label: 'Paramètres',      icon: Settings },
]

const PLAN_BADGE = {
  start:  { bg: '#1a1a1a',             color: '#9ca3af', label: 'Start' },
  pro:    { bg: 'rgba(37,99,235,0.2)', color: '#60a5fa', label: 'Pro' },
  elite:  { bg: 'rgba(124,58,237,0.2)',color: '#a78bfa', label: 'Elite' },
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [arkOpen, setArkOpen] = useState(false)
  const currentPlan = usePlanStore(s => s.currentPlan)

  // Écouter l'event custom pour ouvrir ARK depuis d'autres composants
  useEffect(() => {
    const handler = () => setArkOpen(true)
    window.addEventListener('ark:open', handler)
    return () => window.removeEventListener('ark:open', handler)
  }, [])

  function logout() {
    localStorage.removeItem('courtia_token')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
    toast.success('Déconnexion réussie')
  }

  const badge = PLAN_BADGE[currentPlan] || { bg: '#1a1a1a', color: '#555', label: 'Pro' }

  return (
    <>
      <div style={{
        width: 240, minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0,
        zIndex: 100,
        borderRight: '0.5px solid #111',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* Logo + Plan badge */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '0.5px solid #1a1a1a' }}>
          <Logo />
          <span style={{
            display: 'inline-block', marginTop: 8, fontSize: 10, fontWeight: 700,
            background: badge.bg, color: badge.color,
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 4, padding: '2px 8px', letterSpacing: 0.5,
            textTransform: 'uppercase'
          }}>
            {badge.label} · Courtier
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '10px 0' }}>
          {NAV_ITEMS.map((item, idx) => {
            // Séparateur avec label MODULES
            if (item.separator) {
              return (
                <div key={`sep-${idx}`} style={{ margin: '10px 0 6px', padding: '0 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    <div style={{ flex: 1, height: '0.5px', background: '#1a1a1a' }} />
                  </div>
                </div>
              )
            }

            const isActive = location.pathname === item.path ||
              (item.path === '/clients' && location.pathname.startsWith('/client'))
            const Icon = item.icon

            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileHover={!isActive ? { x: 2 } : {}}
                transition={{ duration: 0.12 }}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 20px',
                  paddingLeft: 17,
                  background: isActive ? 'rgba(37,99,235,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  color: isActive ? 'white' : '#555',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  fontFamily: 'Arial, sans-serif',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {Icon && <Icon size={14} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.55 }} />}
                <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </motion.button>
            )
          })}
        </nav>

        {/* Bouton ARK — valorisé */}
        <div style={{ padding: '12px 16px 8px' }}>
          <motion.button
            onClick={() => setArkOpen(true)}
            whileHover={{ scale: 1.01, boxShadow: '0 6px 24px rgba(37,99,235,0.25)' }}
            transition={{ duration: 0.15 }}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              border: '0.5px solid rgba(37,99,235,0.4)',
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#22c55e',
                animation: 'arkPulse 2s ease infinite'
              }} />
              <span style={{ color: 'white', fontSize: 12, fontWeight: 600, letterSpacing: 0.5 }}>ARK · Actif</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(37,99,235,0.8)', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>IA</span>
            </div>
            <span style={{ color: '#4b6180', fontSize: 11 }}>Ouvrir l'assistant →</span>
          </motion.button>
        </div>

        {/* Déconnexion */}
        <div style={{ padding: '4px 16px 20px' }}>
          <motion.button
            onClick={logout}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.12 }}
            style={{
              width: '100%', padding: '9px 16px',
              background: 'none',
              border: 'none', borderLeft: '3px solid transparent',
              color: '#333', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontFamily: 'Arial, sans-serif', borderRadius: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#666' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#333' }}
          >
            <LogOut size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
            Déconnexion
          </motion.button>
        </div>
      </div>

      {/* Drawer ARK */}
      {arkOpen && <ArkDrawerPanel onClose={() => setArkOpen(false)} />}
    </>
  )
}
