import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

export default function WhiteLabelAdmin() {
  const [tenant, setTenant] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newMember, setNewMember] = useState("");
  const [form, setForm] = useState({ nomReseau: "", subdomain: "", couleurPrimaire: "#00B4D8" });
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Chercher si l'user est admin d'un tenant
  useEffect(() => {
    // Placeholder — en prod, stocker tenant_id dans le profil user
    const tenantId = localStorage.getItem("wl_tenant_id");
    if (tenantId) {
      fetch(`${API}/api/whitelabel/${tenantId}/dashboard`, { headers })
        .then(r => r.json()).then(d => { setDashboard(d); setTenant(d.tenant); });
    }
  }, []);

  async function createTenant() {
    const res = await fetch(`${API}/api/whitelabel/create`, { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    localStorage.setItem("wl_tenant_id", data.id);
    setTenant(data);
    setShowCreate(false);
  }

  async function addMember() {
    if (!newMember || !tenant) return;
    await fetch(`${API}/api/whitelabel/${tenant.id}/member`, {
      method: "POST", headers, body: JSON.stringify({ email: newMember })
    });
    setNewMember("");
    // Recharger
    fetch(`${API}/api/whitelabel/${tenant.id}/dashboard`, { headers }).then(r => r.json()).then(setDashboard);
  }

  if (!tenant && !showCreate) return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">🏢 White-label COURTIA</h2>
        <p className="text-sm text-gray-400 mt-1">Déployez COURTIA sous votre marque réseau · 499 €/mois</p>
      </div>
      <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl border border-gray-700 p-8 text-center space-y-4">
        <p className="text-4xl">🏢</p>
        <p className="text-white font-medium">Vous gérez un réseau d'agences ?</p>
        <p className="text-gray-400 text-sm">Déployez COURTIA sous votre marque avec vos couleurs, votre logo et votre domaine personnalisé. Vue consolidée multi-agences incluse.</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { icon: "🎨", label: "Vos couleurs & logo" },
            { icon: "🌐", label: "Domaine personnalisé" },
            { icon: "📊", label: "Dashboard réseau" },
          ].map(f => (
            <div key={f.label} className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl">{f.icon}</p>
              <p className="text-xs text-gray-300 mt-1">{f.label}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-8 py-3 rounded-xl text-sm transition mt-4">
          Créer mon réseau White-label
        </button>
      </div>
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white">Créer votre réseau</h3>
            <input placeholder="Nom du réseau (ex: Cabinet Dupont & Associés)" value={form.nomReseau}
              onChange={e => setForm(f => ({ ...f, nomReseau: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <div>
              <input placeholder="Sous-domaine (ex: dupont-assurances)" value={form.subdomain}
                onChange={e => setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              <p className="text-xs text-gray-500 mt-1">{form.subdomain && `→ ${form.subdomain}.courtiark.fr`}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">Couleur principale</label>
              <input type="color" value={form.couleurPrimaire}
                onChange={e => setForm(f => ({ ...f, couleurPrimaire: e.target.value }))}
                className="mt-1 block w-full h-10 rounded-lg bg-gray-800 border border-gray-600 cursor-pointer" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={createTenant} className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">🏢 {tenant?.nom_reseau}</h2>
          <p className="text-sm text-gray-400 mt-1">{tenant?.subdomain}.courtiark.fr · {tenant?.nb_agences}/{tenant?.max_agences} agences</p>
        </div>
        <div className="w-8 h-8 rounded-full" style={{ background: tenant?.couleur_primaire }} />
      </div>

      {/* Ajouter membre */}
      <div className="flex gap-2">
        <input placeholder="Email du courtier à ajouter" value={newMember}
          onChange={e => setNewMember(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
        <button onClick={addMember} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm">
          + Ajouter
        </button>
      </div>

      {/* Membres */}
      <div className="space-y-2">
        {dashboard?.members?.map(m => (
          <div key={m.user_id} className="bg-gray-800/40 rounded-lg p-3 flex justify-between items-center border border-gray-700/50">
            <div>
              <p className="text-sm font-medium text-white">{m.nom_cabinet || m.email}</p>
              <p className="text-xs text-gray-400">{m.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-cyan-400 font-medium">{parseFloat(m.ca_portefeuille || 0).toFixed(0)} €</p>
              <p className="text-xs text-gray-500">{m.nb_clients} clients</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
