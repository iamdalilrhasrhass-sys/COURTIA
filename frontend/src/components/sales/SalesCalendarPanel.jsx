import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { salesApi } from '../../api/salesProspecting'
import { formatDateTime } from '../../lib/salesProspecting'

export default function SalesCalendarPanel({ user }) {
  const [data, setData] = useState({ appointments: [], followups: [] })
  const [filter, setFilter] = useState('all')
  const load = async () => { const response = await salesApi.calendar(); setData(response.data) }
  useEffect(() => {
    let active = true
    salesApi.calendar().then((response) => { if (active) setData(response.data) }).catch(() => {})
    return () => { active = false }
  }, [])
  const appointments = data.appointments?.filter((item) => filter === 'all' || item.event_type === filter) || []

  async function markDone(item) {
    try { await salesApi.updateAppointment(item.id, { status: 'realise' }); toast.success('Événement réalisé'); await load() }
    catch (error) { toast.error(error?.response?.data?.error === 'demo_report_required' ? 'Le compte rendu de démonstration doit être complété depuis la fiche cabinet.' : error?.response?.data?.error || 'Mise à jour impossible') }
  }

  return <div className="sales-calendar-grid">
    <section className="sales-panel sales-calendar-main"><header><div><span className="sales-kicker"><CalendarDays size={15} /> Calendrier {user.role === 'super_admin' ? 'partagé' : 'personnel'}</span><h3>Rendez-vous et démonstrations</h3></div><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tous les événements</option><option value="rendez_vous">Rendez-vous</option><option value="demonstration">Démonstrations</option></select></header><div className="sales-calendar-list">{!appointments.length && <p className="sales-empty-small">Aucun événement.</p>}{appointments.map((item) => <article key={item.id}><time><strong>{new Date(item.starts_at).toLocaleDateString('fr-FR', { day: '2-digit' })}</strong><span>{new Date(item.starts_at).toLocaleDateString('fr-FR', { month: 'short' })}</span></time><div><strong>{item.event_type === 'demonstration' ? 'Démonstration' : 'Rendez-vous'} · {item.cabinet_name}</strong><span>{formatDateTime(item.starts_at)} · {item.duration_minutes} min · {item.format}</span><small>{item.attendee_name} · @{item.owner_username}</small></div><em>{item.status}</em>{!['realise','annule'].includes(item.status) && <button className="sales-icon-button" title="Marquer réalisé" onClick={() => markDone(item)}><CheckCircle2 size={16} /></button>}</article>)}</div></section>
    <section className="sales-panel sales-followup-panel"><header><div><span className="sales-kicker"><Clock3 size={15} /> Relances</span><h3>Prochaines actions</h3></div></header>{!data.followups?.length && <p className="sales-empty-small">Aucune relance.</p>}{data.followups?.slice(0, 50).map((item) => <article key={item.id} className={new Date(item.due_at) < new Date() && item.status === 'planifie' ? 'is-overdue' : ''}><div><strong>{item.cabinet_name}</strong><span>{formatDateTime(item.due_at)} · @{item.assigned_username}</span><small>{item.instructions || item.type}</small></div><em>{item.status}</em></article>)}</section>
  </div>
}
