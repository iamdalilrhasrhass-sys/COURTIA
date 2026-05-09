import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Users } from 'lucide-react'
import api from '../api'
import AuroraBackground from '../components/ui/AuroraBackground'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function loadInvite() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/invite/${token}`)
        setInvitation(data.invitation)
      } catch (err) {
        setError(err.response?.data?.message || 'Invitation indisponible.')
      } finally {
        setLoading(false)
      }
    }
    loadInvite()
  }, [token])

  async function acceptInvite() {
    setAccepting(true)
    setError('')
    try {
      await api.post(`/invite/${token}/accept`)
      setSuccess('Invitation acceptée. Votre accès cabinet est prêt.')
      setTimeout(() => navigate('/dashboard'), 900)
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate(`/login?next=/invite/${token}`)
        return
      }
      setError(err.response?.data?.message || 'Acceptation impossible.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div style={pageStyle}>
      <AuroraBackground />
      <GlassCard style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CourtiaMiniLogo size={36} />
          <Badge tone="success">Invitation cabinet</Badge>
        </div>
        {loading ? (
          <EmptyState title="Lecture de l’invitation" description="COURTIA vérifie le lien sécurisé." />
        ) : error ? (
          <EmptyState title="Invitation non disponible" description={error} action={<Button onClick={() => navigate('/login')}>Se connecter</Button>} />
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <h1 style={titleStyle}>Rejoindre {invitation?.cabinet_name || 'un cabinet COURTIA'}</h1>
              <p style={leadStyle}>Vous êtes invité à accéder au cockpit cabinet avec un rôle encadré et traçable.</p>
            </div>
            <div style={summaryStyle}>
              <Users size={19} color="var(--c-aurora-cyan)" />
              <div>
                <strong>{invitation?.email}</strong>
                <p style={mutedStyle}>Rôle proposé : {invitation?.role}</p>
              </div>
              <StatusPill status="warning">Expire le {formatDate(invitation?.expires_at)}</StatusPill>
            </div>
            <div style={noticeStyle}>
              <ShieldCheck size={18} color="var(--c-success)" />
              <span>Le rôle vient du backend. Aucun accès super_admin n’est attribué par invitation.</span>
            </div>
            {success && <div style={successStyle}>{success}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Button onClick={acceptInvite} disabled={accepting}>{accepting ? 'Acceptation...' : 'Accepter l’invitation'} <ArrowRight size={16} /></Button>
              <Button variant="ghost" onClick={() => navigate('/login')}>Me connecter d’abord</Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

const pageStyle = { minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--c-text-primary)', padding: 18, position: 'relative' }
const cardStyle = { width: 'min(100%, 680px)', padding: 'clamp(22px, 5vw, 42px)', display: 'grid', gap: 22, transform: 'perspective(900px) rotateX(1.5deg)' }
const titleStyle = { margin: '10px 0 8px', fontFamily: 'var(--c-font-display)', fontSize: 'clamp(36px, 7vw, 64px)', lineHeight: 0.96, letterSpacing: '-0.06em' }
const leadStyle = { margin: 0, color: 'var(--c-text-secondary)', fontSize: 18, lineHeight: 1.55 }
const mutedStyle = { margin: '4px 0 0', color: 'var(--c-text-secondary)' }
const summaryStyle = { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: 14, borderRadius: 18, border: '1px solid var(--c-glass-border)', background: 'rgba(255,255,255,0.04)' }
const noticeStyle = { display: 'flex', gap: 10, alignItems: 'center', color: 'var(--c-text-secondary)', padding: 12, borderRadius: 16, background: 'rgba(93,227,161,0.08)', border: '1px solid rgba(93,227,161,0.2)' }
const successStyle = { padding: 13, borderRadius: 16, color: 'var(--c-success)', background: 'rgba(93,227,161,0.08)', border: '1px solid rgba(93,227,161,0.25)' }
