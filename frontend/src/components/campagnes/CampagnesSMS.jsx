import { useState, useEffect } from "react";
import asArray from "../../utils/asArray";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const PACKS = {
  pack500: { credits: 500, prix: "60 € HT", label: "Pack 500" },
  pack1000: { credits: 1000, prix: "110 € HT", label: "Pack 1 000" },
  pack5000: { credits: 5000, prix: "450 € HT", label: "Pack 5 000" }
};

export default function CampagnesSMS() {
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", message: "" });
  const [sending, setSending] = useState(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = () => fetch(`${API}/api/sms/dashboard`, { headers }).then(r => r.json()).then(d => setData({ ...d, campagnes: asArray(d?.campagnes) }));
  useEffect(() => { load(); }, []);

  const chars = form.message.length;
  const smsCount = Math.ceil(chars / 160) || 1;

  async function createCampagne() {
    await fetch(`${API}/api/sms/campagne`, { method: "POST", headers, body: JSON.stringify(form) });
    setShowForm(false);
    load();
  }

  async function sendCampagne(id) {
    setSending(id);
    const res = await fetch(`${API}/api/sms/campagne/${id}/send`, { method: "POST", headers });
    const result = await res.json();
    setSending(null);
    if (result.error) { alert(`❌ ${result.error}`); return; }
    alert(`✅ ${result.envoyes} SMS envoyés · Coût : ${result.cout_facture?.toFixed(2)} €`);
    load();
  }

  async function buyPack(pack) {
    if (!confirm(`Acheter le ${PACKS[pack].label} pour ${PACKS[pack].prix} ?`)) return;
    await fetch(`${API}/api/sms/buy-pack`, { method: "POST", headers, body: JSON.stringify({ pack }) });
    load();
  }

  if (!data) return <div className="p-6 text-gray-400">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">📱 Campagnes SMS</h2>
          <p className="text-sm text-gray-400 mt-1">0,15 €/SMS · Marge gérée par COURTIA</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
          + Nouvelle campagne
        </button>
      </div>

      {/* Crédits + packs */}
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-300 text-sm">Crédits SMS disponibles</span>
          <span className="text-2xl font-bold text-cyan-400">{data.credits?.credits || 0}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PACKS).map(([key, p]) => (
            <button key={key} onClick={() => buyPack(key)}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg p-3 text-center transition">
              <p className="text-white font-medium text-sm">{p.label}</p>
              <p className="text-gray-400 text-xs">{p.prix}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "SMS envoyés", val: data.stats?.total_envoyes || 0 },
          { label: "Campagnes", val: data.stats?.nb_campagnes || 0 },
          { label: "Total dépensé", val: `${parseFloat(data.stats?.total_depense || 0).toFixed(2)} €` },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-xl font-bold text-white">{s.val}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Campagnes */}
      <div className="space-y-2">
        {data.campagnes?.map(c => (
          <div key={c.id} className="bg-gray-800/40 rounded-lg p-3 flex justify-between items-center border border-gray-700/50">
            <div>
              <p className="text-sm font-medium text-white">{c.nom}</p>
              <p className="text-xs text-gray-400">{c.nb_destinataires} destinataires · {new Date(c.created_at).toLocaleDateString("fr-FR")}</p>
              {c.statut === "sent" && <p className="text-xs text-green-400">{c.nb_envoyes} envoyés · {parseFloat(c.cout_total_facture).toFixed(2)} €</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${c.statut === "sent" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-300"}`}>
                {c.statut === "sent" ? "Envoyée" : "Brouillon"}
              </span>
              {c.statut === "brouillon" && (
                <button onClick={() => sendCampagne(c.id)} disabled={sending === c.id}
                  className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1 rounded-lg transition disabled:opacity-50">
                  {sending === c.id ? "..." : "Envoyer"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Nouvelle campagne SMS</h3>
            <input placeholder="Nom de la campagne" value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <div>
              <textarea placeholder="Message SMS (variables : {prenom}, {nom})" value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none" />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{chars} caractères</span>
                <span>{smsCount} SMS · {(smsCount * 0.15).toFixed(2)} €/destinataire</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={createCampagne} className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
