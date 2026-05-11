import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Plus, Calendar, FileText, CheckCircle, XCircle, Clock, ChevronRight, Search, Filter, User, Car, Home, Heart, Shield, Sparkles } from 'lucide-react'
import api from '../../api'

const CLAIM_TYPES = {
  auto_collision: { label: 'Auto - Collision', icon: Car, color: '#EF4444' },
  auto_vol: { label: 'Auto - Vol', icon: Car, color: '#F97316' },
  auto_bris_glace: { label: 'Auto - Bris de glace', icon: Car, color: '#F59E0B' },
  habitation_degat_eaux: { label: 'Habitation - Degat des eaux', icon: Home, color: '#3B82F6' },
  habitation_incendie: { label: 'Habitation - Incendie', icon: Home, color: '#EF4444' },
  habitation_vol: { label: 'Habitation - Vol', icon: Home, color: '#F97316' },
  sante: { label: 'Sante', icon: Heart, color: '#EC4899' },
  prevoyance: { label: 'Prevoyance', icon: Shield, color: '#8B5CF6' },
  responsabilite_civile: { label: 'Responsabilite civile', icon: Shield, color: '#06B6D4' },
  autre: { label: 'Autre', icon: FileText, color: '#64748B' },
}

const STATUS_LABELS = {
  opened: { label: 'Ouvert', color: '#F59E0B', icon: Clock },
  in_progress: { label: 'En cours', color: '#3B82F6', icon: Clock },
  pending_docs: { label: 'En attente docs', color: '#F97316', icon: FileText },
  settled: { label: 'Regle', color: '#10B981', icon: CheckCircle },
  rejected: { label: 'Rejete', color: '#EF4444', icon: XCircle },
  closed: { label: 'Cloture', color: '#64748B', icon: CheckCircle },
}

export default function SinistresV2() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newClaim, setNewClaim] = useState({ client_id: '', type: 'autre', description: '', amount: '' })

  useEffect(() => {
    loadClaims()
  }, [filterStatus])

  async function loadClaims() {
    try {
      setLoading(true)
      const params = filterStatus ? { status: filterStatus } : {}
      const res = await api.get('/claims', { params })
      setClaims(res.data || [])
    } catch (err) {
      console.error('Failed to load claims:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createClaim() {
    try {
      await api.post('/claims', newClaim)
      setShowModal(false)
      setNewClaim({ client_id: '', type: 'autre', description: '', amount: '' })
      loadClaims()
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.message || err.message))
    }
  }

  const filtered = claims.filter(c => {
    const q = search.toLowerCase()
    return !q || c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q) || c.type?.toLowerCase().includes(q)
  })

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={28} color="#F59E0B" />
            Sinistres
          </h1>
          <p style={{ color: '#64748B', marginTop: 4 }}>{claims.length} sinistre(s) enregistre(s)</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={18} /> Nouveau sinistre
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input type="text" placeholder="Rechercher par client ou type..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '12px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, background: 'white', cursor: 'pointer' }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Claims List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748B' }}>
          <AlertTriangle size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p>Aucun sinistre trouve</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(claim => {
            const typeInfo = CLAIM_TYPES[claim.type] || CLAIM_TYPES.autre
            const statusInfo = STATUS_LABELS[claim.status] || STATUS_LABELS.opened
            const TypeIcon = typeInfo.icon
            const StatusIcon = statusInfo.icon
            return (
              <motion.div key={claim.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', cursor: 'pointer' }} whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: typeInfo.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TypeIcon size={24} color={typeInfo.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{claim.first_name} {claim.last_name}</div>
                  <div style={{ fontSize: 13, color: '#64748B' }}>{typeInfo.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: statusInfo.color + '15', color: statusInfo.color, fontSize: 13, fontWeight: 500 }}>
                    <StatusIcon size={14} />
                    {statusInfo.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{new Date(claim.opened_at).toLocaleDateString('fr-FR')}</div>
                </div>
                {claim.amount && <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 16 }}>{Number(claim.amount).toLocaleString('fr-FR')} EUR</div>}
                <ChevronRight size={20} color="#CBD5E1" />
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Nouveau sinistre</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#475569' }}>ID Client</label>
                  <input type="number" value={newClaim.client_id} onChange={e => setNewClaim({ ...newClaim, client_id: e.target.value })} placeholder="ID du client" style={{ width: '100%', padding: 12, border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#475569' }}>Type de sinistre</label>
                  <select value={newClaim.type} onChange={e => setNewClaim({ ...newClaim, type: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, background: 'white' }}>
                    {Object.entries(CLAIM_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#475569' }}>Description</label>
                  <textarea value={newClaim.description} onChange={e => setNewClaim({ ...newClaim, description: e.target.value })} placeholder="Description du sinistre..." rows={3} style={{ width: '100%', padding: 12, border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#475569' }}>Montant estime (EUR)</label>
                  <input type="number" value={newClaim.amount} onChange={e => setNewClaim({ ...newClaim, amount: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: 12, border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 14, background: '#F1F5F9', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Annuler</button>
                <button onClick={createClaim} style={{ flex: 1, padding: 14, background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Creer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
