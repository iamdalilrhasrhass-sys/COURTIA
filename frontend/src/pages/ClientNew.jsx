import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, UserPlus } from 'lucide-react'
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

export default function ClientNew() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    statut: 'prospect', segment: 'particulier', profession: '',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const canSubmit = form.prenom.trim() && form.nom.trim() && !loading

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      await api.post('/api/clients', form)
      toast.success('Client créé avec succès !')
      navigate('/clients')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f2', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'white', borderBottom: '0.5px solid #e8e6e0',
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button
          onClick={() => navigate('/clients')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, fontFamily: 'Arial, sans-serif' }}
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <div style={{ width: 1, height: 18, background: '#e8e6e0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserPlus size={16} color="#2563eb" />
          </div>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: '#080808', margin: 0 }}>Nouveau client</h1>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Créer une nouvelle fiche client</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 640, margin: '32px auto', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ background: 'white', border: '0.5px solid #e8e6e0', borderRadius: 16, padding: '32px 32px' }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Prénom" required>
                <input
                  value={form.prenom} onChange={set('prenom')} placeholder="Jean" required
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                  style={inputStyle}
                />
              </Field>
              <Field label="Nom" required>
                <input
                  value={form.nom} onChange={set('nom')} placeholder="Dupont" required
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Email">
                <input
                  type="email" value={form.email} onChange={set('email')} placeholder="jean@email.fr"
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                  style={inputStyle}
                />
              </Field>
              <Field label="Téléphone">
                <input
                  type="tel" value={form.telephone} onChange={set('telephone')} placeholder="06 00 00 00 00"
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <Field label="Statut">
                <select value={form.statut} onChange={set('statut')} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="prospect">Prospect</option>
                  <option value="actif">Actif</option>
                  <option value="résilié">Résilié</option>
                </select>
              </Field>
              <Field label="Segment">
                <select value={form.segment} onChange={set('segment')} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="particulier">Particulier</option>
                  <option value="professionnel">Professionnel</option>
                  <option value="entreprise">Entreprise</option>
                </select>
              </Field>
              <Field label="Profession">
                <input
                  value={form.profession} onChange={set('profession')} placeholder="Ex : Médecin"
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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
                {loading ? 'Création en cours…' : 'Créer le client'}
              </motion.button>
              <button
                type="button"
                onClick={() => navigate('/clients')}
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
