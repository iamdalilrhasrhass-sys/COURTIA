import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

const STATUS_TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'résilié', label: 'Résiliés' },
]

const Avatar = ({ name }) => {
  const getInitials = (name) => {
    const names = (name || '').trim().split(' ').filter(Boolean)
    if (names.length === 0) return '?'
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }

  const getBgColor = (name) => {
    if (!name) return 'bg-gray-500'
    const colors = [
      'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 
      'bg-green-400', 'bg-teal-400', 'bg-cyan-400', 'bg-blue-400', 
      'bg-indigo-400', 'bg-purple-400', 'bg-pink-400'
    ]
    let hash = 0; if (!name) return colors[0];
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const clientName = name || ''
  const initials = getInitials(clientName)
  const bgColorClass = getBgColor(clientName)

  return (
    <div className={`w-8 h-8 rounded-full ${bgColorClass} text-white flex items-center justify-center text-sm font-semibold`}>
      {initials}
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  let colorClasses = 'bg-gray-100 text-gray-700'
  let label = 'Inconnu'

  if (s === 'actif') {
    colorClasses = 'bg-green-100 text-green-700'; label = 'Actif'
  } else if (s === 'prospect') {
    colorClasses = 'bg-blue-100 text-blue-700'; label = 'Prospect'
  } else if (['résilié', 'resilié', 'perdu', 'inactif'].includes(s)) {
    colorClasses = 'bg-gray-100 text-gray-700'
    label = 'Inactif'
    if (s.includes('résilié') || s.includes('resilié')) label = 'Résilié'
  }

  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full inline-block ${colorClasses}`}>
      {label}
    </span>
  )
}

const RiskScoreBadge = ({ score }) => {
  const s = Math.min(100, Math.max(0, Number(score) || 0))
  let colorClass = 'bg-green-500' // Faible
  if (s > 60) colorClass = 'bg-red-500' // Élevé
  else if (s > 30) colorClass = 'bg-yellow-500' // Modéré

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-200 rounded-full h-1.5">
        <div className={`${colorClass} h-1.5 rounded-full`} style={{ width: `${s}%` }}></div>
      </div>
      <span className="text-xs font-semibold text-gray-600 w-6 text-right">{s}</span>
    </div>
  )
}

function SortIcon({ field, active, dir }) {
  if (!active) return <span className="text-gray-300 text-[9px] ml-1">↕</span>
  return <span className="text-blue-400 text-[9px] ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
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
      const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
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

  const thClass = "px-4 py-3 text-left text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap bg-[#0a0a0a] select-none"

  const topbarAction = (
    <button onClick={() => navigate('/clients/new')}
      className="px-4 py-2 bg-[#0a0a0a] text-white border-none rounded-lg text-sm font-medium cursor-pointer font-sans hover:bg-gray-800">
      + Nouveau client
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Topbar title="Clients" subtitle={`${safe.length} client${safe.length > 1 ? 's' : ''} au total`} action={topbarAction} />

      <div className="p-8">

        {/* Tabs statut */}
        <div className="flex gap-1 mb-4 bg-white border border-stone-200 rounded-xl p-1 w-fit shadow-sm">
          {STATUS_TABS.map(tab => {
            const count = tab.key === 'tous' ? safe.length
              : tab.key === 'résilié' ? safe.filter(c => ['résilié', 'resilié', 'perdu'].includes((c.statut || '').toLowerCase())).length
              : safe.filter(c => (c.statut || '').toLowerCase() === tab.key).length
            return (
              <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                className={`px-4 py-1.5 border-none rounded-lg cursor-pointer text-xs font-semibold font-sans transition-all duration-100 ${statusFilter === tab.key ? 'bg-black text-white' : 'bg-transparent text-gray-400 hover:bg-gray-100'}`}>
                {tab.label} <span className="opacity-60 text-xs">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Search + risk filter */}
        <div className="flex gap-4 mb-4">
          <input type="text" placeholder="Rechercher par nom, prénom, email..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 max-w-sm px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-black font-sans shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          <select value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-black cursor-pointer font-sans shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
            <option value="tous">Tous les risques</option>
            <option value="faible">Faible (0-30)</option>
            <option value="modere">Modéré (31-60)</option>
            <option value="eleve">Élevé (61+)</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4 text-red-600 text-sm flex justify-between items-center shadow-sm">
            <span>{error}</span>
            <button onClick={fetchClients} className="px-3 py-1 bg-red-600 text-white border-none rounded-md cursor-pointer text-xs hover:bg-red-700">Réessayer</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12 text-gray-400 text-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-stone-200 border-t-black rounded-full animate-spin" />
              Chargement...
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && paginated.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Aucun client trouvé pour les filtres actuels.
          </div>
        )}

        {/* Table */}
        {!loading && !error && paginated.length > 0 && (
          <>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className={`${thClass} cursor-pointer`} onClick={() => toggleSort('nom')}>
                      Client <SortIcon field="nom" active={sortField === 'nom'} dir={sortDir} />
                    </th>
                    <th className={thClass}>Email</th>
                    <th className={thClass}>Téléphone</th>
                    <th className={`${thClass} cursor-pointer`} onClick={() => toggleSort('statut')}>
                      Statut <SortIcon field="statut" active={sortField === 'statut'} dir={sortDir} />
                    </th>
                    <th className={`${thClass} cursor-pointer`} onClick={() => toggleSort('score_risque')}>
                      Risque <SortIcon field="score_risque" active={sortField === 'score_risque'} dir={sortDir} />
                    </th>
                    <th className={thClass}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((client) => {
                    if (!client?.id) return null
                    return (
                      <tr key={client.id}
                        className="border-b border-stone-100 last:border-b-0 hover:bg-blue-50 cursor-pointer"
                        onClick={() => navigate(`/client/${client.id}`)}>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${client.prenom || ''} ${client.nom || ''}`} />
                            <span>{client.nom || '—'} {client.prenom || ''}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{client.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{client.telephone || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={client.statut} /></td>
                        <td className="px-4 py-3"><RiskScoreBadge score={client.score_risque} /></td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => navigate(`/client/${client.id}`)}
                            className="px-3 py-1 bg-white text-blue-600 border border-blue-200 rounded-md cursor-pointer text-xs font-semibold hover:bg-blue-50 hover:border-blue-300">
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
              <div className="flex justify-center items-center gap-2 mt-5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3.5 py-1.5 border border-stone-200 rounded-md bg-white text-sm text-black cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm">
                  ← Précédent
                </button>
                <span className="px-3.5 py-1.5 text-sm text-gray-500">Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3.5 py-1.5 border border-stone-200 rounded-md bg-white text-sm text-black cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm">
                  Suivant →
                </button>
              </div>
            )}
            <p className="text-center text-xs text-gray-400 mt-3">
              {sorted.length} client{sorted.length > 1 ? 's' : ''} correspondant aux filtres
            </p>
          </>
        )}
      </div>
    </div>
  )
}
