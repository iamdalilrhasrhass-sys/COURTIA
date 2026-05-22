// ============================================================
// /root/courtia/frontend/src/components/dda/DDACompliance.jsx
// FRONTEND — Dashboard conformité DDA avec score visuel + export PDF
// Style : Aurora Bubble C — dark cockpit premium
// ============================================================

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Download, RefreshCw, Loader2, AlertTriangle, FileText, Sparkles } from 'lucide-react';

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
  successBg: 'rgba(34,197,94,0.08)',
  successBorder: 'rgba(34,197,94,0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.08)',
  warningBorder: 'rgba(245,158,11,0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.08)',
  dangerBorder: 'rgba(239,68,68,0.15)',
};

const LEVELS = {
  conforme: { color: 'success', icon: ShieldCheck, label: 'Conforme' },
  partiel: { color: 'warning', icon: ShieldAlert, label: 'Partiel' },
  non_conforme: { color: 'danger', icon: ShieldX, label: 'Non conforme' }
};

export default function DDACompliance({ apiBase = '/api', authToken }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/dda/dashboard`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) setDashboard(d.dashboard);
    } finally { setLoading(false); }
  };

  const batchAudit = async () => {
    setAuditing(true);
    try {
      await fetch(`${apiBase}/dda/batch-audit`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
      await load();
    } finally { setAuditing(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading || !dashboard) return (
    <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color={T.cyan} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const stats = dashboard.stats;
  const total = parseInt(stats.total || 0);

  const colorTokens = {
    success: { bg: T.successBg, border: T.successBorder, text: T.success },
    warning: { bg: T.warningBg, border: T.warningBorder, text: T.warning },
    danger: { bg: T.dangerBg, border: T.dangerBorder, text: T.danger },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Main card */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '20px 22px', backdropFilter: 'blur(14px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${T.cyan}, ${T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Conformité DDA</h2>
              <p style={{ fontSize: 11, color: T.textMuted, margin: '2px 0 0 0' }}>Directive Distribution Assurance — Audit automatique ARK</p>
            </div>
          </div>
          <button onClick={batchAudit} disabled={auditing} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${T.accent}, ${T.cyan})`,
            color: '#050510', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: auditing ? 0.6 : 1,
          }}>
            <RefreshCw size={14} style={auditing ? { animation: 'spin 1s linear infinite' } : {}} />
            {auditing ? 'Audit en cours…' : 'Auditer tous les clients'}
          </button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[
            { label: 'Total audités', value: total },
            { label: 'Conformes', value: parseInt(stats.conforme || 0), color: 'success' },
            { label: 'Partiels', value: parseInt(stats.partiel || 0), color: 'warning' },
            { label: 'Non conformes', value: parseInt(stats.non_conforme || 0), color: 'danger' },
            { label: 'Score moyen', value: `${stats.avg_score || 0}/100`, color: 'accent' },
          ].map(({ label, value, color }) => {
            const c = color === 'accent' ? { text: T.accent, bg: T.accentBg, border: T.accentBorder } : (colorTokens[color] || { text: T.text, bg: T.cardBg, border: T.cardBorder });
            return (
              <div key={label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{value}</div>
              </div>
            );
          })}
        </div>

        {/* Risk alert */}
        {parseInt(stats.at_risk || 0) > 0 && (
          <div style={{ marginTop: 14, borderRadius: 10, background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color={T.danger} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: T.textSecondary }}><strong style={{ color: T.danger }}>{stats.at_risk}</strong> dossiers en risque élevé/critique ACPR — à corriger en priorité</div>
          </div>
        )}
      </div>

      {/* Worst offenders list */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 16, padding: '16px 22px', backdropFilter: 'blur(14px)' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} color={T.warning} /> Dossiers à corriger en priorité
        </h3>
        {dashboard.worst.length === 0 ? (
          <p style={{ fontSize: 12, color: T.textMuted, textAlign: 'center', padding: 20 }}>Aucun audit pour l'instant — lance un audit batch</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dashboard.worst.map(audit => <ClientAuditRow key={audit.client_id} audit={audit} apiBase={apiBase} authToken={authToken} onRefresh={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientAuditRow({ audit, apiBase, authToken, onRefresh }) {
  const [reAuditing, setReAuditing] = useState(false);
  const level = LEVELS[audit.compliance_level] || LEVELS.non_conforme;
  const Icon = level.icon;
  const ct = colorTokens[level.color];

  const reAudit = async (e) => { e.stopPropagation(); setReAuditing(true); await fetch(`${apiBase}/dda/audit/${audit.client_id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } }); setReAuditing(false); onRefresh(); };
  const downloadReport = async (e) => { e.stopPropagation(); const r = await fetch(`${apiBase}/dda/report/${audit.client_id}`, { headers: { 'Authorization': `Bearer ${authToken}` } }); if (r.ok) { const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `DDA_${audit.client_name}.pdf`; a.click(); URL.revokeObjectURL(u); } };
  const missing = typeof audit.missing_items === 'string' ? JSON.parse(audit.missing_items) : (audit.missing_items || []);

  return (
    <div style={{ background: ct.bg, border: `1px solid ${ct.border}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={18} color={ct.text} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{audit.client_name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: ct.text }}>{audit.global_score}<span style={{ fontSize: 10, color: T.textMuted }}>/100</span></span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: T.cardBg, color: ct.text, border: `1px solid ${ct.border}` }}>{level.label}</span>
            </div>
          </div>
          {missing.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {missing.slice(0, 4).map((m, i) => <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: T.textSecondary }}>{m.check}</span>)}
              {missing.length > 4 && <span style={{ fontSize: 10, color: T.textMuted }}>+{missing.length - 4} autres</span>}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={downloadReport} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: T.textSecondary, fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Download size={12} /> Rapport PDF
        </button>
        <button onClick={reAudit} disabled={reAuditing} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: T.textSecondary, fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: reAuditing ? 0.5 : 1 }}>
          {reAuditing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />} Réaudit
        </button>
      </div>
    </div>
  );
}

// Badge compact pour fiche client
export function DDABadge({ clientId, apiBase = '/api', authToken }) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/dda/audit/${clientId}`, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json()).then(d => setAudit(d.audit));
  }, [clientId]);

  const audit_now = async () => { setLoading(true); const r = await fetch(`${apiBase}/dda/audit/${clientId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } }); const d = await r.json(); if (d.success) setAudit(d.audit); setLoading(false); };

  if (!audit) return (
    <button onClick={audit_now} disabled={loading} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: T.textSecondary, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
      {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={12} />} Auditer conformité
    </button>
  );

  const level = LEVELS[audit.compliance_level];
  const Icon = level.icon;
  const ct = colorTokens[level.color];

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: ct.bg, border: `1px solid ${ct.border}` }}>
      <Icon size={14} color={ct.text} />
      <span style={{ fontSize: 11, fontWeight: 600, color: ct.text }}>DDA {audit.global_score}/100</span>
      <span style={{ fontSize: 9, fontWeight: 600, color: ct.text, opacity: 0.7, textTransform: 'uppercase' }}>{level.label}</span>
    </div>
  );
}

const colorTokens = {
  success: { bg: T.successBg, border: T.successBorder, text: T.success },
  warning: { bg: T.warningBg, border: T.warningBorder, text: T.warning },
  danger: { bg: T.dangerBg, border: T.dangerBorder, text: T.danger },
};
