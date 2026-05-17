import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

export default function FacturationHonoraires() {
  const [stats, setStats] = useState(null);
  const [factures, setFactures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: "", objet: "", lignes: [{ description: "", quantite: 1, prixUnitaire: 0 }], dateEcheance: "" });
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/api/facturation/stats`, { headers }).then(r => r.json()).then(setStats);
    fetch(`${API}/api/facturation/list`, { headers }).then(r => r.json()).then(setFactures);
  }, []);

  function addLigne() {
    setForm(f => ({ ...f, lignes: [...f.lignes, { description: "", quantite: 1, prixUnitaire: 0 }] }));
  }

  function updateLigne(i, field, val) {
    const l = [...form.lignes];
    l[i][field] = field === "quantite" || field === "prixUnitaire" ? parseFloat(val) || 0 : val;
    setForm(f => ({ ...f, lignes: l }));
  }

  const totalHt = form.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

  async function handleCreate() {
    const res = await fetch(`${API}/api/facturation/create`, { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    setFactures(prev => [data, ...prev]);
    setShowForm(false);
  }

  async function generatePDF(id) {
    const res = await fetch(`${API}/api/facturation/${id}/generate-pdf`, { method: "POST", headers });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url);
  }

  async function markPaid(id) {
    await fetch(`${API}/api/facturation/${id}/paid`, { method: "POST", headers });
    setFactures(prev => prev.map(f => f.id === id ? { ...f, statut: "payee" } : f));
  }

  const statusColor = s => ({ brouillon: "text-gray-400", emise: "text-amber-400", payee: "text-green-400", retard: "text-red-400" }[s] || "text-gray-400");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">🧾 Facturation Honoraires</h2>
          <p className="text-sm text-gray-400 mt-1">Génération PDF professionnelle + suivi encaissements</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
          + Nouvelle facture
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "CA encaissé", val: `${parseFloat(stats.ca_encaisse || 0).toFixed(0)} €`, color: "text-green-400" },
            { label: "À encaisser", val: `${parseFloat(stats.a_encaisser || 0).toFixed(0)} €`, color: "text-cyan-400" },
            { label: "En retard", val: `${parseFloat(stats.en_retard || 0).toFixed(0)} €`, color: "text-red-400" },
            { label: "Total factures", val: stats.total || 0, color: "text-white" },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {factures.map(f => (
          <div key={f.id} className="bg-gray-800/40 rounded-lg p-3 flex justify-between items-center border border-gray-700/50">
            <div>
              <p className="text-sm font-medium text-white">{f.numero_facture} — {f.client_nom}</p>
              <p className="text-xs text-gray-400">{f.objet} · Échéance : {f.date_echeance}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${statusColor(f.statut)}`}>{parseFloat(f.montant_ttc).toFixed(2)} €</span>
              <span className={`text-xs ${statusColor(f.statut)}`}>{f.statut}</span>
              <button onClick={() => generatePDF(f.id)} className="text-xs text-cyan-400 hover:text-cyan-300">PDF</button>
              {f.statut === "emise" && (
                <button onClick={() => markPaid(f.id)} className="text-xs text-green-400 hover:text-green-300">Encaissé</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white">Nouvelle facture</h3>
            <input placeholder="Objet de la prestation" value={form.objet}
              onChange={e => setForm(f => ({ ...f, objet: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Date d'échéance (YYYY-MM-DD)" value={form.dateEcheance}
              onChange={e => setForm(f => ({ ...f, dateEcheance: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Lignes</p>
              {form.lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input placeholder="Description" value={l.description} onChange={e => updateLigne(i, "description", e.target.value)}
                    className="col-span-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                  <input type="number" placeholder="Qté" value={l.quantite} onChange={e => updateLigne(i, "quantite", e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                  <input type="number" placeholder="Prix HT" value={l.prixUnitaire} onChange={e => updateLigne(i, "prixUnitaire", e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                </div>
              ))}
              <button onClick={addLigne} className="text-xs text-cyan-400">+ Ajouter une ligne</button>
            </div>
            <div className="text-right text-sm text-gray-300">
              <span>Total HT : </span><span className="font-bold text-white">{totalHt.toFixed(2)} €</span>
              <span className="ml-3">TTC (20%) : </span><span className="font-bold text-cyan-400">{(totalHt * 1.2).toFixed(2)} €</span>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={handleCreate} className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm">Créer la facture</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
