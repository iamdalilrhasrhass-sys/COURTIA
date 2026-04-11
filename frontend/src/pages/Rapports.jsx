import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

function getToken() { return localStorage.getItem('token') }

function fmt(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))
}

function KPICard({ title, value, icon, color = '#2563eb' }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0, fontWeight: 500 }}>{title}</p>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 700, color, margin: 0 }}>{value}</p>
    </div>
  )
}

export default function Rapports() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const headers = { Authorization: `Bearer ${getToken()}` }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [statsRes, portfolioRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/dashboard/stats`, { headers }).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
        fetch(`${API_URL}/api/stats/portfolio`, { headers }).then(r => r.ok ? r.json() : null)
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
      else setError('Impossible de charger les statistiques du tableau de bord')
      if (portfolioRes.status === 'fulfilled') setPortfolio(portfolioRes.value)
    } catch {
      setError('Erreur de chargement des rapports')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSpinner message="Chargement des rapports..." />
  if (error && !stats) return (
    <div style={{ padding: 32 }}>
      <ErrorBanner message={error} onRetry={loadAll} />
    </div>
  )

  const contratsByType = portfolio?.contratsByType || stats?.typesContrats || []
  const top10 = portfolio?.top10Loyalty || []
  const renewals = portfolio?.renewalWindows || stats?.alertes || []
  const arkActivity = portfolio?.arkActivity || null

  return (
    <div style={{ padding: 32, minHeight: '100vh', background: '#f9fafb' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#080808', margin: 0 }}>Rapports</h1>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
          Mis à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {error && <ErrorBanner message={error} style={{ marginBottom: 24 }} />}

      {/* SECTION 1 — KPIs résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <KPICard title="Clients actifs" value={stats?.totalClients ?? '—'} icon="👥" color="#080808" />
        <KPICard title="Contrats actifs" value={stats?.contratsActifs ?? '—'} icon="📋" color="#2563eb" />
        <KPICard title="Commission mensuelle" value={fmt(stats?.commissionsMois)} icon="💰" color="#16a34a" />
        <KPICard title="Prime portefeuille" value={fmt(stats?.primeTotale)} icon="🏦" color="#7c3aed" />
      </div>

      {/* SECTION 2 — Contrats par type */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#080808', margin: '0 0 20px' }}>
          Répartition du portefeuille
        </h2>
        {contratsByType.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
            Aucune donnée disponible
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {contratsByType.map(type => {
              const total = contratsByType.reduce((acc, t) => acc + parseInt(t.count || t.nb || 0), 0)
              const count = parseInt(type.count || type.nb || 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const palette = {
                'Auto': '#3b82f6', 'Habitation': '#10b981', 'Mutuelle': '#8b5cf6',
                'RC Pro': '#f59e0b', 'Prévoyance': '#ef4444', 'Décennale': '#06b6d4'
              }
              const color = palette[type.type] || '#6b7280'
              return (
                <div key={type.type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{type.type}</span>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {type.prime_total && (
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{fmt(type.prime_total)}</span>
                      )}
                      <span style={{ fontSize: 13, color: '#6b7280', minWidth: 80, textAlign: 'right' }}>
                        {count} contrat{count > 1 ? 's' : ''} · {pct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                    <div style={{ height: '100%', borderRadius: 4, width: pct + '%', background: color, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

        {/* SECTION 3 — Top 10 clients */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#080808', margin: '0 0 20px' }}>
            Top 10 clients <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>par fidélité</span>
          </h2>
          {top10.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 8px' }}>
                Données disponibles après déploiement du module stats
              </p>
              <p style={{ fontSize: 12, color: '#d1d5db', margin: 0 }}>GET /api/stats/portfolio</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {top10.map((client, i) => (
                <div key={client.id}
                  onClick={() => navigate(`/client/${client.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid #f3f4f6' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#f3f4f6' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', width: 20 }}>#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.nom} {client.prenom}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
                      {client.loyalty_score ?? '—'}/100
                    </p>
                    {client.lifetime_value && (
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{fmt(client.lifetime_value)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 4 — Contrats urgents */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#080808', margin: '0 0 20px' }}>
            Échéances urgentes <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>{'<'} 90 jours</span>
          </h2>
          {renewals.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: '#16a34a', fontSize: 14 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span>Aucune échéance urgente</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {renewals.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8,
                  background: (a.jours_restants ?? 999) <= 30 ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${(a.jours_restants ?? 999) <= 30 ? '#fecaca' : '#fde68a'}`
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#111827' }}>
                      {a.nom} {a.prenom}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{a.type_contrat}</p>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: (a.jours_restants ?? 999) <= 30 ? '#dc2626' : '#d97706',
                    color: 'white', flexShrink: 0
                  }}>
                    J-{a.jours_restants}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5 — Activité ARK */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#080808', margin: '0 0 20px' }}>Activité ARK</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Conversations ce mois', value: arkActivity?.conversationsMois ?? '—', icon: '💬', color: '#2563eb' },
            { label: 'Clients analysés', value: arkActivity?.clientsAnalyses ?? '—', icon: '🔍', color: '#7c3aed' },
            { label: 'Recommandations envoyées', value: arkActivity?.recommandations ?? '—', icon: '📤', color: '#16a34a' }
          ].map(item => (
            <div key={item.label} style={{
              background: '#f9fafb', borderRadius: 10, padding: 20,
              textAlign: 'center', border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <p style={{ fontSize: 24, fontWeight: 700, color: item.color, margin: '0 0 4px' }}>{item.value}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
