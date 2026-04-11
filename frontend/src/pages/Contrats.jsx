import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

const STATUS_TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'en attente', label: 'En attente' },
  { key: 'résilié', label: 'Résiliés' },
]

export default function Contrats() {
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [sortField, setSortField] = useState('date_echeance')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const PER_PAGE = 20

  useEffect(() => { fetchContrats() }, [])

  const fetchContrats = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      if (!token) { setError('Pas de token trouvé'); setContrats([]); return }
      const res = await fetch(`${API_URL}/api/contrats`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let arr = []
      if (Array.isArray(data)) arr = data
      else if (data?.data && Array.isArray(data.data)) arr = data.data
      else if (data?.contrats && Array.isArray(data.contrats)) arr = data.contrats
      setContrats(arr)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(`Impossible de charger les contrats : ${err.message}`)
      setContrats([])
    } finally {
      setLoading(false)
    }
  }

  const safeContrats = Array.isArray(contrats) ? contrats : []

  const filtered = safeContrats.filter(c => {
    if (!c || typeof c !== 'object') return false
    const status = (c.statut || c.status || '').toLowerCase()
    const type = (c.type_contrat || c.type || '').toLowerCase()
    const matchStatus = statusFilter === 'tous' || status === statusFilter.toLowerCase()
    const matchType = typeFilter === 'tous' || type === typeFilter.toLowerCase()
    return matchStatus && matchType
  })

  // Sort — default: date_echeance ASC (soonest first)
  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField] ?? a[sortField === 'date_echeance' ? 'echeance' : sortField] ?? ''
    let vb = b[sortField] ?? b[sortField === 'date_echeance' ? 'echeance' : sortField] ?? ''
    if (sortField === 'prime_annuelle' || sortField === 'prime') {
      va = Number(va) || 0; vb = Number(vb) || 0
    } else if (sortField === 'date_echeance') {
      va = va ? new Date(va).getTime() : Infinity
      vb = vb ? new Date(vb).getTime() : Infinity
    } else {
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase()
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

  const getStatusStyle = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'actif') return { bg: '#dcfce7', color: '#166534', label: 'Actif' }
    if (s === 'résilié' || s === 'resilié' || s === 'resilie') return { bg: '#fee2e2', color: '#991b1b', label: 'Résilié' }
    if (s === 'en attente') return { bg: '#fef3c7', color: '#92400e', label: 'En attente' }
    return { bg: '#f3f4f6', color: '#6b7280', label: status || 'Inconnu' }
  }

  const formatEuros = v => {
    if (!v && v !== 0) return '—'
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0)
  }

  const formatDate = d => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' }
  }

  const getDaysLeft = d => {
    if (!d) return null
    try {
      const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24))
      return diff > 0 ? diff : null
    } catch { return null }
  }

  const thStyle = {
    padding: '14px 16px', textAlign: 'left', color: 'white',
    fontSize: '12px', fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap'
  }

  return (
    <div style={{ padding: '32px', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#080808', margin: 0 }}>Contrats</h1>
        <button
          onClick={() => navigate('/contrats/new')}
          style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          + Nouveau contrat
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
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div style={{ marginBottom: 20 }}>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          style={{ padding: '10px 12px', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#080808', cursor: 'pointer' }}
        >
          <option value="tous">Tous les types</option>
          <option value="auto">Auto</option>
          <option value="habitation">Habitation</option>
          <option value="mutuelle">Mutuelle</option>
          <option value="rc">RC Pro</option>
          <option value="prévoyance">Prévoyance</option>
          <option value="décennale">Décennale</option>
        </select>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#6b7280', fontSize: 16 }}>Chargement des contrats...</div>}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 16, color: '#dc2626', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchContrats} style={{ padding: '6px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Réessayer</button>
        </div>
      )}

      {!loading && !error && paginated.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280', fontSize: 14 }}>Aucun contrat trouvé</div>
      )}

      {!loading && !error && paginated.length > 0 && (
        <>
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#080808' }}>
                  <th style={{ ...thStyle, cursor: 'default' }}>Client</th>
                  <th style={thStyle} onClick={() => toggleSort('type_contrat')}>Type <SortIcon field="type_contrat" /></th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Compagnie</th>
                  <th style={thStyle} onClick={() => toggleSort('prime_annuelle')}>Prime <SortIcon field="prime_annuelle" /></th>
                  <th style={thStyle} onClick={() => toggleSort('date_effet')}>Date effet <SortIcon field="date_effet" /></th>
                  <th style={thStyle} onClick={() => toggleSort('date_echeance')}>Échéance <SortIcon field="date_echeance" /></th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Statut</th>
                  <th style={{ ...thStyle, cursor: 'default' }}>Urgence</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((contrat, idx) => {
                  if (!contrat?.id) return null
                  const st = getStatusStyle(contrat.statut || contrat.status)
                  const daysLeft = getDaysLeft(contrat.date_echeance || contrat.echeance)
                  return (
                    <tr key={`contrat-${contrat.id}`}
                      style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '14px 16px', color: '#080808', fontSize: 14, fontWeight: 600 }}>
                        {contrat.client_nom || contrat.nom_client || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151', fontSize: 13, fontWeight: 500 }}>
                        {contrat.type_contrat || contrat.type || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: 13 }}>
                        {contrat.compagnie || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#080808', fontSize: 13, fontWeight: 500 }}>
                        {formatEuros(contrat.prime_annuelle || contrat.prime)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: 13 }}>
                        {formatDate(contrat.date_effet || contrat.debut)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: 13 }}>
                        {formatDate(contrat.date_echeance || contrat.echeance)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ backgroundColor: st.bg, color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13 }}>
                        {daysLeft !== null && daysLeft <= 90 ? (
                          <span style={{ color: daysLeft <= 30 ? '#dc2626' : '#d97706', fontWeight: 700 }}>
                            ⚠️ J-{daysLeft}
                          </span>
                        ) : (
                          <span style={{ color: '#d1d5db' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, backgroundColor: page === 1 ? '#f3f4f6' : 'white', color: page === 1 ? '#9ca3af' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: 14, color: '#6b7280', fontWeight: 600 }}>Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, backgroundColor: page === totalPages ? '#f3f4f6' : 'white', color: page === totalPages ? '#9ca3af' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                Suivant →
              </button>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
            {sorted.length} contrat{sorted.length > 1 ? 's' : ''} trouvé{sorted.length > 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}
