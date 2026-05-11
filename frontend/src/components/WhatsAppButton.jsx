import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, X, Calendar, FileText, Check } from 'lucide-react'
import api from '../api'

const QUICK_TEMPLATES = [
  { key: 'relance_echeance', label: 'Rappel échéance', icon: Calendar },
  { key: 'prise_contact', label: 'Prise de contact', icon: MessageCircle },
  { key: 'demande_pieces', label: 'Demande pièces', icon: FileText },
]

export default function WhatsAppButton({ phone, clientId, clientName, compact = false }) {
  const [showMenu, setShowMenu] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendTemplate(templateKey) {
    if (!phone) {
      alert('Pas de numéro de téléphone')
      return
    }

    setSending(true)
    try {
      await api.post('/whatsapp/template', {
        phone,
        templateId: templateKey,
        variables: [],
        clientId
      })
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setShowMenu(false)
      }, 2000)
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error || err.message))
    } finally {
      setSending(false)
    }
  }

  async function openChat() {
    // Navigate to WhatsApp page with this conversation
    window.location.href = `/v2/whatsapp?phone=${encodeURIComponent(phone)}`
  }

  if (compact) {
    return (
      <button
        onClick={openChat}
        disabled={!phone}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          background: phone ? '#25D366' : '#E2E8F0',
          border: 'none',
          cursor: phone ? 'pointer' : 'default'
        }}
        title={phone ? `WhatsApp ${phone}` : 'Pas de numéro'}
      >
        <MessageCircle size={18} color={phone ? 'white' : '#94A3B8'} />
      </button>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setShowMenu(!showMenu)}
        disabled={!phone}
        whileHover={{ scale: phone ? 1.02 : 1 }}
        whileTap={{ scale: phone ? 0.98 : 1 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          background: phone ? '#25D366' : '#E2E8F0',
          color: phone ? 'white' : '#94A3B8',
          border: 'none',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          cursor: phone ? 'pointer' : 'default'
        }}
      >
        <MessageCircle size={18} />
        WhatsApp
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Overlay */}
            <div
              onClick={() => setShowMenu(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100
              }}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                width: 240,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                zIndex: 101,
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: 12, borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                  {clientName || 'Client'}
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{phone}</div>
              </div>

              {sent ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Check size={24} color="#10B981" />
                  </div>
                  <div style={{ fontWeight: 500, color: '#10B981' }}>Message envoyé !</div>
                </div>
              ) : (
                <>
                  <div style={{ padding: 8 }}>
                    {QUICK_TEMPLATES.map(tpl => {
                      const Icon = tpl.icon
                      return (
                        <button
                          key={tpl.key}
                          onClick={() => sendTemplate(tpl.key)}
                          disabled={sending}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                          onMouseEnter={e => e.target.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}
                        >
                          <Icon size={16} color="#64748B" />
                          <span style={{ fontSize: 13, color: '#0F172A' }}>{tpl.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ padding: 8, borderTop: '1px solid #F1F5F9' }}>
                    <button
                      onClick={openChat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '10px 12px',
                        background: '#25D366',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500
                      }}
                    >
                      <Send size={16} />
                      Ouvrir conversation
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
