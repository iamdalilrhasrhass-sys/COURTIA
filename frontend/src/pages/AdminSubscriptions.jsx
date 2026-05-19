import { useState, useEffect } from 'react'
import { CreditCard, TrendingUp, AlertTriangle } from 'lucide-react'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import { adminFetch } from '../lib/adminApi'

export default function AdminSubscriptions() {
  const [data, setData] = useState(null)
  const [billingRows, setBillingRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminFetch('/analytics').then(r => r.json()),
      adminFetch('/billing').then(r => r.json())
    ])
      .then(([analytics, billing]) => {
        setData(analytics)
        setBillingRows(billing.organizations || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><CourtiaLogoLoader size={32} text="Chargement..." /></div>
  if (!data) return <AuroraEmptyState icon={CreditCard} title="Données d'abonnement indisponibles" subtitle="Réessayez dans quelques instants." />

  const { mrr, users } = data

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Abonnements</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          MRR estimé — {users.total_active} abonnés actifs (hors réductions Stripe)
        </p>
      </div>

      {/* MRR Total */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))',
        border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} /> MRR estimé (HT)
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{mrr.total_eur}€</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Basé sur prix catalogue</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Nouveaux (30j)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>+{users.signups_30d}</div>
        </div>
      </div>

      {/* Plans breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {Object.entries(mrr.by_plan || {}).map(([plan, info]) => (
          <div key={plan} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{plan}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{info.mrr_eur}€</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {info.count} abonné{info.count !== 1 ? 's' : ''} × {info.price_eur}€
            </div>
            <div style={{ marginTop: 12, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: plan === 'elite' ? '#f59e0b' : plan === 'pro' ? '#8b5cf6' : '#6b7280', borderRadius: 2,
                width: `${mrr.total_eur > 0 ? (info.mrr_eur / mrr.total_eur * 100) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Churn warning */}
      {users.churn_rate_30d > 5 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, marginBottom: 16 }}>
          <AlertTriangle size={16} style={{ color: '#ef4444' }} />
          <span style={{ fontSize: 12.5, color: '#fca5a5' }}>
            Churn élevé : {users.churn_rate_30d}% sur 30 jours ({users.churns_30d} départs). Surveillez de près.
          </span>
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Suivi Billing (test mode)</h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 14px' }}>
          Plan, statut abonnement, fin d’activation et preuve de consentement.
        </p>

        {billingRows.length === 0 ? (
          <AuroraEmptyState
            icon={CreditCard}
            title="Aucune organisation billing"
            subtitle="Les données apparaîtront dès qu’un onboarding billing est créé."
          />
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
            <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: 'rgba(255,255,255,0.04)' }}>
                <tr>
                  <th style={th}>Cabinet</th>
                  <th style={th}>Compte</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Fin activation</th>
                  <th style={th}>Consentement</th>
                  <th style={th}>Customer Stripe</th>
                </tr>
              </thead>
              <tbody>
                {billingRows.map((row) => (
                  <tr key={row.organization_id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={td}>{row.cabinet_name || 'Non renseigné'}</td>
                    <td style={td}>{row.email}</td>
                    <td style={td}>{row.plan_code || 'starter'}</td>
                    <td style={td}>{row.subscription_status || 'not_started'}</td>
                    <td style={td}>{row.trial_end_at ? new Date(row.trial_end_at).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={td}>{row.last_legal_acceptance_at ? new Date(row.last_legal_acceptance_at).toLocaleString('fr-FR') : '—'}</td>
                    <td style={td}>{row.stripe_customer_id_masked || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const th = {
  textAlign: 'left',
  padding: '10px 12px',
  color: 'rgba(255,255,255,0.65)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const td = {
  padding: '10px 12px',
  color: 'rgba(255,255,255,0.86)',
  whiteSpace: 'nowrap',
}
