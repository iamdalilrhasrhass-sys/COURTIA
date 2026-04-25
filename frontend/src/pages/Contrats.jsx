import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar } from 'lucide-react'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleBackground from '../components/BubbleBackground'
import '../styles/design-system.css'

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
    </BubbleCard>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
export default function Contrats() {
  const [contrats, setContrats] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { fetchContrats() }, [])

  async function fetchContrats() {
    try {
      setLoading(true)
      const res = await api.get('/api/contrats')
      const data = Array.isArray(res.data) ? res.data : []
      setContrats(data.length > 0 ? data : MOCK_CONTRATS)
    } catch (err) {
      console.error(`Impossible de charger les contrats : ${err.message}`)
      setContrats(MOCK_CONTRATS)
    } finally { setLoading(false) }
  }

  const kanbanData = useMemo(() => {
    const grouped = {
      actif: [],
      renouvellement: [],
      resilie: [],
      brouillon: [],
    }
    ;(contrats || []).forEach(c => {
      const s = (c.statut || c.status || '').toLowerCase()
      if (s === 'actif') grouped.actif.push(c)
      else if (['renouvellement', 'en attente', 'suspendu'].includes(s)) grouped.renouvellement.push(c)
      else if (['résilié', 'resilie', 'perdu'].includes(s)) grouped.resilie.push(c)
      else if (s === 'brouillon') grouped.brouillon.push(c)
      else grouped.brouillon.push(c) // fallback
    })
    return grouped
  }, [contrats])

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
    <div className="min-h-screen" style={{ background: 'var(--bg-cream)', fontFamily: 'var(--font-sans)' }}>
      <BubbleBackground intensity="subtle" />
      <main className="p-4 md:p-8 relative" style={{ zIndex: 1 }}>
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-gray-900" style={{ fontFamily: 'Arial' }}>Contrats</h1>
            <span className="px-2.5 py-1 text-sm font-semibold rounded-full" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)', border: 'var(--border-fine)' }}>{contrats.length}</span>
          </div>
          <button onClick={() => navigate('/contrats/new')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: '#0a0a0a',
              borderRadius: 'var(--r-md)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              boxShadow: 'var(--shadow-bubble)',
              fontSize: 13,
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble-pop)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-bubble)'; e.currentTarget.style.transform = 'translateY(0)' }}
          ><Plus size={16} />Nouveau contrat</button>
        </header>

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
                          onNavigate={(id) => navigate(`/client/${id}`)}
                        />
                      </div>
                    )) : (
                      <div className="text-center py-8 text-xs rounded-2xl" style={{ color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.3)', border: 'var(--border-fine)' }}>
                        Aucun contrat
                      </div>
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
