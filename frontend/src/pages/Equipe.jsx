import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, MailPlus, RefreshCcw, ShieldCheck, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import AuroraBackground from '../components/ui/AuroraBackground'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatusPill from '../components/ui/StatusPill'
import Input from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'broker', label: 'Broker' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'viewer', label: 'Viewer' },
]

const ROLE_COPY = {
  owner: 'Pilotage complet cabinet, billing et équipe.',
  manager: 'Reporting, conformité et supervision opérationnelle.',
  broker: 'Clients, contrats, tâches et documents métier.',
  assistant: 'Support administratif et saisie opérationnelle.',
  viewer: 'Lecture seule pour audit ou accompagnement.',
}

export default function Equipe() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [invite, setInvite] = useState({ email: '', role: 'broker' })
  const [sending, setSending] = useState(false)

  const loadTeam = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/cabinet/members')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Équipe indisponible pour le moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTeam()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadTeam])

  const isOwner = useMemo(() => data?.cabinet?.role === 'owner' || data?.cabinet?.role === 'super_admin', [data])

  async function submitInvite(e) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await api.post('/cabinet/members/invite', invite)
      setInvite({ email: '', role: 'broker' })
      await loadTeam()
      if (res.data?.invite_link) {
        await navigator.clipboard?.writeText(res.data.invite_link).catch(() => {})
      }
      toast.success(res.data?.message || 'Invitation créée')
    } catch (err) {
      setError(err.response?.data?.message || 'Invitation impossible.')
    } finally {
      setSending(false)
    }
  }

  async function updateRole(memberId, role) {
    try {
      await api.patch(`/cabinet/members/${memberId}`, { role })
      await loadTeam()
      toast.success('Rôle mis à jour')
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour du rôle impossible.')
    }
  }

  async function removeMember(memberId) {
    try {
      await api.delete(`/cabinet/members/${memberId}`)
      await loadTeam()
      toast.success('Membre retiré')
    } catch (err) {
      setError(err.response?.data?.message || 'Suppression impossible.')
    }
  }

  return (
    <div style={pageStyle}>
      <AuroraBackground />
      <section style={heroStyle}>
        <div>
          <Badge tone="success">Multi-utilisateurs</Badge>
          <h1 style={titleStyle}>Votre équipe, vos rôles, votre cockpit.</h1>
          <p style={leadStyle}>Invitez vos collaborateurs sans mélanger les responsabilités : owner, manager, broker, assistant ou lecture seule.</p>
        </div>
        <GlassCard style={statCardStyle}>
          <Users size={26} color="var(--c-aurora-cyan)" />
          <strong style={{ fontSize: 38 }}>{data?.members?.length || 0}</strong>
          <p style={mutedStyle}>membre(s) cabinet</p>
        </GlassCard>
      </section>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={gridStyle}>
        <GlassCard style={panelStyle}>
          <div style={sectionHeaderStyle}>
            <MailPlus size={20} color="var(--c-aurora-cyan)" />
            <div>
              <h2 style={h2Style}>Inviter un collaborateur</h2>
              <p style={mutedStyle}>Le lien d’invitation est généré côté backend et expirera après 7 jours.</p>
            </div>
          </div>
          {!isOwner ? (
            <EmptyState title="Invitation réservée au propriétaire" description="Votre rôle actuel permet de consulter l’équipe, pas d’inviter de nouveaux membres." />
          ) : (
            <form onSubmit={submitInvite} style={{ display: 'grid', gap: 14 }}>
              <Field label="Email professionnel">
                <Input type="email" value={invite.email} onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))} placeholder="collaborateur@cabinet.fr" required />
              </Field>
              <Field label="Rôle cabinet">
                <select className="courtia-input courtia-select" value={invite.role} onChange={(e) => setInvite((v) => ({ ...v, role: e.target.value }))}>
                  {ROLE_OPTIONS.filter((role) => role.value !== 'owner').map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              </Field>
              <p style={mutedStyle}>{ROLE_COPY[invite.role]}</p>
              <Button type="submit" disabled={sending}>{sending ? 'Invitation...' : 'Créer et envoyer l’invitation'}</Button>
            </form>
          )}
        </GlassCard>

        <div style={{ display: 'grid', gap: 14 }}>
          <GlassCard style={panelStyle}>
            <div style={listHeaderStyle}>
              <div>
                <h2 style={h2Style}>{data?.cabinet?.name || 'Cabinet COURTIA'}</h2>
                <p style={mutedStyle}>Rôle courant : {data?.cabinet?.role || 'owner'}</p>
              </div>
              <Button variant="ghost" onClick={loadTeam}><RefreshCcw size={16} /> Actualiser</Button>
            </div>
            {loading ? (
              <EmptyState title="Chargement de l’équipe" description="COURTIA récupère les membres du cabinet." />
            ) : data?.members?.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {data.members.map((member) => (
                  <div key={member.id} style={memberRowStyle}>
                    <div style={avatarStyle}>{initials(member)}</div>
                    <div style={{ minWidth: 0 }}>
                      <strong>{fullName(member) || member.email}</strong>
                      <p style={mutedSmallStyle}>{member.email}</p>
                    </div>
                    <StatusPill status={member.role === 'owner' ? 'success' : 'neutral'}>{member.role}</StatusPill>
                    {isOwner && member.role !== 'owner' && (
                      <select className="courtia-input courtia-select" style={{ maxWidth: 150 }} value={member.role} onChange={(e) => updateRole(member.id, e.target.value)}>
                        {ROLE_OPTIONS.filter((role) => role.value !== 'owner').map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    )}
                    {isOwner && member.role !== 'owner' && <Button variant="danger" onClick={() => removeMember(member.id)}><Trash2 size={15} /></Button>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Aucun membre" description="Invitez votre premier collaborateur pour activer le mode cabinet." />
            )}
          </GlassCard>

          <GlassCard style={panelStyle}>
            <h2 style={h2Style}>Invitations en cours</h2>
            <p style={{ ...mutedStyle, marginBottom: 14 }}>Utile quand l’email transactionnel n’est pas encore configuré : le lien peut être transmis manuellement.</p>
            {data?.invitations?.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {data.invitations.map((row) => (
                  <div key={row.id} style={inviteRowStyle}>
                    <ShieldCheck size={17} color="var(--c-aurora-cyan)" />
                    <div style={{ minWidth: 0 }}>
                      <strong>{row.email}</strong>
                      <p style={mutedSmallStyle}>Rôle {row.role} · expire le {formatDate(row.expires_at)}</p>
                    </div>
                    <StatusPill status={row.accepted_at ? 'success' : 'warning'}>{row.accepted_at ? 'Acceptée' : 'En attente'}</StatusPill>
                    {row.token_preview && <Button variant="ghost" title="Aperçu token"><Copy size={15} /> {row.token_preview}</Button>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Aucune invitation ouverte" description="Les invitations apparaîtront ici après création." />
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <label style={{ display: 'grid', gap: 7 }}><span style={labelStyle}>{label}</span>{children}</label>
}

function initials(member) {
  return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase() || member.email?.[0]?.toUpperCase() || 'C'
}

function fullName(member) {
  return `${member.first_name || ''} ${member.last_name || ''}`.trim()
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

const pageStyle = { position: 'relative', minHeight: '100vh', padding: '40px clamp(16px, 4vw, 48px)', color: 'var(--c-text-primary)', overflow: 'hidden' }
const heroStyle = { maxWidth: 1180, margin: '0 auto 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'end' }
const titleStyle = { margin: '18px 0 12px', fontFamily: 'var(--c-font-display)', fontSize: 'clamp(38px, 7vw, 76px)', lineHeight: 0.94, letterSpacing: '-0.06em' }
const leadStyle = { margin: 0, maxWidth: 720, color: 'var(--c-text-secondary)', fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.55 }
const statCardStyle = { padding: 22, display: 'grid', gap: 6, transform: 'perspective(900px) rotateX(2deg)' }
const gridStyle = { maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 18 }
const panelStyle = { padding: 22 }
const sectionHeaderStyle = { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }
const listHeaderStyle = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }
const h2Style = { margin: 0, fontFamily: 'var(--c-font-display)', fontSize: 24, letterSpacing: '-0.03em' }
const mutedStyle = { margin: 0, color: 'var(--c-text-secondary)', lineHeight: 1.55 }
const mutedSmallStyle = { margin: '3px 0 0', color: 'var(--c-text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }
const labelStyle = { color: 'var(--c-text-secondary)', fontSize: 13, fontWeight: 700 }
const memberRowStyle = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 12, border: '1px solid var(--c-glass-border)', borderRadius: 16, background: 'rgba(255,255,255,0.035)' }
const inviteRowStyle = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 12, border: '1px solid var(--c-glass-border)', borderRadius: 16, background: 'rgba(255,255,255,0.035)' }
const avatarStyle = { width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', fontWeight: 900, color: '#07091a', background: 'linear-gradient(135deg, var(--c-aurora-pearl), var(--c-aurora-cyan))' }
const errorStyle = { maxWidth: 1180, margin: '0 auto 16px', padding: 14, borderRadius: 16, border: '1px solid rgba(255,111,140,0.32)', color: 'var(--c-danger)', background: 'rgba(255,111,140,0.08)' }
