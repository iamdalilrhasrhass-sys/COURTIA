import { useState, useEffect } from "react";
import asArray from "../utils/asArray";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const ROLES = { admin: "Admin", agent: "Agent", stagiaire: "Stagiaire" };
const ROLE_COLORS = { admin: "text-purple-400", agent: "text-cyan-400", stagiaire: "text-gray-400" };

export default function EquipeCabinet() {
  const [membres, setMembres] = useState([]);
  const [stats, setStats] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", role: "agent" });
  const [invited, setInvited] = useState(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = () => {
    fetch(`${API}/api/equipe`, { headers }).then(r => r.json()).then(d => setMembres(asArray(d)));
    fetch(`${API}/api/equipe/stats`, { headers }).then(r => r.json()).then(setStats);
  };
  useEffect(() => { load(); }, []);

  async function inviter() {
    const res = await fetch(`${API}/api/equipe/inviter`, { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    setInvited(data);
    setShowInvite(false);
    load();
  }

  async function retirerMembre(membreId) {
    if (!confirm("Retirer ce membre de l'équipe ?")) return;
    await fetch(`${API}/api/equipe/membres/${membreId}`, { method: "DELETE", headers });
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">👥 Équipe Cabinet</h2>
          <p className="text-sm text-gray-400 mt-1">Gérez votre équipe et les accès au portefeuille</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
          + Inviter un collaborateur
        </button>
      </div>

      {invited && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
          <p className="text-green-400 font-medium text-sm">✅ Invitation envoyée</p>
          <p className="text-xs text-gray-400 mt-1">Lien d'invitation : {invited.invite_url}</p>
          <button onClick={() => navigator.clipboard.writeText(invited.invite_url)} className="text-xs text-cyan-400 mt-1 hover:text-cyan-300">Copier le lien</button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Collaborateurs", val: stats.nb_membres || 0 },
            { label: "Clients équipe", val: stats.total_clients || 0 },
            { label: "CA équipe", val: `${Math.round(parseFloat(stats.ca_total_equipe||0)).toLocaleString('fr-FR')} €` },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700 text-center">
              <p className="text-xl font-bold text-white">{s.val}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {membres.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm">Aucun collaborateur pour l'instant.</p>
          </div>
        )}
        {membres.map(m => (
          <div key={m.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-white">
                    {(m.nom_cabinet || m.email)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{m.nom_cabinet || m.email}</p>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs font-medium ${ROLE_COLORS[m.role]}`}>{ROLES[m.role] || m.role}</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{m.nb_clients_assignes || 0} clients assignés</span>
                  <span className="text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{Math.round(parseFloat(m.ca_gere||0)).toLocaleString('fr-FR')} € CA</span>
                </div>
              </div>
              <div className="flex gap-2">
                <select value={m.role}
                  onChange={async e => {
                    await fetch(`${API}/api/equipe/membres/${m.membre_user_id}/role`, {
                      method: "PATCH", headers, body: JSON.stringify({ role: e.target.value })
                    });
                    load();
                  }}
                  className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300">
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={() => retirerMembre(m.membre_user_id)}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-900/40 rounded">
                  Retirer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Inviter un collaborateur</h3>
            <input placeholder="Email du collaborateur" type="email" value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={inviter} className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm">Envoyer l'invitation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
