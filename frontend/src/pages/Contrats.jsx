import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar } from 'lucide-react'
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
    <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${colorClasses}`}>
      {label}
    </span>
  )
}

const EcheanceIndicator = ({ date }) => {
  if (!date) return <span className="text-sm text-gray-500">—</span>
  const d = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24))

  let color = 'text-emerald-600'
  let label = fmtDate(date)

  if (daysLeft < 0) {
    color = 'text-gray-500'
    label = `Expiré`
  } else if (daysLeft <= 30) {
    color = 'text-red-600 font-semibold'
    label = `J-${daysLeft}`
  } else if (daysLeft <= 90) {
    color = 'text-amber-600'
    label = `J-${daysLeft}`
  }

  return (
    <div className={`flex items-center gap-1.5 text-sm ${color}`}>
      <Calendar size={14} />
      <span>{label}</span>
    </div>
  )
}

const MiniAvatar = ({ name }) => {
  const getInitials = (name) => {
    const names = (name || '').trim().split(' ').filter(Boolean)
    if (names.length === 0) return '?'
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-white flex items-center justify-center text-xs font-bold">
      {getInitials(name)}
    </div>
  )
}

function ContratCard({ contrat, onClientClick }) {
  if (!contrat) return null;
  const clientName = `${contrat.client_prenom || ''} ${contrat.client_nom || ''}`.trim()
  const daysLeft = contrat.date_echeance ? Math.ceil((new Date(contrat.date_echeance) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-300 flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold text-gray-900">{contrat.type_contrat}</p>
            <p className="text-sm text-gray-500 mt-0.5">{contrat.compagnie}</p>
          </div>
          <StatusBadge status={contrat.statut} />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => contrat.client_id && onClientClick(contrat.client_id)}
          >
            <MiniAvatar name={clientName} />
            <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              {clientName || 'Client non spécifié'}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Prime annuelle</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{fmtEur(contrat.prime_annuelle)}</p>
          </div>
        </div>

        <div className="mt-6">
          <EcheanceIndicator date={contrat.date_echeance} />
        </div>
      </div>

      <div className="p-4 bg-gray-50/70 border-t border-gray-100 rounded-b-xl flex items-center justify-end gap-3">
        <button className="px-3 py-1.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-colors shadow-sm">
          Voir
        </button>
        {daysLeft !== null && daysLeft > 0 && daysLeft <= 90 && (
          <button className="px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-md hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md transition-all">
            Renouveler
          </button>
        )}
      </div>
    </div>
  );
}

export default function Contrats() {
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const PER_PAGE = 10

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
    const da = a.date_echeance ? new Date(a.date_echeance).getTime() : Infinity
    const db = b.date_echeance ? new Date(b.date_echeance).getTime() : Infinity
    return da - db
  })
  
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  
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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200/80 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="mt-6 h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="mt-6 h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="mt-1 h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : paginated.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map(c => (
              <ContratCard key={c.id} contrat={c} onClientClick={(id) => navigate(`/client/${id}`)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 text-sm bg-gray-50/70 rounded-xl">
            <p className="font-semibold">Aucun contrat trouvé</p>
            <p className="mt-1">Essayez de modifier vos filtres.</p>
          </div>
        )}

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
