import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Filter, Phone, Mail, Globe, Building2, Trash2, Edit3, ChevronDown, Check, X, ExternalLink, TrendingUp, Layers } from 'lucide-react'
import usePartnerStore from '../stores/partnerStore'

const STATUTS = ['A_contacter', 'Contacte', 'Dossier_envoye', 'En_analyse', 'Code_ouvert', 'Refuse', 'A_relancer']
const STATUT_LABELS = {
  A_contacter: 'À contacter', Contacte: 'Contacté', Dossier_envoye: 'Dossier envoyé',
  En_analyse: 'En analyse', Code_ouvert: 'Code ouvert ✅', Refuse: 'Refusé', A_relancer: 'À relancer'
}
const STATUT_COLORS = {
  A_contacter: 'bg-slate-100 text-slate-700', Contacte: 'bg-blue-100 text-blue-700',
  Dossier_envoye: 'bg-amber-100 text-amber-700', En_analyse: 'bg-purple-100 text-purple-700',
  Code_ouvert: 'bg-emerald-100 text-emerald-700', Refuse: 'bg-red-100 text-red-700',
  A_relancer: 'bg-orange-100 text-orange-700'
}
const CATEGORIES = ['', 'mutuelle', 'grossiste', 'compagnie', 'prevoyance', 'niche']
const PRIORITES = { 1: '🔴 Haute', 2: '🟡 Moyenne', 3: '🟢 Basse' }

