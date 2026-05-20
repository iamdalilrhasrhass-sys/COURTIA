// /root/courtia/frontend/src/components/police/PoliceIntelligence.jsx
import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Upload, FileText, Download, Loader2, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import asArray from '../../utils/asArray';

export default function PoliceIntelligence({ apiBase = '/api', authToken, clientId = null }) {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const url = `${apiBase}/police/list${clientId ? `?client_id=${clientId}` : ''}`;
      const r = await fetch(url, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) setPolicies(asArray(d.policies));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [clientId]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    if (clientId) fd.append('client_id', clientId);
    try {
      const r = await fetch(`${apiBase}/police/analyze`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: fd
      });
      const d = await r.json();
      if (d.success) {
        await load();
        setSelected(d);
      } else alert(`Erreur : ${d.error}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadReport = async (id) => {
    const r = await fetch(`${apiBase}/police/${id}/report`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (r.ok) {
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Analyse_police_${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Police Intelligence</h2>
              <p className="text-xs text-slate-400">Lit la police concurrente, identifie les lacunes, génère l'argumentaire</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={upload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> ARK lit la police…</> : <><Upload className="w-4 h-4" /> Analyser une police</>}
          </button>
        </div>
      </div>

      {loading ? <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div> :
       policies.length === 0 ? <div className="text-slate-400 text-sm text-center py-12 rounded-2xl bg-slate-900/40 border border-slate-700/30">Aucune police analysée. Drop ton premier PDF.</div> :
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {policies.map(p => {
           const scoreColor = p.market_score >= 70 ? 'emerald' : p.market_score >= 50 ? 'amber' : 'red';
           const colorMap = { emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30', red: 'text-red-300 bg-red-500/10 border-red-500/30' };
           return (
             <button key={p.id} onClick={() => setSelected(p)} className={`text-left rounded-2xl border p-4 transition hover:scale-[1.01] ${colorMap[scoreColor]}`}>
               <div className="flex items-start justify-between mb-2">
                 <div className="flex-1 min-w-0">
                   <div className="text-white font-medium truncate">{p.compagnie_concurrente || 'Compagnie inconnue'}</div>
                   <div className="text-xs text-slate-300">{p.produit_type} · {p.prime_annuelle}€/an</div>
                   {p.client_name && <div className="text-xs text-slate-400 mt-0.5">{p.client_name}</div>}
                 </div>
                 <div className="text-2xl font-bold">{p.market_score || '—'}<span className="text-xs text-slate-400">/100</span></div>
               </div>
               <button onClick={(e) => { e.stopPropagation(); downloadReport(p.id); }} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900/40 text-slate-200 border border-slate-700/30 flex items-center gap-1.5">
                 <Download className="w-3 h-3" /> Rapport PDF
               </button>
             </button>
           );
         })}
       </div>
      }

      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="rounded-2xl bg-slate-900 border border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{selected.compagnie_concurrente || selected.police_data?.compagnie} · Analyse</h3>
              <button onClick={() => downloadReport(selected.id)} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>

            {(typeof selected.weak_points === 'string' ? JSON.parse(selected.weak_points) : (selected.weak_points || selected.analysis?.weak_points || [])).length > 0 && (
              <div className="mb-5">
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Points faibles détectés</div>
                <div className="space-y-2">
                  {(typeof selected.weak_points === 'string' ? JSON.parse(selected.weak_points) : (selected.weak_points || selected.analysis?.weak_points || [])).map((wp, i) => (
                    <div key={i} className="rounded-xl bg-red-500/10 border border-red-500/30 p-3">
                      <div className="text-red-200 font-medium text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {wp.titre}</div>
                      <div className="text-slate-300 text-xs mt-1">{wp.explication}</div>
                      {wp.risque_financier_estime && <div className="text-amber-300 text-xs mt-1.5">Risque estimé : {wp.risque_financier_estime}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(typeof selected.recommendations === 'string' ? JSON.parse(selected.recommendations) : (selected.recommendations || selected.analysis?.recommendations || [])).length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Recommandations ARK</div>
                <ol className="space-y-1.5">
                  {(typeof selected.recommendations === 'string' ? JSON.parse(selected.recommendations) : (selected.recommendations || selected.analysis?.recommendations || [])).map((r, i) => (
                    <li key={i} className="text-sm text-slate-200 flex items-start gap-2"><span className="text-cyan-400 font-semibold">{i+1}.</span>{r}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
