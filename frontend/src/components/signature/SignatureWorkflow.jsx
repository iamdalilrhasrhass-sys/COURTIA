import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

export default function SignatureWorkflow() {
  const [dashboard, setDashboard] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientEmail: "", clientName: "", documentName: "" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/api/signature/dashboard`, { headers })
      .then(r => r.json()).then(setDashboard);
  }, []);

  async function handleSubmit() {
    if (!file || !form.clientEmail) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("document", file);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    const res = await fetch(`${API}/api/signature/create`, { method: "POST", headers, body: fd });
    const data = await res.json();
    setLoading(false);
    if (data.signature_link) {
      alert(`✅ Lien de signature envoyé à ${form.clientEmail}`);
      setShowForm(false);
    }
  }

  if (!dashboard) return <div className="p-6 text-gray-400">Chargement...</div>;

  const { stats, recent, credits } = dashboard;
  const creditsPct = credits ? Math.round((credits.credits_used / credits.credits_included) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">✍️ Signature Électronique</h2>
          <p className="text-sm text-gray-400 mt-1">Propulsé par Yousign — 0,50€/signature au-delà du quota</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
          + Nouvelle signature
        </button>
      </div>

      {/* Crédits */}
      <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-300">Signatures incluses ce mois</span>
          <span className="text-white font-medium">{credits?.credits_used || 0} / {credits?.credits_included || 20}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className="bg-cyan-400 h-2 rounded-full transition-all" style={{ width: `${creditsPct}%` }} />
        </div>
        {creditsPct >= 80 && <p className="text-amber-400 text-xs mt-1">⚠️ Quota bientôt atteint — les suivantes seront facturées 0,50€ each</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En attente", val: stats?.en_attente || 0, color: "text-amber-400" },
          { label: "Signées", val: stats?.signees || 0, color: "text-green-400" },
          { label: "Expirées", val: stats?.expirees || 0, color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Liste récente */}
      <div className="space-y-2">
        {(recent || []).map(r => (
          <div key={r.id} className="bg-gray-800/40 rounded-lg p-3 flex justify-between items-center border border-gray-700/50">
            <div>
              <p className="text-sm font-medium text-white">{r.document_name}</p>
              <p className="text-xs text-gray-400">{r.client_nom} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                r.status === "signed" ? "bg-green-900/50 text-green-400" :
                r.status === "expired" ? "bg-red-900/50 text-red-400" :
                "bg-amber-900/50 text-amber-400"
              }`}>{r.status === "signed" ? "Signé" : r.status === "expired" ? "Expiré" : "En attente"}</span>
              {r.status === "pending" && r.yousign_signature_link && (
                <a href={r.yousign_signature_link} target="_blank" className="text-xs text-cyan-400 hover:text-cyan-300">Lien ↗</a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal création */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Nouvelle demande de signature</h3>
            <input placeholder="Nom du client" value={form.clientName}
              onChange={e => setForm({ ...form, clientName: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Email du client" type="email" value={form.clientEmail}
              onChange={e => setForm({ ...form, clientEmail: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <input placeholder="Nom du document" value={form.documentName}
              onChange={e => setForm({ ...form, documentName: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])}
              className="text-sm text-gray-300" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm hover:bg-gray-800">Annuler</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-medium text-sm transition disabled:opacity-50">
                {loading ? "Envoi..." : "Envoyer pour signature"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
