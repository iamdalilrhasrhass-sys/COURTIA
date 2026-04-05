import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

export default function Contrats() {
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchContrats()
  }, [])

  const fetchContrats = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/contrats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setContrats(data)
    } catch (err) {
      console.error('Error:', err)
      toast.error('Erreur chargement contrats')
    } finally {
      setLoading(false)
    }
  }

  const filteredContrats = (contrats || []).filter(c => {
    const matchesStatus = statusFilter === 'all' || c.statut === statusFilter
    const matchesType = typeFilter === 'all' || c.type_contrat === typeFilter
    return matchesStatus && matchesType
  })

  const totalPages = Math.ceil(filteredContrats.length / itemsPerPage)
  const paginatedContrats = filteredContrats.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  const getStatusStyle = (status) => {
    if (status === 'actif') return { bg: '#dcfce7', color: '#166534' }
    if (status === 'resilié') return { bg: '#fee2e2', color: '#991b1b' }
    return { bg: '#fed7aa', color: '#92400e' }
  }

  const getDaysUntilExpiry = (dateStr) => {
    if (!dateStr) return null
    const today = new Date()
    const expiry = new Date(dateStr)
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return daysLeft
  }

  const formatEuros = (value) => {
    if (!value) return '-'
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
  }

  return (
    <div style={{ padding: '32px', marginLeft: '260px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#080808', margin: 0, fontFamily: 'Arial, sans-serif' }}>
          Contrats
        </h1>
        <button
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
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
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
          <option value="résilié">Résilié</option>
          <option value="en attente">En attente</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
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
          <option value="all">Tous les types</option>
          <option value="Auto">Auto</option>
          <option value="Habitation">Habitation</option>
          <option value="Mutuelle">Mutuelle</option>
          <option value="RC Pro">RC Pro</option>
          <option value="Prévoyance">Prévoyance</option>
          <option value="Décennale">Décennale</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Chargement...</div>
      ) : paginatedContrats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Aucun contrat trouvé</div>
      ) : (
        <>
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
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Client</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Compagnie</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Prime annuelle</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Date effet</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Échéance</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Statut</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: '600' }}>Urgence</th>
              </tr>
            </thead>
            <tbody>
              {paginatedContrats.map((contrat, idx) => {
                const statusStyle = getStatusStyle(contrat.statut)
                const daysLeft = getDaysUntilExpiry(contrat.date_echeance)
                const isUrgent = daysLeft && daysLeft > 0 && daysLeft <= 30
                const bgColor = idx % 2 === 0 ? 'white' : '#f9fafb'
                return (
                  <tr key={contrat.id} style={{ backgroundColor: bgColor, borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', color: '#080808', fontSize: '14px' }}>
                      {contrat.client_nom} {contrat.client_prenom}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#080808', fontSize: '14px' }}>
                      {contrat.type_contrat}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>
                      {contrat.compagnie}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#080808', fontSize: '14px', fontWeight: '600' }}>
                      {formatEuros(contrat.prime_annuelle)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>
                      {contrat.date_effet ? new Date(contrat.date_effet).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>
                      {contrat.date_echeance ? new Date(contrat.date_echeance).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}>
                        {contrat.statut}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      {isUrgent ? (
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}>
                          ⚠️ J-{daysLeft}
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: page === 1 ? '#e5e7eb' : '#2563eb',
                  color: page === 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                ← Précédent
              </button>
              <span style={{ color: '#6b7280', alignSelf: 'center', fontSize: '14px' }}>
                Page {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: page === totalPages ? '#e5e7eb' : '#2563eb',
                  color: page === totalPages ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
