import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ChevronRight } from 'lucide-react'
import CourtiaLogoLoader from '../components/brand/CourtiaLogoLoader'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'

const API_URL = import.meta.env.VITE_API_URL || ''

const STATUS_LABELS = { active: 'Actif', trialing: 'Essai', suspended: 'Suspendu', cancelled: 'Résilié' }
const STATUS_COLORS = { active: '#10b981', trialing: '#3b82f6', suspended: '#ef4444', cancelled: '#6b7280' }
const PLAN_COLORS = { start: '#6b7280', pro: '#8b5cf6', elite: '#f59e0b' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchUsers = (p = 1) => {
    setLoading(true)
    const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
    const params = new URLSearchParams({ page: p, limit: 20 })
    if (search) params.set('search', search)
    if (planFilter) params.set('plan', planFilter)
    if (statusFilter) params.set('status', statusFilter)
    fetch(`${API_URL}/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setTotal(d.total || 0); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchUsers(page) }, [page])
  const doSearch = () => { setPage(1); fetchUsers(1) }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Courtiers</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{total} courtier{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0 12px', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Rechercher par nom ou email..."
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 12.5, padding: '9px 0', outline: 'none', width: '100%', fontFamily: 'inherit' }} />
        </div>
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); setTimeout(() => fetchUsers(1), 0) }}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12, padding: '9px 12px', outline: 'none', cursor: 'pointer' }}>
          <option value="">Tous les plans</option>
          <option value="start">Starter</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); setTimeout(() => fetchUsers(1), 0) }}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: 12, padding: '9px 12px', outline: 'none', cursor: 'pointer' }}>
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="trialing">Essai</option>
          <option value="suspended">Suspendu</option>
          <option value="cancelled">Résilié</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><CourtiaLogoLoader size={32} /></div>
      ) : users.length === 0 ? (
        <AuroraEmptyState icon={Search} title="Aucun courtier trouvé" subtitle="Modifiez vos filtres ou votre recherche." />
      ) : (
        <>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Nom</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Plan</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Statut</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Inscription</th>
                  <th style={{ textAlign: 'right', padding: '12px 18px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 18px', color: '#fff', fontWeight: 500 }}>
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                      {u.cabinet && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>{u.cabinet}</span>}
                    </td>
                    <td style={{ padding: '12px 18px', color: 'rgba(255,255,255,0.55)', fontSize: 12.5 }}>{u.email}</td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${PLAN_COLORS[u.subscription_plan] || '#6b7280'}20`, color: PLAN_COLORS[u.subscription_plan] || '#6b7280', fontWeight: 500 }}>
                        {(u.subscription_plan || 'start').charAt(0).toUpperCase() + (u.subscription_plan || 'start').slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${STATUS_COLORS[u.subscription_status] || '#6b7280'}20`, color: STATUS_COLORS[u.subscription_status] || '#6b7280', fontWeight: 500 }}>
                        {STATUS_LABELS[u.subscription_status] || u.subscription_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <Link to={`/admin/users/${u.id}`} style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {Array.from({ length: Math.ceil(total / 20) }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)',
                    background: page === i + 1 ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: page === i + 1 ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: 12, cursor: 'pointer', fontWeight: page === i + 1 ? 600 : 400,
                  }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
