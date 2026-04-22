import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronUp, ChevronDown, Eye, Pencil, Trash2, AlertCircle } from 'lucide-react'
import Topbar from '../components/Topbar'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'

const STATUS_TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'inactif', label: 'Inactifs' },
]

function timeAgo(dateString) {
  if (!dateString) return 'Jamais'
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return `il y a ${Math.floor(interval)} ans`
  
  interval = seconds / 2592000
  if (interval > 1) return `il y a ${Math.floor(interval)} mois`
  
  interval = seconds / 86400
  if (interval > 1) return `il y a ${Math.floor(interval)} jours`
  
  interval = seconds / 3600
  if (interval > 1) return `il y a ${Math.floor(interval)} heures`
  
  interval = seconds / 60
  if (interval > 1) return `il y a ${Math.floor(interval)} minutes`
  
  return `à l'instant`
}

const Avatar = ({ name }) => {
  const getInitials = (name) => {
    const names = (name || '').trim().split(' ').filter(Boolean)
    if (names.length === 0) return '?'
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  const clientName = name || ''
  const initials = getInitials(clientName)
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white flex items-center justify-center text-sm font-semibold">
      {initials}
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  let colorClasses = 'bg-gray-100 text-gray-700'
  let label = 'Inconnu'

  if (s === 'actif') {
    colorClasses = 'bg-emerald-100 text-emerald-700'; label = 'Actif'
  } else if (s === 'prospect') {
    colorClasses = 'bg-blue-100 text-blue-700'; label = 'Prospect'
  } else if (['résilié', 'resilié', 'perdu', 'inactif'].includes(s)) {
    colorClasses = 'bg-gray-100 text-gray-700'; label = 'Inactif'
  }

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colorClasses.replace('text', 'bg').replace('-100', '-500')}`}></span>
      {label}
    </span>
  )
}

const RiskScoreBadge = ({ score }) => {
  const s = Math.min(100, Math.max(0, Number(score) || 0))
  let colorClasses = 'from-emerald-500 to-green-500' // Faible
  if (s > 60) colorClasses = 'from-red-500 to-rose-500' // Élevé
  else if (s > 30) colorClasses = 'from-amber-500 to-orange-500' // Modéré

  return (
    <div className="flex items-center gap-3">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`bg-gradient-to-r ${colorClasses} h-2 rounded-full transition-all duration-500 ease-out`} style={{ width: `${s}%` }}></div>
      </div>
      <span className="text-sm font-bold text-gray-800 w-8 text-right">{s}</span>
    </div>
  )
}

const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronUp size={14} className="text-gray-300" />
  return dir === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />
}

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
        <div>
          <div className="w-24 h-4 bg-gray-200 rounded"></div>
          <div className="w-32 h-3 mt-1.5 bg-gray-200 rounded"></div>
        </div>
      </div>
    </td>
    <td className="p-5"><div className="w-20 h-5 bg-gray-200 rounded-full"></div></td>
    <td className="p-5"><div className="w-40 h-4 bg-gray-200 rounded"></div></td>
    <td className="p-5"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
    <td className="p-5"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
    <td className="p-5"><div className="flex gap-2"><div className="w-6 h-6 bg-gray-200 rounded"></div><div className="w-6 h-6 bg-gray-200 rounded"></div></div></td>
  </tr>
)

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
  const PER_PAGE = 15

  useEffect(() => { 
    // Fake loading for WOW effect on mount
    const timer = setTimeout(() => fetchClients(), 400);
    return () => clearTimeout(timer);
  }, [])

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
    const matchSearch = !s || `${c.nom || ''} ${c.prenom || ''}`.toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s) || (c.telephone || '').toLowerCase().includes(s)
    const st = (c.statut || '').toLowerCase()
    const matchStatus = statusFilter === 'tous'
      || (statusFilter === 'inactif' ? ['résilié', 'resilié', 'perdu', 'inactif'].includes(st) : st === statusFilter)
    const score = Number(c.score_risque) || 0
    const matchRisk = riskFilter === 'tous'
      || (riskFilter === 'faible' && score <= 30)
      || (riskFilter === 'modere' && score > 30 && score <= 60)
      || (riskFilter === 'eleve' && score > 60)
    return matchSearch && matchStatus && matchRisk
  })

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField] ?? '', vb = b[sortField] ?? ''
    if (['score_risque', 'created_at'].includes(sortField)) {
        if(sortField === 'score_risque') { va = Number(va) || 0; vb = Number(vb) || 0 }
        if(sortField === 'created_at') { va = new Date(va); vb = new Date(vb) }
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

  const thClass = "p-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider select-none"
  
  const topbarAction = (
    <button onClick={() => navigate('/clients/new')}
      className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-[#2563eb] hover:to-[#7c3aed] hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02]">
      <Plus size={16} />
      Nouveau client
    </button>
  )

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <Topbar title="Clients" subtitle={`${safe.length} client${safe.length > 1 ? 's' : ''} au total`} action={topbarAction} />

      <main className="p-8 animate-fade-in" style={{ animationDuration: '400ms' }}>
        
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Rechercher par nom, email, téléphone..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-black shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200" />
          </div>
          <div className="flex items-center gap-2">
            {STATUS_TABS.map(tab => {
                const count = tab.key === 'tous' ? safe.length
                : tab.key === 'inactif' ? safe.filter(c => ['résilié', 'resilié', 'perdu', 'inactif'].includes((c.statut || '').toLowerCase())).length
                : safe.filter(c => (c.statut || '').toLowerCase() === tab.key).length
              return (
                <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                  className={`px-4 py-2 border-none rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 ${statusFilter === tab.key ? 'bg-black text-white' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-black'}`}>
                  {tab.label} <span className="opacity-60 text-xs">({count})</span>
                </button>
              )
            })}
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-[#ef4444] text-sm flex items-center gap-3 shadow-lg shadow-red-500/10">
            <AlertCircle />
            <span>{error}</span>
            <button onClick={fetchClients} className="ml-auto px-3 py-1 bg-red-500 text-white rounded-lg cursor-pointer text-xs hover:bg-red-600 transition-colors">Réessayer</button>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg shadow-gray-500/5">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className={`${thClass} cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => toggleSort('nom')}>
                  <div className="flex items-center gap-1.5">Client <SortIcon active={sortField === 'nom'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => toggleSort('statut')}>
                  <div className="flex items-center gap-1.5">Statut <SortIcon active={sortField === 'statut'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => toggleSort('score_risque')}>
                  <div className="flex items-center gap-1.5">Score de risque <SortIcon active={sortField === 'score_risque'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} cursor-pointer hover:bg-gray-100 transition-colors`} onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center gap-1.5">Dernière activité <SortIcon active={sortField === 'created_at'} dir={sortDir} /></div>
                </th>
                <th className={thClass}><div className="text-right">Actions</div></th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              {!loading && paginated.map((client) => {
                if (!client?.id) return null
                return (
                  <tr key={client.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50/50 transition-all duration-200 ease-out cursor-pointer"
                    onClick={() => navigate(`/client/${client.id}`)}>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${client.prenom || ''} ${client.nom || ''}`} />
                        <div>
                          <p className="text-sm font-bold text-gray-800 tracking-tight">{client.nom || '—'} {client.prenom || ''}</p>
                          <p className="text-xs text-gray-500">{client.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5"><StatusBadge status={client.statut} /></td>
                    <td className="p-5"><RiskScoreBadge score={client.score_risque} /></td>
                    <td className="p-5 text-sm text-gray-500">{timeAgo(client.created_at)}</td>
                    <td className="p-5" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end items-center gap-1">
                          <button className="p-2 rounded-md hover:bg-gray-200 transition-colors text-gray-500 hover:text-black"><Eye size={16} /></button>
                          <button className="p-2 rounded-md hover:bg-gray-200 transition-colors text-gray-500 hover:text-black"><Pencil size={16} /></button>
                          <button className="p-2 rounded-md hover:bg-red-100 transition-colors text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && !error && paginated.length === 0 && (
            <div className="text-center py-20 text-gray-500 text-sm">
              <p className="font-semibold">Aucun client trouvé</p>
              <p className="mt-1">Essayez de modifier vos filtres de recherche.</p>
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-black cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">
              ← Précédent
            </button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-black cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">
              Suivant →
            </button>
          </div>
        )}
        <footer className="text-center mt-8">
          <p className="text-xs text-gray-400">Rhasrhass®</p>
        </footer>
      </main>
    </div>
  )
}
