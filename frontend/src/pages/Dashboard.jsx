import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

function getToken() { return localStorage.getItem('token') }

function formatEuros(montant) {
 if (!montant && montant !== 0) return '—'
 return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(montant)
}

function KPICard({ title, value, icon, color, alert }) {
 return (
 <div style={{ background: `linear-gradient(135deg, ${color}dd, ${color}aa)`, borderRadius: 12, padding: 20, color: 'white', position: 'relative', overflow: 'hidden' }}>
 {alert && <span style={{ position: 'absolute', top: 8, right: 8, background: '#dc2626', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>!</span>}
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
 <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>{title}</p>
 <span style={{ fontSize: 22 }}>{icon}</span>
 </div>
 <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{value}</p>
 </div>
 )
}

export default function Dashboard() {
 const navigate = useNavigate()
 const [stats, setStats] = useState(null)
 const [loading, setLoading] = useState(true)

 const headers = { Authorization: `Bearer ${getToken()}` }

 useEffect(() => {
 // Ping le backend pour prévenir cold start
 fetch(`${API_URL}/ping`).catch(() => {})
 loadStats()
 }, [])

 async function loadStats() {
 try {
 setLoading(true)
 const res = await axios.get(`${API_URL}/api/dashboard/stats`, { headers })
 setStats(res.data)
 } catch (err) {
 console.error('Erreur dashboard:', err)
 } finally {
 setLoading(false)
 }
 }

 if (loading) return (
 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
 <div style={{ textAlign: 'center' }}>
 <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
 <p style={{ color: '#6b7280' }}>Chargement du tableau de bord...</p>
 </div>
 </div>
 )

 if (!stats) return <div style={{ padding: 32, color: '#dc2626' }}>Erreur chargement — Réessayez</div>

 return (
 <div style={{ padding: 32 }}>
 <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2563eb', marginBottom: 24 }}>Tableau de bord</h1>

 {/* KPI Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
 <KPICard title="Total clients" value={stats.totalClients || 0} icon="👥" color="#3b82f6" />
 <KPICard title="Contrats actifs" value={stats.contratsActifs || 0} icon="📋" color="#06b6d4" />
 <KPICard title="Commissions mois" value={formatEuros(stats.commissionsMois)} icon="💰" color="#0891b2" />
 <KPICard title="Taux conversion" value={(stats.tauxConversion || 0) + '%'} icon="📈" color="#0284c7" />
 <KPICard title="Prime portefeuille" value={formatEuros(stats.primeTotale)} icon="🏦" color="#0369a1" />
 <KPICard title="Contrats urgents" value={stats.contratsUrgents || 0} icon="⚠️" color={stats.contratsUrgents > 0 ? '#dc2626' : '#16a34a'} alert={stats.contratsUrgents > 0} />
 </div>

 {/* Indicateurs métier ARK */}
 {stats && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
 <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
 <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>🔴 Clients risque élevé</p>
 <p style={{ fontSize: 28, fontWeight: 700, color: '#dc2626', margin: 0 }}>{(stats.clientsRecents || []).filter(c => c.score_risque > 60).length}</p>
 <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>sur les 5 derniers clients</p>
 </div>
 <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
 <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>📈 Commission annuelle</p>
 <p style={{ fontSize: 28, fontWeight: 700, color: '#16a34a', margin: 0 }}>{stats.commissionsMois ? ((stats.commissionsMois * 12).toLocaleString('fr-FR') + '€') : '—'}</p>
 <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>projection sur 12 mois</p>
 </div>
 <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
 <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>⚡ Prime moyenne</p>
 <p style={{ fontSize: 28, fontWeight: 700, color: '#2563eb', margin: 0 }}>{stats.contratsActifs && stats.primeTotale ? (Math.round(stats.primeTotale / stats.contratsActifs).toLocaleString('fr-FR') + '€') : '—'}</p>
 <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>par contrat actif</p>
 </div>
 </div>}

 {/* Graphique revenus */}
 <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
 <h2 style={{ color: '#38bdf8', fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Revenus 6 derniers mois</h2>
 {stats.revenus6Mois && stats.revenus6Mois.length > 0 ? (
 <ResponsiveContainer width="100%" height={220}>
 <LineChart data={stats.revenus6Mois.map(d => ({ ...d, revenue: parseFloat(d.revenue) || 0 }))}>
 <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
 <XAxis dataKey="mois" stroke="#94a3b8" fontSize={12} />
 <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={v => v + '€'} />
 <Tooltip formatter={v => [formatEuros(v), 'Revenus']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} />
 <Line type="monotone" dataKey="revenue" stroke="#38bdf8" strokeWidth={2} dot={{ fill: '#38bdf8', r: 4 }} />
 </LineChart>
 </ResponsiveContainer>
 ) : (
 <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Aucune donnée de revenus disponible</p>
 )}
 </div>

 {/* Répartition du portefeuille */}
 {stats.typesContrats && stats.typesContrats.length > 0 && (
 <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
 <h2 style={{ color: '#38bdf8', fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Répartition du portefeuille</h2>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {stats.typesContrats.map(type => {
 const total = stats.typesContrats.reduce((acc, t) => acc + parseInt(t.count), 0)
 const pct = Math.round((parseInt(type.count) / total) * 100)
 const colors = {
 'Auto': '#3b82f6',
 'Habitation': '#10b981',
 'Mutuelle': '#8b5cf6',
 'RC Pro': '#f59e0b',
 'Prévoyance': '#ef4444',
 'Décennale': '#06b6d4'
 }
 return (
 <div key={type.type}>
 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
 <span style={{ color: '#e2e8f0', fontSize: 13 }}>{type.type}</span>
 <span style={{ color: '#94a3b8', fontSize: 13 }}>{type.count} contrats · {pct}%</span>
 </div>
 <div style={{ height: 6, background: '#334155', borderRadius: 3 }}>
 <div style={{
 height: '100%', borderRadius: 3,
 width: pct + '%',
 background: colors[type.type] || '#06b6d4',
 transition: 'width 0.3s ease'
 }} />
 </div>
 </div>
 )
 })}
 </div>
 </div>
 )}

 {/* Clients récents + Alertes */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
 {/* Clients récents */}
 <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
 <h2 style={{ color: '#38bdf8', fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Clients récents</h2>
 {stats.clientsRecents && stats.clientsRecents.length > 0 ? (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {stats.clientsRecents.map(client => (
 <div key={client.id} onClick={() => navigate('/client/' + client.id)}
 style={{ padding: '10px 14px', background: '#0f172a', borderRadius: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
 onMouseEnter={e => e.currentTarget.style.background = '#1e3a5f'}
 onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}>
 <div>
 <p style={{ color: 'white', fontWeight: 600, margin: 0, fontSize: 14 }}>{client.nom} {client.prenom}</p>
 <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>Score : {client.score_risque}</p>
 </div>
 <span style={{ padding: '3px 8px', background: client.statut === 'actif' ? '#166534' : '#1e3a5f', color: client.statut === 'actif' ? '#4ade80' : '#93c5fd', borderRadius: 12, fontSize: 12 }}>
 {client.statut}
 </span>
 </div>
 ))}
 </div>
 ) : (
 <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>Aucun client récent</p>
 )}
 </div>

 {/* Alertes importantes */}
 <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
 <h2 style={{ color: '#38bdf8', fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Alertes importantes</h2>
 {stats.alertes && stats.alertes.length > 0 ? (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {stats.alertes.map((alerte, i) => (
 <div key={i} style={{ padding: '10px 14px', background: alerte.jours_restants <= 30 ? '#450a0a' : '#422006', borderRadius: 8, border: `1px solid ${alerte.jours_restants <= 30 ? '#7f1d1d' : '#78350f'}` }}>
 <p style={{ color: alerte.jours_restants <= 30 ? '#fca5a5' : '#fcd34d', fontWeight: 600, margin: '0 0 2px', fontSize: 14 }}>
 ⚠️ {alerte.nom} {alerte.prenom}
 </p>
 <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
 {alerte.type_contrat} — expire dans {alerte.jours_restants} jour{alerte.jours_restants > 1 ? 's' : ''}
 </p>
 </div>
 ))}
 </div>
 ) : (
 <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>✅ Aucune échéance urgente dans les 90 prochains jours</p>
 )}
 </div>
 </div>
 </div>
 )
}
