import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar } from 'lucide-react'
import api from '../api'

// Helpers
const fmtEur = (v) => (!v && v !== 0) ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))

const getHash = (str) => {
    let hash = 0
    if (!str) return hash
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    return hash
}
const getGradient = (str) => `linear-gradient(135deg, hsl(${getHash(str) % 360}, 70%, 55%) 0%, hsl(${(getHash(str) + 40) % 360}, 80%, 65%) 100%)`

const Avatar = ({ name }) => {
    const getInitials = (name) => {
        const names = (name || '').trim().split(' ').filter(Boolean)
        if (names.length === 0) return '?'
        if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
        return (names[0][0] + names[names.length - 1][0]).toUpperCase()
    }
    return (
        <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ background: getGradient(name || '') }}>
            {getInitials(name)}
        </div>
    )
}

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  let config = { label: 'Inconnu', classes: 'bg-gray-100 text-gray-600' }
  if (s === 'actif') config = { label: 'Actif', classes: 'bg-green-100 text-green-700' }
  else if (['résilié', 'resilié', 'perdu'].includes(s)) config = { label: 'Résilié', classes: 'bg-red-100 text-red-600' }
  else if (['en attente', 'suspendu'].includes(s)) config = { label: 'En attente', classes: 'bg-amber-100 text-amber-600' }
  return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${config.classes}`}>{config.label}</span>
}

const EcheanceIndicator = ({ date }) => {
  if (!date) return <div className="text-sm text-gray-400">—</div>
  const d = new Date(date)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
  
  if (daysLeft < 0) return <div className="text-sm font-medium text-gray-500">Expiré</div>
  
  let config = { label: `J-${daysLeft}`, classes: 'text-emerald-600 bg-emerald-50' } // Vert
  if (daysLeft <= 30) config = { label: `J-${daysLeft}`, classes: 'text-red-600 bg-red-50 font-semibold' } // Rouge
  else if (daysLeft <= 90) config = { label: `J-${daysLeft}`, classes: 'text-amber-600 bg-amber-50' } // Orange

  return (
    <div className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md ${config.classes}`}>
        <Calendar size={14} />
        <span>{config.label}</span>
    </div>
  )
}

function ContratCard({ contrat, onClientClick, onDetailClick, onRenewClick }) {
    if (!contrat) return null;
    const clientName = `${contrat.client_prenom || ''} ${contrat.client_nom || ''}`.trim()
    const echeance = contrat.date_echeance ? new Date(contrat.date_echeance) : null
    const daysLeft = echeance ? Math.ceil((echeance - new Date()) / (1000 * 60 * 60 * 24)) : Infinity
    
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5" >
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-gray-900">{contrat.type_contrat}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{contrat.compagnie}</p>
                </div>
                <StatusBadge status={contrat.statut} />
            </div>

            {/* Client */}
            <div
                className="mt-4 flex items-center gap-3 cursor-pointer group"
                onClick={() => contrat.client_id && onClientClick(contrat.client_id)}
            >
                <Avatar name={clientName} />
                <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {clientName || 'Client non spécifié'}
                </span>
            </div>

            {/* Prime & Echeance */}
            <div className="mt-5 flex justify-between items-end">
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Prime</p>
                    <p className="text-3xl font-black text-gray-900 leading-none">
                        {fmtEur(contrat.prime_annuelle)}
                        <span className="text-base font-medium text-gray-400">/an</span>
                    </p>
                </div>
                <EcheanceIndicator date={contrat.date_echeance} />
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
                <button onClick={() => contrat.client_id && onDetailClick(contrat.client_id)} className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Voir détail
                </button>
                {daysLeft <= 90 && daysLeft > 0 &&
                    <button onClick={() => contrat.client_id && onRenewClick(contrat.client_id)} className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[#2563eb] rounded-lg hover:bg-blue-700 transition-colors">
                        Renouveler
                    </button>
                }
            </div>
        </div>
    );
}

const STATUS_FILTERS = ['tous', 'actif', 'en attente', 'résilié']

export default function Contrats() {
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('tous')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const PER_PAGE = 12

  useEffect(() => { fetchContrats() }, [])

  async function fetchContrats() {
    try {
      setLoading(true)
      const res = await api.get('/api/contrats')
      setContrats(Array.isArray(res.data) ? res.data : [])
    } catch (err) { console.error(`Impossible de charger les contrats : ${err.message}`) } 
    finally { setLoading(false) }
  }

  const filteredContrats = useMemo(() => (contrats || []).filter(c => c && (statusFilter === 'tous' || (c.statut || c.status || '').toLowerCase() === statusFilter)), [contrats, statusFilter])

  const sortedContrats = useMemo(() => {
    return [...filteredContrats].sort((a, b) => {
        const da = a.date_echeance ? new Date(a.date_echeance).getTime() : Infinity
        const db = b.date_echeance ? new Date(b.date_echeance).getTime() : Infinity
        return da - db
    })
  }, [filteredContrats])
  
  const totalPages = Math.max(1, Math.ceil(sortedContrats.length / PER_PAGE))
  const paginated = sortedContrats.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  
  const SkeletonCard = () => (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="mt-6 flex items-center gap-3">
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="mt-6 h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="mt-1 h-8 bg-gray-200 rounded w-1/2"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans">
      <main className="p-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3"><h1 className="text-2xl font-black text-gray-900">Contrats</h1><span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-full">{contrats.length}</span></div>
          <button onClick={() => navigate('/contrats/new')} className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ease-out shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02]"><Plus size={16} />Nouveau contrat</button>
        </header>

        <div className="mb-6 flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map(filter => (<button key={filter} onClick={() => { setStatusFilter(filter); setPage(1) }} className={`px-3 py-1.5 border rounded-md cursor-pointer text-sm font-semibold transition-all duration-200 ${statusFilter === filter ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</button>))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : paginated.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginated.map(c => (
              <ContratCard
                key={c.id}
                contrat={c}
                onClientClick={(id) => navigate(`/client/${id}`)}
                onDetailClick={(id) => navigate(`/client/${id}`)}
                onRenewClick={(id) => navigate(`/contrats/new?clientId=${id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500 bg-white border border-gray-100 rounded-xl">
            <p className="font-semibold">Aucun contrat trouvé</p>
            <p className="mt-1 text-sm">Essayez de modifier vos filtres.</p>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm font-semibold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors">Précédent</button>
            {Array.from({length: totalPages > 7 ? 7 : totalPages}, (_, i) => { const p = page > 4 && totalPages > 7 ? page - 3 + i : i + 1; if(p > totalPages) return null; return(<button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-md text-sm font-semibold transition-colors ${p === page ? 'bg-[#2563eb] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{p}</button>)})}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm font-semibold text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors">Suivant</button>
          </div>
        )}
      </main>
    </div>
  )
}
