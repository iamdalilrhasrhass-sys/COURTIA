import { useState, useEffect } from 'react'
import { Users, TrendingUp, DollarSign, Activity, AlertTriangle, Sparkles } from 'lucide-react'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import { adminFetch } from '../lib/adminApi'

export default function AdminOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminFetch('/analytics')
      .then(r => { if (!r.ok) throw new Error('Accès refusé'); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Données admin indisponibles'); setLoading(false) })
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><CourtiaLogoLoader size={40} text="Chargement..." /></div>
  if (error || !data) return <AuroraEmptyState icon={AlertTriangle} title="Impossible de charger les données" subtitle="Vérifiez vos droits d'accès administrateur." />

  const { mrr, users, ark, portfolio, product } = data

  const kpis = [
    { icon: Users, label: 'Courtiers actifs', value: users.total_active, sub: `${users.signups_30d} nouveaux / 30j`, color: '#3b82f6' },
    { icon: DollarSign, label: 'MRR estimé', value: `${mrr.total_eur}€`, sub: `HT — hors réductions`, color: '#10b981' },
    { icon: TrendingUp, label: 'Churn 30j', value: `${users.churn_rate_30d}%`, sub: `${users.churns_30d} départs`, color: users.churn_rate_30d > 5 ? '#ef4444' : '#f59e0b' },
    { icon: Sparkles, label: 'ARK (30j)', value: ark.avg_per_user_30d, sub: `${ark.active_users_30d} utilisateurs actifs`, color: '#8b5cf6' },
    { icon: Activity, label: 'Portefeuilles sains', value: portfolio?.healthy_portfolios || 0, sub: `Score moyen: ${portfolio?.avg_health_score || '-'}`, color: '#06b6d4' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Vue d'ensemble</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Données actualisées — {new Date(data.generated_at).toLocaleString('fr-FR')}
        </p>
      </div>

      {/* KPIs */}
      <div className="courtia-admin-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="courtia-depth-card" style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '20px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <kpi.icon size={16} style={{ color: kpi.color }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.02em' }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* MRR par plan */}
      <div className="courtia-depth-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>MRR par plan</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {Object.entries(mrr.by_plan || {}).map(([plan, info]) => (
            <div key={plan} className="courtia-depth-card" style={{ flex: 1, minWidth: 140, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'capitalize' }}>{plan}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{info.mrr_eur}€</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{info.count} courtier{info.count > 1 ? 's' : ''} × {info.price_eur}€</div>
            </div>
          ))}
        </div>
      </div>

      {/* ARK & Portfolio row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="courtia-depth-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Activité ARK</h3>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
            Conversations (30j) : <strong style={{ color: '#fff' }}>{ark.total_conversations_30d}</strong><br/>
            Utilisateurs actifs : <strong style={{ color: '#fff' }}>{ark.active_users_30d}</strong><br/>
            Moyenne par courtier : <strong style={{ color: '#fff' }}>{ark.avg_per_user_30d} conversations</strong>
          </div>
        </div>
        <div className="courtia-depth-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Santé portefeuilles</h3>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
            Analyses (30j) : <strong style={{ color: '#fff' }}>{portfolio?.total_analyses_30d || 0}</strong><br/>
            Score santé moyen : <strong style={{ color: '#fff' }}>{portfolio?.avg_health_score || '-'}</strong><br/>
            Portefeuilles sains : <strong style={{ color: '#10b981' }}>{portfolio?.healthy_portfolios || 0}</strong>
          </div>
        </div>
      </div>

      <div className="courtia-depth-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, marginTop: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>Observabilité produit</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Cabinets actifs 30j</div>
            <div style={{ marginTop: 4, fontSize: 22, color: '#fff', fontWeight: 800 }}>{product?.active_cabinets_30d || 0}</div>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Événements produit</div>
            <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
              {(product?.events_30d || []).slice(0, 4).map((event) => (
                <div key={event.event_name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
                  <span>{event.event_name}</span><strong>{event.count}</strong>
                </div>
              ))}
              {(product?.events_30d || []).length === 0 && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Aucun événement récent.</span>}
            </div>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Feedback</div>
            <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
              {(product?.feedback_by_status || []).map((row) => (
                <div key={row.status} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
                  <span>{row.status}</span><strong>{row.count}</strong>
                </div>
              ))}
              {(product?.feedback_by_status || []).length === 0 && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Aucun feedback.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
