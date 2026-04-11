import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import StatusBadge from '../components/StatusBadge'
import RiskScoreBadge from '../components/RiskScoreBadge'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

const STATUS_TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'résilié', label: 'Résiliés' },
]

function SortIcon({ field, active, dir }) {
  if (!active) return <span style={{ color: '#d1d5db', fontSize: 9, marginLeft: 4 }}>↕</span>
  return <span style={{ color: '#60a5fa', fontSize: 9, marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

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

  async function fetchClients() {
    try {
      setLoading(true); setError('')
      const token = localStorage.getItem('token')
      if (!token) { setError('Token manquant'); return }
      const res = await fetch(`${API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let arr = Array.isArray(data) ? data : (data?.data || data?.clients || [])
      setClients(arr)
    } catch (err) {
      setError(`Impossible de charger les clients : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const safe = Array.isArray(clients) ? clients : []

  const filtered = safe.filter(c => {
    if (!c) return false
    const s = search.toLowerCase()
    const matchSearch = !s || `${c.nom || ''} ${c.prenom || ''}`.toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s)
    const st = (c.statut || '').toLowerCase()
    const matchStatus = statusFilter === 'tous'
      || (statusFilter === 'résilié' ? ['résilié', 'resilié', 'perdu'].includes(st) : st === statusFilter)
    const score = Number(c.score_risque) || 0
    const matchRisk = riskFilter === 'tous'
      || (riskFilter === 'faible' && score <= 30)
      || (riskFilter === 'modere' && score > 30 && score <= 60)
      || (riskFilter === 'eleve' && score > 60)
    return matchSearch && matchStatus && matchRisk
  })

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField] ?? '', vb = b[sortField] ?? ''
    if (sortField === 'score_risque') { va = Number(va) || 0; vb = Number(vb) || 0 }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase() }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function toggleSort(f) {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('asc') }
    setPage(1)
  }

  const thStyle = (f) => ({
    padding: '11px 16px', textAlign: 'left', color: 'white',
    fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px',
    cursor: f ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap', background: '#0a0a0a'
  })

  const topbarAction = (
    <button onClick={() => navigate('/clients/new')}
      style={{ padding: '9px 18px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
      + Nouveau client
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2' }}>
      <Topbar title="Clients" subtitle={`${safe.length} client${safe.length > 1 ? 's' : ''} au total`} action={topbarAction} />

      <div style={{ padding: '24px 32px' }}>

        {/* Tabs statut */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {STATUS_TABS.map(tab => {
            const count = tab.key === 'tous' ? safe.length
              : tab.key === 'résilié' ? safe.filter(c => ['résilié', 'resilié', 'perdu'].includes((c.statut || '').toLowerCase())).length
              : safe.filter(c => (c.statut || '').toLowerCase() === tab.key).length
            return (
              <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                style={{
                  padding: '7px 14px', border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'Arial, sans-serif', transition: 'all 0.1s',
                  background: statusFilter === tab.key ? '#0a0a0a' : 'transparent',
                  color: statusFilter === tab.key ? 'white' : '#9ca3af'
                }}>
                {tab.label} <span style={{ opacity: 0.6, fontSize: 11 }}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Search + risk filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ flex: 1, maxWidth: 360, padding: '10px 14px', background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 8, fontSize: 13, color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }} />
          <select value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1) }}
            style={{ padding: '10px 12px', background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 8, fontSize: 13, color: '#0a0a0a', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
            <option value="tous">Tous les risques</option>
            <option value="faible">Faible (0-30)</option>
            <option value="modere">Modéré (31-60)</option>
            <option value="eleve">Élevé (61+)</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={fetchClients} style={{ padding: '5px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Réessayer</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, border: '2px solid #e8e6e0', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Chargement...
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && paginated.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>
            Aucun client trouvé
          </div>
        )}

        {/* Table */}
        {!loading && !error && paginated.length > 0 && (
          <>
            <div style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle('nom')} onClick={() => toggleSort('nom')}>
                      Nom & Prénom <SortIcon field="nom" active={sortField === 'nom'} dir={sortDir} />
                    </th>
                    <th style={thStyle(null)}>Email</th>
                    <th style={thStyle(null)}>Téléphone</th>
                    <th style={thStyle('statut')} onClick={() => toggleSort('statut')}>
                      Statut <SortIcon field="statut" active={sortField === 'statut'} dir={sortDir} />
                    </th>
                    <th style={thStyle('score_risque')} onClick={() => toggleSort('score_risque')}>
                      Risque <SortIcon field="score_risque" active={sortField === 'score_risque'} dir={sortDir} />
                    </th>
                    <th style={{ ...thStyle(null), cursor: 'default' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((client, idx) => {
                    if (!client?.id) return null
                    const bg = idx % 2 === 0 ? 'white' : '#fafaf8'
                    return (
                      <tr key={client.id}
                        style={{ borderBottom: '0.5px solid #f7f6f2', background: bg, cursor: 'pointer' }}
                        onClick={() => navigate(`/client/${client.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f8ff'}
                        onMouseLeave={e => e.currentTarget.style.background = bg}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>
                          {client.nom || '—'} {client.prenom || ''}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af' }}>{client.email || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af' }}>{client.telephone || '—'}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={client.statut} /></td>
                        <td style={{ padding: '12px 16px' }}><RiskScoreBadge score={client.score_risque} /></td>
                        <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => navigate(`/client/${client.id}`)}
                            style={{ padding: '5px 12px', background: 'white', color: '#2563eb', border: '0.5px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            Voir →
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
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '7px 14px', border: '0.5px solid #e8e6e0', borderRadius: 7, background: 'white', color: page === 1 ? '#d1d5db' : '#0a0a0a', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  ← Précédent
                </button>
                <span style={{ padding: '7px 14px', fontSize: 13, color: '#9ca3af' }}>Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '7px 14px', border: '0.5px solid #e8e6e0', borderRadius: 7, background: 'white', color: page === totalPages ? '#d1d5db' : '#0a0a0a', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                  Suivant →
                </button>
              </div>
            )}
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
              {sorted.length} client{sorted.length > 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
