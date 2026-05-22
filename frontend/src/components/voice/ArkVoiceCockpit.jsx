// ============================================================
// /root/courtia/frontend/src/components/voice/ArkVoiceCockpit.jsx
// FRONTEND — Réglages Voice + Historique + bouton appel client
// Style : Aurora Bubble C — dark cockpit premium
// ============================================================

import { useState, useEffect } from 'react';
import { Phone, PhoneCall, Settings, Clock, Volume2, Loader2, Sparkles } from 'lucide-react';

const T = {
  bg: '#050510',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  text: '#F8FAFC',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#8B5CF6',
  accentBg: 'rgba(139,92,246,0.08)',
  accentBorder: 'rgba(139,92,246,0.15)',
  cyan: '#22D3EE',
  success: '#22C55E',
  danger: '#EF4444',
};

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
    await fetch(`${apiBase}/voice/settings`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    setSaving(false);
  };

  const testCall = async () => {
    setTestCalling(true);
    await fetch(`${apiBase}/voice/test-call`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
    setTestCalling(false);
  };

  if (loading) return (
    <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color={T.cyan} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header card */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(14px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${T.accent}, ${T.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>ARK Voice</h2>
              <p style={{ fontSize: 11, color: T.textMuted, margin: '2px 0 0 0' }}>Assistant téléphonique IA — appels sortants et réception</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={testCall} disabled={testCalling} style={{
              padding: '8px 16px', borderRadius: 10, border: `1px solid ${T.accentBorder}`, background: T.accentBg,
              color: T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              opacity: testCalling ? 0.5 : 1,
            }}>
              <PhoneCall size={14} /> {testCalling ? 'Appel test...' : 'Tester'}
            </button>
          </div>
        </div>

        {/* Toggle settings row */}
        {settings && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { key: 'morning_call_enabled', label: 'Brief matinal', icon: Clock },
              { key: 'client_call_enabled', label: 'Appels clients', icon: Phone },
            ].map(({ key, label, icon: Icon }) => (
              <label key={key} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                borderRadius: 10, background: settings[key] ? T.accentBg : 'rgba(255,255,255,0.02)',
                border: `1px solid ${settings[key] ? T.accentBorder : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer', fontSize: 12, color: T.textSecondary, fontWeight: 500,
              }}>
                <Icon size={14} color={settings[key] ? T.accent : T.textMuted} />
                {label}
                <input type="checkbox" checked={settings[key]} onChange={e => setSettings({ ...settings, [key]: e.target.checked })}
                  style={{ accentColor: T.accent, marginLeft: 4 }} />
              </label>
            ))}
            {saving && <span style={{ fontSize: 11, color: T.cyan }}>Sauvegarde...</span>}
          </div>
        )}
      </div>

      {/* Call history */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '16px 22px', backdropFilter: 'blur(14px)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} color={T.accent} /> Historique des appels
        </h3>
        {history.length === 0 ? (
          <p style={{ fontSize: 12, color: T.textMuted, textAlign: 'center', padding: 20 }}>Aucun appel pour l'instant</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((call, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <PhoneCall size={14} color={call.status === 'completed' ? T.success : T.danger} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{call.client_name || 'Client'}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{call.duration || '--'} · {call.created_at ? new Date(call.created_at).toLocaleDateString('fr-FR') : '--'}</div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 99,
                  background: call.status === 'completed' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: call.status === 'completed' ? T.success : T.danger, fontWeight: 600,
                }}>{call.status === 'completed' ? 'OK' : 'Échec'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Bouton appel client pour fiche client
export function CallClientButton({ clientId, apiBase = '/api', authToken }) {
  const [calling, setCalling] = useState(false);
  const call = async () => {
    setCalling(true);
    await fetch(`${apiBase}/voice/call/${clientId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
    setCalling(false);
  };
  return (
    <button onClick={call} disabled={calling} style={{
      padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.accentBorder}`,
      background: T.accentBg, color: T.text, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
      opacity: calling ? 0.5 : 1,
    }}>
      {calling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Phone size={14} color={T.accent} />}
      {calling ? 'Appel...' : 'Appeler'}
    </button>
  );
}
