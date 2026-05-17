import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const PRODUITS = ["auto","habitation","sante","prevoyance","emprunteur","pme","rc_pro","cyber"];

export default function ComparateurDevis() {
  const [dashboard, setDashboard] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultats, setResultats] = useState(null);
  const [form, setForm] = useState({ clientId: "", typeProduit: "habitation", besoins: {} });
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/api/devis/dashboard`, { headers }).then(r => r.json()).then(setDashboard);
  }, []);

  async function comparer() {
    setLoading(true);
    const res = await fetch(`${API}/api/devis/comparer`, { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);
    setResultats(data);
    setShowForm(false);
  }

  async function selectOffre(devisId, index) {
    await fetch(`${API}/api/devis/${devisId}/select`, { method: "POST", headers, body: JSON.stringify({ offreIndex: index }) });
    alert("✅ Offre sélectionnée. Tu peux maintenant envoyer la signature électronique.");
    setResultats(null);
    fetch(`${API}/api/devis/dashboard`, { headers }).then(r => r.json()).then(setDashboard);
  }

  const stats = dashboard?.stats;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">⚡ Comparateur Devis IA</h2>
          <p className="text-sm text-gray-400 mt-1">3 offres en 30 secondes · Commission sur contrat signé</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
          + Nouveau devis
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Devis générés", val: stats.total_devis || 0, color: "text-white" },
            { label: "Contrats signés", val: stats.contrats_signes || 0, color: "text-green-400" },
            { label: "Commissions", val: `${parseFloat(stats.commissions_totales || 0).toFixed(0)} €`, color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Résultats comparaison */}
      {resultats && (() => {
        const res = typeof resultats.resultats === 'string' ? JSON.parse(resultats.resultats) : resultats.resultats;
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-white font-medium">Résultats — {resultats.type_produit}</p>
              {res?.recommandation_ark && (
                <span className="text-xs bg-cyan-900/50 text-cyan-300 px-3 py-1 rounded-full">
                  💡 ARK recommande : {res.recommandation_ark}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4">
              {res?.offres?.map((o, i) => (
                <div key={i} className={`rounded-xl border p-5 ${o.score_adequation >= 80 ? 'border-cyan-500/50 bg-cyan-900/10' : 'border-gray-700/50 bg-gray-800/40'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-white">{o.nom_produit}</p>
                      <p className="text-xs text-gray-400">{o.partenaire}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">{o.prime_mensuelle} €<span className="text-xs text-gray-400">/mois</span></p>
                      <p className="text-xs text-amber-400">Commission : {o.commission_eur} €</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {o.garanties_incluses?.slice(0,4).map((g, j) => (
                      <span key={j} className="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full">{g}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-700 rounded-full h-1.5">
                        <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${o.score_adequation}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{o.score_adequation}/100</span>
                    </div>
                    <button onClick={() => selectOffre(resultats.id, i)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-1.5 rounded-lg text-sm transition">
                      Sélectionner
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Historique devis */}
      <div className="space-y-2">
        {dashboard?.recents?.map(d => (
          <div key={d.id} className="bg-gray-800/40 rounded-lg p-3 flex justify-between items-center border border-gray-700/50">
            <div>
              <p className="text-sm font-medium text-white">{d.client_nom} — {d.type_produit}</p>
              <p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex items-center gap-2">
              {d.commission_eur && <span className="text-xs text-amber-400 font-medium">{parseFloat(d.commission_eur).toFixed(0)} €</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full ${d.statut === 'signe' ? 'bg-green-900/50 text-green-400' : d.statut === 'selectionne' ? 'bg-amber-900/50 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                {d.statut}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Nouveau devis comparatif</h3>
            <select value={form.typeProduit} onChange={e => setForm(f => ({...f, typeProduit: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
              {PRODUITS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <textarea placeholder="Besoins spécifiques du client (ex: villa 200m², garage, piscine)" rows={4}
              onChange={e => setForm(f => ({...f, besoins: { description: e.target.value }}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={comparer} disabled={loading} className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm disabled:opacity-50">
                {loading ? "⚡ ARK compare..." : "Comparer les offres"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
