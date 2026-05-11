import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Upload, Search, X, Check, Sparkles, Shield, Zap,
  Clock, File, FileImage, FileSpreadsheet, Eye, Download, AlertTriangle, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const DOC_TYPES = [
  { value: 'fic', label: 'FIC', desc: 'Fiche d\'information et de conseil', icon: Shield },
  { value: 'mandat_courtage', label: 'Mandat', desc: 'Mandat de courtage', icon: FileText },
  { value: 'devoir_conseil', label: 'Devoir conseil', desc: 'Traçabilité du conseil', icon: FileText },
  { value: 'attestation', label: 'Attestation', desc: 'Synthèse ou attestation', icon: File },
  { value: 'piece_identite', label: 'Pièce identité', desc: 'CNI, passeport', icon: FileImage },
  { value: 'permis', label: 'Permis', desc: 'Permis de conduire', icon: File },
  { value: 'carte_grise', label: 'Carte grise', desc: 'Certificat immatriculation', icon: FileImage },
  { value: 'rib', label: 'RIB', desc: 'Relevé bancaire', icon: FileSpreadsheet },
]

const DEMO_DOCS = [
  { id: 1, nom: 'Mandat courtage_Sophie L..pdf', client: 'Sophie L.', type: 'mandat_courtage', lieA: 'Client', date: '2026-05-08', statut: 'valide' },
  { id: 2, nom: 'FIC_Martin Conseil.pdf', client: 'Martin Conseil', type: 'fic', lieA: 'Client', date: '2026-05-07', statut: 'valide' },
  { id: 3, nom: 'Attestation_Dupont SAS.pdf', client: 'Dupont SAS', type: 'attestation', lieA: 'RC Pro', date: '2026-05-05', statut: 'valide' },
  { id: 4, nom: 'Devoir conseil_Karim B..pdf', client: 'Karim B.', type: 'devoir_conseil', lieA: 'Devis Auto', date: '2026-05-04', statut: 'a_verifier' },
  { id: 5, nom: 'RIB_BatiSens Pro.pdf', client: 'BatiSens Pro', type: 'rib', lieA: 'Client', date: '2026-04-28', statut: 'valide' },
  { id: 6, nom: 'Permis_Leroy Marie.jpg', client: 'Leroy Marie', type: 'permis', lieA: 'Client', date: '2026-04-25', statut: 'expire' },
  { id: 7, nom: 'Carte grise_Auto Évolution.pdf', client: 'Auto Évolution 89', type: 'carte_grise', lieA: 'Flotte Auto', date: '2026-04-20', statut: 'valide' },
  { id: 8, nom: 'FIC_Groupe Ardent.pdf', client: 'Groupe Ardent', type: 'fic', lieA: 'Client', date: '2026-04-15', statut: 'manquant' },
  { id: 9, nom: 'Mandat courtage_Nadia R..pdf', client: 'Nadia R.', type: 'mandat_courtage', lieA: 'Client', date: '2026-04-10', statut: 'valide' },
  { id: 10, nom: 'Attestation_Cabinet Moreau.pdf', client: 'Cabinet Moreau', type: 'attestation', lieA: 'PJ', date: '2026-04-05', statut: 'a_verifier' },
  { id: 11, nom: 'Devoir conseil_Transports Galli.pdf', client: 'Transports Galli', type: 'devoir_conseil', lieA: 'RC Pro', date: '2026-03-30', statut: 'valide' },
  { id: 12, nom: 'RIB_Maison Lefèvre.pdf', client: 'Maison Lefèvre', type: 'rib', lieA: 'Client', date: '2026-05-09', statut: 'valide' },
]

const STATUT_STYLE = {
  valide: { bg: 'rgba(34,197,94,0.08)', text: '#22C55E', label: 'Validé' },
  a_verifier: { bg: 'rgba(245,158,11,0.08)', text: '#F59E0B', label: 'À vérifier' },
  manquant: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', label: 'Manquant' },
  expire: { bg: 'rgba(100,116,139,0.08)', text: '#9CA3AF', label: 'Expiré' },
}

const FILTERS = ['Tous', 'Validés', 'À vérifier', 'Manquants', 'Expirés', 'Pièces client', 'Documents contrat']

function KpiCard({ icon: Icon, title, value, accent }) {
  return (
    <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 10, padding: '12px 16px', flex: '1 1 auto', minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase' }}>{title}</span>
        <Icon size={14} color={accent || T.accent} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{value}</div>
    </div>
  )
}

