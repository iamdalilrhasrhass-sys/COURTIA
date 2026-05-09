import { useState } from 'react'
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiPost } from '../../utils/api'
import { trackMarketingEvent } from '../../lib/marketingEvents'

const TEAM_SIZES = [
  '1',
  '2-5',
  '6-10',
  '11-20',
  '20+',
]

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  company_name: '',
  email: '',
  phone: '',
  city: '',
  team_size: '',
  current_tools: '',
  wants_google_calendar: false,
  wants_whatsapp: false,
  wants_email_sync: false,
  message: '',
  consent: false,
}

export default function DemoRequestForm({ compact = false }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle')
  const [feedback, setFeedback] = useState('')

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setStatus('idle')
    setFeedback('')

    if (!form.first_name || !form.last_name || !form.company_name || !form.email || !form.consent) {
      setStatus('error')
      setFeedback('Merci de compléter les champs obligatoires et de confirmer le consentement.')
      return
    }

    setLoading(true)
    try {
      await apiPost('/leads/demo-request', {
        ...form,
        source: compact ? 'landing_compact' : 'landing',
      })
      await trackMarketingEvent('submit_demo_request', {
        city: form.city || '',
        team_size: form.team_size || '',
      })
      setStatus('success')
      setFeedback('Votre demande est bien reçue. Nous revenons vers vous rapidement pour planifier la démo.')
      setForm(INITIAL_FORM)
    } catch (err) {
      setStatus('error')
      setFeedback(err?.message || 'Impossible d\'envoyer la demande pour le moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mk-form" onSubmit={submit}>
      <div className="mk-form-grid">
        <label>
          Prénom *
          <input value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} placeholder="Prénom" required />
        </label>
        <label>
          Nom *
          <input value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} placeholder="Nom" required />
        </label>
        <label>
          Cabinet *
          <input value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} placeholder="Nom du cabinet" required />
        </label>
        <label>
          Email professionnel *
          <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="nom@cabinet.fr" required />
        </label>
        <label>
          Téléphone (optionnel)
          <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="06 00 00 00 00" />
        </label>
        <label>
          Ville
          <input value={form.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Lyon" />
        </label>
        <label>
          Collaborateurs
          <select value={form.team_size} onChange={(e) => updateField('team_size', e.target.value)}>
            <option value="">Sélectionner</option>
            {TEAM_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <label className="full">
          Outils actuels
          <input
            value={form.current_tools}
            onChange={(e) => updateField('current_tools', e.target.value)}
            placeholder="Ex: Excel, CRM, Agenda Google, WhatsApp"
          />
        </label>
        <label className="full">
          Message
          <textarea
            value={form.message}
            onChange={(e) => updateField('message', e.target.value)}
            placeholder="Quels enjeux souhaitez-vous résoudre avec COURTIA ?"
          />
        </label>
        <label className="full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.wants_google_calendar}
            onChange={(e) => updateField('wants_google_calendar', e.target.checked)}
            style={{ width: 15, height: 15 }}
          />
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(236,242,255,0.74)' }}>
            Je souhaite connecter Google Agenda
          </span>
        </label>
        <label className="full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.wants_whatsapp}
            onChange={(e) => updateField('wants_whatsapp', e.target.checked)}
            style={{ width: 15, height: 15 }}
          />
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(236,242,255,0.74)' }}>
            Je souhaite connecter WhatsApp Business
          </span>
        </label>
        <label className="full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.wants_email_sync}
            onChange={(e) => updateField('wants_email_sync', e.target.checked)}
            style={{ width: 15, height: 15 }}
          />
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(236,242,255,0.74)' }}>
            Je souhaite centraliser Gmail / Outlook
          </span>
        </label>
        <label className="full" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => updateField('consent', e.target.checked)}
            style={{ width: 15, height: 15, marginTop: 2 }}
          />
          <span style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(236,242,255,0.74)' }}>
            J'accepte d'être recontacté(e) par COURTIA au sujet de ma demande de démo (prospection B2B, opt-out possible à tout moment).
          </span>
        </label>
      </div>

      <p className="mk-inline-note" style={{ margin: '10px 0 0' }}>
        COURTIA traite uniquement les données nécessaires à votre demande. Aucune cession à des tiers.
      </p>

      <button
        type="submit"
        className="mk-button primary"
        disabled={loading}
        style={{ marginTop: 12, width: '100%', opacity: loading ? 0.75 : 1 }}
      >
        {loading ? 'Envoi en cours...' : 'Demander une démo'} <ArrowRight size={14} />
      </button>

      {status === 'success' && (
        <div className="mk-form-result ok" role="status">
          <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {feedback}
        </div>
      )}

      {status === 'error' && (
        <div className="mk-form-result err" role="alert">
          <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {feedback}
        </div>
      )}
    </form>
  )
}
