import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, Send, Sparkles, User, Bot, Trash2, 
  FileText, Calendar, AlertTriangle, HelpCircle, RefreshCw,
  ThumbsUp, ThumbsDown, X
} from 'lucide-react'
import api from '../../api'

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Bonjour ! Je suis ARK, votre assistant intelligent. Comment puis-je vous aider aujourd\'hui ?'
}

export default function ArkChatV2() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [context, setContext] = useState(null)
  const [typingText, setTypingText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    loadSuggestions()
    loadContext()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingText])

  async function loadSuggestions() {
    try {
      const res = await api.get('/ark-chat/suggestions')
      setSuggestions(res.data?.suggestions || [])
    } catch (err) {
      setSuggestions(['Quels sont mes contrats ?', 'Comment déclarer un sinistre ?'])
    }
  }

  async function loadContext() {
    try {
      const res = await api.get('/ark-chat/context')
      setContext(res.data)
    } catch (err) {
      console.log('Context not available')
    }
  }

  async function sendMessage(text = input) {
    if (!text.trim() || loading) return

    const userMessage = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setIsTyping(true)
    setTypingText('')

    try {
      const res = await api.post('/ark-chat/message', {
        message: text.trim(),
        sessionId
      })

      const response = res.data.response || 'Je suis désolé, je n\'ai pas pu traiter votre demande.'
      
      if (res.data.sessionId) {
        setSessionId(res.data.sessionId)
      }

      // Effet machine à écrire
      await typeWriterEffect(response)
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
      setTypingText('')
      setIsTyping(false)
    } catch (err) {
      console.error('ARK Chat error:', err)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Je suis temporairement indisponible. Veuillez réessayer dans quelques instants ou contacter votre courtier.',
        error: true
      }])
      setIsTyping(false)
    } finally {
      setLoading(false)
    }
  }

  async function typeWriterEffect(text) {
    const words = text.split(' ')
    let current = ''
    
    for (let i = 0; i < words.length; i++) {
      current += (i > 0 ? ' ' : '') + words[i]
      setTypingText(current)
      await new Promise(r => setTimeout(r, 30))
    }
  }

  async function clearHistory() {
    if (!confirm('Effacer tout l\'historique de conversation ?')) return
    
    try {
      await api.delete(`/ark-chat/history/${context?.clientId || 0}`)
      setMessages([INITIAL_MESSAGE])
      setSessionId(null)
    } catch (err) {
      console.error('Clear history failed:', err)
    }
  }

  function handleSuggestionClick(suggestion) {
    sendMessage(suggestion)
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 80px)', 
      maxWidth: 900, 
      margin: '0 auto',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 24 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.div
            animate={{ 
              boxShadow: ['0 0 20px rgba(139, 92, 246, 0.3)', '0 0 40px rgba(139, 92, 246, 0.5)', '0 0 20px rgba(139, 92, 246, 0.3)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Sparkles size={28} color="white" />
          </motion.div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              ARK Assistant
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
              {context?.cabinetName || 'Votre assistant intelligent'}
            </p>
          </div>
        </div>
        <button
          onClick={clearHistory}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: '#FEE2E2',
            color: '#DC2626',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          <Trash2 size={14} /> Effacer
        </button>
      </div>

      {/* Context cards */}
      {context && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {context.hasContracts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#F0F9FF', borderRadius: 20, fontSize: 13 }}>
              <FileText size={14} color="#3B82F6" />
              <span style={{ color: '#1E40AF' }}>Contrats actifs</span>
            </div>
          )}
          {context.hasClaims && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#FEF3C7', borderRadius: 20, fontSize: 13 }}>
              <AlertTriangle size={14} color="#F59E0B" />
              <span style={{ color: '#92400E' }}>Sinistre(s) en cours</span>
            </div>
          )}
          {context.upcomingDeadlinesCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#FEE2E2', borderRadius: 20, fontSize: 13 }}>
              <Calendar size={14} color="#DC2626" />
              <span style={{ color: '#991B1B' }}>{context.upcomingDeadlinesCount} échéance(s)</span>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        background: '#FAFAFA',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20
      }}>
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 20,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: msg.role === 'user' 
                  ? '#E2E8F0' 
                  : 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {msg.role === 'user' ? (
                  <User size={18} color="#475569" />
                ) : (
                  <Bot size={18} color="white" />
                )}
              </div>

              {/* Message bubble */}
              <div style={{
                maxWidth: '75%',
                padding: '14px 18px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' 
                  ? 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)' 
                  : msg.error ? '#FEE2E2' : 'white',
                color: msg.role === 'user' ? 'white' : msg.error ? '#991B1B' : '#0F172A',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5
              }}>
                {msg.content}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && typingText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', gap: 12, marginBottom: 20 }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot size={18} color="white" />
              </div>
              <div style={{
                maxWidth: '75%',
                padding: '14px 18px',
                borderRadius: '16px 16px 16px 4px',
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5
              }}>
                {typingText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >|</motion.span>
              </div>
            </motion.div>
          )}

          {loading && !typingText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', gap: 12, marginBottom: 20 }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bot size={18} color="white" />
              </div>
              <div style={{
                padding: '14px 18px',
                borderRadius: '16px 16px 16px 4px',
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex',
                gap: 4
              }}>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: '#8B5CF6' }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length <= 2 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {suggestions.map((s, i) => (
            <motion.button
              key={i}
              onClick={() => handleSuggestionClick(s)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '10px 16px',
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: 20,
                fontSize: 13,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <HelpCircle size={14} color="#8B5CF6" />
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: 12,
        padding: 16,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Posez votre question à ARK..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '14px 18px',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            fontSize: 15,
            outline: 'none'
          }}
        />
        <motion.button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: input.trim() 
              ? 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)' 
              : '#E2E8F0',
            border: 'none',
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={20} color={input.trim() ? 'white' : '#94A3B8'} />
        </motion.button>
      </div>
    </div>
  )
}