export default function Documents() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tous')
  const [showUpload, setShowUpload] = useState(false)

  const filtered = useMemo(() => {
    let list = DEMO_DOCS
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => d.nom.toLowerCase().includes(q) || d.client.toLowerCase().includes(q))
    }
    if (filter === 'Validés') list = list.filter(d => d.statut === 'valide')
    else if (filter === 'À vérifier') list = list.filter(d => d.statut === 'a_verifier')
    else if (filter === 'Manquants') list = list.filter(d => d.statut === 'manquant')
    else if (filter === 'Expirés') list = list.filter(d => d.statut === 'expire')
    else if (filter === 'Pièces client') list = list.filter(d => ['piece_identite', 'permis', 'carte_grise', 'rib'].includes(d.type))
    else if (filter === 'Documents contrat') list = list.filter(d => ['fic', 'mandat_courtage', 'devoir_conseil', 'attestation'].includes(d.type))
    return list
  }, [search, filter])

  const stats = useMemo(() => ({
    total: DEMO_DOCS.length,
    aVerifier: DEMO_DOCS.filter(d => d.statut === 'a_verifier').length,
    manquants: DEMO_DOCS.filter(d => d.statut === 'manquant').length,
    expires: DEMO_DOCS.filter(d => d.statut === 'expire').length,
    recents: DEMO_DOCS.filter(d => new Date(d.date) > new Date('2026-05-01')).length,
  }), [])

  const getTypeInfo = (type) => {
    const t = DOC_TYPES.find(ti => ti.value === type)
    return t || { label: type, desc: '', icon: FileText }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(34,197,94,0.02) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileText size={16} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ressources</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Documents</h1>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Centralisez les pièces liées à vos clients, contrats et devis.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowUpload(true)} style={btnStyle(T.accent)}><Upload size={13} /> Ajouter</button>
            <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Analyse ARK</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={FileText} title="Documents" value="12 / 186" />
          <KpiCard icon={AlertTriangle} title="À vérifier" value={stats.aVerifier} accent={T.warning} />
          <KpiCard icon={XCircle} title="Manquants" value={stats.manquants} accent={T.danger} />
          <KpiCard icon={Clock} title="Expirés" value={stats.expires} accent={T.textMuted} />
          <KpiCard icon={Check} title="Récents (7j)" value={stats.recents} accent={T.success} />
        </div>

        {/* TOOLBAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: filter === f ? T.accent + '22' : T.cardBg,
                color: filter === f ? T.accent : T.textSecondary,
                border: filter === f ? '1px solid ' + T.accent + '40' : '1px solid ' + T.cardBorder,
                cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={T.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{
              padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: T.cardBg, color: T.text, border: '1px solid ' + T.cardBorder,
              width: 200, outline: 'none',
            }} />
          </div>
        </div>

        {/* ARK ALERT */}
        {stats.manquants > 0 && (
          <div style={{
            background: 'rgba(139,92,246,0.04)', border: '1px solid ' + T.arkBorder,
            borderRadius: 10, padding: '10px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Sparkles size={14} color={T.ark} />
            <span style={{ fontSize: 12, color: '#c4b5fd', flex: 1 }}>
              <strong style={{ color: '#a78bfa' }}>ARK</strong> a détecté {stats.manquants} document(s) manquant(s) et {stats.aVerifier} à vérifier. Centralisez toutes les pièces pour sécuriser vos dossiers.
            </span>
          </div>
        )}

        {/* TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid ' + T.cardBorder }}>
                {['Document', 'Client', 'Type', 'Associé à', 'Date', 'Statut', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: T.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const statut = STATUT_STYLE[d.statut] || STATUT_STYLE.valide
                const typeInfo = getTypeInfo(d.type)
                const TypeIcon = typeInfo.icon
                return (
                  <tr key={d.id}
                    style={{ borderBottom: '1px solid ' + T.cardBorder, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.cardHover }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    onClick={() => navigate('/clients')}
                  >
                    <td style={{ padding: '10px 12px', color: T.text, fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TypeIcon size={14} color={T.textMuted} />
                        <span>{d.nom}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: T.textSecondary }}>{d.client}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 4, background: T.cardBg, color: T.textMuted }}>{typeInfo.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: T.textSecondary }}>{d.lieA}</td>
                    <td style={{ padding: '10px 12px', color: T.textMuted }}>{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: statut.bg, color: statut.text }}>{statut.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={e => e.stopPropagation()} style={{ padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}><Eye size={14} color={T.textMuted} /></button>
                        <button onClick={e => e.stopPropagation()} style={{ padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}><Download size={14} color={T.textMuted} /></button>
                        <button onClick={e => e.stopPropagation()} style={{ padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}><Sparkles size={14} color={T.ark} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucun document trouvé.</p>
          </div>
        )}

        {/* UPLOAD MODAL */}
        <AnimatePresence>
          {showUpload && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowUpload(false)}
            >
              <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                style={{
                  background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24,
                  maxWidth: 480, width: '90%',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Ajouter un document</h3>
                  <button onClick={() => setShowUpload(false)} style={{ padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={16} color={T.textMuted} /></button>
                </div>
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 12, padding: '40px 20px',
                  textAlign: 'center', marginBottom: 16,
                }}>
                  <Upload size={32} color={T.textMuted} style={{ marginBottom: 12 }} />
                  <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 4 }}>Glissez un fichier ici</p>
                  <p style={{ fontSize: 11, color: T.textMuted }}>PDF, JPG, PNG — Max 10 MB</p>
                </div>
                <button onClick={() => { setShowUpload(false); toast.success('Document ajoute (simulation)') }} style={{
                  width: '100%', padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: T.accent, color: '#fff', border: 'none', cursor: 'pointer',
                }}>Téléverser</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function btnStyle(color) {
  return {
    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: color ? color + '15' : T.cardBg,
    color: color || T.text,
    border: color ? '1px solid ' + color + '30' : '1px solid ' + T.cardBorder,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  }
}
