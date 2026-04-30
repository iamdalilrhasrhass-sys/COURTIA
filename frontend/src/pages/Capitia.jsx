/**
 * Capitia.jsx — Page module financement IOBSP / CAPITIA
 * 5 états : A (non soumis) B (en attente) C (actif) D (validé non payé) E (rejeté)
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, XCircle, Euro, Target, Calculator,
  FileText, TrendingUp, Users, Sparkles, ArrowRight, AlertCircle,
  Upload, X, Plus, ChevronDown, Building2, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import PageTransition from '../components/ui/PageTransition'
import AnimatedNumber from '../components/ui/AnimatedNumber'

// ─── Utilitaires ───────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtCurrency(v) {
  if (v == null || v === '') return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

// ─── Skeleton shimmer ──────────────────────────────────────────────────────────

function Shimmer({ w = '100%', h = 20, r = 8, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg, #f0ede8 25%, #e8e4de 50%, #f0ede8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s ease-in-out infinite'
    }} />
  )
}

// ─── Header commun ─────────────────────────────────────────────────────────────

function CapitiaHeader({ stateBadge }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="ca-header"
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)',
        borderBottom: '0.5px solid rgba(255,255,255,0.15)',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: -1 }}>CAPITIA</span>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            background: 'rgba(255,255,255,0.25)', color: 'white',
            padding: '2px 8px', borderRadius: 20,
            backdropFilter: 'blur(4px)'
          }}>ADD-ON</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 500 }}>
          Module Financement pour courtiers IOBSP
        </p>
      </div>
      {stateBadge}
    </motion.div>
  )
}

// ─── ÉTAT A : Formulaire soumission ───────────────────────────────────────────

function StateA({ onSuccess }) {
  const [orias, setOrias] = useState('')
  const [file, setFile] = useState(null)
  const [fileDataUrl, setFileDataUrl] = useState(null)
  const [certif, setCertif] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [experience, setExperience] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const oriasValid = /^\d{8}$/.test(orias)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
  const canSubmit = oriasValid && fileDataUrl && certif && emailValid && !loading

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5 Mo)')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setFileDataUrl(ev.target.result)
    reader.readAsDataURL(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      await api.post('/financing/iobsp/submit', {
        orias_number: orias,
        certif_uploaded: fileDataUrl,
        has_dda_certification: certif,
        contact_email: contactEmail,
        additional_info: experience || null
      })
      toast.success('Candidature soumise avec succès !')
      onSuccess()
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de la soumission'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    { icon: <Euro size={20} color="#2563eb" />, title: 'Commissions démultipliées', sub: '+30 à 50% de CA potentiel' },
    { icon: <Target size={20} color="#2563eb" />, title: 'Leads qualifiés', sub: 'Accès au portail partenaires banques' },
    { icon: <Calculator size={20} color="#2563eb" />, title: 'Simulateurs intégrés', sub: 'Offres en temps réel' },
  ]

  return (
    <div className="ca-container" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px' }}>
      {/* Bénéfices */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 28 }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#080808', margin: '0 0 6px' }}>
          Activez CAPITIA — Accédez au marché du financement immobilier
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
          Première étape : soumettez votre dossier IOBSP pour validation.
        </p>
        <div className="ca-benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 28 }}>
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              style={{
                background: 'white', border: '0.5px solid #e8e6e0',
                borderRadius: 14, padding: '20px 18px',
                display: 'flex', flexDirection: 'column', gap: 8
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {b.icon}
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#080808', margin: 0 }}>{b.title}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{b.sub}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Formulaire */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="ca-form-card"
        style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 16, padding: '28px 28px' }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#080808', margin: '0 0 20px' }}>
          Dossier de candidature IOBSP
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ORIAS */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Numéro ORIAS IOBSP (8 chiffres) *
            </label>
            <input
              value={orias}
              onChange={e => setOrias(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="12345678"
              maxLength={8}
              onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = orias.length > 0 && !oriasValid ? '#ef4444' : '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${orias.length > 0 && !oriasValid ? '#ef4444' : '#e5e7eb'}`,
                fontSize: 14, fontFamily: 'Arial, sans-serif', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s'
              }}
            />
            {orias.length > 0 && !oriasValid && (
              <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>8 chiffres requis</p>
            )}
          </div>

          {/* Email de contact */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Email de contact *
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="vous@cabinet.fr"
              onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = contactEmail.length > 0 && !emailValid ? '#ef4444' : '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: `1px solid ${contactEmail.length > 0 && !emailValid ? '#ef4444' : '#e5e7eb'}`,
                fontSize: 14, fontFamily: 'Arial, sans-serif', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s'
              }}
            />
            {contactEmail.length > 0 && !emailValid && (
              <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>Email invalide</p>
            )}
          </div>

          {/* Upload fichier */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Justificatif de compétence (PDF, max 5 Mo) *
            </label>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            {!file ? (
              <div
                onClick={() => fileRef.current.click()}
                style={{
                  border: '1.5px dashed #d1d5db', borderRadius: 10,
                  padding: '24px', textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#d1d5db'}
              >
                <Upload size={24} color="#9ca3af" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  Cliquez pour sélectionner un PDF
                </p>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', background: '#f0fdf4',
                border: '1px solid #bbf7d0', borderRadius: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="#16a34a" />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#080808', margin: 0 }}>{file.name}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
                      {(file.size / 1024).toFixed(0)} Ko
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => { setFile(null); setFileDataUrl(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={16} color="#9ca3af" />
                </button>
              </div>
            )}
          </div>

          {/* Expérience (optionnel) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Parcours et expérience en financement (optionnel)
            </label>
            <textarea
              value={experience}
              onChange={e => setExperience(e.target.value)}
              placeholder="Décrivez brièvement votre expérience en financement immobilier..."
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #e5e7eb', fontSize: 13,
                fontFamily: 'Arial, sans-serif', resize: 'vertical',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Certification */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={certif}
              onChange={e => setCertif(e.target.checked)}
              style={{ marginTop: 2, accentColor: '#2563eb', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              Je certifie sur l'honneur détenir les qualifications requises (article L.519-1 du Code monétaire et financier) *
            </span>
          </label>

          {/* Bouton */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: '13px 24px', borderRadius: 10,
              background: canSubmit ? '#2563eb' : '#e5e7eb',
              color: canSubmit ? 'white' : '#9ca3af',
              border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontSize: 14, fontWeight: 700, fontFamily: 'Arial, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Envoi en cours…' : 'Soumettre ma candidature'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

// ─── ÉTAT B : En attente ───────────────────────────────────────────────────────

function StateB({ data }) {
  const submittedAt = data?.submitted_at
  const hoursSince = submittedAt
    ? Math.floor((Date.now() - new Date(submittedAt).getTime()) / 3600000)
    : 0

  const steps = [
    { label: 'Soumission', done: true },
    { label: 'Examen', done: false, active: true },
    { label: 'Décision', done: false },
  ]

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 32px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="ca-stateb-card"
        style={{
          background: 'white', border: '0.5px solid #e8e6e0',
          borderRadius: 20, padding: '40px 36px', textAlign: 'center'
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'inline-flex', marginBottom: 20 }}
        >
          <Clock size={64} color="#2563eb" />
        </motion.div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#080808', margin: '0 0 8px' }}>
          Candidature en cours de validation
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 6px' }}>
          Soumise le {fmtDate(submittedAt)}
        </p>
        <p style={{ fontSize: 14, color: '#374151', margin: '0 0 28px', lineHeight: 1.6 }}>
          Votre dossier est étudié par notre équipe conformité.<br />
          Délai moyen : 24-48h ouvrées.
        </p>

        {/* Timeline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <motion.div
                  animate={s.active ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] } : {}}
                  transition={s.active ? { duration: 1.5, repeat: Infinity } : {}}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: s.done ? '#2563eb' : s.active ? '#eff6ff' : '#f0ede8',
                    border: s.active ? '2px solid #2563eb' : s.done ? 'none' : '2px solid #e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {s.done
                    ? <CheckCircle2 size={16} color="white" />
                    : s.active
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                          <Clock size={14} color="#2563eb" />
                        </motion.div>
                      : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db' }} />
                  }
                </motion.div>
                <span style={{ fontSize: 11, color: s.done || s.active ? '#2563eb' : '#9ca3af', fontWeight: s.active ? 700 : 400 }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 60, height: 2, background: s.done ? '#2563eb' : '#e5e7eb', margin: '0 4px', marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>

        {hoursSince > 72 && (
          <a
            href="mailto:support@courtia.fr"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#2563eb', textDecoration: 'none',
              padding: '9px 16px', border: '1px solid #bfdbfe',
              borderRadius: 8, background: '#eff6ff', fontWeight: 600
            }}
          >
            <AlertCircle size={14} /> Contacter le support
          </a>
        )}
      </motion.div>
    </div>
  )
}

// ─── ÉTAT E : Rejeté ───────────────────────────────────────────────────────────

function StateE({ data, onRestart }) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 32px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="ca-statee-card"
        style={{
          background: 'white', border: '0.5px solid #fecaca',
          borderRadius: 20, padding: '40px 36px', textAlign: 'center'
        }}
      >
        <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#080808', margin: '0 0 8px' }}>
          Candidature non acceptée
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
          Examinée le {fmtDate(data?.reviewed_at)}
        </p>
        <p style={{ fontSize: 14, color: '#374151', margin: '0 0 28px', lineHeight: 1.6 }}>
          Nous n'avons pas pu valider votre dossier.<br />
          Contactez-nous pour comprendre les motifs et soumettre à nouveau si éligible.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onRestart}
            style={{
              padding: '10px 20px', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: 9, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'Arial, sans-serif'
            }}
          >
            Nouvelle candidature
          </button>
          <a
            href="mailto:support@courtia.fr"
            style={{
              padding: '10px 20px', background: 'white', color: '#374151',
              border: '1px solid #e5e7eb', borderRadius: 9,
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <AlertCircle size={14} /> Contacter le support
          </a>
        </div>
      </motion.div>
    </div>
  )
}

// ─── ÉTAT D : Validé, add-on non payé ─────────────────────────────────────────

function StateD() {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await api.post('/financing/iobsp/reactivate')
      window.location.href = res.data.url
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement')
      setLoading(false)
    }
  }

  const perks = [
    'Simulateurs de crédit illimités',
    'Accès au réseau de 5 partenaires bancaires',
    'Soumission de leads financement',
    'Support dédié IOBSP'
  ]

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 32px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="ca-stated-card"
        style={{
          background: 'white', border: '0.5px solid #bbf7d0',
          borderRadius: 20, padding: '40px 36px', textAlign: 'center'
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'inline-flex', marginBottom: 20 }}
        >
          <CheckCircle2 size={64} color="#22c55e" />
        </motion.div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#080808', margin: '0 0 8px' }}>
          Félicitations ! Votre profil IOBSP est validé
        </h2>
        <p style={{ fontSize: 14, color: '#374151', margin: '0 0 28px', lineHeight: 1.6 }}>
          Activez maintenant CAPITIA pour accéder au module financement.
        </p>

        {/* Card tarifaire */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          border: '1px solid #bfdbfe', borderRadius: 14,
          padding: '24px', marginBottom: 24
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 8px' }}>
            CAPITIA Add-on
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: '#2563eb' }}>
              <AnimatedNumber value={49} duration={1.2} suffix="€" />
            </span>
            <span style={{ fontSize: 13, color: '#3b82f6' }}>/mois HT</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {perks.map((p, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1d4ed8' }}>
                <CheckCircle2 size={14} color="#2563eb" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCheckout}
          disabled={loading}
          style={{
            width: '100%', padding: '15px 24px',
            background: loading ? '#93c5fd' : '#2563eb',
            color: 'white', border: 'none', borderRadius: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700, fontFamily: 'Arial, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          {loading ? 'Redirection…' : 'Activer CAPITIA maintenant'}
          {!loading && <Zap size={16} />}
        </motion.button>
      </motion.div>
    </div>
  )
}

// ─── ÉTAT C : Dashboard actif ──────────────────────────────────────────────────

function SimulatorModal({ onClose }) {
  const [type, setType] = useState('immo')
  const [capital, setCapital] = useState('')
  const [taux, setTaux] = useState('')
  const [duree, setDuree] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSimulate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/financing/tools/simulate', {
        type, capital: parseFloat(capital),
        taux_nominal: parseFloat(taux),
        duree_mois: parseInt(duree, 10)
      })
      setResult(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur de simulation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{ background: 'white', borderRadius: 16, padding: '28px', width: '100%', maxWidth: 460 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#080808' }}>Simulateur de crédit</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#9ca3af" /></button>
        </div>
        <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <select value={type} onChange={e => setType(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Arial, sans-serif' }}>
            <option value="immo">Prêt Immobilier</option>
            <option value="conso">Prêt Consommation</option>
            <option value="regroupement">Regroupement de crédits</option>
          </select>
          {[
            { label: 'Capital (€)', val: capital, set: setCapital, placeholder: '200000' },
            { label: 'Taux nominal (%)', val: taux, set: setTaux, placeholder: '3.5' },
            { label: 'Durée (mois)', val: duree, set: setDuree, placeholder: '240' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                type="number" step="any" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button type="submit" disabled={!capital || !taux || !duree || loading}
            style={{ padding: '11px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
            {loading ? 'Calcul…' : 'Calculer'}
          </button>
        </form>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px' }}>
            <div className="ca-sim-result-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { l: 'Mensualité', v: fmtCurrency(result.mensualite) },
                { l: 'Coût total', v: fmtCurrency(result.cout_total) },
                { l: 'Coût du crédit', v: fmtCurrency(result.cout_credit) },
                { l: 'TAEG approx.', v: result.taeg_approx + '%' },
              ].map(r => (
                <div key={r.l}>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px' }}>{r.l}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#15803d', margin: 0 }}>{r.v}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

function LeadModal({ onClose }) {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [partnerId, setPartnerId] = useState('1')
  const [amount, setAmount] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/clients?limit=50').then(r => setClients(r.data?.data || r.data?.clients || [])).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!clientId || !amount || !duration) return
    setLoading(true)
    try {
      await api.post('/financing/tools/leads', {
        client_id: parseInt(clientId, 10),
        partner_id: parseInt(partnerId, 10),
        amount: parseFloat(amount),
        duration_months: parseInt(duration, 10),
        notes: notes || null
      })
      toast.success('Lead enregistré avec succès !')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la soumission')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        style={{ background: 'white', borderRadius: 16, padding: '28px', width: '100%', maxWidth: 460 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#080808' }}>Nouveau lead financement</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#9ca3af" /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Client *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Arial, sans-serif' }}>
              <option value="">Sélectionner un client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Partenaire bancaire *</label>
            <select value={partnerId} onChange={e => setPartnerId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Arial, sans-serif' }}>
              {[{id:1,name:'BNP Paribas'},{id:2,name:'Crédit Agricole'},{id:3,name:'Banque Populaire'},{id:4,name:'LCL'},{id:5,name:'Société Générale'}].map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {[
            { label: 'Montant souhaité (€) *', val: amount, set: setAmount, placeholder: '200000', type: 'number' },
            { label: 'Durée (mois) *', val: duration, set: setDuration, placeholder: '240', type: 'number' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Arial, sans-serif', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Arial, sans-serif', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={!clientId || !amount || !duration || loading}
            style={{ padding: '11px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
            {loading ? 'Envoi…' : 'Soumettre le lead'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

function StateC({ data, onRefresh }) {
  const navigate = useNavigate()
  const [simulators, setSimulators] = useState([])
  const [partners, setPartners] = useState([])
  const [showSimModal, setShowSimModal] = useState(false)
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    api.get('/financing/tools/simulators').then(r => setSimulators(r.data || [])).catch(() => {})
    api.get('/financing/tools/partners').then(r => setPartners(r.data?.partners || [])).catch(() => {})
  }, [])

  async function handleCancel() {
    setCancelling(true)
    try {
      await api.post('/financing/iobsp/cancel')
      toast.success('Add-on CAPITIA annulé. Accès actif jusqu\'à fin de période.')
      setShowCancelConfirm(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'annulation')
    } finally {
      setCancelling(false)
    }
  }

  const simIcons = { immo: <Building2 size={18} color="#2563eb" />, conso: <Euro size={18} color="#2563eb" />, regroupement: <TrendingUp size={18} color="#2563eb" /> }

  return (
    <div className="ca-container" style={{ maxWidth: 900, margin: '0 auto', padding: '28px 32px' }}>
      {/* Bandeau actif */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#f0fdf4', border: '0.5px solid #bbf7d0',
          borderRadius: 12, padding: '12px 18px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 8
        }}
      >
        <CheckCircle2 size={16} color="#16a34a" />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>CAPITIA ACTIF</span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>— Vous avez accès à tous les outils de financement IOBSP</span>
      </motion.div>

      <div className="ca-statec-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Bloc A : Simulateurs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 14, overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e8e6e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Calculator size={15} color="#080808" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#080808' }}>Simulateurs</span>
            </div>
            <button
              onClick={() => setShowSimModal(true)}
              style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'Arial, sans-serif' }}
            >
              Simuler →
            </button>
          </div>
          <div style={{ padding: '12px 0' }}>
            {simulators.length === 0
              ? [1, 2, 3].map(i => <div key={i} style={{ padding: '10px 20px' }}><Shimmer h={32} /></div>)
              : simulators.map((s, i) => (
                <motion.div
                  key={s.id} whileHover={{ x: 2 }}
                  onClick={() => setShowSimModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', borderBottom: i < simulators.length - 1 ? '0.5px solid #f7f6f2' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {simIcons[s.type] || <Calculator size={16} color="#2563eb" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#080808', margin: 0 }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{s.description}</p>
                  </div>
                  <ArrowRight size={13} color="#d1d5db" />
                </motion.div>
              ))
            }
          </div>
        </motion.div>

        {/* Bloc B : Partenaires */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 14, overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e8e6e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Building2 size={15} color="#080808" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#080808' }}>Partenaires bancaires</span>
            </div>
          </div>
          <div style={{ padding: '8px 0' }}>
            {partners.length === 0
              ? [1,2,3].map(i => <div key={i} style={{ padding: '10px 20px' }}><Shimmer h={28} /></div>)
              : partners.slice(0, 4).map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', borderBottom: i < 3 ? '0.5px solid #f7f6f2' : 'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.logo_color || '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#080808', margin: 0 }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.specialite}</p>
                  </div>
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, flexShrink: 0 }}>
                    {p.taux_min}%
                  </span>
                </div>
              ))
            }
          </div>
        </motion.div>
      </div>

      {/* Bloc C : Leads */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e8e6e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Users size={15} color="#080808" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#080808' }}>Leads financement</span>
          </div>
          <button
            onClick={() => setShowLeadModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Arial, sans-serif' }}
          >
            <Plus size={13} /> Nouveau lead
          </button>
        </div>
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <Users size={28} color="#d1d5db" style={{ margin: '0 auto 10px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#080808', margin: '0 0 4px' }}>
            Soumettez votre premier lead financement
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>
            Transmettez les dossiers de vos clients à nos partenaires bancaires
          </p>
          <button
            onClick={() => setShowLeadModal(true)}
            style={{ padding: '9px 18px', background: '#080808', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Arial, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} /> Nouveau lead
          </button>
        </div>
      </motion.div>

      {/* Boutons bas */}
      <div className="ca-statec-buttons" style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => navigate('/billing?addon=capitia')}
          style={{ padding: '9px 16px', background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Arial, sans-serif' }}>
          Gérer mon abonnement CAPITIA
        </button>
        <button onClick={() => setShowCancelConfirm(true)}
          style={{ padding: '9px 16px', background: 'none', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Arial, sans-serif' }}>
          Désactiver CAPITIA
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSimModal && <SimulatorModal onClose={() => setShowSimModal(false)} />}
        {showLeadModal && <LeadModal onClose={() => setShowLeadModal(false)} />}
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <motion.div
              initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              style={{ background: 'white', borderRadius: 14, padding: 28, maxWidth: 380, textAlign: 'center' }}
            >
              <AlertCircle size={32} color="#ef4444" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Désactiver CAPITIA ?</h3>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
                Votre accès restera actif jusqu'à la fin de la période en cours. Cette action est irréversible.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setShowCancelConfirm(false)}
                  style={{ padding: '9px 18px', background: '#f0ede8', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Arial, sans-serif' }}>
                  Annuler
                </button>
                <button onClick={handleCancel} disabled={cancelling}
                  style={{ padding: '9px 18px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Arial, sans-serif' }}>
                  {cancelling ? 'Annulation…' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Page principale ────────────────────────────────────────────────────────────

export default function Capitia() {
  const [searchParams] = useSearchParams()
  const [statusData, setStatusData] = useState(null)
  const [stateKey, setStateKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [forceStateA, setForceStateA] = useState(false)

  async function fetchStatus() {
    try {
      const res = await api.get('/financing/iobsp/status')
      setStatusData(res.data)
      setStateKey(res.data?.state || 'A')
    } catch {
      setStateKey('A')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Gestion retour Stripe
    const addonParam = searchParams.get('addon')
    if (addonParam === 'success') {
      toast.success('CAPITIA activé ! Bienvenue dans le module financement.')
    } else if (addonParam === 'cancelled') {
      toast('Paiement annulé.', { icon: 'ℹ️' })
    }
    fetchStatus()
  }, [searchParams])

  const stateBadgeMap = {
    A: { label: 'Non soumis', bg: '#f0ede8', color: '#6b7280' },
    B: { label: 'En attente', bg: '#eff6ff', color: '#2563eb' },
    C: { label: 'Actif', bg: '#f0fdf4', color: '#16a34a' },
    D: { label: 'Validé', bg: '#fefce8', color: '#ca8a04' },
    E: { label: 'Rejeté', bg: '#fef2f2', color: '#ef4444' },
  }
  const badge = stateBadgeMap[stateKey] || stateBadgeMap.A

  const stateBadge = (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
      background: badge.bg, color: badge.color
    }}>
      {badge.label}
    </span>
  )

  const effectiveState = forceStateA ? 'A' : stateKey

  return (
    <PageTransition>
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (max-width: 767px) {
          .ca-header { padding: 16px 16px !important; flex-direction: column !important; gap: 10px !important; align-items: flex-start !important; }
          .ca-container { padding: 20px 16px !important; }
          .ca-benefits-grid { grid-template-columns: 1fr !important; }
          .ca-statec-grid { grid-template-columns: 1fr !important; }
          .ca-stateb-card { padding: 28px 20px !important; }
          .ca-stated-card { padding: 28px 20px !important; }
          .ca-statee-card { padding: 28px 20px !important; }
          .ca-form-card { padding: 20px 16px !important; }
          .ca-statec-buttons { flex-direction: column !important; align-items: stretch !important; }
          .ca-sim-result-grid { grid-template-columns: 1fr !important; }
          .ca-loading-container { padding: 0 16px !important; }
        }
      `}</style>

      <CapitiaHeader stateBadge={loading ? <Shimmer w={80} h={28} r={20} /> : stateBadge} />

      {loading ? (
        <div className="ca-loading-container" style={{ maxWidth: 640, margin: '48px auto', padding: '0 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Shimmer h={120} r={14} />
          <Shimmer h={200} r={14} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {effectiveState === 'A' && (
            <motion.div key="A" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StateA onSuccess={() => { setForceStateA(false); fetchStatus() }} />
            </motion.div>
          )}
          {effectiveState === 'B' && (
            <motion.div key="B" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StateB data={statusData} />
            </motion.div>
          )}
          {effectiveState === 'C' && (
            <motion.div key="C" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StateC data={statusData} onRefresh={fetchStatus} />
            </motion.div>
          )}
          {effectiveState === 'D' && (
            <motion.div key="D" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StateD />
            </motion.div>
          )}
          {effectiveState === 'E' && (
            <motion.div key="E" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StateE data={statusData} onRestart={() => setForceStateA(true)} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
    </PageTransition>
  )
}
