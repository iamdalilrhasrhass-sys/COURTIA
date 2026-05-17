import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

export default function RGPDRegistre() {
  const [activites, setActivites] = useState([]);
  const [inited, setInited] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = () => fetch(`${API}/api/rgpd/registre`, { headers }).then(r => r.json()).then(a => { setActivites(a); setInited(a.length > 0); });
  useEffect(() => { load(); }, []);

  async function initRegistre() {
    setLoading(true);
    await fetch(`${API}/api/rgpd/init`, { method: "POST", headers });
    await load();
    setLoading(false);
  }

  async function downloadPDF() {
    const res = await fetch(`${API}/api/rgpd/registre/pdf`, { method: "POST", headers });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url);
  }

  const baseLegaleColor = bl => {
    if (bl?.includes('contrat')) return 'text-blue-400';
    if (bl?.includes('légale')) return 'text-orange-400';
    if (bl?.includes('légitime')) return 'text-purple-400';
    if (bl?.includes('consentement')) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">🛡️ Registre RGPD</h2>
          <p className="text-sm text-gray-400 mt-1">Art. 30 RGPD — Obligation légale pour tout responsable de traitement</p>
        </div>
        <div className="flex gap-2">
          {!inited && (
            <button onClick={initRegistre} disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {loading ? "Initialisation..." : "Initialiser mon registre"}
            </button>
          )}
          {inited && (
            <button onClick={downloadPDF} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
              📄 Télécharger PDF
            </button>
          )}
        </div>
      </div>

      {!inited && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-amber-400 font-medium text-sm">Registre non initialisé</p>
            <p className="text-gray-400 text-xs mt-1">Le RGPD impose à tout responsable de traitement de tenir un registre des activités. ARK pré-remplit les activités standard d'un courtier en assurance.</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activites.map((a, i) => {
          const categories = typeof a.categories_donnees === 'string' ? JSON.parse(a.categories_donnees) : a.categories_donnees || [];
          const mesures = typeof a.mesures_securite === 'string' ? JSON.parse(a.mesures_securite) : a.mesures_securite || [];
          return (
            <div key={a.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs text-gray-500 mr-2">#{i + 1}</span>
                  <span className="font-medium text-white">{a.nom_traitement}</span>
                </div>
                <span className={`text-xs font-medium ${baseLegaleColor(a.base_legale)}`}>
                  {a.base_legale?.split('(')[0].trim()}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{a.finalite}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {categories.map((c, j) => (
                  <span key={j} className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Conservation : {a.duree_conservation}</span>
                {a.transferts_hors_ue && <span className="text-amber-400">⚠️ Transfert hors UE</span>}
              </div>
            </div>
          );
        })}
      </div>

      {inited && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-3 text-center">
          <p className="text-green-400 text-sm font-medium">✅ Registre conforme Art. 30 RGPD</p>
          <p className="text-gray-400 text-xs mt-1">Télécharge le PDF et conserve-le. Mets-le à jour à chaque nouveau traitement.</p>
        </div>
      )}
    </div>
  );
}
