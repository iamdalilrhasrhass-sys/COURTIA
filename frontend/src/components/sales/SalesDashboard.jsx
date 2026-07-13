import { ArrowRight, CalendarCheck2, CheckCircle2, Clock3, Flame, PhoneCall, RefreshCw, Target, Trophy, UsersRound } from 'lucide-react'
import { formatDateTime, PIPELINE_LABELS } from '../../lib/salesProspecting'

function MetricCard({ label, value, hint, tone = 'violet', onClick }) {
  return <button className={`sales-metric tone-${tone}`} onClick={onClick}><span>{label}</span><strong>{value ?? 0}</strong>{hint && <small>{hint}</small>}<ArrowRight size={14} /></button>
}

export default function SalesDashboard({ metrics = {}, user, onOpenFilter, onCallNext, loadingNext }) {
  const isAdmin = user.role === 'super_admin'
  const adminMetrics = [
    ['Cabinets enregistrés', metrics.total_cabinets, 'Toute la base', 'violet', {}],
    ['Non attribués', metrics.unassigned, 'À répartir', 'slate', { assigned_to: 'unassigned' }],
    ['Attribués à Tarek', metrics.assigned_tarek, 'Portefeuille actif', 'cyan', { assigned_to_username: 'tarek' }],
    ['Attribués à Ahmed', metrics.assigned_ahmed, 'Portefeuille actif', 'blue', { assigned_to_username: 'ahmed' }],
    ['Déjà appelés', metrics.already_called, 'Au moins une tentative', 'amber', { called: 'true' }],
    ['Restant à appeler', metrics.remaining_to_call, 'Hors statuts terminaux', 'violet', { uncalled: 'true' }],
    ["Appels aujourd’hui", metrics.calls_today, `${metrics.calls_week || 0} cette semaine`, 'cyan', {}],
    ['Appels ce mois', metrics.calls_month, `${metrics.reached_calls || 0} aboutis`, 'blue', {}],
    ['Rappels programmés', metrics.callbacks_scheduled, `${metrics.overdue_followups || 0} en retard`, 'amber', { status: 'a_rappeler' }],
    ['Rendez-vous', metrics.appointments_scheduled, 'Programmés', 'cyan', { status: 'rdv_programme' }],
    ['Démonstrations', metrics.demos_scheduled, `${metrics.demos_completed || 0} réalisées`, 'violet', { status: 'demo_programmee' }],
    ['Propositions envoyées', metrics.proposals_sent, 'Suivi commercial', 'blue', { status: 'proposition_envoyee' }],
    ['Signatures', metrics.signatures, 'Signé + client actif', 'green', { status: 'signe' }],
    ['Taux de contact', `${metrics.contact_rate || 0}%`, 'Appels aboutis', 'cyan', {}],
    ['Taux de rendez-vous', `${metrics.appointment_rate || 0}%`, 'Sur contacts établis', 'violet', {}],
    ['Conversion', `${metrics.conversion_rate || 0}%`, 'Base vers signature', 'green', {}],
  ]

  return (
    <div className="sales-dashboard-grid">
      {isAdmin && (
        <section className="sales-boss-command">
          <div className="sales-boss-command-copy"><span className="sales-kicker"><UsersRound size={15} /> Activité commerciale en direct</span><h2>Suivez ce que fait votre équipe.</h2><p>Appels, relances, rendez-vous et signatures sont centralisés ici pour garder une vision factuelle de l’avancement.</p></div>
          <div className="sales-boss-command-stats"><span><small>Appels aujourd’hui</small><strong>{metrics.calls_today || 0}</strong></span><span><small>Relances en retard</small><strong>{metrics.overdue_followups || 0}</strong></span><span><small>Signatures</small><strong>{metrics.signatures || 0}</strong></span></div>
          <button className="sales-button secondary" onClick={() => onOpenFilter({ called: 'true' })}>Voir tous les appels <ArrowRight size={15} /></button>
        </section>
      )}
      {!isAdmin && (
        <section className="sales-next-call-hero">
          <div><span className="sales-kicker"><Target size={15} /> Priorité du jour</span><h2>Avancez cabinet par cabinet.</h2><p>Courtiark choisit le prochain cabinet disponible, du plus petit au plus grand, sans doublon ni relance prématurée.</p></div>
          <button className="sales-button primary giant" disabled={loadingNext} onClick={onCallNext}><PhoneCall size={21} /> {loadingNext ? 'Sélection…' : 'Appeler le prochain cabinet'}</button>
        </section>
      )}

      <section className={`sales-metrics-grid ${isAdmin ? 'admin' : ''}`}>
        {(isAdmin ? adminMetrics : [
          ['Mes cabinets', metrics.total_cabinets, 'Portefeuille attribué', 'violet', {}],
          ["Appels aujourd’hui", metrics.calls_today, `${metrics.calls_week || 0} cette semaine`, 'cyan', {}],
          ['Rappels', metrics.callbacks_scheduled, `${metrics.overdue_followups || 0} en retard`, 'amber', { status: 'a_rappeler' }],
          ['Rendez-vous', metrics.appointments_scheduled, 'À venir', 'blue', { status: 'rdv_programme' }],
          ['Prospects chauds', metrics.hot_prospects?.length || 0, 'Fort / très fort', 'pink', { interest_level: 'fort' }],
          ['Signatures', metrics.signatures, `${metrics.conversion_rate || 0}% de conversion`, 'green', { status: 'signe' }],
        ]).map(([label, value, hint, tone, filter]) => <MetricCard key={label} label={label} value={value} hint={hint} tone={tone} onClick={() => onOpenFilter(filter)} />)}
      </section>

      <section className="sales-panel sales-hot-panel">
        <header><div><span className="sales-kicker"><Flame size={14} /> À traiter</span><h3>Prospects les plus chauds</h3></div><button className="sales-text-button" onClick={() => onOpenFilter({ interest_level: 'fort' })}>Voir la liste <ArrowRight size={14} /></button></header>
        <div className="sales-hot-list">
          {!metrics.hot_prospects?.length && <div className="sales-empty-small">Les prospects qualifiés apparaîtront ici.</div>}
          {metrics.hot_prospects?.map((prospect) => <button key={prospect.id} onClick={() => onOpenFilter({ open_id: prospect.id })}><span className={`sales-heat ${prospect.interest_level === 'tres_fort' ? 'max' : ''}`} /><div><strong>{prospect.legal_name}</strong><small>{prospect.city || 'France'} · {prospect.assigned_username || 'Non attribué'}</small></div><em>{PIPELINE_LABELS[prospect.commercial_status] || prospect.commercial_status}</em></button>)}
        </div>
      </section>

      {isAdmin && <section className="sales-panel sales-leaderboard">
        <header><div><span className="sales-kicker"><Trophy size={14} /> Équipe</span><h3>Résultats des commerciaux</h3></div></header>
        <div className="sales-leaderboard-head"><span>Commercial</span><span>Appels</span><span>Aboutis</span><span>RDV</span><span>Démos</span><span>Signatures</span></div>
        {metrics.leaderboard?.map((row, index) => <div className="sales-leaderboard-row" key={row.id}><span><b>{index + 1}</b><div><strong>{row.first_name || row.username}</strong><small>@{row.username}</small></div></span><em>{row.calls}</em><em>{row.reached}</em><em>{row.appointments}</em><em>{row.demonstrations}</em><em className="success">{row.signatures}</em></div>)}
      </section>}

      <section className="sales-panel sales-activity-panel">
        <header><div><span className="sales-kicker"><Clock3 size={14} /> Temps réel</span><h3>{isAdmin ? 'Activité récente des commerciaux' : 'Activité récente'}</h3></div></header>
        <div className="sales-activity-list">
          {!metrics.recent_activity?.length && <div className="sales-empty-small">Aucune activité enregistrée.</div>}
          {metrics.recent_activity?.map((activity) => <div key={activity.id}><span className="sales-activity-icon">{activity.action.includes('call') ? <PhoneCall size={14} /> : activity.action.includes('appointment') ? <CalendarCheck2 size={14} /> : activity.action.includes('assign') ? <UsersRound size={14} /> : activity.action.includes('status') ? <RefreshCw size={14} /> : <CheckCircle2 size={14} />}</span><div><strong>{activity.username || 'Système'} · {activity.action}</strong><p>{activity.cabinet_name || activity.entity_type}</p></div><time>{formatDateTime(activity.created_at)}</time></div>)}
        </div>
      </section>
    </div>
  )
}
