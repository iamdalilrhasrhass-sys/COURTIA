import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const TYPE_ICONS = { tarif: "📊", produit: "🆕", reglementation: "⚖️", tendance: "📈", opportunite: "💎" };
const IMPACT_COLOR = s => s >= 75 ? "text-red-400" : s >= 50 ? "text-amber-400" : "text-green-400";

export default function VeilleMarche() {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("tout");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = () => fetch(`${API}/api/veille/alertes`, { headers }).then(r => r.json()).then(setAlertes);
  useEffect(() => { load(); }, []);

  async function generer() {
    setLoading(true);
    await fetch(`${API}/api/veille/generer`, { method: "POST", headers });
    await load();
    setLoading(false);
  }

  async function markLue(id) {
    await fetch(`${API}/api/veille/alertes/${id}/lue`, { method: "PATCH", headers });
    setAlertes(prev => prev.map(a => a.id === id ? { ...a, lue: true } : a));
  }

  async function markAllLues() {
    await fetch(`${API}/api/veille/alertes/mark-all-lues`, { method: "POST", headers });
    setAlertes(prev => prev.map(a => ({ ...a, lue: true })));
  }

  const nonLues = alertes.filter(a => !a.lue).length;
  const filtered = filter === "tout" ? alertes : alertes.filter(a => a.type_alerte === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">🔭 Veille Marché ARK</h2>
          <p className="text-sm text-gray-400 mt-1">
            Alertes IA sur le marché assurance · {nonLues > 0 && <span className="text-cyan-400 font-medium">{nonLues} non lues</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {nonLues > 0 && (
            <button onClick={markAllLues} className="text-xs text-gray-400 hover:text-gray-300 px-3 py-2 rounded-lg border border-gray-700">
              Tout marquer lu
            </button>
          )}
          <button onClick={generer} disabled={loading} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
            {loading ? "⚡ Analyse..." : "🔄 Générer veille"}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {["tout","tarif","produit","reglementation","tendance","opportunite"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${filter === f ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
            {TYPE_ICONS[f] || "🔍"} {f}
          </button>
        ))}
      </div>

      {/* Alertes */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔭</p>
          <p className="text-gray-500 text-sm">Aucune alerte. Clique sur "Générer veille" pour obtenir un briefing marché.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(a => (
          <div key={a.id}
            className={`rounded-xl border p-4 transition ${a.lue ? 'border-gray-700/30 bg-gray-800/20' : 'border-gray-700/60 bg-gray-800/50'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-xl mt-0.5">{TYPE_ICONS[a.type_alerte] || "📌"}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-medium ${a.lue ? 'text-gray-400' : 'text-white'}`}>{a.titre}</p>
                    {!a.lue && <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{a.contenu}</p>
                  {a.action_suggere && (
                    <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg p-2">
                      <span className="text-amber-400 text-xs">→</span>
                      <p className="text-xs text-amber-300">{a.action_suggere}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">{a.source}</span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className={`text-xs font-medium ${IMPACT_COLOR(a.impact_score)}`}>Impact {a.impact_score}/100</span>
                  </div>
                </div>
              </div>
              {!a.lue && (
                <button onClick={() => markLue(a.id)} className="text-xs text-gray-500 hover:text-gray-300 ml-2 shrink-0">✓ Lu</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
