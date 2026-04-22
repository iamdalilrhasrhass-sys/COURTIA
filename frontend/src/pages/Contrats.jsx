import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronUp, ChevronDown, Clock } from 'lucide-react'
import Topbar from '../components/Topbar'
import api from '../api'

const STATUS_TABS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actif', label: 'Actifs' },
  { key: 'en attente', label: 'En attente' },
  { key: 'résilié', label: 'Résiliés' },
]

const fmtEur = (v) => (!v && v !== 0) ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  let colorClasses = 'bg-gray-100 text-gray-700'
  let label = status

  if (s === 'actif') {
    colorClasses = 'bg-emerald-100 text-emerald-700'; label = 'Actif'
  } else if (['résilié', 'resilié', 'perdu'].includes(s)) {
    colorClasses = 'bg-red-100 text-red-700'; label = 'Résilié'
  } else if (['en attente', 'suspendu'].includes(s)) {
    colorClasses = 'bg-amber-100 text-amber-700'; label = 'En attente'
  }

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colorClasses.replace('text', 'bg').replace('-100', '-500')}`}></span>
      {label}
    </span>
  )
}

const EcheanceIndicator = ({ date }) => {
  if (!date) return <span className="text-sm text-gray-400">—</span>
  const d = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24))

  if (daysLeft < 0) {
    return <span className="text-sm text-gray-500">Expiré</span>
  }
  if (daysLeft <= 30) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
        <Clock size={14} /> J-{daysLeft}
      </span>
    )
  }
  return <span className="text-sm text-gray-600">{fmtDate(date)}</span>
}

const SortIcon = ({ active, dir }) => {
  if (!active) return <ChevronUp size={14} className="text-gray-300" />
  return dir === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />
}

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-5"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
    <td className="p-5"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
    <td className="p-5">
        <div>
          <div className="w-24 h-4 bg-gray-200 rounded"></div>
          <div className="w-32 h-3 mt-1.5 bg-gray-200 rounded"></div>
        </div>
    </td>
    <td className="p-5"><div className="w-16 h-4 bg-gray-200 rounded text-right"></div></td>
    <td className="p-5"><div className="w-20 h-5 bg-gray-200 rounded-full"></div></td>
    <td className="p-5"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
  </tr>
)

export default function Contrats() {
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [sortField, setSortField] = useState('date_echeance')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const PER_PAGE = 15

  useEffect(() => {
    fetchContrats()
  }, [])

  async function fetchContrats() {
    try {
      setLoading(true); setError('')
      const res = await api.get('/api/contrats')
      const data = res.data
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
    return statusFilter === 'tous' || st === statusFilter
  })

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortField]
    let vb = b[sortField]

    if (sortField === 'date_echeance') {
      va = va ? new Date(va).getTime() : (sortDir === 'asc' ? Infinity : -Infinity)
      vb = vb ? new Date(vb).getTime() : (sortDir === 'asc' ? Infinity : -Infinity)
    } else if (sortField === 'prime_annuelle') {
      va = Number(va) || 0; vb = Number(vb) || 0
    } else if (sortField === 'client') {
      va = `${a.client_nom || ''} ${a.client_prenom || ''}`.trim().toLowerCase()
      vb = `${b.client_nom || ''} ${b.client_prenom || ''}`.trim().toLowerCase()
    } else {
      va = String(va ?? '').toLowerCase(); vb = String(vb ?? '').toLowerCase()
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
    <button onClick={() => navigate('/contrats/new')}
      className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-[#2563eb] hover:to-[#7c3aed] hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02]">
      <Plus size={16} />
      Nouveau contrat
    </button>
  )
  
  return (
    <div className="min-h-screen bg-white font-sans">
      <Topbar title="Contrats" subtitle={`${safe.length} contrat${safe.length > 1 ? 's' : ''} au total`} action={topbarAction} />

      <main className="p-8 animate-fade-in">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {STATUS_TABS.map(tab => {
              const count = tab.key === 'tous' ? safe.length
                : safe.filter(c => (c.statut || c.status || '').toLowerCase() === tab.key).length
              return (
                <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1) }}
                  className={`px-4 py-2 border-none rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 ${statusFilter === tab.key ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'}`}>
                  {tab.label} <span className="opacity-60 text-xs">({count})</span>
                </button>
              )
            })}
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-[#ef4444] text-sm">
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${thClass} cursor-pointer hover:bg-gray-50 transition-colors`} onClick={() => toggleSort('type_contrat')}>
                  <div className="flex items-center gap-1.5">Type Contrat <SortIcon active={sortField === 'type_contrat'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} cursor-pointer hover:bg-gray-50 transition-colors`} onClick={() => toggleSort('compagnie')}>
                  <div className="flex items-center gap-1.5">Compagnie <SortIcon active={sortField === 'compagnie'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} cursor-pointer hover:bg-gray-50 transition-colors`} onClick={() => toggleSort('client')}>
                  <div className="flex items-center gap-1.5">Client <SortIcon active={sortField === 'client'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} text-right cursor-pointer hover:bg-gray-50 transition-colors`} onClick={() => toggleSort('prime_annuelle')}>
                  <div className="flex items-center justify-end gap-1.5">Prime Annuelle <SortIcon active={sortField === 'prime_annuelle'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} cursor-pointer hover:bg-gray-50 transition-colors`} onClick={() => toggleSort('statut')}>
                  <div className="flex items-center gap-1.5">Statut <SortIcon active={sortField === 'statut'} dir={sortDir} /></div>
                </th>
                <th className={`${thClass} cursor-pointer hover:bg-gray-50 transition-colors`} onClick={() => toggleSort('date_echeance')}>
                  <div className="flex items-center gap-1.5">Échéance <SortIcon active={sortField === 'date_echeance'} dir={sortDir} /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
              {!loading && paginated.map((c) => {
                if (!c?.id) return null
                const clientName = `${c.client_prenom || ''} ${c.client_nom || ''}`.trim()
                return (
                  <tr key={c.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50/50 transition-all duration-200 ease-out">
                    <td className="p-5 font-bold text-sm text-gray-800">{c.type_contrat || '—'}</td>
                    <td className="p-5 text-sm text-gray-600">{c.compagnie || '—'}</td>
                    <td className="p-5">
                      <div
                        className="text-sm font-bold text-gray-800 tracking-tight cursor-pointer hover:text-blue-600"
                        onClick={() => c.client_id && navigate(`/client/${c.client_id}`)}
                      >
                        {clientName || '—'}
                      </div>
                      <p className="text-xs text-gray-500">{c.client_email || ''}</p>
                    </td>
                    <td className="p-5 text-sm font-semibold text-gray-800 text-right">{fmtEur(c.prime_annuelle)}</td>
                    <td className="p-5"><StatusBadge status={c.statut} /></td>
                    <td className="p-5"><EcheanceIndicator date={c.date_echeance} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && !error && paginated.length === 0 && (
            <div className="text-center py-20 text-gray-500 text-sm">
              <p className="font-semibold">Aucun contrat trouvé</p>
              <p className="mt-1">Essayez de modifier vos filtres.</p>
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">
              ← Précédent
            </button>
            <span className="text-sm text-gray-500 font-medium">Page {page} sur {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 cursor-pointer disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">
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
