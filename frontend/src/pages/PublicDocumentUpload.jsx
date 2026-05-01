import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Check, AlertCircle, Clock, FileText, ArrowLeft,
  Shield, Lock, X, File, FileImage, FileSpreadsheet,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '../components/Logo'

const API_URL = import.meta.env.VITE_API_URL || ''

const CATEGORY_LABELS = {
  'piece_identite': 'Pièce d\'identité',
  'permis': 'Permis de conduire',
  'carte_grise': 'Carte grise',
  'releve_information': 'Relevé d\'information',
  'rib': 'RIB',
  'justificatif_domicile': 'Justificatif de domicile',
  'kbis': 'KBIS',
  'contrat_signe': 'Contrat signé',
  'devis': 'Devis',
  'mandat': 'Mandat',
  'autre': 'Autre',
}

const FILE_ICONS = {
  'application/pdf': FileText,
  'image/jpeg': FileImage,
  'image/png': FileImage,
  'image/heic': FileImage,
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' o'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko'
  return (bytes / 1024 / 1024).toFixed(1) + ' Mo'
}

export default function PublicDocumentUpload() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [requestInfo, setRequestInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)

  // Récupérer les infos de la demande
  useEffect(() => {
    if (!token) {
      setError('Lien invalide')
      setLoading(false)
      return
    }

    const fetchRequest = async () => {
      try {
        const res = await fetch(`${API_URL}/api/document-inbox/public/request/${token}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || err.error || 'Lien invalide ou expiré')
        }
        const data = await res.json()
        if (data.success) {
          setRequestInfo(data.data)
          setUploadedFiles(data.data.uploads || [])
        } else {
          throw new Error('Erreur lors du chargement')
        }
      } catch (err) {
        setError(err.message)
      }
      setLoading(false)
    }

    fetchRequest()
  }, [token])

  const handleFiles = useCallback((newFiles) => {
    const validFiles = []
    for (const file of newFiles) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!['pdf', 'jpg', 'jpeg', 'png', 'heic'].includes(ext)) {
        toast.error(`${file.name} : format non accepté (PDF, JPG, PNG, HEIC)`)
        continue
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} : fichier trop volumineux (max 20 Mo)`)
        continue
      }
      validFiles.push(file)
    }
    setFiles(prev => [...prev, ...validFiles].slice(0, 10))
  }, [])

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }, [handleFiles])

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleInputChange = (e) => {
    handleFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const uploadFiles = async () => {
    if (files.length === 0) return toast.error('Ajoutez au moins un fichier')
    setUploading(true)

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`${API_URL}/api/document-inbox/public/upload/${token}`, {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.message || data.error || 'Upload échoué')

        setUploadedFiles(prev => [...prev, {
          file_name: file.name,
          document_category: 'autre',
          status: 'reçu',
          created_at: new Date().toISOString(),
        }])
        toast.success(`${file.name} envoyé avec succès !`)
      } catch (err) {
        toast.error(`${file.name} : ${err.message}`)
      }
    }

    setFiles([])
    setUploading(false)

    // Recharge les infos pour mettre à jour la checklist
    try {
      const res = await fetch(`${API_URL}/api/document-inbox/public/request/${token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) setRequestInfo(data.data)
      }
    } catch {}
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#5B4DF5', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#6B7280' }}>Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f6f2', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
          <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Lien invalide</h1>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{error}</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>Vérifiez le lien reçu ou contactez votre courtier.</p>
        </div>
      </div>
    )
  }

  const missing = requestInfo?.missing || []
  const isComplete = missing.length === 0 && (requestInfo?.required_docs || []).length > 0

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2', fontFamily: "'Inter', sans-serif" }}>
      {/* Header minimal */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
        <Logo size={28} textSize={11} />
        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Espace client sécurisé</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#10B981' }}>
          <Lock size={12} /> Chiffré
        </div>
      </div>

      <div style={{ maxWidth: 580, margin: '40px auto', padding: '0 20px' }}>
        {/* Infos client */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>
            Bonjour{requestInfo?.client_name ? ` ${requestInfo?.client_name?.split(' ')[0]}` : ''} 👋
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            Déposez les pièces demandées par votre courtier
          </p>
        </div>

        {/* Message personnalisé */}
        {requestInfo?.message && (
          <div style={{ padding: '14px 18px', background: '#EEECFE', borderRadius: 10, marginBottom: 24, fontSize: 13, color: '#4B3DB5', lineHeight: 1.5 }}>
            <p style={{ margin: 0 }}>{requestInfo.message}</p>
          </div>
        )}

        {/* Checklist */}
        {requestInfo?.required_docs && requestInfo.required_docs.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', padding: 20, marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={16} style={{ color: '#5B4DF5' }} /> Pièces demandées
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requestInfo.required_docs.map((doc, i) => {
                const received = uploadedFiles.some(u => u.document_category === doc)
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: received ? '#F0FDF4' : '#F9FAFB',
                    border: received ? '1px solid #BBF7D0' : '1px solid #F3F4F6',
                  }}>
                    {received ? (
                      <Check size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #D1D5DB', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: received ? 600 : 500, color: received ? '#065F46' : '#374151', flex: 1 }}>
                      {CATEGORY_LABELS[doc] || doc}
                    </span>
                    {received && (
                      <span style={{ fontSize: 10, color: '#065F46', fontWeight: 500 }}>Reçu</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Fichiers déjà uploadés */}
        {uploadedFiles.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', padding: 20, marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: '0 0 10px' }}>
              Fichiers envoyés ({uploadedFiles.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {uploadedFiles.map((f, i) => {
                const Icon = FILE_ICONS[f.mime_type] || File
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: '#F9FAFB', fontSize: 12 }}>
                    <Icon size={14} style={{ color: '#5B4DF5' }} />
                    <span style={{ flex: 1, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#D1FAE5', color: '#065F46' }}>Reçu</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Zone d'upload */}
        {!isComplete && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={16} style={{ color: '#5B4DF5' }} /> Ajouter des fichiers
            </h2>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: `2px dashed ${dragOver ? '#5B4DF5' : '#E5E7EB'}`,
                borderRadius: 10,
                padding: 32,
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? '#EEECFE' : '#F9FAFB',
                transition: 'all 0.15s',
                marginBottom: files.length > 0 ? 16 : 0,
              }}
              onClick={() => document.getElementById('file-input').click()}
            >
              <Upload size={28} style={{ color: dragOver ? '#5B4DF5' : '#9CA3AF', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: dragOver ? '#5B4DF5' : '#374151', margin: '0 0 4px' }}>
                {dragOver ? 'Déposez vos fichiers ici' : 'Cliquez ou glissez vos fichiers'}
              </p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>PDF, JPG, PNG ou HEIC — max 20 Mo</p>
            </div>
            <input id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.heic" onChange={handleInputChange} style={{ display: 'none' }} />

            {/* Files list before upload */}
            {files.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', margin: '0 0 8px' }}>
                  {files.length} fichier(s) à envoyer
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {files.map((file, i) => {
                    const Icon = FILE_ICONS[file.type] || File
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: '#F3F4F6' }}>
                        <Icon size={14} style={{ color: '#5B4DF5' }} />
                        <span style={{ flex: 1, fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{formatFileSize(file.size)}</span>
                        <button onClick={() => removeFile(i)} style={{ padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444' }}><X size={12} /></button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
            {files.length > 0 && (
              <button onClick={uploadFiles} disabled={uploading}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                  background: uploading ? '#9CA3AF' : '#5B4DF5', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                {uploading ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Envoi en cours...
                  </>
                ) : (
                  <><Upload size={14} /> Envoyer {files.length} fichier(s)</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Message si tout est reçu */}
        {isComplete && (
          <div style={{ padding: 32, background: '#F0FDF4', borderRadius: 12, border: '1px solid #BBF7D0', textAlign: 'center' }}>
            <Check size={40} style={{ color: '#10B981', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#065F46', margin: '0 0 6px' }}>Dossier complet !</h2>
            <p style={{ fontSize: 13, color: '#047857', margin: 0 }}>Toutes les pièces demandées ont été reçues. Votre courtier va traiter votre dossier.</p>
          </div>
        )}

        {/* Sécurité */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: '#9CA3AF', padding: '20px 0' }}>
          <Shield size={12} />
          <span>Transmission sécurisée • COURTIA</span>
        </div>
      </div>
    </div>
  )
}
