import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [riskFilter, setRiskFilter] = useState('tous')
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
      if (!token) {
        setError('Pas de token trouvé')
        setClients([])
        return
      }
      const res = await fetch(`${API_URL}/api/clients`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      // Sécurisation complète de la réponse
      let clientsArray = []
      if (Array.isArray(data)) {
        clientsArray = data
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        clientsArray = data.data
      } else if (data && typeof data === 'object' && Array.isArray(data.clients)) {
        clientsArray = data.clients
      }
      
      // Double check qu'on a bien un array
      setClients(Array.isArray(clientsArray) ? clientsArray : [])
    } catch (err) {
      console.error('Fetch error:', err)
      setError(`Impossible de charger les clients: ${err.message}`)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  // Sécurisation: garantir que clients est toujours un array
  const safeClients = Array.isArray(clients) ? clients : []
  
  const filtered = safeClients.filter(c => {
    if (!c || typeof c !== 'object') return false
    const nom = `${c.nom || ''} ${c.prenom || ''}`.toLowerCase()
    const email = (c.email || '').toLowerCase()
    const searchLower = search.toLowerCase()
    const matchSearch = nom.includes(searchLower) || email.includes(searchLower)
    const matchStatus = statusFilter === 'tous' || (c.statut || '').toLowerCase() === statusFilter.toLowerCase()
    const score = Number(c.score_risque) || 0
    const matchRisk = riskFilter === 'tous'
      || (riskFilter === 'faible' && score <= 30)
      || (riskFilter === 'modere' && score > 30 && score <= 60)
      || (riskFilter === 'eleve' && score > 60)
    return matchSearch && matchStatus && matchRisk
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'actif') return { bg: '#dcfce7', color: '#166534', label: 'Actif' }
    if (s === 'prospect') return { bg: '#fef9c3', color: '#854d0e', label: 'Prospect' }
    return { bg: '#f3f4f6', color: '#6b7280', label: 'Inactif' }
  }

  const getRiskColor = (score) => {
    const s = Number(score) || 0
    if (s > 60) return { bg: '#fee2e2', color: '#dc2626', label: `${s}/100` }
    if (s > 30) return { bg: '#fed7aa', color: '#92400e', label: `${s}/100` }
    return { bg: '#dcfce7', color: '#166534', label: `${s}/100` }
  }

  return (
    <div style={{ padding: '32px', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#080808', margin: 0 }}>
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
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '10px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#080808'
          }}
        />
        
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          style={{
            padding: '10px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#080808',
            cursor: 'pointer'
          }}
        >
          <option value="tous">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="prospect">Prospect</option>
          <option value="inactif">Inactif</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value); setPage(1) }}
          style={{
            padding: '10px 12px',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#080808',
            cursor: 'pointer'
          }}
        >
          <option value="tous">Tous les risques</option>
          <option value="faible">Faible (0-30)</option>
          <option value="modere">Modéré (31-60)</option>
          <option value="eleve">Élevé (61-100)</option>
        </select>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '16px' }}>
          Chargement des clients...
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {!loading && !error && paginated.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '14px' }}>
          Aucun client trouvé
        </div>
      )}

      {!loading && !error && paginated.length > 0 && (
        <>
          {/* Table */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#080808' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom & Prénom</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Téléphone</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score risque</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(paginated) && paginated.length > 0 && paginated.map((client, idx) => {
                  if (!client || !client.id) return null
                  const statusColor = getStatusColor(client.statut)
                  const riskColor = getRiskColor(client.score_risque)
                  const bgColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                  return (
                    <tr key={`client-${client.id}`} style={{ backgroundColor: bgColor, borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '14px 16px', color: '#080808', fontSize: '14px', fontWeight: '600' }}>
                        {client.nom || '—'} {client.prenom || ''}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                        {client.email || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                        {client.telephone || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.color,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {statusColor.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          backgroundColor: riskColor.bg,
                          color: riskColor.color,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {riskColor.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => navigate(`/client/${client.id}`)}
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '6px 14px',
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ 
                  padding: '8px 16px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  backgroundColor: page === 1 ? '#f3f4f6' : 'white', 
                  color: page === 1 ? '#9ca3af' : '#374151', 
                  cursor: page === 1 ? 'not-allowed' : 'pointer', 
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ← Précédent
              </button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ 
                  padding: '8px 16px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  backgroundColor: page === totalPages ? '#f3f4f6' : 'white', 
                  color: page === totalPages ? '#9ca3af' : '#374151', 
                  cursor: page === totalPages ? 'not-allowed' : 'pointer', 
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Suivant →
              </button>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af', marginTop: '16px' }}>
            {filtered.length} client{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}
