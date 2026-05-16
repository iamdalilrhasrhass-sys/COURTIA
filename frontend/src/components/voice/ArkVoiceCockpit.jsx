// ============================================================
// /root/courtia/frontend/src/components/voice/ArkVoiceCockpit.jsx
// FRONTEND — Réglages Voice + Historique + bouton appel client
// ============================================================

import { useState, useEffect } from 'react';
import { Phone, PhoneCall, Settings, Clock, Volume2, Loader2, Check, AlertCircle } from 'lucide-react';

export default function ArkVoiceCockpit({ apiBase = '/api', authToken }) {
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCalling, setTestCalling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        fetch(`${apiBase}/voice/settings`, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json()),
        fetch(`${apiBase}/voice/history?limit=8`, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json())
      ]);
      if (s.success) setSettings(s.settings);
      if (h.success) setHistory(h.history);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${apiBase}/voice/settings`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } finally { setSaving(false); }
  };

  const testCall = async () => {
    setTestCalling(true);
    try {
      const r = await fetch(`${apiBase}/voice/morning-brief`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (!d.success) alert(`Échec : ${d.reason || d.error}`);
      else alert('Appel programmé — décroche ton téléphone dans 10 secondes');
      await load();
    } finally { setTestCalling(false); }
  };

  if (loading || !settings) {
    return <div className="rounded-3xl bg-slate-900/60 border border-slate-700/50 p-12 flex items-center justify-center backdrop-blur-xl"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl overflow-hidden">
        <div className="relative p-6">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">ARK Voice</h2>
              <p className="text-slate-400 text-xs">Appels téléphoniques pilotés par IA</p>
            </div>
          </div>

          <div className="relative space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-white font-medium">Brief matinal vocal</div>
                  <div className="text-xs text-slate-400">ARK t'appelle chaque matin pour briefer ta journée</div>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, morning_call_enabled: !settings.morning_call_enabled })}
                className={`w-12 h-6 rounded-full transition relative ${settings.morning_call_enabled ? 'bg-cyan-500' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${settings.morning_call_enabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Téléphone (ton numéro)</label>
                <input
                  type="tel"
                  value={settings.phone_number || ''}
                  onChange={e => setSettings({ ...settings, phone_number: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:border-cyan-500/50 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Heure d'appel</label>
                <input
                  type="time"
                  value={(settings.morning_call_time || '07:30:00').slice(0, 5)}
                  onChange={e => setSettings({ ...settings, morning_call_time: e.target.value + ':00' })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:border-cyan-500/50 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">Budget quotidien max</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" step="0.5" min="0" max="50"
                  value={settings.daily_budget_eur || 5}
                  onChange={e => setSettings({ ...settings, daily_budget_eur: parseFloat(e.target.value) })}
                  className="w-24 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:border-cyan-500/50 outline-none"
                />
                <span className="text-slate-400 text-sm">€ / jour — au-delà, les appels sont bloqués</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={save} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer
              </button>
              <button
                onClick={testCall} disabled={testCalling || !settings.phone_number}
                className="px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-white text-sm border border-slate-700/50 transition disabled:opacity-50 flex items-center gap-2"
              >
                {testCalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />} Test appel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> Historique récent
        </h3>
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-6">Aucun appel pour l'instant</div>
          ) : history.map(call => (
            <div key={call.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${call.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : call.status === 'failed' ? 'bg-red-500/20 text-red-300' : 'bg-slate-700/60 text-slate-300'}`}>
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{call.client_name || 'Brief matinal'}</div>
                <div className="text-xs text-slate-400 truncate">{call.call_type} · {call.status} · {new Date(call.created_at).toLocaleString('fr')}</div>
                {call.ai_summary && <div className="text-xs text-slate-300 italic mt-1 line-clamp-2">{call.ai_summary}</div>}
              </div>
              <div className="text-right text-xs text-slate-400">
                {call.duration_seconds > 0 && <div>{Math.round(call.duration_seconds / 60)}min</div>}
                {call.cost_eur > 0 && <div>{parseFloat(call.cost_eur).toFixed(2)}€</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bouton compact à intégrer dans la fiche client
export function CallClientButton({ clientId, apiBase = '/api', authToken }) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const call = async (callType) => {
    setLoading(true); setShowMenu(false);
    try {
      const r = await fetch(`${apiBase}/voice/call-client`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, call_type: callType })
      });
      const d = await r.json();
      if (d.success) alert('ARK est en train d\'appeler le client. Tu verras le résultat dans l\'historique.');
      else alert(`Échec : ${d.error}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)} disabled={loading}
        className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />} Faire appeler par ARK
      </button>
      {showMenu && (
        <div className="absolute top-full right-0 mt-1 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-xl z-10 overflow-hidden">
          {[
            { id: 'qualification', label: 'Qualifier le besoin' },
            { id: 'relance', label: 'Relancer sur devis' },
            { id: 'rdv', label: 'Fixer un RDV' },
            { id: 'document', label: 'Demander un document' }
          ].map(opt => (
            <button key={opt.id} onClick={() => call(opt.id)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-800 transition">
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
