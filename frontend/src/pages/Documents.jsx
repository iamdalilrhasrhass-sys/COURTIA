import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Upload, Download, Search, Filter, X, Check,
  AlertCircle, Clock, Send, Copy, Link, Eye, Trash2,
  File, FileImage, FileSpreadsheet, RefreshCw,
  User, Mail, Plus, MessageSquare, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useDocumentInboxStore from '../stores/documentInboxStore'

const CATEGORIES = [
  { value: 'piece_identite', label: 'Pièce d\'identité' },
  { value: 'permis', label: 'Permis de conduire' },
  { value: 'carte_grise', label: 'Carte grise' },
  { value: 'releve_information', label: 'Relevé d\'information' },
  { value: 'rib', label: 'RIB' },
  { value: 'justificatif_domicile', label: 'Justificatif de domicile' },
  { value: 'kbis', label: 'KBIS' },
  { value: 'contrat_signe', label: 'Contrat signé' },
  { value: 'devis', label: 'Devis' },
  { value: 'mandat', label: 'Mandat' },
  { value: 'autre', label: 'Autre' },
]

const CATEGORY_LABELS = { 'piece_identite': 'Pièce d\'identité', 'permis': 'Permis', 'carte_grise': 'Carte grise', 'releve_information': 'Relevé info', 'rib': 'RIB', 'justificatif_domicile': 'Justificatif', 'kbis': 'KBIS', 'contrat_signe': 'Contrat', 'devis': 'Devis', 'mandat': 'Mandat', 'autre': 'Autre' }

const STATUS_COLORS = {
  'reçu': { bg: '#FEF3C7', text: '#92400E' },
  'en_analyse': { bg: '#DBEAFE', text: '#1E40AF' },
  'à_vérifier': { bg: '#FEE2E2', text: '#991B1B' },
  'accepté': { bg: '#D1FAE5', text: '#065F46' },
  'rejeté': { bg: '#FEE2E2', text: '#991B1B' },
}

