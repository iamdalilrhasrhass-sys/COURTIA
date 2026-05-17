import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const STATUT_COLORS = { nouvelle:'bg-blue-900/50 text-blue-300', contacte:'bg-amber-900/50 text-amber-300', convertie:'bg-green-900/50 text-green-300', ignoree:'bg-gray-700 text-gray-400' };

export default function CrossSellDashboard() {
  const [opportunites, setOpportunites] = useState([]);
  const [stats, setStats] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState("nouvelle");
  const [selected, setSelected] = useState(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async (statut) => {
    fetch(`${API}/api/cross-sell/opportunites?statut=${statut}`, { headers }).then(r => r.json()).then(setOpportunites);
    fetch(`${API}/api/cross-sell/stats`, { headers }).then(r => r.json()).then(setStats);
  };

  useEffect(() => { load(filter); }, []);

  async function scan() {
    setScanning(true);
    const res = await fetch(`${API}/api/cross-sell/scan`, { method: "POST", headers });
    const result = await res.json();
    setScanning(false);
    alert(`✅ ${result.total_opportunites} nouvelles opportunités détectées · CA potentiel : ${Math.round(result.ca_potentiel)} €`);
    load(filter);
  }

  async function updateStatut(id, statut) {
    await fetch(`${API}/api/cross-sell/opportunites/${id}`, { method: "PATCH", headers, body: JSON.stringify({ statut }) });
    setOpportunites(prev => prev.filter(o => o.id !== id));
  }

  const caTotal = parseFloat(stats?.ca_potentiel || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">💎 Cross-sell Intelligence</h2>
          <p className="text-sm text-gray-400 mt-1">ARK détecte les produits manquants dans ton portefeuille</p>
        </div>
        <button onClick={scan} disabled={scanning}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
          {scanning ? "⚡ Analyse en cours..." : "🔍 Scanner le portefeuille"}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Nouvelles", val: stats.nouvelles || 0, color: "text-blue-400" },
            { label: "Contactées", val: stats.contactees || 0, color: "text-amber-400" },
            { label: "Converties", val: stats.converties || 0, color: "text-green-400" },
            { label: "CA potentiel", val: `${Math.round(caTotal)} €`, color: "text-cyan-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2">
        {["nouvelle","contacte","convertie","ignoree"].map(s => (
          <button key={s} onClick={() => { setFilter(s); load(s); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${filter===s?'border-cyan-500 text-cyan-400 bg-cyan-900/20':'border-gray-700 text-gray-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Opportunités */}
      {opportunites.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💎</p>
          <p className="text-gray-500 text-sm">Aucune opportunité en statut "{filter}".</p>
          <p className="text-gray-600 text-xs mt-1">Clique "Scanner le portefeuille" pour détecter de nouvelles opportunités.</p>
        </div>
      )}

      <div className="space-y-3">
        {opportunites.map(o => (
          <div key={o.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="p-4 cursor-pointer" onClick={() => setSelected(selected?.id === o.id ? null : o)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white">{o.client_nom}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[o.statut]}`}>{o.statut}</span>
                  </div>
                  <p className="text-xs text-amber-400 font-medium">{o.type_opportunite}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Produit manquant : <span className="text-white">{o.produit_manquant}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">{parseFloat(o.commission_estimee||0).toFixed(0)} €</p>
                  <p className="text-xs text-gray-500">commission est.</p>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <div className="w-12 bg-gray-700 rounded-full h-1">
                      <div className="bg-cyan-400 h-1 rounded-full" style={{ width: `${o.score_potentiel}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">{o.score_potentiel}</span>
                  </div>
                </div>
              </div>
            </div>

            {selected?.id === o.id && (
              <div className="border-t border-gray-700 p-4 space-y-3">
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                  <p className="text-xs text-cyan-400 mb-1">💬 Message personnalisé ARK</p>
                  <p className="text-sm text-gray-200 italic">"{o.message_personnalise}"</p>
                </div>
                <div className="flex gap-2">
                  {o.client_email && (
                    <a href={`mailto:${o.client_email}?subject=Votre couverture assurance&body=${encodeURIComponent(o.message_personnalise)}`}
                      className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm text-center transition">
                      📧 Email
                    </a>
                  )}
                  {o.client_tel && (
                    <a href={`tel:${o.client_tel}`}
                      className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm text-center transition">
                      📞 Appeler
                    </a>
                  )}
                  <button onClick={() => updateStatut(o.id, 'contacte')}
                    className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm transition">
                    ✓ Contacté
                  </button>
                  <button onClick={() => updateStatut(o.id, 'convertie')}
                    className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm transition">
                    💰 Converti
                  </button>
                  <button onClick={() => updateStatut(o.id, 'ignoree')}
                    className="py-2 px-3 rounded-lg border border-gray-600 text-gray-400 text-sm">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
