// /root/courtia/frontend/src/components/renewal/RenewalMachine.jsx
import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Check, X, Loader2, RefreshCw, Mail, TrendingUp } from 'lucide-react';
import asArray from '../../utils/asArray';

export default function RenewalMachine({ apiBase = '/api', authToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedRenewal, setSelectedRenewal] = useState(null);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/renewal/dashboard`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) setData({ ...d, renewals: asArray(d.renewals) });
    } finally { setLoading(false); }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await fetch(`${apiBase}/renewal/sync`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) {
        alert(`Sync : ${d.created} nouveaux renouvellements, ${d.updated} mis à jour`);
        await load();
      }
    } finally { setSyncing(false); }
  };

  const generateMsg = async (renewalId, step) => {
    setDrafting(true);
    try {
      const r = await fetch(`${apiBase}/renewal/${renewalId}/generate-message/${step}`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) setDraft({ ...d, renewalId, step });
    } finally { setDrafting(false); }
  };

  const markRenewed = async (id) => {
    await fetch(`${apiBase}/renewal/${id}/renewed`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
    setSelectedRenewal(null); await load();
  };

  const markLost = async (id) => {
    const reason = prompt('Raison de la perte ?');
    if (!reason) return;
    await fetch(`${apiBase}/renewal/${id}/lost`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    setSelectedRenewal(null); await load();
  };

  useEffect(() => { load(); }, []);
  if (loading || !data) return <div className="rounded-3xl bg-slate-900/60 border border-slate-700/50 p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Machine Renouvellement</h2>
              <p className="text-xs text-slate-400">Détecte les contrats à risque + séquences J-90/J-60/J-30/J-7</p>
            </div>
          </div>
          <button onClick={sync} disabled={syncing} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Sync…' : 'Synchroniser'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="En cours" value={data.stats?.en_cours || 0} color="cyan" />
          <Stat label="À risque élevé" value={data.high_risk_count} color="red" />
          <Stat label="Signés 12 mois" value={data.stats?.signed_12m || 0} color="emerald" />
          <Stat label="Commission sauvée" value={`${Math.round(data.stats?.commission_saved_12m || 0).toLocaleString('fr')}€`} color="emerald" />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Échéances à venir
        </h3>
        {data.renewals.length === 0 ? (
          <div className="text-slate-400 text-sm text-center py-8">Aucun renouvellement détecté. Lance Synchroniser.</div>
        ) : (
          <div className="space-y-2">
            {data.renewals.map(r => {
              const riskColor = r.retention_risk_score >= 70 ? 'red' : r.retention_risk_score >= 40 ? 'amber' : 'emerald';
              const colorMap = { red: 'text-red-300 bg-red-500/10 border-red-500/30', amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30', emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' };
              return (
                <div key={r.id} className={`rounded-xl border p-4 ${colorMap[riskColor]}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{r.client_name} · {r.produit}</div>
                      <div className="text-xs text-slate-300 mt-0.5">Contrat {r.numero_contrat} · {r.prime_annuelle}€/an · Échéance {new Date(r.date_echeance).toLocaleDateString('fr')} (J-{r.days_before_renewal})</div>
                      {r.risk_drivers && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(typeof r.risk_drivers === 'string' ? JSON.parse(r.risk_drivers) : r.risk_drivers).slice(0, 3).map((d, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-900/60 text-slate-300 border border-slate-700/50">{d.detail}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{r.retention_risk_score}<span className="text-xs text-slate-400">/100</span></div>
                      <div className="text-[10px] uppercase text-slate-400">risque</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[1,2,3,4].map(step => (
                      <button key={step} onClick={() => generateMsg(r.id, step)} className="px-2.5 py-1 rounded-lg bg-slate-800/60 text-slate-200 text-xs border border-slate-700/50 hover:bg-slate-700/60">
                        Msg J-{[90,60,30,7][step-1]}
                      </button>
                    ))}
                    <button onClick={() => markRenewed(r.id)} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 text-xs border border-emerald-500/40">✓ Renouvelé</button>
                    <button onClick={() => markLost(r.id)} className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-200 text-xs border border-red-500/40">✗ Perdu</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {draft && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setDraft(null)}>
          <div className="rounded-2xl bg-slate-900 border border-slate-700 max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">Message J-{[90,60,30,7][draft.step-1]}</h3>
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 mb-4">
              <div className="text-xs text-slate-400 mb-1">Sujet</div>
              <div className="text-white text-sm font-medium mb-3">{draft.subject}</div>
              <pre className="text-slate-200 text-sm whitespace-pre-wrap font-sans">{draft.body}</pre>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`)} className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 text-white">Copier</button>
              <button onClick={() => setDraft(null)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  const map = { white: 'text-white', emerald: 'text-emerald-300', amber: 'text-amber-300', red: 'text-red-300', cyan: 'text-cyan-300' };
  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${map[color]}`}>{value}</div>
    </div>
  );
}