export default function Partners() {
  const { partners, stats, loading, fetchPartners, fetchStats, createPartner, updatePartner, updateStatus, deletePartner } = usePartnerStore()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [selectedPartner, setSelectedPartner] = useState(null)

  const [form, setForm] = useState({ nom: '', categorie: '', type_partenaire: '', contact_nom: '', contact_email: '', contact_telephone: '', produit_principal: '', notes: '', priorite: 2, vague: 1 })

  useEffect(() => {
    fetchPartners({ statut: filtreStatut, categorie: filtreCategorie, search })
    fetchStats()
  }, [filtreStatut, filtreCategorie, search])

  const resetForm = () => {
    setForm({ nom: '', categorie: '', type_partenaire: '', contact_nom: '', contact_email: '', contact_telephone: '', produit_principal: '', notes: '', priorite: 2, vague: 1 })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingId) {
      await updatePartner(editingId, form)
    } else {
      await createPartner(form)
    }
    resetForm()
    fetchStats()
  }

  const handleStatusChange = async (id, statut) => {
    await updateStatus(id, statut)
    fetchStats()
  }

  const openEdit = (p) => {
    setForm({ nom: p.nom, categorie: p.categorie || '', type_partenaire: p.type_partenaire || '', contact_nom: p.contact_nom || '', contact_email: p.contact_email || '', contact_telephone: p.contact_telephone || '', produit_principal: p.produit_principal || '', notes: p.notes || '', priorite: p.priorite || 2, vague: p.vague || 1 })
    setEditingId(p.id)
    setShowForm(true)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: "'Inter', sans-serif", padding: '32px 40px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>Partenaires</h1>
          <p style={{ color: '#666', fontSize: 14 }}>Suivi des conventions et codes courtage</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          style={{ background: '#5B4DF5', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Nouveau partenaire
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, icon: Layers, color: '#5B4DF5' },
            { label: 'Codes ouverts', value: stats.codes_ouverts, icon: Check, color: '#10b981' },
            { label: 'En cours', value: stats.en_cours, icon: TrendingUp, color: '#f59e0b' },
            { label: 'Refusés', value: stats.refus, icon: X, color: '#ef4444' }
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '18px 20px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: s.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={22} color={s.color} />
              </div>
              <div><div style={{ fontSize: 13, color: '#888' }}>{s.label}</div><div style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</div></div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, background: 'white', borderRadius: 12, padding: '12px 16px', border: '1px solid #f0f0f0' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8f8f8', borderRadius: 8, padding: '0 14px' }}>
          <Search size={16} color="#999" />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: '10px 0', fontSize: 14, outline: 'none', flex: 1 }} />
        </div>
        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
          style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: '0 12px', fontSize: 13, background: 'white' }}>
          <option value="">Tous statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
        </select>
        <select value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}
          style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: '0 12px', fontSize: 13, background: 'white' }}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.filter(c => c).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Partner cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Chargement...</div>
      ) : partners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #f0f0f0' }}>
          <Building2 size={48} color="#ccc" style={{ marginBottom: 16 }} />
          <h3 style={{ color: '#666', marginBottom: 8 }}>Aucun partenaire</h3>
          <p style={{ color: '#999', fontSize: 14 }}>Ajoutez votre premier partenaire pour commencer le suivi</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {partners.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              style={{ background: 'white', borderRadius: 12, padding: '20px 22px', border: '1px solid #f0f0f0', cursor: 'pointer', position: 'relative' }}
              onClick={() => setSelectedPartner(selectedPartner?.id === p.id ? null : p)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{p.nom}</h3>
                  <span style={{ fontSize: 12, color: '#888' }}>{p.categorie && p.categorie.charAt(0).toUpperCase() + p.categorie.slice(1)}{p.type_partenaire ? ' · ' + p.type_partenaire : ''}</span>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUT_COLORS[p.statut] ? { background: STATUT_COLORS[p.statut].split(' ')[0], color: STATUT_COLORS[p.statut].split(' ')[1] } : {} }}
                  className={STATUT_COLORS[p.statut] || 'bg-gray-100 text-gray-600'}>
                  {STATUT_LABELS[p.statut] || p.statut}
                </span>
              </div>

              {p.contact_nom && <div style={{ fontSize: 13, color: '#444', marginBottom: 4 }}>👤 {p.contact_nom}</div>}
              {p.produit_principal && <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>📦 {p.produit_principal}</div>}
              {p.code_courtage && <div style={{ fontSize: 12, background: '#f0fff4', color: '#065f46', padding: '4px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 8 }}>🔑 Code : {p.code_courtage}</div>}

              {/* Expanded actions */}
              <AnimatePresence>
                {selectedPartner?.id === p.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden', borderTop: '1px solid #f0f0f0', paddingTop: 14, marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      {p.contact_email && <a href={`mailto:${p.contact_email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#f8f8f8', fontSize: 12, textDecoration: 'none', color: '#444' }}><Mail size={14} /> Email</a>}
                      {p.contact_telephone && <a href={`tel:${p.contact_telephone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#f8f8f8', fontSize: 12, textDecoration: 'none', color: '#444' }}><Phone size={14} /> Appeler</a>}
                      {p.extranet_url && <a href={p.extranet_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#f8f8f8', fontSize: 12, textDecoration: 'none', color: '#444' }}><Globe size={14} /> Extranet</a>}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, color: '#888', marginBottom: 4, display: 'block' }}>Changer statut</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {STATUTS.map(s => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); handleStatusChange(p.id, s) }}
                            style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, border: '1px solid #e5e5e5', cursor: 'pointer',
                              background: p.statut === s ? '#5B4DF5' : 'white', color: p.statut === s ? 'white' : '#666' }}>
                            {STATUT_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {p.notes && <div style={{ fontSize: 12, color: '#888', background: '#fafafa', padding: 10, borderRadius: 8, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{p.notes}</div>}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e5e5', background: 'white', fontSize: 12, cursor: 'pointer' }}>
                        <Edit3 size={13} /> Modifier
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer ?')) { deletePartner(p.id); fetchStats() } }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={resetForm}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 16, padding: '30px 32px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{editingId ? 'Modifier le partenaire' : 'Nouveau partenaire'}</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input placeholder="Nom du partenaire *" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }}>
                    <option value="">Catégorie</option>
                    {CATEGORIES.filter(c => c).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={form.type_partenaire} onChange={e => setForm({...form, type_partenaire: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }}>
                    <option value="">Type</option>
                    <option value="porteur_risque">Porteur de risque</option>
                    <option value="grossiste">Grossiste</option>
                    <option value="mgas">MGA</option>
                  </select>
                </div>
                <input placeholder="Nom du contact" value={form.contact_nom} onChange={e => setForm({...form, contact_nom: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input placeholder="Email" type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }} />
                  <input placeholder="Téléphone" value={form.contact_telephone} onChange={e => setForm({...form, contact_telephone: e.target.value})}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }} />
                </div>
                <input placeholder="Produit principal" value={form.produit_principal} onChange={e => setForm({...form, produit_principal: e.target.value})}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select value={form.priorite} onChange={e => setForm({...form, priorite: parseInt(e.target.value)})}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }}>
                    {Object.entries(PRIORITES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select value={form.vague} onChange={e => setForm({...form, vague: parseInt(e.target.value)})}
                    style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14 }}>
                    <option value={1}>Vague 1 (rapide)</option>
                    <option value={2}>Vague 2 (moyen)</option>
                    <option value={3}>Vague 3 (long)</option>
                  </select>
                </div>
                <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 14, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button type="button" onClick={resetForm}
                    style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e5e5', background: 'white', fontSize: 14, cursor: 'pointer' }}>Annuler</button>
                  <button type="submit"
                    style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#5B4DF5', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    {editingId ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
