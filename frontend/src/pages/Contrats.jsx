import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

const STATUS_TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'en attente', label: 'En attente' },
  { key: 'résilié', label: 'Résiliés' },
]

function StatusPill({ status }) {
  const s = (status || '').toLowerCase()
  let bg, color, label
  if (s === 'actif') { bg = '#dcfce7'; color = '#166534'; label = 'Actif' }
  else if (s === 'résilié' || s === 'resilié' || s === 'resilie') { bg = '#fee2e2'; color = '#991b1b'; label = 'Résilié' }
  else if (s === 'en attente') { bg = '#fef9c3'; color = '#854d0e'; label = 'En attente' }
  else { bg = '#f3f4f6'; color = '#6b7280'; label = status || '—' }
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color, whiteSpace: 'nowrap' }}>{label}</span>
}

function SortIcon({ field, active, dir }) {
  if (!active) return <span style={{ color: '#555', fontSize: 9, marginLeft: 4 }}>↕</span>
  return <span style={{ color: '#60a5fa', fontSize: 9, marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

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

  async function fetchContrats() {
    try {
      setLoading(true); setError('')
      const token = localStorage.getItem('token')
      if (!token) { setError('Token manquant'); return }
      const res = await fetch(`${API_URL}/api/contrats`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      let arr = Array.isArray(data) ? data : (data?.data || data?.contrats || [])
      setContrats(arr)
    } catch (err) {
      setError(`Impossible de charger les contrats : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const safe = Array.isArray(contrats) ? contrats : []

  const filtered = safe.filter(c => {
    if (!c) return false
    const st = (c.statut || c.status || '').toLowerCase()
    const ty = (c.type_contrat || c.type || '').toLowerCase()
    const matchStatus = statusFilter === 'tous' || st === statusFilter
    const matchType = typeFilter === 'tous' || ty === typeFilter
    return matchStatus && matchType
  })

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField] ?? a[sortField === 'date_echeance' ? 'echeance' : sortField] ?? ''
    let vb = b[sortField] ?? b[sortField === 'date_echeance' ? 'echeance' : sortField] ?? ''
    if (sortField === 'date_echeance') {
      va = va ? new Date(va).getTime() : Infinity
      vb = vb ? new Date(vb).getTime() : Infinity
    } else if (sortField === 'prime_annuelle') {
      va = Number(va) || 0; vb = Number(vb) || 0
    } else {
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase()
    }
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

  function fmtEur(v) { if (!v && v !== 0) return '—'; return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v) || 0) }
  function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('fr-FR') } catch { return '—' } }
  function getDaysLeft(d) { if (!d) return null; try { const diff = Math.ceil((new Date(d) - new Date()) / 86400000); return diff > 0 ? diff : null } catch { return null } }

  const thStyle = (f) => ({
    padding: '11px 16px', textAlign: 'left', color: 'white', background: '#0a0a0a',
    fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px',
    cursor: f ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap'
  })

  const topbarAction = (
    <button onClick={() => navigate('/contrats/new')}
      style={{ padding: '9px 18px', background: '#0a0a0a', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
      + Nouveau contrat
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2' }}>
      <Topbar title="Contrats" subtitle={`${safe.length} contrat${safe.length > 1 ? 's' : ''} au total`} action={topbarAction} />

      <div style={{ padding: '24px 32px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {STATUS_TABS.map(tab => (
            <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
              style={{
                padding: '7px 14px', border: 'none', borderRadius: 7, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'Arial, sans-serif',
                background: statusFilter === tab.key ? '#0a0a0a' : 'transparent',
                color: statusFilter === tab.key ? 'white' : '#9ca3af'
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div style={{ marginBottom: 16 }}>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            style={{ padding: '10px 12px', background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 8, fontSize: 13, color: '#0a0a0a', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
            <option value="tous">Tous les types</option>
            <option value="auto">Auto</option>
            <option value="habitation">Habitation</option>
            <option value="mutuelle">Mutuelle</option>
            <option value="rc pro">RC Pro</option>
            <option value="prévoyance">Prévoyance</option>
            <option value="décennale">Décennale</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={fetchContrats} style={{ padding: '5px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Réessayer</button>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13, flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, height: 28, border: '2px solid #e8e6e0', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Chargement...
          </div>
        )}

        {!loading && !error && paginated.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 13 }}>Aucun contrat trouvé</div>
        )}

        {!loading && !error && paginated.length > 0 && (
          <>
            <div style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle('client_nom')} onClick={() => toggleSort('client_nom')}>
                      Client <SortIcon field="client_nom" active={sortField === 'client_nom'} dir={sortDir} />
                    </th>
                    <th style={thStyle('type_contrat')} onClick={() => toggleSort('type_contrat')}>
                      Type <SortIcon field="type_contrat" active={sortField === 'type_contrat'} dir={sortDir} />
                    </th>
                    <th style={thStyle(null)}>Compagnie</th>
                    <th style={thStyle('prime_annuelle')} onClick={() => toggleSort('prime_annuelle')}>
                      Prime <SortIcon field="prime_annuelle" active={sortField === 'prime_annuelle'} dir={sortDir} />
                    </th>
                    <th style={thStyle('date_echeance')} onClick={() => toggleSort('date_echeance')}>
                      Échéance <SortIcon field="date_echeance" active={sortField === 'date_echeance'} dir={sortDir} />
                    </th>
                    <th style={thStyle(null)}>Statut</th>
                    <th style={thStyle(null)}>Urgence</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c, idx) => {
                    if (!c?.id) return null
                    const bg = idx % 2 === 0 ? 'white' : '#fafaf8'
                    const daysLeft = getDaysLeft(c.date_echeance || c.echeance)
                    const clientId = c.client_id
                    return (
                      <tr key={c.id} style={{ borderBottom: '0.5px solid #f7f6f2', background: bg }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#2563eb', cursor: clientId ? 'pointer' : 'default' }}
                          onClick={() => clientId && navigate(`/client/${clientId}`)}>
                          {c.client_nom || c.nom_client || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#0a0a0a', fontWeight: 500 }}>
                          {c.type_contrat || c.type || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af' }}>{c.compagnie || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#0a0a0a', fontWeight: 500 }}>
                          {fmtEur(c.prime_annuelle || c.prime)}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af' }}>
                          {fmtDate(c.date_echeance || c.echeance)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusPill status={c.statut || c.status} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {daysLeft !== null && daysLeft <= 90 ? (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                              background: daysLeft <= 15 ? '#fee2e2' : daysLeft <= 30 ? '#fef9c3' : '#fafaf8',
                              color: daysLeft <= 15 ? '#dc2626' : daysLeft <= 30 ? '#d97706' : '#9ca3af'
                            }}>
                              J-{daysLeft}
                            </span>
                          ) : <span style={{ color: '#d1d5db', fontSize: 13 }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '7px 14px', border: '0.5px solid #e8e6e0', borderRadius: 7, background: 'white', color: page === 1 ? '#d1d5db' : '#0a0a0a', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}>← Précédent</button>
                <span style={{ padding: '7px 14px', fontSize: 13, color: '#9ca3af' }}>Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '7px 14px', border: '0.5px solid #e8e6e0', borderRadius: 7, background: 'white', color: page === totalPages ? '#d1d5db' : '#0a0a0a', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}>Suivant →</button>
              </div>
            )}
            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>{sorted.length} contrat{sorted.length > 1 ? 's' : ''}</p>
          </>
        )}
      </div>
    </div>
  )
}
