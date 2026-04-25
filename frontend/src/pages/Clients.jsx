import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronUp, ChevronDown, Eye, Pencil, Trash2 } from 'lucide-react'
import api from '../api'

// HSL gradient from string
const getHash = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return hash
}
const getHSL = (str) => `hsl(${getHash(str) % 360}, 70%, 55%)`
const getGradient = (str) => `linear-gradient(135deg, ${getHSL(str)} 0%, hsl(${(getHash(str) + 40) % 360}, 80%, 65%) 100%)`

const Avatar = ({ name }) => {
  const getInitials = (name) => {
    const names = (name || '').trim().split(' ').filter(Boolean)
    if (names.length === 0) return '?'
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  return (
    <div className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{ background: getGradient(name || '') }}>
      {getInitials(name)}
    </div>
  )
}

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  let config = { label: 'Inconnu', classes: 'bg-gray-50 text-gray-500 border border-gray-200' }
  if (s === 'actif') config = { label: 'Actif', classes: 'bg-emerald-50 text-emerald-600 border border-emerald-100' }
  else if (s === 'prospect') config = { label: 'Prospect', classes: 'bg-blue-50 text-blue-600 border border-blue-100' }
  else if (['inactif'].includes(s)) config = { label: 'Inactif', classes: 'bg-gray-50 text-gray-500 border border-gray-200' }
  else if (['résilié', 'resilié', 'perdu'].includes(s)) config = { label: 'Résilié', classes: 'bg-red-50 text-red-600 border border-red-100' }
  return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${config.classes}`}>{config.label}</span>
}

const ScoreBar = ({ score }) => {
    const s = Math.min(100, Math.max(0, Number(score) || 0))
    let color = '#10b981' // green
    if (s < 40) color = '#ef4444' // red
    else if (s < 70) color = '#f59e0b' // orange
    return (
      <div className="flex items-center gap-2 w-[90px]">
        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${s}%`, backgroundColor: color }}></div></div>
        <span className="text-xs font-bold text-gray-700 w-8 text-right">{s}</span>
      </div>
    )
}

const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronUp size={14} className="text-gray-300" />
  return dir === 'asc' ? <ChevronUp size={14} className="text-[#2563eb]" /> : <ChevronDown size={14} className="text-[#2563eb]" />
}

const SkeletonRow = () => (
  <tr className="animate-pulse"><td className="p-4"><div className="flex items-center gap-4"><div className="w-11 h-11 rounded-full bg-gray-200"></div><div><div className="w-24 h-4 bg-gray-200 rounded"></div><div className="w-32 h-3 mt-1.5 bg-gray-200 rounded"></div></div></div></td><td className="p-4"><div className="w-20 h-5 bg-gray-200 rounded-full"></div></td><td className="p-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td><td className="p-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td><td className="p-4"><div className="flex gap-2 justify-end"><div className="w-6 h-6 bg-gray-200 rounded"></div><div className="w-6 h-6 bg-gray-200 rounded"></div></div></td></tr>
)

