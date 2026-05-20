import { useState, useEffect } from "react";
import asArray from "../utils/asArray";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

export default function ArkWidgetManager() {
  const [widgets, setWidgets] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ nom: "", couleurPrimaire: "#00B4D8", messageAccueil: "Bonjour ! Je suis ARK, votre assistant assurance. Comment puis-je vous aider ?" });
  const [copied, setCopied] = useState(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/api/ark-widgets`, { headers }).then(r => r.json()).then(d => setWidgets(asArray(d)));
  }, []);

  async function createWidget() {
    const res = await fetch(`${API}/api/ark-widgets/create`, { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    setWidgets(prev => [data, ...prev]);
    setShowCreate(false);
  }

  async function loadStats(widgetId) {
    const res = await fetch(`${API}/api/ark-widgets/${widgetId}/stats`, { headers });
    const data = await res.json();
    setStats(data);
    setSelected(widgets.find(w => w.id === widgetId));
  }

  function copyCode(code, id) {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">🤖 ARK Widget Embeddable</h2>
          <p className="text-sm text-gray-400 mt-1">Chatbot ARK sur votre site · 10 tokens/conversation · Leads auto-capturés</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
          + Créer widget
        </button>
      </div>

      {widgets.length === 0 && (
        <div className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 rounded-2xl border border-purple-700/30 p-8 text-center">
          <p className="text-4xl mb-3">🤖</p>
          <p className="text-white font-medium">Déployez ARK sur votre site</p>
          <p className="text-gray-400 text-sm mt-2">Ajoutez 2 lignes de code sur votre site web.<br/>ARK qualifie vos visiteurs et capture leurs coordonnées automatiquement.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 bg-purple-600 hover:bg-purple-500 text-white font-medium px-6 py-2 rounded-xl text-sm transition">
            Créer mon premier widget
          </button>
        </div>
      )}

      <div className="space-y-4">
        {widgets.map(w => (
          <div key={w.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: w.couleur_primaire }}>
                    ARK
                  </div>
                  <div>
                    <p className="font-medium text-white">{w.nom}</p>
                    <p className="text-xs text-gray-400">{w.nb_conversations} convs · {w.leads_captures} leads · {w.tokens_consommes} tokens</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadStats(w.id)} className="text-xs text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg border border-gray-600">
                    Statistiques
                  </button>
                  <span className={`text-xs px-2 py-1 rounded-full ${w.actif ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {w.actif ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>

              {/* Code d'intégration */}
              <div className="mt-4 bg-gray-900 rounded-lg p-3 border border-gray-700/50">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-gray-400">Code d'intégration — coller avant </p>
                  <button onClick={() => copyCode(w.embed_code, w.id)}
                    className="text-xs text-cyan-400 hover:text-cyan-300">
                    {copied === w.id ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
                <code className="text-xs text-green-400 whitespace-pre-wrap break-all">
                  {w.embed_code}
                </code>
              </div>
            </div>

            {/* Stats détaillées */}
            {selected?.id === w.id && stats && (
              <div className="border-t border-gray-700 p-4 space-y-3">
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: "Conversations", val: stats.stats?.total_conversations || 0 },
                    { label: "Leads capturés", val: stats.stats?.leads_captures || 0 },
                    { label: "Tokens utilisés", val: stats.stats?.tokens_total || 0 },
                    { label: "Msgs/conversation", val: Math.round(stats.stats?.messages_par_conv || 0) },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-800 rounded-lg p-2">
                      <p className="text-lg font-bold text-white">{s.val}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Dernières conversations</p>
                  {stats.conversations?.slice(0,5).map(c => (
                    <div key={c.id} className="flex justify-between text-xs bg-gray-800/50 rounded-lg p-2">
                      <span className="text-gray-300">{c.client_email || 'Anonyme'}</span>
                      <span className="text-gray-500">{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                      {c.lead_capture && <span className="text-green-400">Lead ✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Créer un widget ARK</h3>
            <input placeholder="Nom du widget (ex: Site principal)" value={form.nom}
              onChange={e => setForm(f => ({...f, nom: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <div>
              <label className="text-xs text-gray-400">Couleur principale</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="color" value={form.couleurPrimaire} onChange={e => setForm(f => ({...f, couleurPrimaire: e.target.value}))}
                  className="h-10 w-20 rounded-lg bg-gray-800 border border-gray-600 cursor-pointer" />
                <span className="text-sm text-gray-300">{form.couleurPrimaire}</span>
              </div>
            </div>
            <textarea placeholder="Message d'accueil du chatbot" value={form.messageAccueil} rows={3}
              onChange={e => setForm(f => ({...f, messageAccueil: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={createWidget} className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
