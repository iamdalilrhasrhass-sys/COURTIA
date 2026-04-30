import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Topbar from '../components/Topbar'
import PremiumTooltip from '../components/ui/PremiumTooltip'

const API_URL = import.meta.env.VITE_API_URL || '/api'
function getToken() { return localStorage.getItem('courtia_token') || localStorage.getItem('token') }

function fmtEur(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))
}

function KPICard({ label, value, sub }) {
  return (
    <div style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, padding: '20px 24px' }}>
      <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 500, color: '#0a0a0a', margin: 0, letterSpacing: -0.5 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>{sub}</p>}
    </div>
  )
}

function DaysBadge({ days }) {
  const veryUrgent = days <= 7
  const urgent = days <= 30
  const soon = days <= 90

  let bg, color
  if (veryUrgent) { bg = '#fee2e2'; color = '#dc2626' }
  else if (urgent) { bg = '#ffedd5'; color = '#ea580c' }
  else { bg = '#fef9c3'; color = '#d97706' }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {veryUrgent && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, flexShrink: 0,
          animation: 'urgentPulse 1.5s ease infinite',
        }} />
      )}
      <span style={{
        padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        background: bg, color,
      }}>
        J-{days}
      </span>
    </span>
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
    setLoading(true); setError('')
    try {
      const [statsRes, portfolioRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/dashboard/stats`, { headers }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
        fetch(`${API_URL}/api/stats/portfolio`, { headers }).then(r => r.ok ? r.json() : null)
      ])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
      else setError('Impossible de charger les statistiques')
      if (portfolioRes.status === 'fulfilled') setPortfolio(portfolioRes.value)
    } catch { setError('Erreur de chargement') }
    finally { setLoading(false) }
  }

  const contratsByType = portfolio?.contratsByType || stats?.typesContrats || []
  const top10 = portfolio?.top10Loyalty || []
  const renewals = portfolio?.renewalWindows || stats?.alertes || []
  const arkActivity = portfolio?.arkActivity || null

  const card = { background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, padding: '24px 28px', marginBottom: 16 }
  const thStyle = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'white', background: '#0a0a0a', textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap' }
  const tdStyle = { padding: '11px 16px', fontSize: 13, borderBottom: '0.5px solid #f7f6f2' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2' }}>
      <Topbar title="Rapports" subtitle="Analyse de votre portefeuille" />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <div style={{ width: 28, height: 28, border: '2px solid #e8e6e0', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes urgentPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.5)} }
        @media (max-width: 767px) {
          .rp-container { padding: 16px !important; }
          .rp-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .rp-2col { grid-template-columns: 1fr !important; }
          .rp-ark-grid { grid-template-columns: 1fr !important; }
          .rp-table-wrap { overflow-x: auto; }
          .rp-card { padding: 16px !important; }
        }
      `}</style>
      <Topbar title="Rapports" subtitle="Analyse de votre portefeuille" />

      <div className="rp-container" style={{ padding: '24px 32px', maxWidth: 1100 }}>

        {error && (
          <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={loadAll} style={{ padding: '5px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Réessayer</button>
          </div>
        )}

        {/* KPIs */}
        <div className="rp-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <KPICard label="Clients actifs" value={stats?.totalClients ?? '—'} sub="dans le portefeuille" />
          <KPICard label="Contrats actifs" value={stats?.contratsActifs ?? '—'} sub="en cours" />
          <KPICard label="Commission mois" value={fmtEur(stats?.commissionsMois)} sub="ce mois-ci" />
          <KPICard label="Prime portefeuille" value={fmtEur(stats?.primeTotale)} sub="total annuel" />
        </div>

        {/* Répartition portefeuille */}
        <div className="rp-card" style={card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 20px', letterSpacing: 0.3 }}>RÉPARTITION DU PORTEFEUILLE</h2>
          {contratsByType.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucune donnée disponible</p>
          ) : (
            <div className="rp-table-wrap" style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Type</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Contrats</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Prime totale</th>
                    <th style={{ ...thStyle, width: 180 }}>Part</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const total = contratsByType.reduce((acc, t) => acc + parseInt(t.count || t.nb || 0), 0)
                    return contratsByType.map((type, idx) => {
                      const count = parseInt(type.count || type.nb || 0)
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0
                      const bg = idx % 2 === 0 ? 'white' : '#fafaf8'
                      return (
                        <tr key={type.type} style={{ background: bg }}>
                          <td style={{ ...tdStyle, fontWeight: 600, color: '#0a0a0a' }}>{type.type || '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#0a0a0a', fontWeight: 500 }}>{count}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: '#9ca3af' }}>{fmtEur(type.prime_total)}</td>
                          <td style={{ ...tdStyle }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                                <div style={{ height: '100%', borderRadius: 3, width: pct + '%', background: '#0a0a0a' }} />
                              </div>
                              <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Top clients */}
          <div className="rp-card" style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, padding: '24px 28px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 20px', letterSpacing: 0.3 }}>TOP CLIENTS <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', letterSpacing: 0 }}>par fidélité</span></h2>
            {top10.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
                <p style={{ margin: 0 }}>Aucun client à afficher pour l'instant</p>
              </div>
            ) : (
              <div className="rp-table-wrap" style={{ border: '0.5px solid #e8e6e0', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 36 }}>#</th>
                      <th style={thStyle}>Client</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Score</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10.map((client, i) => (
                      <motion.tr
                        key={client.id}
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.12 }}
                        onClick={() => navigate(`/clients/${client.id}`)}
                        style={{ cursor: 'pointer', background: i % 2 === 0 ? 'white' : '#fafaf8' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafaf8'}
                      >
                        <td style={{ ...tdStyle, color: '#9ca3af', fontWeight: 700, textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#0a0a0a' }}>{client.nom} {client.prenom}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>{client.loyalty_score ?? '—'}/100</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: '#9ca3af' }}>{fmtEur(client.lifetime_value)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Échéances urgentes */}
          <div className="rp-card" style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, padding: '24px 28px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 20px', letterSpacing: 0.3 }}>
              ÉCHÉANCES URGENTES <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', letterSpacing: 0 }}>{'<'} 90 jours</span>
            </h2>
            {renewals.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: '#16a34a', fontSize: 13 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
                Aucune échéance urgente
              </div>
            ) : (
              <div className="rp-table-wrap" style={{ border: '0.5px solid #e8e6e0', borderRadius: 10, overflow: 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Client</th>
                      <th style={thStyle}>Type</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Échéance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewals.map((a, i) => {
                      const days = a.jours_restants ?? 999
                      const clientId = a.client_id || a.id
                      const tooltipContent = (
                        <span>
                          Échéance dans <strong>{days}j</strong><br />
                          {a.type_contrat ? `Contrat : ${a.type_contrat}` : ''}{a.type_contrat && (a.nom || a.prenom) ? ' · ' : ''}
                          {a.nom || a.prenom ? `${a.nom} ${a.prenom}` : ''}<br />
                          <span style={{ color: '#9ca3af', fontSize: 10 }}>Cliquer pour ouvrir le dossier</span>
                        </span>
                      )
                      return (
                        <PremiumTooltip key={i} content={tooltipContent} position="top">
                          <motion.tr
                            whileHover={{ x: 2 }}
                            transition={{ duration: 0.12 }}
                            onClick={() => {
                              if (clientId) navigate(`/clients/${clientId}`)
                              else toast('Dossier client non disponible', { icon: 'ℹ️' })
                            }}
                            style={{ cursor: 'pointer', display: 'table-row' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#fafaf8'}
                          >
                            <td style={{ ...tdStyle, fontWeight: 600, color: '#0a0a0a' }}>{a.nom} {a.prenom}</td>
                            <td style={{ ...tdStyle, color: '#9ca3af' }}>{a.type_contrat || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              <DaysBadge days={days} />
                            </td>
                          </motion.tr>
                        </PremiumTooltip>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Activité ARK */}
        <div className="rp-card" style={card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', margin: '0 0 20px', letterSpacing: 0.3 }}>ACTIVITÉ ARK</h2>
          <div className="rp-ark-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Conversations ce mois', value: arkActivity?.conversationsMois ?? '—' },
              { label: 'Clients analysés', value: arkActivity?.clientsAnalyses ?? '—' },
              { label: 'Recommandations', value: arkActivity?.recommandations ?? '—' }
            ].map(item => (
              <div key={item.label} style={{ background: '#fafaf8', border: '0.5px solid #e8e6e0', borderRadius: 10, padding: '18px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 500, color: '#0a0a0a', margin: '0 0 6px', letterSpacing: -0.5 }}>{item.value}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
