import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const PER_PAGE = 20

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
      setClients(arr || [])
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Impossible de charger les clients')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const safeClients = Array.isArray(clients) ? clients : []
  
  const filtered = safeClients.filter(c => {
    if (!c) return false
    const nom = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    const email = (c.email || '').toLowerCase()
    const searchLower = search.toLowerCase()
    const matchSearch = nom.includes(searchLower) || email.includes(searchLower)
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const score = Number(c.risk_score) || 0
    const matchRisk = riskFilter === 'all'
      || (riskFilter === 'Faible' && score <= 30)
      || (riskFilter === 'Modéré' && score > 30 && score <= 60)
      || (riskFilter === 'Élevé' && score > 60)
    return matchSearch && matchStatus && matchRisk
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const getStatusColor = (status) => {
    if (status === 'actif') return { bg: '#dcfce7', color: '#166534' }
    if (status === 'prospect') return { bg: '#fef9c3', color: '#854d0e' }
    return { bg: '#f3f4f6', color: '#6b7280' }
  }

  const getRiskColor = (score) => {
    const s = Number(score) || 0
    if (s > 60) return { bg: '#fee2e2', color: '#991b1b' }
    if (s > 30) return { bg: '#fed7aa', color: '#92400e' }
    return { bg: '#dcfce7', color: '#166534' }
  }

  return (
    <div style={{ padding: '32px', marginLeft: '260px', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#080808', margin: 0, fontFamily: 'Arial, sans-serif' }}>
          Clients
        </h1>
        <button
          onClick={() => navigate('/clients/new')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          + Nouveau client
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '10px 12px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#080808'
          }}
        />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 12px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#080808',
            cursor: 'pointer'
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="prospect">Prospect</option>
          <option value="inactif">Inactif</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          style={{
            padding: '10px 12px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#080808',
            cursor: 'pointer'
          }}
        >
          <option value="all">Tous risques</option>
          <option value="Faible">Faible (0-30)</option>
          <option value="Modéré">Modéré (31-60)</option>
          <option value="Élevé">Élevé (61-100)</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Chargement...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>{error}</div>
      ) : paginated.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Aucun client trouvé</div>
      ) : (
        <>
          {/* Table */}
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#080808' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Nom & Prénom</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Téléphone</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Statut</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Score risque</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((client, idx) => {
                if (!client || !client.id) return null
                const statusStyle = getStatusColor(client.status)
                const riskStyle = getRiskColor(client.risk_score)
                const bgColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                return (
                  <tr key={client.id} style={{ backgroundColor: bgColor, borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', color: '#080808', fontSize: '14px' }}>
                      {client.first_name} {client.last_name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>
                      {client.email || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>
                      {client.phone || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}>
                        {client.status || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: riskStyle.bg,
                        color: riskStyle.color,
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}>
                        {client.risk_score || 0}/100
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <button
                        onClick={() => navigate(`/client/${client.id}`)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: page === 1 ? '#f3f4f6' : 'white', color: page === 1 ? '#9ca3af' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '14px' }}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#6b7280' }}>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: page === totalPages ? '#f3f4f6' : 'white', color: page === totalPages ? '#9ca3af' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '14px' }}
              >
                Suivant →
              </button>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af', marginTop: '12px' }}>
            {filtered.length} client{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}
