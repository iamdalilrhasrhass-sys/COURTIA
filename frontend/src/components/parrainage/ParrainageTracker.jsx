import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

export default function ParrainageTracker() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API}/api/parrainage/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setData);
  }, []);

  function copyLink() {
    navigator.clipboard.writeText(data.lien_parrainage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!data) return <div className="p-6 text-gray-400">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">🎁 Programme Parrainage</h2>
        <p className="text-sm text-gray-400 mt-1">
          Tu gagnes <span className="text-green-400 font-medium">{data.reward_referrer} €</span> par filleul converti ·
          Ton filleul gagne <span className="text-cyan-400 font-medium">{data.reward_referee} €</span> sur son premier mois
        </p>
      </div>

      {/* Code + lien */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-xl p-5 border border-cyan-700/40">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Ton code de parrainage</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-cyan-400 tracking-widest">{data.code}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input value={data.lien_parrainage} readOnly
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-300" />
          <button onClick={copyLink}
            className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg text-sm font-medium transition">
            {copied ? "✓ Copié" : "Copier"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Invitations envoyées", val: data.total_referrals, color: "text-white" },
          { label: "Conversions", val: data.total_conversions, color: "text-green-400" },
          { label: "Gains cumulés", val: `${data.total_reward_eur} €`, color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Liste filleuls */}
      {data.referrals?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Filleuls</p>
          {data.referrals.map(r => (
            <div key={r.id} className="bg-gray-800/40 rounded-lg p-3 flex justify-between items-center border border-gray-700/50">
              <div>
                <p className="text-sm text-white">{r.referee_email}</p>
                <p className="text-xs text-gray-400">{r.filleul_cabinet || "En attente d'inscription"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  r.statut === "converted" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"
                }`}>{r.statut === "converted" ? `+${r.reward_eur} €` : "En attente"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA partage */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => window.open(`mailto:?subject=Découvre COURTIA&body=Utilise mon lien : ${data.lien_parrainage}`)}
          className="py-3 rounded-xl border border-gray-600 text-gray-300 text-sm hover:bg-gray-800 transition">
          📧 Inviter par email
        </button>
        <button onClick={() => window.open(`https://wa.me/?text=Utilise mon code COURTIA ${data.code} : ${data.lien_parrainage}`)}
          className="py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm transition">
          💬 Inviter sur WhatsApp
        </button>
      </div>
    </div>
  );
}
