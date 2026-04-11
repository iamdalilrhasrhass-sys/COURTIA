import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import RiskScoreBadge from '../components/RiskScoreBadge'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

const STATUS_TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'résilié', label: 'Résiliés' },
]

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [riskFilter, setRiskFilter] = useState('tous')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const PER_PAGE = 20

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      if (!token) { setError('Pas de token trouvé'); setClients([]); return }
      const res = await fetch(`${API_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let arr = []
      if (Array.isArray(data)) arr = data
      else if (data?.data && Array.isArray(data.data)) arr = data.data
      else if (data?.clients && Array.isArray(data.clients)) arr = data.clients
      setClients(arr)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(`Impossible de charger les clients : ${err.message}`)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const safeClients = Array.isArray(clients) ? clients : []

  const filtered = safeClients.filter(c => {
    if (!c || typeof c !== 'object') return false
    const fullName = `${c.nom || ''} ${c.prenom || ''}`.toLowerCase()
    const email = (c.email || '').toLowerCase()
    const s = search.toLowerCase()
    const matchSearch = fullName.includes(s) || email.includes(s)
    const matchStatus = statusFilter === 'tous' || (c.statut || '').toLowerCase() === statusFilter
    const score = Number(c.score_risque) || 0
    const matchRisk = riskFilter === 'tous'
      || (riskFilter === 'faible' && score <= 30)
      || (riskFilter === 'modere' && score > 30 && score <= 60)
      || (riskFilter === 'eleve' && score > 60)
    return matchSearch && matchStatus && matchRisk
  })

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField] ?? ''
    let vb = b[sortField] ?? ''
    if (sortField === 'score_risque' || sortField === 'loyalty_score') {
      va = Number(va) || 0
      vb = Number(vb) || 0
    } else {
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <span style={{ color: '#6b7280', fontSize: 10, marginLeft: 4 }}>↕</span>
    return <span style={{ color: '#60a5fa', fontSize: 10, marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const thStyle = {
    padding: '14px 16px', textAlign: 'left', color: 'white',
    fontSize: '12px', fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none',
    whiteSpace: 'nowrap'
  }

  return (
    <div style={{ padding: '32px', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#080808', margin: 0 }}>Clients</h1>
        <button
          onClick={() => navigate('/clients/new')}
          style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
        >
          + Nouveau client
        </button>
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1) }}
            style={{
              padding: '7px 16px', border: 'none', borderRadius: 7, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: statusFilter === tab.key ? '#080808' : 'transparent',
              color: statusFilter === tab.key ? 'white' : '#6b7280'
            }}
          >
            {tab.label}
            {tab.key !== 'tous' && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                ({safeClients.filter(c => tab.key === 'résilié' ? ['résilié', 'resilié', 'perdu'].includes((c.statut || '').toLowerCase()) : (c.statut || '').toLowerCase() === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, minWidth: 200, padding: '10px 12px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#080808' }}
        />
        <select
          value={riskFilter}
          onChange={e => { setRiskFilter(e.target.value); setPage(1) }}
          style={{ padding: '10px 12px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#080808', cursor: 'pointer' }}
        >
          <option value="tous">Tous les risques</option>
          <option value="faible">Faible (0-30)</option>
          <option value="modere">Modéré (31-60)</option>
          <option value="eleve">Élevé (61-100)</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: 16 }}>
          Chargement des clients...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 16, color: '#dc2626', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchClients} style={{ padding: '6px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Réessayer</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && paginated.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280', fontSize: 14 }}>
          Aucun client trouvé
        </div>
      )}

      {/* Table */}
      {!loading && !error && paginated.length > 0 && (
        <>
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#080808' }}>
                  <th style={thStyle} onClick={() => toggleSort('nom')}>
                    Nom & Prénom <SortIcon field="nom" />
                  </th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Téléphone</th>
                  <th style={thStyle} onClick={() => toggleSort('statut')}>
                    Statut <SortIcon field="statut" />
                  </th>
                  <th style={thStyle} onClick={() => toggleSort('score_risque')}>
                    Score risque <SortIcon field="score_risque" />
                  </th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((client, idx) => {
                  if (!client?.id) return null
                  return (
                    <tr
                      key={`client-${client.id}`}
                      style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                      onClick={() => navigate(`/client/${client.id}`)}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'white' : '#f9fafb'}
                    >
                      <td style={{ padding: '14px 16px', color: '#080808', fontSize: 14, fontWeight: 600 }}>
                        {client.nom || '—'} {client.prenom || ''}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: 13 }}>
                        {client.email || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: 13 }}>
                        {client.telephone || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge status={client.statut} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <RiskScoreBadge score={client.score_risque} />
                      </td>
                      <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/client/${client.id}`)}
                          style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, backgroundColor: page === 1 ? '#f3f4f6' : 'white', color: page === 1 ? '#9ca3af' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: 14, color: '#6b7280', fontWeight: 600 }}>
                Page {page} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, backgroundColor: page === totalPages ? '#f3f4f6' : 'white', color: page === totalPages ? '#9ca3af' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                Suivant →
              </button>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
            {sorted.length} client{sorted.length > 1 ? 's' : ''} trouvé{sorted.length > 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}
