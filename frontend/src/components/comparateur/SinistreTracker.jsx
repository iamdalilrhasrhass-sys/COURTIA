import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const STATUTS = ['declare','en_instruction','expertise','accord_compagnie','reglement','clos','litige'];
const STATUT_COLORS = { declare:'text-blue-400', en_instruction:'text-amber-400', expertise:'text-purple-400', accord_compagnie:'text-cyan-400', reglement:'text-green-400', clos:'text-gray-400', litige:'text-red-400' };

export default function SinistreTracker() {
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ clientId: "", typeSinistre: "vol", dateSinistre: "", description: "", montantDeclare: "" });
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = () => fetch(`${API}/api/sinistres/dashboard`, { headers }).then(r => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  async function declarer() {
    await fetch(`${API}/api/sinistres/declarer`, { method: "POST", headers, body: JSON.stringify(form) });
    setShowForm(false); load();
  }

  async function updateStatut(id, statut) {
    const note = prompt(`Note pour le passage à "${statut}" :`);
    await fetch(`${API}/api/sinistres/${id}/statut`, { method: "PATCH", headers, body: JSON.stringify({ statut, note }) });
    load();
  }

  if (!data) return <div className="p-6 text-gray-400">Chargement...</div>;
  const stats = data.stats;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">🔥 Suivi Sinistres</h2>
          <p className="text-sm text-gray-400 mt-1">Analyse ARK + timeline + taux de remboursement</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
          + Déclarer sinistre
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "En cours", val: stats?.en_cours || 0, color: "text-amber-400" },
          { label: "Montant déclaré", val: `${parseFloat(stats?.total_declare||0).toFixed(0)} €`, color: "text-white" },
          { label: "Indemnisé", val: `${parseFloat(stats?.total_indemnise||0).toFixed(0)} €`, color: "text-green-400" },
          { label: "Taux remboursement", val: `${Math.round(stats?.taux_remboursement||0)}%`, color: parseFloat(stats?.taux_remboursement||0) >= 80 ? "text-green-400" : "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {data.sinistres?.map(s => {
          const ark = typeof s.ark_analyse === 'string' ? JSON.parse(s.ark_analyse) : s.ark_analyse;
          const isSelected = selected?.id === s.id;
          return (
            <div key={s.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="p-4 flex justify-between items-start cursor-pointer" onClick={() => setSelected(isSelected ? null : s)}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{s.type_sinistre} — {s.client_nom}</p>
                    {ark?.gravite && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ark.gravite==='critique'?'bg-red-900/50 text-red-400':ark.gravite==='eleve'?'bg-amber-900/50 text-amber-400':'bg-blue-900/50 text-blue-400'
                      }`}>{ark.gravite}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(s.date_sinistre).toLocaleDateString('fr-FR')} · {parseFloat(s.montant_declare||0).toFixed(0)} € déclaré</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${STATUT_COLORS[s.statut]}`}>{s.statut.replace(/_/g,' ')}</span>
                  <select value={s.statut} onChange={e => { e.stopPropagation(); updateStatut(s.id, e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300">
                    {STATUTS.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              </div>

              {isSelected && ark && (
                <div className="border-t border-gray-700 p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Probabilité acceptation</p>
                      <p className={`text-lg font-bold ${ark.probabilite_acceptation>=70?'text-green-400':'text-amber-400'}`}>{ark.probabilite_acceptation}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Délai estimé</p>
                      <p className="text-lg font-bold text-white">{ark.delai_estime_jours}j</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Risque litige</p>
                      <p className={`text-lg font-bold ${ark.risque_litige>=50?'text-red-400':'text-green-400'}`}>{ark.risque_litige}%</p>
                    </div>
                  </div>
                  {ark.documents_requis?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">📎 Documents requis</p>
                      <div className="flex flex-wrap gap-1">
                        {ark.documents_requis.map((d, i) => (
                          <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ark.conseils_courtier?.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-400 mb-1">💡 Conseils ARK</p>
                      {ark.conseils_courtier.map((c, i) => <p key={i} className="text-xs text-gray-300">· {c}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Déclarer un sinistre</h3>
            <select value={form.typeSinistre} onChange={e => setForm(f => ({...f, typeSinistre: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
              {['vol','incendie','dégât_des_eaux','accident','bris_de_glace','catastrophe_naturelle','responsabilite_civile','autre'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
            <input type="date" value={form.dateSinistre} onChange={e => setForm(f => ({...f, dateSinistre: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <input type="number" placeholder="Montant déclaré (€)" value={form.montantDeclare}
              onChange={e => setForm(f => ({...f, montantDeclare: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <textarea placeholder="Description du sinistre" value={form.description} rows={3}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={declarer} className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm">Déclarer + analyse ARK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
