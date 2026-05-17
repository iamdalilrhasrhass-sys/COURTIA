import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const JOURS = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const TYPE_COLORS = { appel: "bg-blue-900/50 text-blue-300", visio: "bg-purple-900/50 text-purple-300", presentiel: "bg-green-900/50 text-green-300", client_entrant: "bg-amber-900/50 text-amber-300" };

export default function AgendaRDV() {
  const [rdvs, setRdvs] = useState([]);
  const [view, setView] = useState("semaine");
  const [showForm, setShowForm] = useState(false);
  const [showDispo, setShowDispo] = useState(false);
  const [bookingPage, setBookingPage] = useState(null);
  const [form, setForm] = useState({ titre: "", clientId: "", dateHeure: "", dureeMinutes: 60, typeRdv: "appel", lienVisio: "", clientEmail: "", sendConfirmation: true });
  const [dispos, setDispos] = useState([]);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const now = new Date();
  const debut = new Date(now); debut.setDate(now.getDate() - now.getDay());
  const fin = new Date(debut); fin.setDate(debut.getDate() + 6);

  useEffect(() => {
    fetch(`${API}/api/agenda?debut=${debut.toISOString()}&fin=${fin.toISOString()}`, { headers })
      .then(r => r.json()).then(setRdvs);
    fetch(`${API}/api/agenda/disponibilites`, { headers }).then(r => r.json()).then(setDispos);
  }, []);

  async function createRDV() {
    await fetch(`${API}/api/agenda/rdv`, { method: "POST", headers, body: JSON.stringify(form) });
    setShowForm(false);
    fetch(`${API}/api/agenda?debut=${debut.toISOString()}&fin=${fin.toISOString()}`, { headers }).then(r => r.json()).then(setRdvs);
  }

  async function createBookingPage() {
    const slug = prompt("Slug de ta page (ex: dupont-conseils):");
    if (!slug) return;
    const res = await fetch(`${API}/api/agenda/booking-page`, {
      method: "POST", headers, body: JSON.stringify({ slug, titre: "Prendre un RDV", durees: [30, 60] })
    });
    const data = await res.json();
    setBookingPage(data);
  }

  async function updateStatut(id, statut) {
    await fetch(`${API}/api/agenda/rdv/${id}/statut`, { method: "PATCH", headers, body: JSON.stringify({ statut }) });
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, statut } : r));
  }

  const rdvsParJour = JOURS.map((_, i) => {
    const d = new Date(debut); d.setDate(debut.getDate() + i);
    return rdvs.filter(r => new Date(r.date_heure).toDateString() === d.toDateString());
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">📅 Agenda & RDV</h2>
          <p className="text-sm text-gray-400 mt-1">Prise de RDV en ligne + gestion agenda</p>
        </div>
        <div className="flex gap-2">
          <button onClick={createBookingPage} className="border border-gray-600 text-gray-300 hover:bg-gray-800 px-3 py-2 rounded-lg text-sm transition">
            🔗 Page réservation
          </button>
          <button onClick={() => setShowForm(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-medium px-4 py-2 rounded-lg text-sm transition">
            + RDV
          </button>
        </div>
      </div>

      {bookingPage && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-3 flex justify-between items-center">
          <div>
            <p className="text-green-400 text-sm font-medium">✅ Page de réservation créée</p>
            <p className="text-gray-400 text-xs mt-0.5">{bookingPage.lien_public}</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(bookingPage.lien_public); }}
            className="text-xs text-cyan-400 hover:text-cyan-300">Copier</button>
        </div>
      )}

      {/* Semaine */}
      <div className="grid grid-cols-7 gap-1">
        {JOURS.map((jour, i) => {
          const d = new Date(debut); d.setDate(debut.getDate() + i);
          const isToday = d.toDateString() === now.toDateString();
          return (
            <div key={i} className={`rounded-xl border ${isToday ? 'border-cyan-500/50 bg-cyan-900/10' : 'border-gray-700/50 bg-gray-800/30'} p-2 min-h-[120px]`}>
              <p className={`text-xs font-medium mb-1 ${isToday ? 'text-cyan-400' : 'text-gray-400'}`}>
                {jour} <span className={isToday ? 'text-cyan-300' : 'text-gray-500'}>{d.getDate()}</span>
              </p>
              {rdvsParJour[i].map(r => (
                <div key={r.id} className={`rounded p-1.5 mb-1 text-xs cursor-pointer ${TYPE_COLORS[r.type_rdv] || 'bg-gray-700 text-gray-300'}`}
                  onClick={() => { if (confirm(`Annuler "${r.titre}" ?`)) updateStatut(r.id, 'annule'); }}>
                  <p className="font-medium truncate">{r.titre}</p>
                  <p className="opacity-70">{new Date(r.date_heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                  {r.client_nom && <p className="opacity-70 truncate">{r.client_nom}</p>}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Liste complète */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Cette semaine</p>
        {rdvs.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Aucun RDV cette semaine</p>}
        {rdvs.sort((a,b) => new Date(a.date_heure)-new Date(b.date_heure)).map(r => (
          <div key={r.id} className="bg-gray-800/40 rounded-lg p-3 flex justify-between items-center border border-gray-700/50">
            <div>
              <p className="text-sm font-medium text-white">{r.titre}</p>
              <p className="text-xs text-gray-400">
                {new Date(r.date_heure).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })} à {new Date(r.date_heure).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })} · {r.duree_minutes} min
              </p>
              {r.client_nom && <p className="text-xs text-gray-500">{r.client_nom}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[r.type_rdv]}`}>{r.type_rdv}</span>
              {r.lien_visio && <a href={r.lien_visio} target="_blank" className="text-xs text-cyan-400">📹 Rejoindre</a>}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 space-y-3">
            <h3 className="text-lg font-semibold text-white">Nouveau RDV</h3>
            <input placeholder="Titre" value={form.titre} onChange={e => setForm(f => ({...f, titre: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <input type="datetime-local" value={form.dateHeure} onChange={e => setForm(f => ({...f, dateHeure: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.dureeMinutes} onChange={e => setForm(f => ({...f, dureeMinutes: parseInt(e.target.value)}))}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                {[15,30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
              <select value={form.typeRdv} onChange={e => setForm(f => ({...f, typeRdv: e.target.value}))}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                {['appel','visio','presentiel'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {form.typeRdv === 'visio' && (
              <input placeholder="Lien visio (Meet, Teams...)" value={form.lienVisio} onChange={e => setForm(f => ({...f, lienVisio: e.target.value}))}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            )}
            <input placeholder="Email client (pour confirmation)" value={form.clientEmail} onChange={e => setForm(f => ({...f, clientEmail: e.target.value}))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">Annuler</button>
              <button onClick={createRDV} className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
