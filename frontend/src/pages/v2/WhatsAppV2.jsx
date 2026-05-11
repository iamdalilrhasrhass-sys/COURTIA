import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, Send, Phone, User, Clock, Check, CheckCheck, 
  AlertCircle, Search, Filter, RefreshCw, Sparkles, Calendar,
  FileText, ChevronRight, X, MessageSquare
} from 'lucide-react'
import api from '../../api'

const TEMPLATES = [
  { key: 'relance_echeance', label: 'Rappel échéance', icon: Calendar, color: '#F59E0B' },
  { key: 'prise_contact', label: 'Prise de contact', icon: MessageSquare, color: '#3B82F6' },
  { key: 'confirmation_rdv', label: 'Confirmation RDV', icon: Check, color: '#10B981' },
  { key: 'demande_pieces', label: 'Demande pièces', icon: FileText, color: '#8B5CF6' },
]

const STATUS_ICONS = {
  pending: Clock,
  sent: Check,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: AlertCircle,
  mock_sent: Check
}

const STATUS_COLORS = {
  pending: '#94A3B8',
  sent: '#3B82F6',
  delivered: '#10B981',
  read: '#10B981',
  failed: '#EF4444',
  mock_sent: '#8B5CF6'
}

export default function WhatsAppV2() {
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [search, setSearch] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [status, setStatus] = useState({ configured: false })
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadConversations()
    checkStatus()
  }, [])

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.phone)
    }
  }, [selectedConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function checkStatus() {
    try {
      const res = await api.get('/whatsapp/status')
      setStatus(res.data)
    } catch (err) {
      console.error('Status check failed:', err)
    }
  }

  async function loadConversations() {
    try {
      setLoading(true)
      const res = await api.get('/whatsapp/conversations')
      setConversations(res.data?.data || [])
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(phone) {
    try {
      const res = await api.get(`/whatsapp/conversations/${encodeURIComponent(phone)}/messages`)
      setMessages(res.data?.data || [])
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConv) return
    
    setSending(true)
    try {
      await api.post('/whatsapp/send', {
        phone: selectedConv.phone,
        message: newMessage,
        clientId: selectedConv.client_id
      })
      setNewMessage('')
      loadMessages(selectedConv.phone)
      loadConversations()
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message))
    } finally {
      setSending(false)
    }
  }

  async function sendTemplate(templateKey) {
    if (!selectedConv) return
    
    setSending(true)
    try {
      await api.post('/whatsapp/template', {
        phone: selectedConv.phone,
        templateId: templateKey,
        variables: [],
        clientId: selectedConv.client_id
      })
      setShowTemplates(false)
      loadMessages(selectedConv.phone)
      loadConversations()
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message))
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = conversations.filter(c => {
    const q = search.toLowerCase()
    const name = `${c.client_first_name || ''} ${c.client_last_name || ''}`.toLowerCase()
    return !q || name.includes(q) || c.phone?.includes(q)
  })

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: '#F8FAFC' }}>
      {/* Liste des conversations */}
      <div style={{ width: 360, borderRight: '1px solid #E2E8F0', background: 'white', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: 20, borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={24} color="#25D366" />
              WhatsApp
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {status.configured ? (
                <span style={{ padding: '4px 10px', background: '#10B98115', color: '#10B981', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                  Connecté
                </span>
              ) : (
                <span style={{ padding: '4px 10px', background: '#F59E0B15', color: '#F59E0B', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                  Mode démo
                </span>
              )}
              <button onClick={loadConversations} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <RefreshCw size={18} color="#64748B" />
              </button>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14 }}
            />
          </div>
        </div>

        {/* Conversations list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Chargement...</div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
              <MessageCircle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p>Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <motion.div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                whileHover={{ background: '#F8FAFC' }}
                style={{
                  padding: 16,
                  cursor: 'pointer',
                  borderBottom: '1px solid #F1F5F9',
                  background: selectedConv?.id === conv.id ? '#F0F9FF' : 'white',
                  borderLeft: selectedConv?.id === conv.id ? '3px solid #3B82F6' : '3px solid transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {conv.client_first_name ? (
                      <span style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>
                        {conv.client_first_name[0]}{conv.client_last_name?.[0] || ''}
                      </span>
                    ) : (
                      <User size={20} color="white" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#0F172A' }}>
                        {conv.client_first_name ? `${conv.client_first_name} ${conv.client_last_name || ''}` : conv.phone}
                      </span>
                      {conv.unread_count > 0 && (
                        <span style={{ background: '#25D366', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.last_message_preview || 'Aucun message'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {conv.last_message_at ? new Date(conv.last_message_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                      {conv.window_open && <span style={{ marginLeft: 8, color: '#10B981' }}>● Fenêtre 24h</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Zone de chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConv ? (
          <>
            {/* Header conversation */}
            <div style={{ padding: 16, background: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>
                    {selectedConv.client_first_name ? `${selectedConv.client_first_name} ${selectedConv.client_last_name || ''}` : selectedConv.phone}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>{selectedConv.phone}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowTemplates(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  <Sparkles size={14} /> Templates
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20, background: '#ECE5DD' }}>
              {messages.map((msg, i) => {
                const isOutbound = msg.direction === 'outbound'
                const StatusIcon = STATUS_ICONS[msg.status] || Check
                const statusColor = STATUS_COLORS[msg.status] || '#94A3B8'
                
                return (
                  <motion.div
                    key={msg.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                      marginBottom: 8
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '10px 14px',
                      borderRadius: isOutbound ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isOutbound ? '#DCF8C6' : 'white',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {msg.template_name && (
                        <div style={{ fontSize: 11, color: '#8B5CF6', marginBottom: 4, fontWeight: 500 }}>
                          📋 Template: {msg.template_name}
                        </div>
                      )}
                      <div style={{ color: '#0F172A', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                        {msg.message}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: '#64748B' }}>
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOutbound && <StatusIcon size={14} color={statusColor} />}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: 16, background: 'white', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Votre message..."
                  style={{ flex: 1, padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: 24, fontSize: 14 }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: newMessage.trim() ? '#25D366' : '#E2E8F0',
                    border: 'none', cursor: newMessage.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Send size={20} color={newMessage.trim() ? 'white' : '#94A3B8'} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748B' }}>
            <MessageCircle size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ fontSize: 18 }}>Sélectionnez une conversation</p>
            <p style={{ fontSize: 14 }}>ou commencez-en une nouvelle</p>
          </div>
        )}
      </div>

      {/* Modal Templates */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 20, padding: 24, width: 400, maxHeight: '80vh', overflow: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Templates WhatsApp</h2>
                <button onClick={() => setShowTemplates(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="#64748B" />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {TEMPLATES.map(tpl => {
                  const Icon = tpl.icon
                  return (
                    <motion.button
                      key={tpl.key}
                      onClick={() => sendTemplate(tpl.key)}
                      disabled={sending}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: 16, background: '#F8FAFC', border: '1px solid #E2E8F0',
                        borderRadius: 12, cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: tpl.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={tpl.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{tpl.label}</div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>Template pré-approuvé Meta</div>
                      </div>
                      <ChevronRight size={18} color="#94A3B8" />
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
