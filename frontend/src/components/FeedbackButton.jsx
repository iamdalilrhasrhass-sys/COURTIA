import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import PremiumModal from './ui/PremiumModal'
import Button from './ui/Button'

const FEEDBACK_TYPES = [
  ['bug', 'Bug'],
  ['idea', 'Idée'],
  ['friction', 'Friction'],
  ['praise', 'Bravo'],
]

export default function FeedbackButton() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submitFeedback() {
    const trimmed = message.trim()
    if (!trimmed) {
      setError('Décrivez en quelques mots ce que vous observez.')
      return
    }
    setSending(true)
    setError('')
    try {
      await api.post('/feedback', {
        type,
        page: location.pathname,
        message: trimmed,
        metadata: {
          user_agent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
      })
      setSent(true)
      setMessage('')
      toast.success('Feedback transmis')
    } catch (err) {
      setError(err.response?.data?.message || 'Envoi impossible pour le moment.')
    } finally {
      setSending(false)
    }
  }

  function close() {
    setOpen(false)
    setError('')
    setSent(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Envoyer un feedback"
        className="courtia-depth-card"
        style={{
          position: 'fixed',
          left: 18,
          bottom: 20,
          zIndex: 210,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid rgba(255,255,255,0.16)',
          background: 'rgba(8,12,28,0.82)',
          color: '#fff',
          borderRadius: 999,
          padding: '9px 13px',
          fontSize: 12,
          fontWeight: 800,
          backdropFilter: 'blur(16px)',
          cursor: 'pointer',
        }}
      >
        <MessageCircle size={14} />
        Feedback
      </button>

      <PremiumModal
        open={open}
        title={sent ? 'Merci pour votre retour' : 'Feedback COURTIA'}
        onClose={close}
        footer={!sent && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" type="button" onClick={close}>Annuler</Button>
            <Button type="button" onClick={submitFeedback} disabled={sending}>
              <Send size={14} /> {sending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        )}
      >
        {sent ? (
          <div style={{ display: 'grid', gap: 10, color: '#dbeafe' }}>
            <CheckCircle2 size={28} color="#22c55e" />
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              Votre retour est enregistré avec la page actuelle. L’équipe pourra le suivre depuis l’admin.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 1.6 }}>
              Bug, idée ou friction : envoyez le contexte sans quitter votre écran.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FEEDBACK_TYPES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  style={{
                    border: `1px solid ${type === value ? 'rgba(142,234,255,0.72)' : 'rgba(255,255,255,0.14)'}`,
                    background: type === value ? 'rgba(34,211,238,0.14)' : 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '7px 10px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Décrivez le problème, l’idée ou ce qui vous ralentit..."
              style={{
                width: '100%',
                resize: 'vertical',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(0,0,0,0.22)',
                color: '#fff',
                padding: 12,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: 11 }}>
              Page jointe automatiquement : {location.pathname}
            </div>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fecaca', fontSize: 12 }}>
                <AlertTriangle size={13} /> {error}
              </div>
            )}
          </div>
        )}
      </PremiumModal>
    </>
  )
}
