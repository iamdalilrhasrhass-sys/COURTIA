import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

const inputStyle = {
  width: '100%', padding: '10px 12px',
  border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 14, fontFamily: 'Arial, sans-serif',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

export default function ContratNew() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({
    client_id: '',
    type_contrat: '',
    compagnie: '',
    numero: '',
    prime_annuelle: '',
    date_effet: '',
    date_echeance: '',
    statut: 'actif',
  })

  useEffect(() => {
    api.get('/clients')
      .then(r => {
        const arr = Array.isArray(r.data) ? r.data : (r.data?.data || r.data?.clients || [])
        setClients(arr)
        if (arr.length > 0) setForm(f => ({ ...f, client_id: String(arr[0].id) }))
      })
      .catch(() => {})
  }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const focus = e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }
  const blur = e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }

  const canSubmit = form.client_id && form.type_contrat.trim() && !loading

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        client_id: parseInt(form.client_id, 10),
        prime_annuelle: form.prime_annuelle ? parseFloat(form.prime_annuelle) : null,
      }
      await api.post('/contrats', payload)
      toast.success('Contrat créé avec succès !')
      navigate('/contrats')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2', fontFamily: 'Arial, sans-serif' }}>
      <style>{`
        @media (max-width: 767px) {
          .ct-header { padding: 12px 16px !important; }
          .ct-form-container { padding: 0 16px !important; margin: 20px auto !important; }
          .ct-form-card { padding: 20px 20px !important; }
          .ct-grid-2 { grid-template-columns: 1fr !important; }
          .ct-grid-3 { grid-template-columns: 1fr !important; }
          .ct-btn-row { flex-direction: column !important; }
          .ct-btn-row button { width: 100% !important; }
        }
      `}</style>
      {/* Header */}
      <div className="ct-header" style={{
        background: 'white', borderBottom: '0.5px solid #e8e6e0',
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button
          onClick={() => navigate('/contrats')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, fontFamily: 'Arial, sans-serif' }}
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <div style={{ width: 1, height: 18, background: '#e8e6e0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={16} color="#16a34a" />
          </div>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: '#080808', margin: 0 }}>Nouveau contrat</h1>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Créer une nouvelle fiche contrat</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="ct-form-container" style={{ maxWidth: 640, margin: '32px auto', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="ct-form-card"
          style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 16, padding: '32px 32px' }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <Field label="Client" required>
              <select value={form.client_id} onChange={set('client_id')} style={{ ...inputStyle, cursor: 'pointer' }}>
                {clients.length === 0 && <option value="">Aucun client</option>}
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.prenom || c.first_name || ''} {c.nom || c.last_name || ''}{c.email ? ` — ${c.email}` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <div className="ct-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Type de contrat" required>
                <input
                  value={form.type_contrat} onChange={set('type_contrat')} placeholder="Ex : Auto, Habitation, Santé"
                  onFocus={focus} onBlur={blur} style={inputStyle}
                />
              </Field>
              <Field label="Compagnie">
                <input
                  value={form.compagnie} onChange={set('compagnie')} placeholder="Ex : AXA, Allianz"
                  onFocus={focus} onBlur={blur} style={inputStyle}
                />
              </Field>
            </div>

            <div className="ct-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Numéro de contrat">
                <input
                  value={form.numero} onChange={set('numero')} placeholder="Ex : CTR-2026-001"
                  onFocus={focus} onBlur={blur} style={inputStyle}
                />
              </Field>
              <Field label="Prime annuelle (€)">
                <input
                  type="number" min="0" step="0.01"
                  value={form.prime_annuelle} onChange={set('prime_annuelle')} placeholder="Ex : 1200"
                  onFocus={focus} onBlur={blur} style={inputStyle}
                />
              </Field>
            </div>

            <div className="ct-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <Field label="Date d'effet">
                <input
                  type="date" value={form.date_effet} onChange={set('date_effet')}
                  onFocus={focus} onBlur={blur} style={inputStyle}
                />
              </Field>
              <Field label="Date d'échéance">
                <input
                  type="date" value={form.date_echeance} onChange={set('date_echeance')}
                  onFocus={focus} onBlur={blur} style={inputStyle}
                />
              </Field>
              <Field label="Statut">
                <select value={form.statut} onChange={set('statut')} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="actif">Actif</option>
                  <option value="en attente">En attente</option>
                  <option value="résilié">Résilié</option>
                </select>
              </Field>
            </div>

            <div className="ct-btn-row" style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <motion.button
                type="submit"
                disabled={!canSubmit}
                whileHover={canSubmit ? { y: -1 } : {}}
                whileTap={canSubmit ? { scale: 0.98 } : {}}
                style={{
                  flex: 1, padding: '13px',
                  background: canSubmit ? '#080808' : '#e5e7eb',
                  color: canSubmit ? 'white' : '#9ca3af',
                  border: 'none', borderRadius: 9, cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontSize: 14, fontWeight: 700, fontFamily: 'Arial, sans-serif',
                }}
              >
                {loading ? 'Création en cours…' : 'Créer le contrat'}
              </motion.button>
              <button
                type="button"
                onClick={() => navigate('/contrats')}
                style={{
                  padding: '13px 20px', background: 'white', color: '#374151',
                  border: '1px solid #e5e7eb', borderRadius: 9, cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, fontFamily: 'Arial, sans-serif',
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
