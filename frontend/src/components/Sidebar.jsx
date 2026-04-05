import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

function getToken() { return localStorage.getItem('token') }

// ArkDrawerPanel — intégré directement
function ArkDrawerPanel({ onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function envoyer(message) {
    if (!message || !message.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: message.trim() }])
    setInput('')
    setLoading(true)
    try {
      const token = getToken()
      if (!token) throw new Error('Token manquant')
      const res = await axios.post(`${API_URL}/api/ark/chat`, {
        message: message.trim(),
        clientData: null,
        conversationHistory: messages.slice(-10)
      }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 45000
      })
      let reply = null
      if (res.data && typeof res.data.reply === 'string') {
        reply = res.data.reply
      } else if (res.data && typeof res.data.message === 'string') {
        reply = res.data.message
      } else if (typeof res.data === 'string') {
        reply = res.data
      } else {
        reply = JSON.stringify(res.data)
      }
      if (!reply || reply.trim() === '') reply = 'ARK a traité votre demande mais n\'a pas retourné de réponse.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      console.error('ARK error:', err.message)
      let errMsg = 'ARK est temporairement indisponible.'
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errMsg = 'ARK met du temps à répondre (serveur en démarrage). Patientez 30 sec et réessayez.'
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: '#0a0a0a', zIndex: 9999, display: 'flex', flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid #1f2937',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>ARK — Assistant IA</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#9ca3af',
          cursor: 'pointer', fontSize: 20, padding: 4
        }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12
      }}>
        {messages.length === 0 && (
          <div style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
            <p>Bonjour ! Je suis ARK, votre assistant IA spécialisé en assurance française.</p>
            <p style={{ marginTop: 8 }}>Posez-moi une question sur votre portefeuille, vos clients ou la réglementation.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            padding: '10px 14px', borderRadius: 10,
            background: msg.role === 'user' ? '#1d4ed8' : '#1f2937',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%'
          }}>
            <p style={{ color: 'white', fontSize: 14, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </p>
          </div>
        ))}
        {loading && (
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#1f2937', alignSelf: 'flex-start'
          }}>
            <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>ARK analyse...</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: 16, borderTop: '1px solid #1f2937', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(input) } }}
          placeholder="Demandez à ARK..."
          style={{
            flex: 1, padding: '10px 14px',
            background: '#1f2937', border: '1px solid #374151',
            borderRadius: 8, color: 'white', fontSize: 14, outline: 'none'
          }}
        />
        <button
          onClick={() => envoyer(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: '10px 16px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            opacity: loading || !input.trim() ? 0.5 : 1, fontSize: 18
          }}
        >→</button>
      </div>
    </div>
  )
}

// Sidebar Principal
export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [arkDrawerOpen, setArkDrawerOpen] = useState(false)

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
    toast.success('Déconnexion réussie')
  }

  const menuItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: '🏠' },
    { path: '/clients', label: 'Clients', icon: '👥' },
    { path: '/contrats', label: 'Contrats', icon: '📋' },
    { path: '/taches', label: 'Tâches', icon: '✅' },
    { path: '/rapports', label: 'Rapports', icon: '📊' },
    { path: '/parametres', label: 'Paramètres', icon: '⚙️' },
  ]

  return (
    <>
      <div style={{
        width: 260, minHeight: '100vh', background: '#080808',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #1a1a1a', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #1a1a1a' }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>COURTIA</span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
          {menuItems.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path === '/clients' && location.pathname.startsWith('/client'))
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 24px', background: 'none', border: 'none',
                  color: isActive ? 'white' : '#9ca3af',
                  cursor: 'pointer', fontSize: 14, textAlign: 'left',
                  borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#9ca3af' }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span style={{ marginLeft: 'auto', width: 6, height: 6, background: '#2563eb', borderRadius: '50%' }} />}
              </button>
            )
          })}
        </nav>

        {/* Bouton ARK */}
        <div style={{ padding: '16px 16px 8px', borderTop: '1px solid #1a1a1a' }}>
          <button
            onClick={() => setArkDrawerOpen(true)}
            style={{
              width: '100%', padding: '12px 16px',
              background: 'linear-gradient(135deg, #065f46, #047857)',
              border: '1px solid #059669', borderRadius: 10,
              color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600
            }}
          >
            <span style={{
              width: 8, height: 8, background: '#4ade80',
              borderRadius: '50%', display: 'inline-block',
              boxShadow: '0 0 6px #4ade80'
            }} />
            <span>ARK — Assistant IA</span>
          </button>
        </div>

        {/* Déconnexion */}
        <div style={{ padding: '8px 16px 20px' }}>
          <button
            onClick={logout}
            style={{
              width: '100%', padding: '10px 16px',
              background: 'none', border: '1px solid #374151',
              borderRadius: 8, color: '#9ca3af', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
            }}
          >
            <span>→</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Overlay ARK Drawer */}
      {arkDrawerOpen && (
        <>
          <div
            onClick={() => setArkDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 9998, cursor: 'pointer'
            }}
          />
          <ArkDrawerPanel onClose={() => setArkDrawerOpen(false)} />
        </>
      )}
    </>
  )
}
