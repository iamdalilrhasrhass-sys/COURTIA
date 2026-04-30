import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function ArkDrawer({ isOpen, onClose, token }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return
    
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/ark/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: input })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Erreur' }])
    } catch (err) {
      toast.error('Erreur ARK')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '400px',
      background: '#080808',
      border: '0.5px solid rgba(255,255,255,0.06)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{padding: '16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <span style={{fontSize: '12px', fontWeight: 700, color: '#fff', letterSpacing: '1px'}}>ARK</span>
        <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#fff'}}>
          <X size={18} />
        </button>
      </div>

      <div style={{flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
        {messages.map((msg, i) => (
          <div key={i} style={{display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'}}>
            <div style={{
              padding: '10px 13px',
              borderRadius: msg.role === 'user' ? '10px 4px 10px 10px' : '4px 10px 10px 10px',
              fontSize: '12px',
              background: msg.role === 'user' ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.8)',
              maxWidth: '70%'
            }}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div style={{padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px'}}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Demandez à ARK..."
          style={{flex: 1, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: '#fff'}}
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading} style={{background: '#2563eb', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700}}>
          →
        </button>
      </div>
    </div>
  )
}
