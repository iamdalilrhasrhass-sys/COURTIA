import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronUp, ChevronDown, Eye, Pencil, Trash2, LayoutList, LayoutGrid, Circle } from 'lucide-react'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleBackground from '../components/BubbleBackground'
import '../styles/design-system.css'

const MOCK_CLIENTS = [
  {id:1,name:'SARL Dupont',email:'contact@dupont.fr',status:'actif',riskScore:28,premium:45000,city:'Paris'},
  {id:2,name:'Martin Assurances',email:'m.assurances@outlook.fr',status:'actif',riskScore:65,premium:32000,city:'Lyon'},
  {id:3,name:'BCE Courtage',email:'bce@courtage.fr',status:'opportunite',riskScore:15,premium:78000,city:'Marseille'},
  {id:4,name:'Cabinet Lefebvre',email:'contact@lefebvre.com',status:'a_risque',riskScore:82,premium:21000,city:'Bordeaux'},
  {id:5,name:'Groupe Axial',email:'g.axial@orange.fr',status:'actif',riskScore:42,premium:56000,city:'Lille'}
]

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
  let config = { label: 'Inconnu', color: '#6b7280' }
  if (s === 'actif') config = { label: 'Actif', color: '#10b981' }
  else if (s === 'prospect') config = { label: 'Prospect', color: '#3b82f6' }
  else if (s === 'opportunite') config = { label: 'Opportunité', color: '#f59e0b' }
  else if (s === 'a_risque') config = { label: 'À risque', color: '#ef4444' }
  else if (['inactif'].includes(s)) config = { label: 'Inactif', color: '#9ca3af' }
  else if (['résilié', 'resilié', 'perdu'].includes(s)) config = { label: 'Résilié', color: '#dc2626' }
  return <BubbleBadge color={config.color} size="sm">{config.label}</BubbleBadge>
}

const ScoreGauge = ({ score }) => {
  const s = Math.min(100, Math.max(0, Number(score) || 0))
  let color = '#10b981'
  if (s >= 70) color = '#10b981'
  else if (s >= 40) color = '#f59e0b'
  else color = '#ef4444'
  const size = 48, strokeWidth = 4, radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (s / 100) * circumference
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-shrink-0">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <span className="text-sm font-black" style={{ color }}>{s}</span>
    </div>
  )
}

const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronUp size={14} className="text-gray-300" />
  return dir === 'asc' ? <ChevronUp size={14} style={{ color: 'var(--accent-blue)' }} /> : <ChevronDown size={14} style={{ color: 'var(--accent-blue)' }} />
}

const SkeletonRow = () => (
  <tr className="animate-pulse"><td className="p-4"><div className="flex items-center gap-4"><div className="w-11 h-11 rounded-full bg-gray-200"></div><div><div className="w-24 h-4 bg-gray-200 rounded"></div><div className="w-32 h-3 mt-1.5 bg-gray-200 rounded"></div></div></div></td><td className="p-4"><div className="w-20 h-5 bg-gray-200 rounded-full"></div></td><td className="p-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td><td className="p-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td><td className="p-4"><div className="flex gap-2 justify-end"><div className="w-6 h-6 bg-gray-200 rounded"></div><div className="w-6 h-6 bg-gray-200 rounded"></div></div></td></tr>
)

const STATUS_FILTERS = ['tous', 'prospect', 'actif', 'inactif', 'résilié']

