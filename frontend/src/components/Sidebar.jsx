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
        width: 32, height: 32, background: 'linear-gradient(135deg, #fff, #e0e0e0)', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: '0 2px 8px rgba(255,255,255,0.1)'
      }}>
        <div style={{ width: 14, height: 14, background: '#0a0a0a', transform: 'rotate(45deg)', borderRadius: 2 }} />
      </div>
      <span style={{ color: 'white', fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>COURTIA</span>
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
        background: 'linear-gradient(180deg, #0f0f0f, #0a0a0a)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0,
        zIndex: 100,
        borderRight: '0.5px solid #222',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* Logo + Plan badge */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '0.5px solid #222' }}>
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
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {NAV_ITEMS.map((item, idx) => {
            // Séparateur avec label MODULES
            if (item.separator) {
              return (
                <div key={`sep-${idx}`} style={{ margin: '16px 0 8px', padding: '0 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    <div style={{ flex: 1, height: '0.5px', background: '#222' }} />
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
                  width: 'calc(100% - 24px)', margin: '2px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px',
                  background: isActive ? '#1d4ed8' : 'transparent',
                  border: 'none',
                  borderRadius: 7,
                  color: isActive ? 'white' : '#888',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  fontFamily: 'Arial, sans-serif',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#bbb' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888' }}
              >
                {Icon && <Icon size={15} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />}
                <span style={{ fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
              </motion.button>
            )
          })}
        </nav>

        {/* Bouton ARK — valorisé */}
        <div style={{ padding: '12px 16px 8px' }}>
          <motion.button
            onClick={() => setArkOpen(true)}
            whileHover={{ scale: 1.02, y: -1, boxShadow: '0 8px 30px rgba(37,99,235,0.3)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'linear-gradient(135deg, #1e40af, #2563eb)',
              border: '1px solid #2563eb',
              borderRadius: 12, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left',
              boxShadow: '0 4px 15px rgba(37,99,235,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#4ade80',
                animation: 'arkPulse 1.5s ease infinite'
              }} />
              <span style={{ color: 'white', fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>ARK · Assistant</span>
              <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5 }}>IA</span>
            </div>
            <span style={{ color: '#93c5fd', fontSize: 11, marginTop: 2 }}>Questions & Analyse →</span>
          </motion.button>
        </div>

        {/* Déconnexion */}
        <div style={{ padding: '8px 16px 20px' }}>
          <motion.button
            onClick={logout}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.12 }}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'transparent',
              border: 'none',
              color: '#555', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, fontFamily: 'Arial, sans-serif', borderRadius: 7,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = '#1a1a1a' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={15} style={{ opacity: 0.6, flexShrink: 0 }} />
            <span style={{ fontWeight: 500 }}>Déconnexion</span>
          </motion.button>
        </div>
      </div>

      {/* Drawer ARK */}
      {arkOpen && <ArkDrawerPanel onClose={() => setArkOpen(false)} />}
    </>
  )
}
