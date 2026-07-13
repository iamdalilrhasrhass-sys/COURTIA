import { useState } from 'react'
import { Building2, CalendarPlus, Clock3, ExternalLink, FileSignature, Mail, MapPin, MessageSquarePlus, Phone, PhoneCall, RefreshCw, ShieldAlert, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi } from '../../api/salesProspecting'
import { formatDateTime, formatMoney, INTEREST_LABELS, PIPELINE_LABELS, SIZE_LABELS } from '../../lib/salesProspecting'

function dateTimeIn(hours) {
  const date = new Date(Date.now() + hours * 3600000)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function CabinetDrawer({ detail, user, onClose, onStartCall, onRefresh }) {
  const { cabinet, calls = [], notes = [], assignment_history: assignments = [], status_history: statuses = [], followups = [], appointments = [], proposals = [] } = detail
  const [tab, setTab] = useState('resume')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState(cabinet.commercial_status)
  const [justification, setJustification] = useState('')
  const [followup, setFollowup] = useState({ due_at: dateTimeIn(24), instructions: '' })
  const [appointment, setAppointment] = useState({ event_type: 'rendez_vous', starts_at: dateTimeIn(48), duration_minutes: 30, attendee_name: cabinet.primary_contact_name || '', format: 'visioconference', meeting_url: '', preparation_notes: '' })
  const [proposal, setProposal] = useState({ amount_eur: '', status: 'a_envoyer', subject: `Proposition Courtiark — ${cabinet.trade_name || cabinet.legal_name}`, notes: '' })
  const [saving, setSaving] = useState(false)

  async function run(work, success) {
    setSaving(true)
    try {
      await work()
      toast.success(success)
      await onRefresh?.()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Action impossible')
    } finally {
      setSaving(false)
    }
  }

  const lockedByOther = cabinet.locked_by && Number(cabinet.locked_by) !== Number(user.id)
  const cannotCall = cabinet.do_not_contact || cabinet.is_client || ['ne_plus_contacter', 'cabinet_ferme', 'signe', 'client_actif'].includes(cabinet.commercial_status)

  return (
    <div className="sales-drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="sales-drawer" role="dialog" aria-modal="true" aria-labelledby="cabinet-title">
        <header className="sales-drawer-head">
          <div className="sales-company-avatar"><Building2 size={20} /></div>
          <div className="sales-drawer-title">
            <span>{SIZE_LABELS[cabinet.size_category] || cabinet.size_category} · score {cabinet.size_score}</span>
            <h2 id="cabinet-title">{cabinet.trade_name || cabinet.legal_name}</h2>
            {cabinet.trade_name && <p>{cabinet.legal_name}</p>}
          </div>
          <button className="sales-icon-button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>

        {(lockedByOther || cabinet.do_not_contact) && (
          <div className="sales-drawer-alert">
            <ShieldAlert size={17} />
            <span>{cabinet.do_not_contact ? 'Ce cabinet a demandé à ne plus être contacté.' : `${cabinet.locked_by_username || 'Un autre commercial'} consulte actuellement cette fiche jusqu’à ${formatDateTime(cabinet.locked_until)}.`}</span>
          </div>
        )}

        <div className="sales-drawer-quick">
          <a href={cabinet.phone ? `tel:${cabinet.phone}` : undefined} className={!cabinet.phone ? 'is-disabled' : ''}><Phone size={15} /><span>{cabinet.phone || 'Téléphone absent'}</span></a>
          <a href={cabinet.professional_email ? `mailto:${cabinet.professional_email}` : undefined} className={!cabinet.professional_email ? 'is-disabled' : ''}><Mail size={15} /><span>{cabinet.professional_email || 'E-mail absent'}</span></a>
          {cabinet.website && <a href={cabinet.website} target="_blank" rel="noreferrer"><ExternalLink size={15} /><span>Site internet</span></a>}
        </div>

        <div className="sales-drawer-call-row">
          <button className="sales-button primary call" disabled={saving || lockedByOther || cannotCall || !cabinet.phone} onClick={() => onStartCall(cabinet)}><PhoneCall size={18} /> Commencer l’appel</button>
          <div><strong>{cabinet.assigned_username ? `Attribué à ${cabinet.assigned_username}` : 'Non attribué'}</strong><span>{PIPELINE_LABELS[cabinet.commercial_status]}</span></div>
        </div>

        <nav className="sales-drawer-tabs">
          {['resume', 'actions', 'historique'].map((value) => <button key={value} className={tab === value ? 'is-active' : ''} onClick={() => setTab(value)}>{value === 'resume' ? 'Fiche' : value === 'actions' ? 'Actions' : 'Historique'}</button>)}
        </nav>

        <div className="sales-drawer-content">
          {tab === 'resume' && (
            <>
              <section className="sales-detail-grid">
                <div><span>Localisation</span><strong><MapPin size={14} /> {[cabinet.city, cabinet.department, cabinet.region].filter(Boolean).join(' · ') || '—'}</strong></div>
                <div><span>Contact</span><strong><UserRound size={14} /> {cabinet.primary_contact_name || 'À identifier'}</strong><small>{cabinet.primary_contact_role || ''}</small></div>
                <div><span>SIREN / SIRET</span><strong>{cabinet.siren || '—'} / {cabinet.siret || '—'}</strong></div>
                <div><span>ORIAS</span><strong>{cabinet.orias_number || 'Non renseigné'}</strong></div>
                <div><span>Effectif</span><strong>{cabinet.employee_count ?? 'Inconnu'}</strong></div>
                <div><span>Chiffre d’affaires</span><strong>{formatMoney(cabinet.revenue_eur)}</strong></div>
                <div className="sales-span-2"><span>Calcul de taille</span><strong>{cabinet.size_explanation}</strong>{cabinet.size_is_estimated && <small>Estimation — données incomplètes</small>}</div>
              </section>
              <section className="sales-timeline-card">
                <div className="sales-section-title"><Clock3 size={16} /><strong>Derniers appels</strong></div>
                {!calls.length && <p className="sales-empty-small">Aucun appel enregistré.</p>}
                {calls.slice(0, 5).map((call) => <div className="sales-timeline-row" key={call.id}><span className={`sales-dot ${call.reached ? 'success' : ''}`} /><div><strong>{call.username || call.first_name} · {call.outcome || 'appel démarré'}</strong><p>{call.comment || call.identified_need || 'Aucun commentaire'}</p></div><time>{formatDateTime(call.started_at)}</time></div>)}
              </section>
              <section className="sales-timeline-card">
                <div className="sales-section-title"><CalendarPlus size={16} /><strong>Rendez-vous et démonstrations</strong></div>
                {!appointments.length && <p className="sales-empty-small">Aucun événement programmé.</p>}
                {appointments.slice(0, 5).map((item) => <div className="sales-list-line" key={item.id}><div><strong>{item.event_type === 'demonstration' ? 'Démonstration' : 'Rendez-vous'} · {item.attendee_name}</strong><span>{formatDateTime(item.starts_at)} · {item.format}</span></div><em>{item.status}</em></div>)}
              </section>
            </>
          )}

          {tab === 'actions' && (
            <div className="sales-action-stack">
              <section className="sales-action-card">
                <div className="sales-section-title"><RefreshCw size={16} /><strong>Changer le statut</strong></div>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(PIPELINE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
                <textarea rows="2" value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Justification du changement" />
                <button className="sales-button secondary" disabled={saving || status === cabinet.commercial_status} onClick={() => run(() => salesApi.changeStatus(cabinet.id, { status, justification }), 'Statut mis à jour')}>Mettre à jour</button>
              </section>
              <section className="sales-action-card">
                <div className="sales-section-title"><MessageSquarePlus size={16} /><strong>Ajouter une note</strong></div>
                <textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note commerciale factuelle…" />
                <button className="sales-button secondary" disabled={saving || !note.trim()} onClick={() => run(async () => { await salesApi.addNote(cabinet.id, { body: note }); setNote('') }, 'Note ajoutée')}>Enregistrer la note</button>
              </section>
              <section className="sales-action-card">
                <div className="sales-section-title"><Clock3 size={16} /><strong>Planifier une relance</strong></div>
                <input type="datetime-local" value={followup.due_at} onChange={(e) => setFollowup({ ...followup, due_at: e.target.value })} />
                <textarea rows="2" value={followup.instructions} onChange={(e) => setFollowup({ ...followup, instructions: e.target.value })} placeholder="À qui parler, quoi vérifier…" />
                <button className="sales-button secondary" disabled={saving || !followup.due_at} onClick={() => run(() => salesApi.createFollowup(cabinet.id, { ...followup, due_at: new Date(followup.due_at).toISOString() }), 'Relance programmée')}>Créer la relance</button>
              </section>
              <section className="sales-action-card">
                <div className="sales-section-title"><CalendarPlus size={16} /><strong>Programmer un événement</strong></div>
                <div className="sales-form-grid compact">
                  <label>Type<select value={appointment.event_type} onChange={(e) => setAppointment({ ...appointment, event_type: e.target.value })}><option value="rendez_vous">Rendez-vous</option><option value="demonstration">Démonstration</option></select></label>
                  <label>Date<input type="datetime-local" value={appointment.starts_at} onChange={(e) => setAppointment({ ...appointment, starts_at: e.target.value })} /></label>
                  <label>Interlocuteur<input value={appointment.attendee_name} onChange={(e) => setAppointment({ ...appointment, attendee_name: e.target.value })} /></label>
                  <label>Format<select value={appointment.format} onChange={(e) => setAppointment({ ...appointment, format: e.target.value })}><option value="telephone">Téléphone</option><option value="visioconference">Visioconférence</option><option value="presentiel">Présentiel</option></select></label>
                  <label className="sales-span-2">Lien visio<input value={appointment.meeting_url} onChange={(e) => setAppointment({ ...appointment, meeting_url: e.target.value })} /></label>
                  <label className="sales-span-2">Préparation<textarea rows="2" value={appointment.preparation_notes} onChange={(e) => setAppointment({ ...appointment, preparation_notes: e.target.value })} /></label>
                </div>
                <button className="sales-button secondary" disabled={saving || !appointment.attendee_name || !appointment.starts_at} onClick={() => run(() => salesApi.createAppointment(cabinet.id, { ...appointment, starts_at: new Date(appointment.starts_at).toISOString() }), 'Événement programmé')}>Programmer</button>
              </section>
              <section className="sales-action-card">
                <div className="sales-section-title"><FileSignature size={16} /><strong>Créer une proposition</strong></div>
                <div className="sales-form-grid compact"><label>Montant potentiel<input type="number" min="0" value={proposal.amount_eur} onChange={(e) => setProposal({ ...proposal, amount_eur: e.target.value })} /></label><label>Statut<select value={proposal.status} onChange={(e) => setProposal({ ...proposal, status: e.target.value })}><option value="brouillon">Brouillon</option><option value="a_envoyer">À envoyer</option><option value="envoyee">Envoyée</option><option value="negociation">Négociation</option><option value="signee">Signée</option></select></label><label className="sales-span-2">Objet<input value={proposal.subject} onChange={(e) => setProposal({ ...proposal, subject: e.target.value })} /></label></div>
                <button className="sales-button secondary" disabled={saving} onClick={() => run(() => salesApi.createProposal(cabinet.id, { ...proposal, amount_eur: proposal.amount_eur || null }), 'Proposition enregistrée')}>Enregistrer la proposition</button>
              </section>
            </div>
          )}

          {tab === 'historique' && (
            <div className="sales-history-groups">
              <section><h3>Notes</h3>{!notes.length && <p className="sales-empty-small">Aucune note.</p>}{notes.map((item) => <article key={item.id}><strong>{item.username} · {formatDateTime(item.created_at)}</strong><p>{item.body}</p>{item.supersedes_note_id && <small>Révision de la note #{item.supersedes_note_id}</small>}</article>)}</section>
              <section><h3>Attributions</h3>{!assignments.length && <p className="sales-empty-small">Aucun transfert.</p>}{assignments.map((item) => <article key={item.id}><strong>{item.from_username || 'Non attribué'} → {item.to_username || 'Non attribué'}</strong><p>{item.assignment_method} · {formatDateTime(item.created_at)}</p></article>)}</section>
              <section><h3>Statuts</h3>{statuses.map((item) => <article key={item.id}><strong>{PIPELINE_LABELS[item.old_status] || item.old_status || 'Création'} → {PIPELINE_LABELS[item.new_status] || item.new_status}</strong><p>{item.username} · {formatDateTime(item.created_at)}</p>{item.justification && <small>{item.justification}</small>}</article>)}</section>
              <section><h3>Relances</h3>{followups.map((item) => <article key={item.id}><strong>{formatDateTime(item.due_at)} · {item.status}</strong><p>{item.instructions || item.type}</p></article>)}</section>
              <section><h3>Propositions</h3>{!proposals.length && <p className="sales-empty-small">Aucune proposition.</p>}{proposals.map((item) => <article key={item.id}><strong>{item.status} · {formatMoney(item.amount_eur)}</strong><p>{item.subject || 'Proposition Courtiark'} · {formatDateTime(item.created_at)}</p></article>)}</section>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
