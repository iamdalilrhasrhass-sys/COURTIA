import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, FileText, Search } from 'lucide-react'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleBackground from '../components/BubbleBackground'
import AuroraPageHeader from '../components/brand/AuroraPageHeader'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'
import AuroraButton from '../components/brand/AuroraButton'
import '../styles/design-system.css'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// Mock data with varied statuses
const MOCK_CONTRATS = [
  { id: 1, compagnie: 'AXA', type_contrat: 'Auto Tiers', client_nom: 'Dupont', client_prenom: 'Jean', client_id: 1, statut: 'actif', prime_annuelle: 4800, date_echeance: '2026-08-15' },
  { id: 2, compagnie: 'Allianz', type_contrat: 'MRH', client_nom: 'Martin', client_prenom: 'Sophie', client_id: 2, statut: 'actif', prime_annuelle: 3200, date_echeance: '2026-06-01' },
  { id: 3, compagnie: 'Generali', type_contrat: 'Prévoyance', client_nom: 'Petit', client_prenom: 'Paul', client_id: 3, statut: 'actif', prime_annuelle: 12000, date_echeance: '2027-01-20' },
  { id: 4, compagnie: 'MMA', type_contrat: 'Auto Tous Risques', client_nom: 'Lefebvre', client_prenom: 'Marie', client_id: 4, statut: 'renouvellement', prime_annuelle: 2100, date_echeance: '2026-05-10' },
  { id: 5, compagnie: 'Groupama', type_contrat: 'Santé', client_nom: 'Bernard', client_prenom: 'Luc', client_id: 5, statut: 'renouvellement', prime_annuelle: 5600, date_echeance: '2026-05-25' },
  { id: 6, compagnie: 'Matmut', type_contrat: 'Auto Tiers', client_nom: 'Dubois', client_prenom: 'Emma', client_id: 6, statut: 'resilie', prime_annuelle: 1500, date_echeance: '2025-12-01' },
  { id: 7, compagnie: 'GMF', type_contrat: 'MRH', client_nom: 'Roux', client_prenom: 'Pierre', client_id: 7, statut: 'resilie', prime_annuelle: 2800, date_echeance: '2026-02-28' },
  { id: 8, compagnie: 'Swiss Life', type_contrat: 'Prévoyance', client_nom: 'Fournier', client_prenom: 'Anne', client_id: 8, statut: 'brouillon', prime_annuelle: 7500, date_echeance: '2026-09-01' },
  { id: 9, compagnie: 'Aésio', type_contrat: 'Santé', client_nom: 'Moreau', client_prenom: 'David', client_id: 9, statut: 'brouillon', prime_annuelle: 4200, date_echeance: '2026-10-15' },
  { id: 10, compagnie: 'MAIF', type_contrat: 'Auto Tiers', client_nom: 'Garcia', client_prenom: 'Elena', client_id: 10, statut: 'actif', prime_annuelle: 3900, date_echeance: '2026-07-30' },
  { id: 11, compagnie: 'Covéa', type_contrat: 'Multirisque Pro', client_nom: 'SARL Dupont', client_prenom: '', client_id: 11, statut: 'actif', prime_annuelle: 45000, date_echeance: '2026-12-31' },
  { id: 12, compagnie: 'Generali', type_contrat: 'RC Pro', client_nom: 'BCE Courtage', client_prenom: '', client_id: 12, statut: 'renouvellement', prime_annuelle: 78000, date_echeance: '2026-05-05' },
  { id: 13, compagnie: 'AXA', type_contrat: 'Flotte Auto', client_nom: 'Groupe Axial', client_prenom: '', client_id: 13, statut: 'brouillon', prime_annuelle: 56000, date_echeance: '2026-11-01' },
  { id: 14, compagnie: 'Allianz', type_contrat: 'MRH', client_nom: 'Cabinet Lefebvre', client_prenom: '', client_id: 14, statut: 'actif', prime_annuelle: 21000, date_echeance: '2027-03-15' },
]

// Helpers
const fmtEur = (v) => (!v && v !== 0) ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))

const getHash = (str) => {
    let hash = 0
    if (!str) return hash
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    return hash
}
const getGradient = (str) => `linear-gradient(135deg, hsl(${getHash(str) % 360}, 70%, 55%) 0%, hsl(${(getHash(str) + 40) % 360}, 80%, 65%) 100%)`

// ─── KANBAN COLUMNS ──────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'actif', label: 'En cours', color: '#10b981', borderColor: '#10b981' },
  { id: 'renouvellement', label: 'Renouvellement', color: '#f59e0b', borderColor: '#f59e0b' },
  { id: 'resilie', label: 'Résiliés', color: '#ef4444', borderColor: '#ef4444' },
  { id: 'brouillon', label: 'Brouillon', color: '#9ca3af', borderColor: '#9ca3af' },
]

