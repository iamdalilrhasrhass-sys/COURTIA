import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

export default function RentabiliteDashboard() {
  const [data, setData] = useState(null);
  const [periode, setPeriode] = useState("mois");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const load = async (p) => {
    setLoading(true);
    const res = await fetch(`${API}/api/rentabilite?periode=${p}`, { headers });
    const d = await res.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(periode); }, []);

  const changePeriode = (p) => { setPeriode(p); load(p); };

  if (!data && loading) return <div className="p-6 text-gray-400">Calcul en cours...</div>;
  if (!data) return null;

  const details = typeof data.details === 'string' ? JSON.parse(data.details) : data.details;
  const byProduit = details?.by_produit || [];
  const byCompagnie = details?.by_compagnie || [];
  const arkAnalyse = details?.ark_analyse;
  const margePct = data.ca_total > 0 ? Math.round((data.marge_brute / data.ca_total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">💰 Rentabilité Cabinet</h2>
          <p className="text-sm text-gray-400 mt-1">Analyse IA de ton portefeuille</p>
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {["mois","trimestre","annee"].map(p => (
            <button key={p} onClick={() => changePeriode(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${periode === p ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}>
              {p === "mois" ? "Mois" : p === "trimestre" ? "Trimestre" : "Année"}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "CA Portefeuille", val: `${parseFloat(data.ca_total||0).toFixed(0)} €`, color: "text-white" },
          { label: "Marge brute est.", val: `${parseFloat(data.marge_brute||0).toFixed(0)} €`, color: "text-green-400" },
          { label: "Taux de marge", val: `${margePct}%`, color: margePct >= 50 ? "text-green-400" : "text-amber-400" },
          { label: "Meilleur produit", val: data.meilleur_produit || "N/A", color: "text-cyan-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Recommandations ARK */}
      {arkAnalyse?.recommandations && (
        <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/20 rounded-xl p-4 border border-purple-700/40">
          <p className="text-xs text-purple-300 uppercase tracking-wide mb-3">💡 Recommandations ARK</p>
          <div className="space-y-2">
            {arkAnalyse.recommandations.map((r, i) => (
              <div key={i} className="flex gap-2 text-sm text-gray-200">
                <span className="text-purple-400 shrink-0">{i+1}.</span>{r}
              </div>
            ))}
          </div>
          {arkAnalyse.opportunite_principale && (
            <div className="mt-3 p-2 bg-green-900/20 border border-green-700/30 rounded-lg">
              <p className="text-xs text-green-400">🎯 Opportunité principale</p>
              <p className="text-xs text-gray-200 mt-0.5">{arkAnalyse.opportunite_principale}</p>
            </div>
          )}
        </div>
      )}

      {/* Répartition par produit */}
      {byProduit.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Répartition par produit</p>
          <div className="space-y-2">
            {byProduit.map((p, i) => {
              const pct = data.ca_total > 0 ? Math.round((p.ca / data.ca_total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 w-24 truncate">{p.type}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div className="bg-cyan-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{parseFloat(p.ca||0).toFixed(0)} €</span>
                  <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top compagnies */}
      {byCompagnie.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Top compagnies</p>
          <div className="grid grid-cols-2 gap-2">
            {byCompagnie.slice(0,6).map((c, i) => (
              <div key={i} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
                <p className="text-sm font-medium text-white truncate">{c.compagnie}</p>
                <p className="text-xs text-gray-400">{c.nb_contrats} contrats</p>
                <p className="text-xs text-cyan-400 font-medium">{parseFloat(c.ca||0).toFixed(0)} € CA</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