function DocumentIcon({ category }) {
  const icons = { 'piece_identite': File, 'permis': File, 'carte_grise': FileImage, 'rib': FileSpreadsheet, 'contrat_signe': FileText, 'devis': FileText }
  const Icon = icons[category] || File
  return <Icon size={16} style={{ color: '#5B4DF5', opacity: 0.7 }} />
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Documents() {
  const [activeTab, setActiveTab] = useState('a-traiter')
  const [searchTerm, setSearchTerm] = useState('')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const {
    documents, requests, submissions, stats,
    fetchDocuments, fetchRequests, fetchSubmissions, fetchStats,
    uploadDocument, deleteDocument, loading,
  } = useDocumentInboxStore()

  useEffect(() => {
    fetchDocuments()
    fetchRequests()
    fetchSubmissions()
    fetchStats()
  }, [refreshKey])

  const filteredDocs = documents.filter(d => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return d.file_name?.toLowerCase().includes(q) ||
             (d.document_category || '').toLowerCase().includes(q)
    }
    return true
  })

  const tabContent = {
    'a-traiter': filteredDocs.filter(d => ['reçu', 'en_analyse', 'à_vérifier'].includes(d.status)),
    'classes': filteredDocs.filter(d => ['accepté', 'rejeté'].includes(d.status)),
    'manquantes': [], // sera calculé plus bas
    'envoyes': submissions,
  }

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'Inter', sans-serif", maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={22} style={{ color: '#5B4DF5' }} /> Documents
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            Gérez les pièces clients et les soumissions assurances
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowUploadModal(true)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
            <Upload size={14} /> Ajouter
          </button>
          <button onClick={() => setShowRequestModal(true)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#5B4DF5', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: '#fff' }}>
            <Plus size={14} /> Demander des pièces
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total documents', value: stats?.documents?.total || 0, color: '#5B4DF5' },
          { label: 'En attente', value: (parseInt(stats?.documents?.recu || 0) + parseInt(stats?.documents?.a_verifier || 0)), color: '#F59E0B' },
          { label: 'Acceptés', value: stats?.documents?.accepte || 0, color: '#10B981' },
          { label: 'Demandes envoyées', value: stats?.requests?.sent || 0, color: '#3B82F6' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #f0f0f0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{stat.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: stat.color, margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E5E7EB', marginBottom: 20 }}>
        {[
          { key: 'a-traiter', label: 'À traiter', count: tabContent['a-traiter'].length },
          { key: 'classes', label: 'Classés', count: tabContent['classes'].length },
          { key: 'manquantes', label: 'Pièces manquantes', count: 0 },
          { key: 'envoyes', label: 'Envoyés assurance', count: tabContent['envoyes'].length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 500,
              color: activeTab === tab.key ? '#5B4DF5' : '#6B7280',
              border: 'none', borderBottom: activeTab === tab.key ? '2px solid #5B4DF5' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {tab.label} {tab.count > 0 && <span style={{ fontSize: 11, background: activeTab === tab.key ? '#EEECFE' : '#F3F4F6', color: activeTab === tab.key ? '#5B4DF5' : '#6B7280', padding: '1px 7px', borderRadius: 10 }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher un document..."
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', background: '#fff' }} />
        </div>
        <button onClick={() => setRefreshKey(k => k + 1)}
          style={{ padding: 8, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex' }}>
          <RefreshCw size={14} style={{ color: '#6B7280' }} />
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {activeTab === 'a-traiter' && (
            tabContent['a-traiter'].length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>Aucun document à traiter</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tabContent['a-traiter'].map(doc => (
                  <div key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #f0f0f0', cursor: 'pointer' }}>
                    <DocumentIcon category={doc.document_category} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</p>
                      <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                        {CATEGORY_LABELS[doc.document_category] || doc.document_category} • {formatDate(doc.created_at)}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: STATUS_COLORS[doc.status]?.bg || '#F3F4F6', color: STATUS_COLORS[doc.status]?.text || '#6B7280', fontWeight: 500 }}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'classes' && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#F9FAFB' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Fichier</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Catégorie</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Client</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Statut</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6B7280' }}>Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#6B7280' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tabContent['classes'].map(doc => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111' }}>{doc.file_name}</td>
                      <td style={{ padding: '10px 14px', color: '#6B7280' }}>{CATEGORY_LABELS[doc.document_category] || doc.document_category}</td>
                      <td style={{ padding: '10px 14px', color: '#6B7280' }}>#{doc.client_id}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, background: STATUS_COLORS[doc.status]?.bg, color: STATUS_COLORS[doc.status]?.text, fontWeight: 500 }}>{doc.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6B7280' }}>{formatDate(doc.created_at)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button onClick={() => deleteDocument(doc.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'manquantes' && (
            <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
              <AlertCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>Sélectionnez un client pour voir les pièces manquantes</p>
              <p style={{ fontSize: 12, color: '#D1D5DB', marginTop: 4 }}>Les checklists apparaîtront ici après une demande de pièces</p>
            </div>
          )}

          {activeTab === 'envoyes' && (
            tabContent['envoyes'].length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                <Send size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>Aucune soumission envoyée</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tabContent['envoyes'].map(sub => (
                  <div key={sub.id} style={{ padding: '14px 18px', background: '#fff', borderRadius: 10, border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Send size={16} style={{ color: '#5B4DF5' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0 }}>{sub.insurer_email}</p>
                        <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>{sub.subject}</p>
                      </div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: sub.status === 'sent' ? '#D1FAE5' : '#FEF3C7', color: sub.status === 'sent' ? '#065F46' : '#92400E', fontWeight: 500 }}>
                        {sub.status === 'sent' ? 'Envoyé' : 'Brouillon'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadModal onClose={() => setShowUploadModal(false)} onUpload={(c, f, cat) => uploadDocument(c, f, cat)} />
        )}
      </AnimatePresence>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <RequestModal onClose={() => setShowRequestModal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Upload Modal ────────────────────────────────────────────────────────

function UploadModal({ onClose, onUpload }) {
  const [clientId, setClientId] = useState('')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clientId || !file) return toast.error('Client et fichier requis')
    setLoading(true)
    try {
      await onUpload(clientId, file, category)
      toast.success('Document ajouté')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} style={{ color: '#5B4DF5' }} /> Ajouter un document
          </h2>
          <button onClick={onClose} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Client ID</label>
            <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="ID du client"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Catégorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', background: '#fff' }}>
              <option value="">Détection auto</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Fichier</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png,.heic"
              style={{ width: '100%', padding: 6, borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13 }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: loading ? '#9CA3AF' : '#5B4DF5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Upload...' : 'Uploader'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Request Modal ───────────────────────────────────────────────────────

function RequestModal({ onClose }) {
  const [clientId, setClientId] = useState('')
  const [selectedDocs, setSelectedDocs] = useState([])
  const [message, setMessage] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [loading, setLoading] = useState(false)
  const createRequest = useDocumentInboxStore(s => s.createRequest)

  const toggleDoc = (val) => {
    setSelectedDocs(prev =>
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    )
  }

  const handleGenerate = async () => {
    if (!clientId || selectedDocs.length === 0) return toast.error('Client et pièces requis')
    setLoading(true)
    try {
      const result = await createRequest(clientId, selectedDocs, message, recipientEmail)
      setGeneratedLink(result.upload_url)
      toast.success('Lien généré !')
    } catch (err) {
      toast.error(err.message)
    }
    setLoading(false)
  }

  const copyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      toast.success('Lien copié !')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link size={16} style={{ color: '#5B4DF5' }} /> Demander des pièces
          </h2>
          <button onClick={onClose} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>

        {!generatedLink ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Client ID</label>
              <input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="ID du client"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>Pièces requises</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {CATEGORIES.map(c => (
                  <label key={c.value} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, border: selectedDocs.includes(c.value) ? '1px solid #5B4DF5' : '1px solid #E5E7EB', cursor: 'pointer', fontSize: 12, background: selectedDocs.includes(c.value) ? '#EEECFE' : '#fff' }}>
                    <input type="checkbox" checked={selectedDocs.includes(c.value)} onChange={() => toggleDoc(c.value)} style={{ accentColor: '#5B4DF5' }} />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Message (optionnel)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Message personnalisé pour le client..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Email du client</label>
              <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="client@email.com"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none' }} />
            </div>

            <button onClick={handleGenerate} disabled={loading}
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: loading ? '#9CA3AF' : '#5B4DF5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Génération...' : 'Générer le lien'}
            </button>
          </>
        ) : (
          <div>
            <div style={{ padding: 16, background: '#EEECFE', borderRadius: 10, marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#5B4DF5', margin: '0 0 8px' }}>Lien de téléchargement généré</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input readOnly value={generatedLink} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #D1CCF7', fontSize: 12, background: '#fff', outline: 'none' }} />
                <button onClick={copyLink} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: '#5B4DF5', color: '#fff', cursor: 'pointer' }}><Copy size={14} /></button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>Partagez ce lien avec votre client pour qu'il dépose ses pièces</p>
            <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12 }}>
              Fermer
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