const STATUS_FILTERS = ['tous', 'prospect', 'actif', 'inactif', 'résilié']

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const PER_PAGE = 15

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    try {
      setLoading(true)
      const res = await api.get('/api/clients')
      setClients(res.data?.data || [])
    } catch (err) { console.error(`Impossible de charger les clients: ${err.message}`) } 
    finally { setLoading(false) }
  }
  
  const filteredClients = useMemo(() => {
    return (clients || []).filter(c => {
        if (!c) return false
        const s = search.toLowerCase()
        const fullName = `${c.prenom || ''} ${c.nom || ''}`.toLowerCase()
        const matchSearch = !s || fullName.includes(s) || (c.email || '').toLowerCase().includes(s)
        if (statusFilter === 'tous') return matchSearch
        const st = (c.statut || '').toLowerCase()
        if (statusFilter === 'inactif') return matchSearch && ['inactif'].includes(st)
        if (statusFilter === 'résilié') return matchSearch && ['résilié', 'resilié', 'perdu'].includes(st)
        return matchSearch && st === statusFilter
      })
  }, [clients, search, statusFilter])

  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      let va = a[sortField] ?? '', vb = b[sortField] ?? ''
      if (sortField === 'score_risque') { va = Number(va) || 0; vb = Number(vb) || 0 }
      else if (sortField === 'created_at') { va = new Date(va).getTime() || 0; vb = new Date(vb).getTime() || 0 }
      else if (sortField === 'nom') {
        va = `${a.nom || ''} ${a.prenom || ''}`.trim().toLowerCase()
        vb = `${b.nom || ''} ${b.prenom || ''}`.trim().toLowerCase()
      } else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredClients, sortField, sortDir])

  const paginatedClients = useMemo(() => sortedClients.slice((page - 1) * PER_PAGE, page * PER_PAGE), [sortedClients, page])
  const totalPages = Math.max(1, Math.ceil(sortedClients.length / PER_PAGE))
  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }
  
  function timeAgo(dateString) {
      if (!dateString) return 'Jamais'
      const seconds = Math.floor((new Date() - new Date(dateString)) / 1000)
      let interval = seconds / 31536000
      if (interval > 1) return `il y a ${Math.floor(interval)} an${Math.floor(interval) > 1 ? 's' : ''}`
      interval = seconds / 2592000
      if (interval > 1) return `il y a ${Math.floor(interval)} mois`
      interval = seconds / 86400
      if (interval > 1) return `il y a ${Math.floor(interval)} jour${Math.floor(interval) > 1 ? 's' : ''}`
      return `aujourd'hui`
  }

  const thClass = "p-4 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-widest select-none cursor-pointer"
  const headerMapping = { Client: 'nom', Statut: 'statut', 'Score Risque': 'score_risque', 'Dernière activité': 'created_at' }

  return (
    <>
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-gray-900">Clients</h1><span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">{clients.length}</span></div>
          <button onClick={() => navigate('/clients/new')} className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ease-out shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02]"><Plus size={16} />Nouveau client</button>
        </header>
        
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2563eb] transition-colors" size={18} />
            <input type="text" placeholder="Rechercher un client..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-black shadow-sm focus:border-[#2563eb] focus:shadow-md focus:shadow-blue-100 outline-none transition-all duration-200" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">{STATUS_FILTERS.map(filter => (<button key={filter} onClick={() => { setStatusFilter(filter); setPage(1) }} className={`px-3 py-1.5 border rounded-md cursor-pointer text-sm font-semibold transition-all duration-200 ${statusFilter === filter ? 'bg-[#2563eb] text-white border-[#2563eb] shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</button>))}</div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm"><tr>{Object.keys(headerMapping).map(h => (<th key={h} onClick={() => toggleSort(headerMapping[h])} className={thClass}><div className="flex items-center gap-1.5">{h}<SortIcon active={sortField === headerMapping[h]} dir={sortDir} /></div></th>))}<th className="p-4 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Actions</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />) : paginatedClients.map((client) => (
                  <tr key={client.id} className="border-b border-gray-100 last:border-0 group hover:bg-blue-50/20 transition-colors duration-200 cursor-pointer" onClick={() => navigate(`/client/${client.id}`)}>
                    <td className="p-4"><div className="flex items-center gap-4"><Avatar name={`${client.prenom || ''} ${client.nom || ''}`} /><div><p className="text-sm font-semibold text-gray-900 tracking-tight">{client.nom || '—'} {client.prenom || ''}</p><p className="text-xs text-gray-400">{client.email || '—'}</p></div></div></td>
                    <td className="p-4"><StatusBadge status={client.statut} /></td>
                    <td className="p-4"><ScoreBar score={client.score_risque} /></td>
                    <td className="p-4 text-gray-500">{timeAgo(client.created_at)}</td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/client/${client.id}`)} className="p-2 rounded-md hover:bg-gray-200 text-gray-500 hover:text-black" title="Voir"><Eye size={16} /></button>
                        <button onClick={() => navigate(`/clients/${client.id}/edit`)} className="p-2 rounded-md hover:bg-gray-200 text-gray-500 hover:text-black" title="Modifier"><Pencil size={16} /></button>
                        <button onClick={() => alert('Suppression non implémentée')} className="p-2 rounded-md hover:bg-red-100 text-gray-500 hover:text-red-600" title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && paginatedClients.length === 0 && (<div className="text-center py-20 text-gray-500"><p className="font-semibold">Aucun client trouvé</p><p className="mt-1 text-sm">Essayez de modifier vos filtres.</p></div>)}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm font-semibold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors">Précédent</button>
            {Array.from({length: totalPages > 7 ? 7 : totalPages}, (_, i) => { const p = page > 4 && totalPages > 7 ? page - 3 + i : i + 1; if(p > totalPages) return null; return(<button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${p === page ? 'bg-[#2563eb] text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>{p}</button>)})}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm font-semibold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors">Suivant</button>
          </div>
        )}
    </>
  )
}
