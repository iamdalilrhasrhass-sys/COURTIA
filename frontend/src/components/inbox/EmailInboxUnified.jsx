// ============================================================
// /root/courtia/frontend/src/components/inbox/EmailInboxUnified.jsx
// FRONTEND — Inbox emails classifiés IA avec réponses suggérées
// Style : Aurora Bubble C — dark cockpit premium
// ============================================================

import { useState, useEffect } from 'react';
import { Mail, RefreshCw, Loader2, MessageSquare, ThumbsUp, AlertTriangle, X, Sparkles, Settings, CheckCheck, ChevronRight } from 'lucide-react';

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
  warning: '#F59E0B',
  danger: '#EF4444',
  pink: '#FF65BB',
};

const CLASSIFICATIONS = {
  positive_response: { color: T.success, icon: ThumbsUp, label: 'Réponse positive' },
  signed: { color: T.success, icon: CheckCheck, label: 'Signé' },
  question: { color: T.cyan, icon: MessageSquare, label: 'Question' },
  objection: { color: T.warning, icon: AlertTriangle, label: 'Objection' },
  refusal: { color: T.danger, icon: X, label: 'Refus' },
  complaint: { color: T.danger, icon: AlertTriangle, label: 'Réclamation' },
  new_lead: { color: T.accent, icon: Sparkles, label: 'Nouveau lead' },
  unrelated: { color: T.textMuted, icon: Mail, label: 'Hors sujet' }
};

export default function EmailInboxUnified({ apiBase = '/api', authToken }) {
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('pending');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/email/inbox?filter=${filter}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) setInbox(d.inbox || []);
    } finally { setLoading(false); }
  };

  const scan = async () => {
    setScanning(true);
    try {
      await fetch(`${apiBase}/email/scan`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
      await load();
    } finally { setScanning(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const counts = {
    all: inbox.length,
    pending: inbox.filter(e => !e.classification || e.classification === 'pending').length,
    important: inbox.filter(e => ['positive_response', 'signed', 'new_lead', 'question'].includes(e.classification)).length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(14px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${T.cyan}, ${T.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Boîte mail unifiée</h2>
              <p style={{ fontSize: 11, color: T.textMuted, margin: '2px 0 0 0' }}>Emails classifiés par ARK — {counts.all} messages</p>
            </div>
          </div>
          <button onClick={scan} disabled={scanning} style={{
            padding: '8px 16px', borderRadius: 10, border: `1px solid ${T.accentBorder}`, background: T.accentBg,
            color: T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            opacity: scanning ? 0.5 : 1,
          }}>
            <RefreshCw size={14} style={scanning ? { animation: 'spin 1s linear infinite' } : {}} />
            {scanning ? 'Scan en cours…' : 'Scanner maintenant'}
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Tous', count: counts.all },
            { key: 'pending', label: 'En attente', count: counts.pending },
            { key: 'important', label: 'Importants', count: counts.important },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: '6px 14px', borderRadius: 999, border: `1px solid ${filter === key ? T.accentBorder : 'rgba(255,255,255,0.06)'}`,
              background: filter === key ? T.accentBg : 'transparent',
              color: filter === key ? T.text : T.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              {label} {count > 0 && <span style={{ opacity: 0.5 }}>({count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Email list */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(14px)' }}>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={24} color={T.cyan} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : inbox.length === 0 ? (
          <p style={{ fontSize: 12, color: T.textMuted, textAlign: 'center', padding: 40 }}>Aucun email pour le moment — lance un scan</p>
        ) : (
          inbox.map((email, i) => {
            const cls = CLASSIFICATIONS[email.classification] || CLASSIFICATIONS.unrelated;
            const Icon = cls.icon;
            return (
              <div key={i} onClick={() => setSelected(selected === i ? null : i)} style={{
                padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                cursor: 'pointer', transition: 'background 0.15s',
                background: selected === i ? 'rgba(255,255,255,0.03)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon size={16} color={cls.color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{email.from_name || email.from}</span>
                      <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 'auto', flexShrink: 0 }}>{email.date ? new Date(email.date).toLocaleDateString('fr-FR') : '--'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email.subject}</div>
                    {selected === i && (
                      <div style={{ marginTop: 8, fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                        <p style={{ margin: '0 0 8px' }}>{email.body_preview || email.body || 'Aucun contenu disponible'}</p>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                          borderRadius: 99, fontSize: 10, fontWeight: 600,
                          background: `rgba(${cls.color === T.success ? '34,197,94' : cls.color === T.danger ? '239,68,68' : cls.color === T.warning ? '245,158,11' : '139,92,246'},0.1)`,
                          color: cls.color,
                        }}>
                          {cls.label}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} color={T.textMuted} style={{ transform: selected === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', marginTop: 2 }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