// ─── KANBAN CARD ──────────────────────────────────────────────────────────
function KanbanCard({ contrat, borderColor, onNavigate }) {
  const clientName = `${contrat.client_prenom || ''} ${contrat.client_nom || ''}`.trim() || '—'
  const echeance = contrat.date_echeance ? new Date(contrat.date_echeance) : null
  const now = new Date(); now.setHours(0,0,0,0)
  const daysLeft = echeance ? Math.ceil((echeance - now) / (1000*60*60*24)) : null
  const actionReco = daysLeft !== null && daysLeft <= 30
    ? 'Relance renouvellement'
    : daysLeft !== null && daysLeft <= 90
      ? 'Préparer ajustement tarifaire'
      : 'Suivi standard'
  const dateEffet = contrat.date_effet ? new Date(contrat.date_effet).toLocaleDateString('fr-FR') : '—'
  const numero = contrat.numero || '—'

  return (
    <BubbleCard hover padding={16} onClick={() => onNavigate(contrat.client_id)}>
      {/* Left colored border */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '20%',
        bottom: '20%',
        width: 3,
        borderRadius: 2,
        background: borderColor,
      }} />
      {/* Company & Type */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Arial' }}>{contrat.compagnie}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{contrat.type_contrat}</p>
        </div>
      </div>
      {/* Client name */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0"
          style={{ background: getGradient(clientName) }}>
          {(clientName.charAt(0) || '?').toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-gray-700 truncate">{clientName}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2 text-[11px]">
        <div>
          <p style={{ color: 'var(--text-tertiary)' }}>N° contrat</p>
          <p className="font-semibold text-gray-800 truncate">{numero}</p>
        </div>
        <div className="text-right">
          <p style={{ color: 'var(--text-tertiary)' }}>Date effet</p>
          <p className="font-semibold text-gray-800">{dateEffet}</p>
        </div>
      </div>
      {/* Amount & Date */}
      <div className="flex justify-between items-end pt-2" style={{ borderTop: 'var(--border-fine)' }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Montant</p>
          <p className="text-sm font-black text-gray-900">{fmtEur(contrat.prime_annuelle)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Échéance</p>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: daysLeft !== null && daysLeft <= 30 ? '#ef4444' : daysLeft !== null && daysLeft <= 90 ? '#f59e0b' : 'var(--text-secondary)' }}>
            <Calendar size={11} />
            {echeance ? `J-${daysLeft}` : '—'}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] font-semibold text-blue-700">{actionReco}</div>
    </BubbleCard>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
export default function Contrats() {
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [onlyNearExpiry, setOnlyNearExpiry] = useState(false)
  const [sortBy, setSortBy] = useState('echeance')
  const navigate = useNavigate()

  const fetchContrats = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/contrats')
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : [])
      if (data.length > 0) {
        setContrats(data)
        setUseMock(false)
        return
      }

      if (USE_MOCKS) {
        setContrats(MOCK_CONTRATS)
        setUseMock(true)
        setError('Mode simulation activé (VITE_USE_MOCKS=true).')
      } else {
        setContrats([])
        setUseMock(false)
      }
    } catch {
      console.error('Impossible de charger les contrats.')
      if (USE_MOCKS) {
        setContrats(MOCK_CONTRATS)
        setUseMock(true)
        setError('Mode simulation activé (API indisponible).')
      } else {
        setContrats([])
        setUseMock(false)
        setError('Impossible de charger les contrats pour le moment.')
      }
    } finally { setLoading(false) }
  }, [])

  // Chargement initial des contrats du portefeuille.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchContrats() }, [fetchContrats])

  const availableTypes = useMemo(() => {
    const unique = new Set()
    ;(contrats || []).forEach((c) => {
      const type = String(c.type_contrat || '').trim()
      if (type) unique.add(type)
    })
    return ['tous', ...Array.from(unique).sort((a, b) => a.localeCompare(b))]
  }, [contrats])

  const displayedContrats = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = [...(contrats || [])]

    if (q) {
      rows = rows.filter((c) => {
        const client = `${c.client_prenom || ''} ${c.client_nom || ''}`.toLowerCase()
        const type = String(c.type_contrat || '').toLowerCase()
        const compagnie = String(c.compagnie || '').toLowerCase()
        const numero = String(c.numero || '').toLowerCase()
        return client.includes(q) || type.includes(q) || compagnie.includes(q) || numero.includes(q)
      })
    }

    if (statusFilter !== 'tous') {
      rows = rows.filter((c) => String(c.statut || c.status || '').toLowerCase() === statusFilter)
    }

    if (typeFilter !== 'tous') {
      rows = rows.filter((c) => String(c.type_contrat || '').toLowerCase() === typeFilter.toLowerCase())
    }

    if (onlyNearExpiry) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const maxDate = new Date(now)
      maxDate.setDate(maxDate.getDate() + 45)
      rows = rows.filter((c) => {
        if (!c.date_echeance) return false
        const d = new Date(c.date_echeance)
        d.setHours(0, 0, 0, 0)
        return d >= now && d <= maxDate
      })
    }

    rows.sort((a, b) => {
      if (sortBy === 'prime') return Number(b.prime_annuelle || 0) - Number(a.prime_annuelle || 0)
      if (sortBy === 'compagnie') return String(a.compagnie || '').localeCompare(String(b.compagnie || ''))
      const da = a.date_echeance ? new Date(a.date_echeance).getTime() : Number.MAX_SAFE_INTEGER
      const db = b.date_echeance ? new Date(b.date_echeance).getTime() : Number.MAX_SAFE_INTEGER
      return da - db
    })

    return rows
  }, [contrats, search, statusFilter, typeFilter, onlyNearExpiry, sortBy])

  const kanbanData = useMemo(() => {
    const grouped = {
      actif: [],
      renouvellement: [],
      resilie: [],
      brouillon: [],
    }
    displayedContrats.forEach(c => {
      const s = (c.statut || c.status || '').toLowerCase()
      if (s === 'actif') grouped.actif.push(c)
      else if (['renouvellement', 'en attente', 'suspendu'].includes(s)) grouped.renouvellement.push(c)
      else if (['résilié', 'resilie', 'perdu'].includes(s)) grouped.resilie.push(c)
      else if (s === 'brouillon') grouped.brouillon.push(c)
      else grouped.brouillon.push(c) // fallback
    })
    return grouped
  }, [displayedContrats])

  const SkeletonCard = () => (
    <div className="animate-pulse rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.5)', border: 'var(--border-fine)' }}>
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-2.5 bg-gray-200 rounded w-1/2 mb-3"></div>
      <div className="flex items-center gap-2 mb-3"><div className="w-5 h-5 bg-gray-200 rounded-full"></div><div className="h-3 bg-gray-200 rounded w-1/3"></div></div>
      <div style={{ borderTop: 'var(--border-fine)', marginTop: 8, paddingTop: 8 }}>
        <div className="flex justify-between"><div className="h-3 bg-gray-200 rounded w-1/4"></div><div className="h-3 bg-gray-200 rounded w-1/4"></div></div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'transparent', fontFamily: 'var(--font-sans)' }}>
      <BubbleBackground intensity="subtle" />
      <main className="p-4 md:p-8 relative" style={{ zIndex: 1 }}>
        <AuroraPageHeader
          title="Contrats"
          subtitle={`${contrats.length} contrats suivis par statut, échéance et prime annuelle.`}
          badge="Portefeuille contrats"
          dark
          actions={
            <AuroraButton variant="primary" size="sm" icon={<Plus size={16} />} onClick={() => navigate('/contrats/new')}>
              Nouveau contrat
            </AuroraButton>
          }
        />

        {useMock && (
          <div className="mb-5 rounded-2xl border border-amber-300/30 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm">
            {error || 'Mode simulation activé (données fictives).'}
          </div>
        )}

        {!useMock && error && (
          <div className="mb-5 rounded-2xl border border-red-200/40 bg-red-50/80 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher client, compagnie, type, numéro..."
              className="w-full rounded-xl border border-white/20 bg-white/80 pl-9 pr-3 py-2 text-sm outline-none"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-sm outline-none">
            <option value="tous">Tous statuts</option>
            <option value="actif">Actif</option>
            <option value="renouvellement">Renouvellement</option>
            <option value="brouillon">Brouillon</option>
              <option value="resilie">Résilié</option>
            </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-sm outline-none">
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'tous' ? 'Tous types' : type}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={onlyNearExpiry}
              onChange={(e) => setOnlyNearExpiry(e.target.checked)}
            />
            Échéance proche (45j)
          </label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-sm outline-none">
            <option value="echeance">Tri: échéance proche</option>
            <option value="prime">Tri: prime annuelle</option>
            <option value="compagnie">Tri: compagnie</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COLUMNS.map(col => (
              <div key={col.id}>
                <div className="flex items-center gap-2 mb-4">
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.borderColor }} />
                  <span className="text-sm font-bold text-gray-900">{col.label}</span>
                  <span className="text-xs ml-auto px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)' }}>0</span>
                </div>
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COLUMNS.map(col => {
              const items = kanbanData[col.id] || []
              return (
                <div key={col.id}>
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.borderColor }} />
                    <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Arial' }}>{col.label}</span>
                    <span className="text-xs ml-auto px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)', border: 'var(--border-fine)' }}>{items.length}</span>
                  </div>
                  {/* Cards */}
                  <div className="space-y-3">
                    {items.length > 0 ? items.map(c => (
                      <div key={c.id} className="relative" style={{ paddingLeft: 0 }}>
                        <KanbanCard
                          contrat={c}
                          borderColor={col.borderColor}
                          onNavigate={(id) => navigate(`/clients/${id}`)}
                        />
                      </div>
                    )) : (
                      <AuroraEmptyState
                        compact
                        icon={<FileText size={30} />}
                        title="Aucun contrat"
                        description="Créez votre premier contrat pour commencer à suivre votre portefeuille."
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
