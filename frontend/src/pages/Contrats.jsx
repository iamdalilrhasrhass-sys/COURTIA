import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

export default function Contrats() {
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const PER_PAGE = 20

  useEffect(() => {
    fetchContrats()
  }, [])

  const fetchContrats = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Pas de token trouvé')
        setContrats([])
        return
      }
      const res = await fetch(`${API_URL}/api/contrats`, {
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
      let contratsArray = []
      if (Array.isArray(data)) {
        contratsArray = data
      } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
        contratsArray = data.data
      } else if (data && typeof data === 'object' && Array.isArray(data.contrats)) {
        contratsArray = data.contrats
      }
      
      setContrats(Array.isArray(contratsArray) ? contratsArray : [])
    } catch (err) {
      console.error('Fetch error:', err)
      setError(`Impossible de charger les contrats: ${err.message}`)
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = Array.isArray(filtered) ? filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE) : []

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'actif') return { bg: '#dcfce7', color: '#166534', label: 'Actif' }
    if (s === 'résilié' || s === 'resilié') return { bg: '#fee2e2', color: '#991b1b', label: 'Résilié' }
    return { bg: '#fed7aa', color: '#92400e', label: 'En attente' }
  }

  const formatEuros = (value) => {
    if (!value && value !== 0) return '—'
    const n = Number(value) || 0
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR')
    } catch {
      return '—'
    }
  }

  const getDaysUntilExpiry = (dateStr) => {
    if (!dateStr) return null
    try {
      const today = new Date()
      const expiry = new Date(dateStr)
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
      return daysLeft > 0 ? daysLeft : null
    } catch {
      return null
    }
  }

  return (
    <div style={{ padding: '32px', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#080808', margin: 0 }}>
          Contrats
        </h1>
        <button
          onClick={() => navigate('/contrats/new')}
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
          + Nouveau contrat
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
          <option value="résilié">Résilié</option>
          <option value="en attente">En attente</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
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
          <option value="tous">Tous les types</option>
          <option value="auto">Auto</option>
          <option value="habitation">Habitation</option>
          <option value="mutuelle">Mutuelle</option>
          <option value="rc">RC Pro</option>
          <option value="prévoyance">Prévoyance</option>
          <option value="décennale">Décennale</option>
        </select>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '16px' }}>
          Chargement des contrats...
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {!loading && !error && paginated.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', fontSize: '14px' }}>
          Aucun contrat trouvé
        </div>
      )}

      {!loading && !error && paginated.length > 0 && (
        <>
          {/* Table */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#080808' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compagnie</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prime annuelle</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date effet</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Échéance</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', color: 'white', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Urgence</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(paginated) && paginated.length > 0 && paginated.map((contrat, idx) => {
                  if (!contrat || !contrat.id) return null
                  const statusColor = getStatusColor(contrat.statut || contrat.status)
                  const bgColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                  const daysLeft = getDaysUntilExpiry(contrat.date_echeance || contrat.echeance)
                  return (
                    <tr key={`contrat-${contrat.id}`} style={{ backgroundColor: bgColor, borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '14px 16px', color: '#080808', fontSize: '14px', fontWeight: '600' }}>
                        {contrat.client_nom || contrat.nom_client || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                        {contrat.type_contrat || contrat.type || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                        {contrat.compagnie || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#080808', fontSize: '13px', fontWeight: '500' }}>
                        {formatEuros(contrat.prime_annuelle || contrat.prime)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                        {formatDate(contrat.date_effet || contrat.debut)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                        {formatDate(contrat.date_echeance || contrat.echeance)}
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
                      <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                        {daysLeft !== null && daysLeft <= 30 && (
                          <span style={{ color: '#ea580c', fontWeight: '700' }}>
                            ⚠️ J-{daysLeft}
                          </span>
                        )}
                        {(!daysLeft || daysLeft > 30) && (
                          <span style={{ color: '#6b7280' }}>—</span>
                        )}
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
            {filtered.length} contrat{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}
