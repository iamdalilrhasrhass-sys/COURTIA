// /root/courtia/frontend/src/components/leads/LeadInstantInbox.jsx
import { useState, useEffect } from 'react';
import { Zap, PhoneCall, MessageSquare, UserPlus, Loader2, ExternalLink } from 'lucide-react';

const STATUS_LABELS = {
  new: { label: 'Nouveau', color: 'cyan' },
  voice_calling: { label: 'Voice en cours', color: 'purple' },
  sms_drafted: { label: 'SMS prêt', color: 'amber' },
  qualified: { label: 'Qualifié', color: 'emerald' },
  converted: { label: 'Converti client', color: 'emerald' }
};

export default function LeadInstantInbox({ apiBase = '/api', authToken }) {
  const [leads, setLeads] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showWidgets, setShowWidgets] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [l, w] = await Promise.all([
        fetch(`${apiBase}/leads${filter !== 'all' ? `?status=${filter}` : ''}`, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json()),
        fetch(`${apiBase}/leads/widgets`, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json())
      ]);
      if (l.success) setLeads(l.leads);
      if (w.success) setWidgets(w.widgets);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const convert = async (id) => {
    const r = await fetch(`${apiBase}/leads/${id}/convert`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
    const d = await r.json();
    if (d.success) {
      alert(d.already_converted ? `Déjà converti — client ${d.client_id}` : `Converti en client ${d.client_id}`);
      load();
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Lead Instant</h2>
              <p className="text-xs text-slate-400">Qualification IA en 60 secondes — Voice ou SMS automatique</p>
            </div>
          </div>
          <button onClick={() => setShowWidgets(!showWidgets)} className="px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-sm border border-slate-700/50">
            {showWidgets ? 'Voir leads' : `Widgets (${widgets.length})`}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {['all', 'new', 'voice_calling', 'sms_drafted', 'qualified', 'converted'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${filter === s ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' : 'bg-slate-800/40 text-slate-400 border border-slate-700/50'}`}>
              {s === 'all' ? 'Tous' : STATUS_LABELS[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div> :
       showWidgets ? <WidgetsList widgets={widgets} apiBase={apiBase} authToken={authToken} onReload={load} /> :
       leads.length === 0 ? <div className="text-slate-400 text-sm text-center py-12 rounded-2xl bg-slate-900/40 border border-slate-700/30">Aucun lead pour le moment. Configure un widget de capture pour commencer.</div> :
       <div className="space-y-2">
         {leads.map(l => {
           const status = STATUS_LABELS[l.status] || { label: l.status, color: 'slate' };
           const scoreColor = l.lead_score >= 70 ? 'emerald' : l.lead_score >= 40 ? 'amber' : 'red';
           const sCol = { emerald: 'text-emerald-300', amber: 'text-amber-300', red: 'text-red-300' };
           return (
             <div key={l.id} className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4">
               <div className="flex items-start justify-between gap-3 flex-wrap">
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap mb-1">
                     <div className="text-white font-medium">{l.nom} {l.prenom || ''}</div>
                     <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-${status.color}-500/15 text-${status.color}-300 border border-${status.color}-500/30`}>{status.label}</span>
                     {l.contact_method_used && <span className="text-[10px] text-slate-400">via {l.contact_method_used}</span>}
                   </div>
                   <div className="text-xs text-slate-400">{l.email} · {l.telephone || '—'}</div>
                   <div className="text-xs text-slate-300 mt-1">{l.type_demande || 'Pas de précision'}</div>
                   {l.raison_sociale && <div className="text-xs text-cyan-300 mt-1">🏢 {l.raison_sociale} · {l.secteur_activite}</div>}
                 </div>
                 <div className="text-right">
                   <div className={`text-2xl font-bold ${sCol[scoreColor]}`}>{l.lead_score}<span className="text-xs text-slate-400">/100</span></div>
                   <div className="text-[10px] uppercase text-slate-400">score</div>
                 </div>
               </div>
               {l.status !== 'converted' && (
                 <div className="flex gap-2 mt-3">
                   <button onClick={() => convert(l.id)} className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-1.5">
                     <UserPlus className="w-3.5 h-3.5" /> Convertir en client
                   </button>
                   {l.telephone && <a href={`tel:${l.telephone}`} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5" /> Appeler</a>}
                 </div>
               )}
             </div>
           );
         })}
       </div>
      }
    </div>
  );
}

function WidgetsList({ widgets, apiBase, authToken, onReload }) {
  const [creating, setCreating] = useState(false);
  const create = async () => {
    const name = prompt('Nom du widget :');
    if (!name) return;
    const produit = prompt('Produit cible (ex: auto, sante, rc_pro) :');
    setCreating(true);
    await fetch(`${apiBase}/leads/widgets`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, produit_cible: produit, fields_config: { nom: true, email: true, telephone: true, type_demande: true } })
    });
    setCreating(false);
    onReload();
  };

  return (
    <div className="space-y-3">
      <button onClick={create} disabled={creating} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
        {creating ? 'Création…' : '+ Nouveau widget'}
      </button>
      {widgets.map(w => (
        <div key={w.id} className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4">
          <div className="text-white font-medium">{w.name}</div>
          <div className="text-xs text-slate-400">Produit : {w.produit_cible} · {w.total_captured} captures · {w.total_converted} convertis</div>
          <div className="mt-2 rounded-lg bg-slate-900 border border-slate-700 p-2.5">
            <div className="text-[10px] uppercase text-slate-400 mb-1">URL de soumission</div>
            <code className="text-xs text-cyan-200 break-all">POST /api/leads/widget/{w.widget_token}</code>
          </div>
        </div>
      ))}
    </div>
  );
}
