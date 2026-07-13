import { useMemo, useState } from 'react'
import { CalendarPlus, CheckCircle2, PhoneCall, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi } from '../../api/salesProspecting'
import { INTEREST_LABELS, NEXT_STEP_LABELS, OUTCOME_LABELS } from '../../lib/salesProspecting'

const emptyResult = {
  outcome: '',
  contacted_person_name: '',
  contacted_person_role: '',
  direct_phone: '',
  direct_email: '',
  interest_level: '',
  identified_need: '',
  comment: '',
  next_step: '',
  callback_decision: '',
  callback_at: '',
  suggested_time: '',
  alternate_contact: '',
  alternate_phone: '',
  alternate_email: '',
}

function localDateTime(hours = 24) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000)
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function CallOutcomeWizard({ cabinet, call, onComplete, onCancel }) {
  const [form, setForm] = useState({ ...emptyResult, direct_phone: cabinet.phone || '', direct_email: cabinet.professional_email || '' })
  const [appointment, setAppointment] = useState({
    starts_at: localDateTime(48),
    duration_minutes: 30,
    attendee_name: cabinet.primary_contact_name || '',
    format: 'visioconference',
    phone: cabinet.phone || '',
    meeting_url: '',
    address: cabinet.address || '',
    preparation_notes: '',
    reminder_minutes: 60,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const reached = form.outcome === 'oui'
  const wantsAppointment = reached && form.next_step === 'organiser_demo'

  const canSubmit = useMemo(() => {
    if (!form.outcome) return false
    if (reached) {
      const reachedFields = Boolean(form.contacted_person_name && form.interest_level && form.identified_need && form.next_step)
      const appointmentFields = !wantsAppointment || Boolean(appointment.starts_at && appointment.attendee_name && appointment.format)
      return reachedFields && appointmentFields
    }
    if (!form.comment || !form.callback_decision) return false
    if (form.callback_decision === 'oui' && !form.callback_at) return false
    return true
  }, [appointment, form, reached, wantsAppointment])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setAppointmentValue = (key, value) => setAppointment((current) => ({ ...current, [key]: value }))

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        reached,
        callback_at: form.callback_at ? new Date(form.callback_at).toISOString() : null,
      }
      await salesApi.completeCall(call.id, payload)
      if (wantsAppointment) {
        await salesApi.createAppointment(cabinet.id, {
          ...appointment,
          event_type: 'demonstration',
          starts_at: new Date(appointment.starts_at).toISOString(),
        })
      }
      toast.success(wantsAppointment ? 'Appel et démonstration enregistrés' : 'Résultat de l’appel enregistré')
      onComplete?.()
    } catch (requestError) {
      const details = requestError?.response?.data?.details
      setError(Array.isArray(details) ? details.join(' · ') : requestError?.response?.data?.error || 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sales-modal-backdrop" role="presentation">
      <section className="sales-modal sales-call-wizard" role="dialog" aria-modal="true" aria-labelledby="call-wizard-title">
        <header className="sales-modal-head">
          <div>
            <span className="sales-kicker"><PhoneCall size={14} /> Appel en cours</span>
            <h2 id="call-wizard-title">{cabinet.trade_name || cabinet.legal_name}</h2>
            <p>{cabinet.phone || 'Téléphone non renseigné'} · le résultat est obligatoire</p>
          </div>
          <button className="sales-icon-button" onClick={onCancel} aria-label="Annuler l’appel"><X size={18} /></button>
        </header>

        <form onSubmit={submit} className="sales-modal-body">
          <div className="sales-form-section">
            <label className="sales-question">L’appel a-t-il abouti ?</label>
            <div className="sales-choice-grid sales-outcomes">
              {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                <button key={value} type="button" className={`sales-choice ${form.outcome === value ? 'is-selected' : ''}`} onClick={() => set('outcome', value)}>
                  {value === 'oui' && <CheckCircle2 size={15} />}{label}
                </button>
              ))}
            </div>
          </div>

          {form.outcome && reached && (
            <div className="sales-form-section sales-form-grid">
              <label>Personne contactée *<input value={form.contacted_person_name} onChange={(e) => set('contacted_person_name', e.target.value)} /></label>
              <label>Fonction<input value={form.contacted_person_role} onChange={(e) => set('contacted_person_role', e.target.value)} /></label>
              <label>Téléphone direct<input value={form.direct_phone} onChange={(e) => set('direct_phone', e.target.value)} /></label>
              <label>E-mail direct<input type="email" value={form.direct_email} onChange={(e) => set('direct_email', e.target.value)} /></label>
              <label>Niveau d’intérêt *
                <select value={form.interest_level} onChange={(e) => set('interest_level', e.target.value)}>
                  <option value="">Choisir</option>
                  {Object.entries(INTEREST_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>Prochaine étape *
                <select value={form.next_step} onChange={(e) => set('next_step', e.target.value)}>
                  <option value="">Choisir</option>
                  {Object.entries(NEXT_STEP_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="sales-span-2">Besoin identifié *<textarea rows="3" value={form.identified_need} onChange={(e) => set('identified_need', e.target.value)} /></label>
              <label className="sales-span-2">Commentaire<textarea rows="2" value={form.comment} onChange={(e) => set('comment', e.target.value)} /></label>
            </div>
          )}

          {form.outcome && !reached && (
            <div className="sales-form-section sales-form-grid">
              <label className="sales-span-2">Pourquoi l’appel n’a-t-il pas abouti ? *<textarea rows="3" value={form.comment} onChange={(e) => set('comment', e.target.value)} placeholder="Standard fermé, interlocuteur absent, numéro erroné…" /></label>
              <label>Faut-il rappeler ? *
                <select value={form.callback_decision} onChange={(e) => set('callback_decision', e.target.value)}>
                  <option value="">Choisir</option><option value="oui">Oui</option><option value="non">Non</option><option value="plus_tard">À décider plus tard</option>
                </select>
              </label>
              {form.callback_decision === 'oui' && <label>Date de rappel *<input type="datetime-local" value={form.callback_at} min={localDateTime(1)} onChange={(e) => set('callback_at', e.target.value)} /></label>}
              <label>Heure conseillée<input value={form.suggested_time} onChange={(e) => set('suggested_time', e.target.value)} placeholder="Ex. après 14 h" /></label>
              <label>Autre contact<input value={form.alternate_contact} onChange={(e) => set('alternate_contact', e.target.value)} /></label>
              <label>Autre numéro<input value={form.alternate_phone} onChange={(e) => set('alternate_phone', e.target.value)} /></label>
              <label>Autre e-mail<input type="email" value={form.alternate_email} onChange={(e) => set('alternate_email', e.target.value)} /></label>
            </div>
          )}

          {wantsAppointment && (
            <div className="sales-form-section sales-appointment-inline">
              <div className="sales-section-title"><CalendarPlus size={17} /><div><strong>Programmer la démonstration</strong><span>L’événement, la tâche de préparation et le rappel seront créés automatiquement.</span></div></div>
              <div className="sales-form-grid">
                <label>Date et heure *<input type="datetime-local" value={appointment.starts_at} onChange={(e) => setAppointmentValue('starts_at', e.target.value)} /></label>
                <label>Durée<select value={appointment.duration_minutes} onChange={(e) => setAppointmentValue('duration_minutes', Number(e.target.value))}><option value="20">20 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option></select></label>
                <label>Personne rencontrée *<input value={appointment.attendee_name} onChange={(e) => setAppointmentValue('attendee_name', e.target.value)} /></label>
                <label>Format *<select value={appointment.format} onChange={(e) => setAppointmentValue('format', e.target.value)}><option value="telephone">Téléphone</option><option value="visioconference">Visioconférence</option><option value="presentiel">Présentiel</option></select></label>
                {appointment.format === 'visioconference' && <label className="sales-span-2">Lien de visioconférence<input value={appointment.meeting_url} onChange={(e) => setAppointmentValue('meeting_url', e.target.value)} /></label>}
                {appointment.format === 'presentiel' && <label className="sales-span-2">Adresse<input value={appointment.address} onChange={(e) => setAppointmentValue('address', e.target.value)} /></label>}
                <label className="sales-span-2">Notes de préparation<textarea rows="2" value={appointment.preparation_notes} onChange={(e) => setAppointmentValue('preparation_notes', e.target.value)} /></label>
              </div>
            </div>
          )}

          {error && <div className="sales-error">{error}</div>}
          <footer className="sales-modal-actions">
            <button type="button" className="sales-button secondary" onClick={onCancel}>Annuler et libérer la fiche</button>
            <button type="submit" className="sales-button primary" disabled={!canSubmit || saving}>{saving ? 'Enregistrement…' : wantsAppointment ? 'Enregistrer et programmer' : 'Enregistrer le résultat'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
