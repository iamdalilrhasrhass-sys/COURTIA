import { useState, useEffect } from "react";
import asArray from "../utils/asArray";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const PRODUITS = ["auto","habitation","sante","prevoyance","emprunteur","rc_pro","cyber","pme"];

export default function SimulateurRevenus() {
  const [scenarios, setScenarios] = useState([{ type_produit: "auto", nb_contrats: 50, prime_annuelle: 600, commission_pct: "", croissance_mensuelle_pct: 2 }]);
  const [charges, setCharges] = useState(2000);
  const [objectif, setObjectif] = useState("");
  const [nom, setNom] = useState("Ma simulation");
  const [resultats, setResultats] = useState(null);
  const [saved, setSaved] = useState([]);
  const [running, setRunning] = useState(false);
  const [commissions, setCommissions] = useState({});
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/api/simulateur/saved`, { headers }).then(r => r.json()).then(d => setSaved(asArray(d)));
    fetch(`${API}/api/simulateur/commissions-marche`, { headers }).then(r => r.json()).then(setCommissions);
  }, []);

  function addScenario() {
    setScenarios(s => [...s, { type_produit: "habitation", nb_contrats: 30, prime_annuelle: 400, commission_pct: "", croissance_mensuelle_pct: 1 }]);
  }

  function updateScenario(i, field, val) {
    const updated = [...scenarios];
    updated[i][field] = ["nb_contrats","prime_annuelle","commission_pct","croissance_mensuelle_pct"].includes(field) ? parseFloat(val)||0 : val;
    setScenarios(updated);
  }

  async function run() {
    setRunning(true);
    const res = await fetch(`${API}/api/simulateur/run`, {
      method: "POST", headers,
      body: JSON.stringify({ nom, scenarios, charges_fixes_mois: charges, objectif_ca_annuel: objectif || undefined })
    });
    const data = await res.json();
    setResultats(data);
    setRunning(false);
    fetch(`${API}/api/simulateur/saved`, { headers }).then(r => r.json()).then(d => setSaved(asArray(d)));
  }

  const commRef = (type) => commissions[type];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">📈 Simulateur de Revenus</h2>
        <p className="text-sm text-gray-400 mt-1">Projette ton CA selon les types de produits et volumes</p>
      </div>

      {/* Config */}
      <div className="space-y-4">
        <input placeholder="Nom de la simulation" value={nom} onChange={e => setNom(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Charges fixes/mois (€)</label>
            <input type="number" value={charges} onChange={e => setCharges(parseInt(e.target.value)||0)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Objectif CA annuel (€, optionnel)</label>
            <input type="number" value={objectif} onChange={e => setObjectif(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder="Ex: 60000" />
          </div>
        </div>

        {/* Scénarios */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Scénarios produits</p>
            <button onClick={addScenario} className="text-xs text-cyan-400 hover:text-cyan-300">+ Ajouter produit</button>
          </div>
          {scenarios.map((s, i) => {
            const ref = commRef(s.type_produit);
            return (
              <div key={i} className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 space-y-3">
                <div className="flex justify-between">
                  <select value={s.type_produit} onChange={e => updateScenario(i, 'type_produit', e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white">
                    {PRODUITS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {scenarios.length > 1 && (
                    <button onClick={() => setScenarios(s => s.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400 text-xs">✕</button>
                  )}
                </div>
                {ref && (
                  <p className="text-xs text-gray-500">Marché : {(ref.min*100).toFixed(0)}% – {(ref.max*100).toFixed(0)}% · Moy. {(ref.moy*100).toFixed(0)}%</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">Nb contrats</label>
                    <input type="number" value={s.nb_contrats} onChange={e => updateScenario(i, 'nb_contrats', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mt-0.5" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Prime moy. annuelle (€)</label>
                    <input type="number" value={s.prime_annuelle} onChange={e => updateScenario(i, 'prime_annuelle', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mt-0.5" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Commission % (vide = moy. marché)</label>
                    <input type="number" placeholder={ref ? `${(ref.moy*100).toFixed(0)}` : '12'} value={s.commission_pct || ''} onChange={e => updateScenario(i, 'commission_pct', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mt-0.5" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Croissance mensuelle %</label>
                    <input type="number" value={s.croissance_mensuelle_pct} onChange={e => updateScenario(i, 'croissance_mensuelle_pct', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white mt-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={run} disabled={running}
          className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition disabled:opacity-50">
          {running ? "⚡ Calcul en cours..." : "▶ Lancer la simulation"}
        </button>
      </div>

      {/* Résultats */}
      {resultats && (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 border ${resultats.total.marge_brute > 0 ? 'border-green-700/40 bg-green-900/10' : 'border-red-700/40 bg-red-900/10'}`}>
            <p className={`text-sm font-medium mb-1 ${resultats.total.marge_brute > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {resultats.message_ark}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "CA annuel total", val: `${(resultats.total.ca_annuel||0).toLocaleString('fr-FR')} €`, color: "text-white" },
              { label: "CA mensuel", val: `${(resultats.total.ca_mensuel||0).toLocaleString('fr-FR')} €`, color: "text-cyan-400" },
              { label: "Charges annuelles", val: `${(resultats.total.charges_annuelles||0).toLocaleString('fr-FR')} €`, color: "text-red-400" },
              { label: "Marge brute", val: `${(resultats.total.marge_brute||0).toLocaleString('fr-FR')} €`, color: resultats.total.marge_brute > 0 ? "text-green-400" : "text-red-400" },
            ].map(s => (
              <div key={s.label} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-xl font-bold ${s.color} mt-0.5`}>{s.val}</p>
              </div>
            ))}
          </div>

          {resultats.total.gap_objectif !== null && (
            <div className={`rounded-lg p-3 border ${resultats.total.gap_objectif > 0 ? 'border-amber-700/40 bg-amber-900/10' : 'border-green-700/40 bg-green-900/10'}`}>
              <p className={`text-sm ${resultats.total.gap_objectif > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {resultats.total.gap_objectif > 0 ? `Gap objectif : ${resultats.total.gap_objectif.toLocaleString('fr-FR')} € à combler` : `Objectif dépassé de ${Math.abs(resultats.total.gap_objectif).toLocaleString('fr-FR')} €`}
              </p>
            </div>
          )}

          {/* Détail par scénario */}
          <div className="space-y-2">
            {resultats.scenarios.map((s, i) => (
              <div key={i} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{s.type_produit} — {s.nb_contrats} contrats</p>
                    <p className="text-xs text-gray-400">{s.commission_rate_pct}% commission · {s.vs_marche.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{(s.ca_annuel||0).toLocaleString('fr-FR')} €/an</p>
                    <p className="text-xs text-gray-500">{s.commission_par_contrat} €/contrat</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulations sauvegardées */}
      {saved.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Simulations sauvegardées</p>
          {saved.slice(0,5).map(s => {
            const res = typeof s.resultats === 'string' ? JSON.parse(s.resultats) : s.resultats;
            return (
              <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-800 cursor-pointer hover:bg-gray-800/30 px-1 rounded"
                onClick={() => setResultats(res)}>
                <p className="text-sm text-gray-300">{s.nom}</p>
                <p className="text-xs text-cyan-400">{(res?.total?.ca_annuel||0).toLocaleString('fr-FR')} €/an</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
