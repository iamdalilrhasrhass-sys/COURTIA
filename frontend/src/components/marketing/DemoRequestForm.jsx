import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { trackMarketingEvent } from '../../lib/marketingEvents'
import { useNavigate } from 'react-router-dom'
import {
  CAPTURE_ERROR_MESSAGE,
  captureAcquisition,
  isHoneypotTripped,
  mergeAcquisition,
  postDemoRequest,
  readWindowContext,
  resolveRedirect,
} from '../../lib/leadCapture'

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
  // Champ piège anti-robot : jamais rempli par un humain.
  website: '',
}

export default function DemoRequestForm({ compact = false }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle')
  const [feedback, setFeedback] = useState('')

  // Acquisition figée à l'arrivée sur la page (UTM, referrer, landing page).
  const acquisition = useMemo(() => captureAcquisition(readWindowContext()), [])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setStatus('idle')
    setFeedback('')

    /* Piège anti-robot : rien n'est envoyé, rien n'est affiché, aucune
       redirection — le robot ne peut pas savoir qu'il a été filtré. */
    if (isHoneypotTripped(form)) {
      setForm(INITIAL_FORM)
      return
    }

    if (!form.first_name || !form.last_name || !form.company_name || !form.email || !form.consent) {
      setStatus('error')
      setFeedback('Merci de compléter les champs obligatoires et de confirmer le consentement.')
      return
    }

    setLoading(true)
    try {
      const payload = mergeAcquisition({ ...form }, acquisition)
      const data = await postDemoRequest(payload)
      await trackMarketingEvent('submit_demo_request', {
        city: form.city || '',
        team_size: form.team_size || '',
        variant: compact ? 'contact_compact' : 'demo_page',
      })
      setStatus('success')
      setFeedback('Votre demande est bien reçue. Nous vous conduisons à la démonstration…')
      setForm(INITIAL_FORM)
      /* Le lead est ENREGISTRÉ avant toute redirection : on ne sacrifie jamais
         la capture pour naviguer. La démonstration prend le relais aussitôt. */
      const target = resolveRedirect(data)
      setTimeout(() => navigate(target), 1400)
    } catch (err) {
      /* Échec réel d'enregistrement : message d'erreur explicite, AUCUNE
         redirection vers /demo — sinon la demande serait silencieusement perdue. */
      setStatus('error')
      setFeedback(
        err?.message
          ? `${CAPTURE_ERROR_MESSAGE} ${err.message}`
          : `${CAPTURE_ERROR_MESSAGE} Merci de réessayer dans un instant.`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mk-form" onSubmit={submit}>
      {/* Piège anti-robot : champ invisible, hors du flux, non focusable.
          Un humain ne le voit ni ne le remplit jamais. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: 1,
          height: 1,
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <label htmlFor="courtia-demo-website">Site web</label>
        <input
          id="courtia-demo-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => updateField('website', e.target.value)}
        />
      </div>
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
