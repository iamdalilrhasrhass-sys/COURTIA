import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Calendar, Building, FileText, CheckSquare, Shield, Clock } from 'lucide-react'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'

const API_URL = import.meta.env.VITE_API_URL || ''

const STATUS_LABELS = { active: 'Actif', trialing: 'Essai', suspended: 'Suspendu', cancelled: 'Résilié' }

export default function AdminUserDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
    fetch(`${API_URL}/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><CourtiaLogoLoader size={32} /></div>
  if (!data?.user) return <AuroraEmptyState icon={Shield} title="Utilisateur introuvable" subtitle="Cet utilisateur n'existe pas ou vous n'y avez pas accès." />

  const { user, metrics, portfolio } = data

  return (
    <div>
      <Link to="/admin/users" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 12.5, marginBottom: 24 }}>
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sans nom'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mail size={12} /> {user.email}
            </span>
            {user.cabinet && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}><Building size={12} /> {user.cabinet}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', fontWeight: 500 }}>
            {user.subscription_plan ? user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) : 'Starter'}
          </span>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 500 }}>
            {STATUS_LABELS[user.subscription_status] || user.subscription_status}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Clients', value: metrics?.clients_count || 0, icon: FileText },
          { label: 'Contrats', value: metrics?.contracts_count || 0, icon: FileText },
          { label: 'Tâches en cours', value: metrics?.pending_tasks || 0, icon: CheckSquare },
          { label: 'Conversations ARK', value: metrics?.ark_conversations_total || 0, icon: Shield },
          { label: 'ARK (30j)', value: metrics?.ark_conversations_30d || 0, icon: Shield },
          { label: 'Dernière activité', value: metrics?.last_ark_activity ? new Date(metrics.last_ark_activity).toLocaleDateString('fr-FR') : '—', icon: Clock },
        ].map((m, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <m.icon size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{m.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Portfolio & Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Profil</h3>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 2 }}>
            {user.orias && <div>ORIAS : {user.orias}</div>}
            {user.telephone && <div>Tél : {user.telephone}</div>}
            {user.adresse && <div>Adresse : {user.adresse}</div>}
            {user.ville && <div>Ville : {user.ville}</div>}
            <div>Inscription : {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'}</div>
            {user.trial_ends_at && <div>Fin essai : {new Date(user.trial_ends_at).toLocaleDateString('fr-FR')}</div>}
            {user.stripe_customer_id && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>Stripe : {user.stripe_customer_id}</div>}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Portefeuille</h3>
          {portfolio ? (
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 2 }}>
              <div>Score santé : <strong style={{ color: '#10b981' }}>{portfolio.health_score}</strong></div>
              <div>Note : {portfolio.grade || '—'}</div>
              <div>Analyse : {portfolio.generated_at ? new Date(portfolio.generated_at).toLocaleDateString('fr-FR') : '—'}</div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.3)' }}>Aucune analyse de portefeuille disponible.</div>
          )}
        </div>
      </div>
    </div>
  )
}