function ClientCard({ client, onNavigate }) {
  const badgeColor = {
    actif: '#10b981',
    prospect: '#3b82f6',
    opportunite: '#f59e0b',
    a_risque: '#ef4444',
    inactif: '#9ca3af',
    résilié: '#dc2626',
    resilié: '#dc2626',
    perdu: '#dc2626',
  }[(client.status || client.statut || '').toLowerCase()] || '#6b7280'

  const name = client.name || `${client.nom || ''} ${client.prenom || ''}`.trim() || '—'
  const email = client.email || '—'
  const riskScore = client.riskScore ?? client.score_risque ?? 0
  const city = client.city || '—'

  return (
    <BubbleCard hover padding={20} onClick={() => onNavigate(client.id)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar name={name} />
          <div>
            <p className="text-sm font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Arial' }}>{name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{email}</p>
          </div>
        </div>
        <BubbleBadge color={badgeColor} size="sm" pulse={(client.status || client.statut || '').toLowerCase() === 'a_risque'}>
          {(client.status || client.statut || 'Inconnu').charAt(0).toUpperCase() + (client.status || client.statut || '').slice(1)}
        </BubbleBadge>
      </div>
      <div className="flex items-center justify-between pt-3" style={{ borderTop: 'var(--border-fine)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'Arial', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risque</p>
          <ScoreGauge score={riskScore} />
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'Arial', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ville</p>
          <p className="text-sm font-semibold text-gray-700">{city}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'Arial', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prime</p>
          <p className="text-sm font-black text-gray-900">
            {client.premium ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(client.premium) : '—'}
          </p>
        </div>
      </div>
    </BubbleCard>
  )
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'cards' | 'bulles'
  const navigate = useNavigate()
  const PER_PAGE = 15

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    try {
      setLoading(true)
      const res = await api.get('/api/clients')
      setClients(res.data?.data || [])
    } catch (err) {
      console.error(`Impossible de charger les clients: ${err.message}`)
      setClients(MOCK_CLIENTS)
    }
    finally { setLoading(false) }
  }
  
  const filteredClients = useMemo(() => {
    return (clients || []).filter(c => {
        if (!c) return false
        const s = search.toLowerCase()
        const name = c.name || `${c.prenom || ''} ${c.nom || ''}`.toLowerCase()
        const email = c.email || ''
        const matchSearch = !s || name.includes(s) || email.toLowerCase().includes(s)
        const st = (c.status || c.statut || '').toLowerCase()
        if (statusFilter === 'tous') return matchSearch
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
      } else if (sortField === 'riskScore') {
        va = Number(a.riskScore) || 0; vb = Number(b.riskScore) || 0
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

  const thClass = "p-4 text-left text-[11px] font-semibold uppercase tracking-widest select-none cursor-pointer"
  const headerMapping = { Client: 'nom', Statut: 'statut', 'Score Risque': 'score_risque', 'Dernière activité': 'created_at' }
  const VIEW_OPTIONS = [
    { key: 'list', label: 'Liste', icon: LayoutList },
    { key: 'cards', label: 'Cartes', icon: LayoutGrid },
    { key: 'bulles', label: 'Bulles', icon: Circle },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-cream)', fontFamily: 'var(--font-sans)' }}>
      <BubbleBackground intensity="subtle" />
      <main className="p-8 relative" style={{ zIndex: 1 }}>
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'Arial' }}>Clients</h1>
            <span className="px-2.5 py-1 text-sm font-semibold rounded-full" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)', border: 'var(--border-fine)' }}>{clients.length}</span>
          </div>
          <button onClick={() => navigate('/clients/new')} className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0a0a0a] text-white rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ease-out shadow-lg hover:scale-[1.02]" style={{ border: '0.5px solid rgba(255,255,255,0.1)' }}><Plus size={16} />Nouveau client</button>
        </header>
        
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Rechercher un client..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(20px)',
                border: 'var(--border-fine)',
                boxShadow: 'var(--shadow-bubble)',
                color: 'var(--text-primary)',
              }} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl overflow-hidden" style={{ border: 'var(--border-fine)', background: 'rgba(255,255,255,0.5)' }}>
              {VIEW_OPTIONS.map(opt => {
                const Icon = opt.icon
                return (
                  <button key={opt.key} onClick={() => setViewMode(opt.key)}
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === opt.key ? 'rgba(0,0,0,0.06)' : 'transparent',
                      color: viewMode === opt.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                    <Icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {STATUS_FILTERS.map(filter => (
              <button key={filter} onClick={() => { setStatusFilter(filter); setPage(1) }}
                style={{
                  padding: '6px 14px',
                  border: statusFilter === filter ? '0.5px solid rgba(0,0,0,0.2)' : 'var(--border-fine)',
                  borderRadius: 9999,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  background: statusFilter === filter ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.5)',
                  color: statusFilter === filter ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* View: Liste (table) */}
        {viewMode === 'list' && (
          <BubbleCard hover={false} padding={0}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr style={{ borderBottom: 'var(--border-fine)' }}>
                    {Object.keys(headerMapping).map(h => (
                      <th key={h} onClick={() => toggleSort(headerMapping[h])} className={thClass} style={{ padding: '14px 16px', color: 'var(--text-tertiary)' }}>
                        <div className="flex items-center gap-1.5">{h}<SortIcon active={sortField === headerMapping[h]} dir={sortDir} /></div>
                      </th>
                    ))}
                    <th className="p-4 text-right text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />) : paginatedClients.map((client) => {
                    const name = client.name || `${client.nom || ''} ${client.prenom || ''}`.trim() || '—'
                    return (
                      <tr key={client.id} className="last:border-0 group cursor-pointer" style={{ borderBottom: 'var(--border-fine)', transition: 'background 0.2s' }}
                        onClick={() => navigate(`/client/${client.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar name={name} />
                            <div>
                              <p className="text-sm font-bold text-gray-900 tracking-tight">{name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{client.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4"><StatusBadge status={client.statut || client.status} /></td>
                        <td className="p-4"><ScoreGauge score={client.score_risque ?? client.riskScore} /></td>
                        <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{timeAgo(client.created_at)}</td>
                        <td className="p-4">
                          <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                            <button onClick={() => navigate(`/client/${client.id}`)} className="p-2 rounded-md hover:bg-gray-200 text-gray-500 hover:text-black" title="Voir"><Eye size={16} /></button>
                            <button onClick={() => navigate(`/clients/${client.id}/edit`)} className="p-2 rounded-md hover:bg-gray-200 text-gray-500 hover:text-black" title="Modifier"><Pencil size={16} /></button>
                            <button onClick={() => alert('Suppression non implémentée')} className="p-2 rounded-md hover:bg-red-100 text-gray-500 hover:text-red-600" title="Supprimer"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!loading && paginatedClients.length === 0 && (<div className="text-center py-20" style={{ color: 'var(--text-secondary)' }}><p className="font-semibold">Aucun client trouvé</p><p className="mt-1 text-sm">Essayez de modifier vos filtres.</p></div>)}
            </div>
          </BubbleCard>
        )}

        {/* View: Cartes */}
        {viewMode === 'cards' && (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.5)', border: 'var(--border-fine)' }}>
                  <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-full bg-gray-200"></div><div><div className="w-24 h-4 bg-gray-200 rounded"></div><div className="w-32 h-3 mt-1.5 bg-gray-200 rounded"></div></div></div>
                  <div className="mt-4 pt-3 flex justify-between" style={{ borderTop: 'var(--border-fine)' }}>
                    <div><div className="w-12 h-3 bg-gray-200 rounded mb-1"></div><div className="w-16 h-4 bg-gray-200 rounded"></div></div>
                    <div><div className="w-12 h-3 bg-gray-200 rounded mb-1"></div><div className="w-16 h-4 bg-gray-200 rounded"></div></div>
                  </div>
                </div>
              ))}
            </div>
          ) : paginatedClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedClients.map(client => (
                <ClientCard key={client.id} client={client} onNavigate={(id) => navigate(`/client/${id}`)} />
              ))}
            </div>
          ) : (
            <BubbleCard hover={false} padding={40}>
              <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
                <p className="font-semibold">Aucun client trouvé</p>
                <p className="mt-1 text-sm">Essayez de modifier vos filtres.</p>
              </div>
            </BubbleCard>
          )
        )}

        {/* View: Bulles */}
        {viewMode === 'bulles' && (
          loading ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-full" style={{ width: 160, height: 160, background: 'rgba(255,255,255,0.5)', border: 'var(--border-fine)' }}></div>
              ))}
            </div>
          ) : paginatedClients.length > 0 ? (
            <div className="flex flex-wrap gap-6 justify-center">
              {paginatedClients.map(client => {
                const name = client.name || `${client.nom || ''} ${client.prenom || ''}`.trim() || '—'
                const riskScore = client.riskScore ?? client.score_risque ?? 0
                let color = '#10b981'
                if (riskScore >= 70) color = '#ef4444'
                else if (riskScore >= 40) color = '#f59e0b'
                return (
                  <div key={client.id} onClick={() => navigate(`/client/${client.id}`)}
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.75)',
                      backdropFilter: 'blur(20px)',
                      border: 'var(--border-fine)',
                      boxShadow: 'var(--shadow-bubble)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: 20,
                      textAlign: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble-pop)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <Avatar name={name} />
                    <p className="text-sm font-bold text-gray-900 mt-2 leading-tight" style={{ fontFamily: 'Arial' }}>{name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }}></span>
                      <span className="text-xs font-semibold" style={{ color }}>{riskScore}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <BubbleCard hover={false} padding={40}>
              <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
                <p className="font-semibold">Aucun client trouvé</p>
                <p className="mt-1 text-sm">Essayez de modifier vos filtres.</p>
              </div>
            </BubbleCard>
          )
        )}

        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{
                padding: '6px 14px',
                border: 'var(--border-fine)',
                borderRadius: 'var(--r-sm)',
                background: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: 600,
                color: page === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}>Précédent</button>
            {Array.from({length: totalPages > 7 ? 7 : totalPages}, (_, i) => {
              const p = page > 4 && totalPages > 7 ? page - 3 + i : i + 1
              if(p > totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--r-sm)',
                    border: p === page ? 'none' : 'var(--border-fine)',
                    background: p === page ? '#0a0a0a' : 'rgba(255,255,255,0.5)',
                    color: p === page ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>{p}</button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{
                padding: '6px 14px',
                border: 'var(--border-fine)',
                borderRadius: 'var(--r-sm)',
                background: 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: 600,
                color: page === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}>Suivant</button>
          </div>
        )}
      </main>
    </div>
  )
}
