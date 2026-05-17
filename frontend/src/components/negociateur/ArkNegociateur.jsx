import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

export default function ArkNegociateur() {
  const [negociations, setNegociations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    compagnieNom: "", typeNegociation: "revalorisation_commission",
    volumePorrefeuille: "", sinistraliteRate: "",
    ancienneteMois: "", commissionActuelle: "", commissionCible: ""
  });
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/api/negociation/list`, { headers }).then(r => r.json()).then(setNegociations);
  }, []);

  async function buildDossier() {
    setLoading(true);
    const res = await fetch(`${API}/api/negociation/build`, { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);
    setNegociations(prev => [data, ...prev]);
    setShowForm(false);
  }

  async function downloadPDF(id) {
    const res = await fetch(`${API}/api/negociation/${id}/rapport-pdf`, { method: "POST", headers });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url);
  }

  const typeLabels = {
    revalorisation_commission: "Revalorisation commission",
    extension_gamme: "Extension de gamme",
    exclusivite: "Accord d'exclusivité",
    conditions_speciales: "Conditions spéciales"
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">🤝 ARK Négociateur Compagnie</h2>
          <p className="text-sm text-gray-400 mt-1">Dossier argumenté IA · Stratégie + PDF téléchargeable</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
          + Préparer une négociation
        </button>
      </div>

      <div className="space-y-3">
        {negociations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-sm">Aucune négociation préparée.</p>
            <p className="text-xs mt-1">ARK construit ton dossier en 30 secondes.</p>
          </div>
        )}
        {negociations.map(n => {
          const dossier = typeof n.dossier_arguments === 'string' ? JSON.parse(n.dossier_arguments) : n.dossier_arguments;
          return (
            <div key={n.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-white">{n.compagnie_nom}</p>
                  <p className="text-xs text-gray-400 mt-1">{typeLabels[n.type_negociation]} · {n.commission_actuelle}% → {n.commission_cible}%</p>
                  <p className="text-xs text-gray-500">{n.volume_portefeuille} contrats · Sinistralité {n.sinistralite_rate}%</p>
                </div>
                <button onClick={() => downloadPDF(n.id)} className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition">
                  📄 Télécharger
                </button>
              </div>

              {dossier?.synthese_executive && (
                <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                  <p className="text-xs text-cyan-400 mb-1">Synthèse ARK</p>
                  <p className="text-xs text-gray-300">{dossier.synthese_executive}</p>
                </div>
              )}

              {dossier?.arguments_principaux?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {dossier.arguments_principaux.slice(0, 3).map((a, i) => (
                    <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{a.titre}</span>
                  ))}
                </div>
              )}

              {dossier?.phrase_ouverture && (
                <div className="mt-3 p-2 border border-purple-700/40 rounded-lg">
                  <p className="text-xs text-purple-400">Phrase d'ouverture recommandée</p>
                  <p className="text-xs text-gray-200 mt-1 italic">"{dossier.phrase_ouverture}"</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Nouvelle négociation</h3>
            <input placeholder="Nom de la compagnie (ex: AXA, MMA...)" value={form.compagnieNom}
              onChange={e => setForm(f => ({ ...f, compagnieNom: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <select value={form.typeNegociation} onChange={e => setForm(f => ({ ...f, typeNegociation: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Nb contrats" value={form.volumePorrefeuille}
                onChange={e => setForm(f => ({ ...f, volumePorrefeuille: e.target.value }))}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="number" placeholder="Sinistralité %" value={form.sinistraliteRate}
                onChange={e => setForm(f => ({ ...f, sinistraliteRate: e.target.value }))}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="number" placeholder="Ancienneté (mois)" value={form.ancienneteMois}
                onChange={e => setForm(f => ({ ...f, ancienneteMois: e.target.value }))}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="number" placeholder="Commission actuelle %" value={form.commissionActuelle}
                onChange={e => setForm(f => ({ ...f, commissionActuelle: e.target.value }))}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="number" placeholder="Commission cible %" value={form.commissionCible}
                onChange={e => setForm(f => ({ ...f, commissionCible: e.target.value }))}
                className="col-span-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={buildDossier} disabled={loading}
                className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm disabled:opacity-50">
                {loading ? "ARK analyse..." : "Construire le dossier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
