// /root/courtia/frontend/src/components/bordereau/BordereauIntelligence.jsx
import { useState, useEffect, useRef } from 'react';
import { Upload, TrendingUp, AlertCircle, Loader2, Check, Mail } from 'lucide-react';

export default function BordereauIntelligence({ apiBase = '/api', authToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedEcart, setSelectedEcart] = useState(null);
  const fileInputRef = useRef();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/bordereau/dashboard`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) setData(d);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`${apiBase}/bordereau/upload`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }, body: fd
      });
      const result = await r.json();
      if (result.success) {
        alert(`Bordereau traité :\n${result.total_lignes} lignes\n${result.lignes_rapprochees} rapprochées\n${result.lignes_non_rapprochees} non rapprochées\nÉcart total : ${result.ecart_total?.toFixed(2)}€`);
        await load();
      } else alert(`Erreur : ${result.error}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateRelance = async (ecartId) => {
    const r = await fetch(`${apiBase}/bordereau/ecart/${ecartId}/relance`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
    const d = await r.json();
    if (d.success) setSelectedEcart({ ...d.draft, ecart_id: ecartId });
  };

  const markRecovered = async (ecartId, amount) => {
    await fetch(`${apiBase}/bordereau/ecart/${ecartId}/recovered`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    setSelectedEcart(null);
    await load();
  };

  if (loading || !data) return <div className="rounded-3xl bg-slate-900/60 border border-slate-700/50 p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Bordereau Intelligence</h2>
              <p className="text-xs text-slate-400">Commissions oubliées récupérées automatiquement</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.xls,.xlsx,.csv" onChange={handleUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse…</> : <><Upload className="w-4 h-4" /> Uploader un bordereau</>}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Écarts ouverts" value={data.ecarts_ouverts.length} color="amber" />
          <Stat label="À récupérer" value={`${Math.round(data.total_ecarts_ouverts).toLocaleString('fr')}€`} color="red" />
          <Stat label="Récupéré 12 mois" value={`${Math.round(data.total_recovered_12m).toLocaleString('fr')}€`} color="emerald" />
          <Stat label="Bordereaux traités" value={data.bordereaux.length} color="cyan" />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" /> Écarts à récupérer
        </h3>
        {data.ecarts_ouverts.length === 0 ? (
          <div className="text-slate-400 text-sm text-center py-8">Uploade ton premier bordereau pour voir apparaître les écarts.</div>
        ) : (
          <div className="space-y-2">
            {data.ecarts_ouverts.map(ec => (
              <div key={ec.id} className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{ec.description}</div>
                    <div className="text-xs text-slate-400 mt-1">Type : {ec.type_ecart} · {ec.relance_envoyee_at ? `Relancé le ${new Date(ec.relance_envoyee_at).toLocaleDateString('fr')}` : 'Non relancé'}</div>
                  </div>
                  <div className="text-xl font-bold text-amber-300">{parseFloat(ec.montant_ecart).toFixed(2)}€</div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => generateRelance(ec.id)} className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Générer relance
                  </button>
                  <button onClick={() => { const a = prompt('Montant récupéré (€) :', ec.montant_ecart); if (a) markRecovered(ec.id, parseFloat(a)); }} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Récupéré
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEcart && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEcart(null)}>
          <div className="rounded-2xl bg-slate-900 border border-slate-700 max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-3">Brouillon relance compagnie</h3>
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 mb-4">
              <div className="text-xs text-slate-400 mb-1">Sujet</div>
              <div className="text-white text-sm font-medium mb-3">{selectedEcart.subject}</div>
              <div className="text-xs text-slate-400 mb-1">Message</div>
              <pre className="text-slate-200 text-sm whitespace-pre-wrap font-sans">{selectedEcart.body}</pre>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(`${selectedEcart.subject}\n\n${selectedEcart.body}`); alert('Copié'); }} className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 text-white font-medium">Copier</button>
              <button onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent(selectedEcart.subject)}&body=${encodeURIComponent(selectedEcart.body)}`} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium">Ouvrir Mail</button>
              <button onClick={() => setSelectedEcart(null)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">Fermer</button>
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
