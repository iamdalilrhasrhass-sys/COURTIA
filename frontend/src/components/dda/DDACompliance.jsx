// ============================================================
// /root/courtia/frontend/src/components/dda/DDACompliance.jsx
// FRONTEND — Dashboard conformité DDA avec score visuel + export PDF
// ============================================================

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Download, RefreshCw, Loader2, AlertTriangle, Check, FileText } from 'lucide-react';

const LEVEL_STYLES = {
  conforme: { color: 'emerald', icon: ShieldCheck, label: 'Conforme' },
  partiel: { color: 'amber', icon: ShieldAlert, label: 'Partiel' },
  non_conforme: { color: 'red', icon: ShieldX, label: 'Non conforme' }
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

  if (loading || !dashboard) return <div className="rounded-3xl bg-slate-900/60 border border-slate-700/50 p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;

  const stats = dashboard.stats;
  const total = parseInt(stats.total || 0);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Conformité DDA</h2>
              <p className="text-xs text-slate-400">Directive Distribution Assurance — Audit automatique ARK</p>
            </div>
          </div>
          <button onClick={batchAudit} disabled={auditing} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${auditing ? 'animate-spin' : ''}`} />
            {auditing ? 'Audit en cours…' : 'Auditer tous les clients'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Total audités" value={total} color="white" />
          <Stat label="Conformes" value={parseInt(stats.conforme || 0)} color="emerald" />
          <Stat label="Partiels" value={parseInt(stats.partiel || 0)} color="amber" />
          <Stat label="Non conformes" value={parseInt(stats.non_conforme || 0)} color="red" />
          <Stat label="Score moyen" value={`${stats.avg_score || 0}/100`} color="cyan" />
        </div>

        {parseInt(stats.at_risk || 0) > 0 && (
          <div className="mt-5 rounded-xl bg-red-500/10 border border-red-500/40 p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="text-sm text-red-100"><strong>{stats.at_risk}</strong> dossiers en risque élevé/critique ACPR — à corriger en priorité</div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-400" /> Dossiers à corriger en priorité</h3>
        {dashboard.worst.length === 0 ? (
          <div className="text-slate-400 text-sm text-center py-8">Aucun audit pour l'instant — lance un audit batch</div>
        ) : (
          <div className="space-y-2">
            {dashboard.worst.map(audit => <ClientAuditRow key={audit.client_id} audit={audit} apiBase={apiBase} authToken={authToken} onRefresh={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  const colorMap = {
    white: 'text-white',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
    cyan: 'text-cyan-300'
  };
  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</div>
    </div>
  );
}

function ClientAuditRow({ audit, apiBase, authToken, onRefresh }) {
  const [reAuditing, setReAuditing] = useState(false);
  const level = LEVEL_STYLES[audit.compliance_level] || LEVEL_STYLES.non_conforme;
  const Icon = level.icon;

  const colorMap = {
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300' }
  };
  const c = colorMap[level.color];

  const reAudit = async (e) => {
    e.stopPropagation();
    setReAuditing(true);
    await fetch(`${apiBase}/dda/audit/${audit.client_id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
    setReAuditing(false);
    onRefresh();
  };

  const downloadReport = async (e) => {
    e.stopPropagation();
    const r = await fetch(`${apiBase}/dda/report/${audit.client_id}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (r.ok) {
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `DDA_${audit.client_name}.pdf`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const missing = typeof audit.missing_items === 'string' ? JSON.parse(audit.missing_items) : (audit.missing_items || []);

  return (
    <div className={`rounded-xl ${c.bg} border ${c.border} p-4`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${c.text} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-white font-medium truncate">{audit.client_name}</div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${c.text}`}>{audit.global_score}<span className="text-xs text-slate-400">/100</span></span>
              <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-900/60 ${c.text} border ${c.border}`}>{level.label}</span>
            </div>
          </div>
          {missing.length > 0 && (
            <div className="mt-2 text-xs text-slate-300 flex flex-wrap gap-1.5">
              {missing.slice(0, 4).map((m, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-900/40 border border-slate-700/30">{m.check}</span>
              ))}
              {missing.length > 4 && <span className="text-slate-500">+{missing.length - 4} autres</span>}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={downloadReport} className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-xs border border-slate-700/50 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Rapport PDF
        </button>
        <button onClick={reAudit} disabled={reAuditing} className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-xs border border-slate-700/50 flex items-center gap-1.5 disabled:opacity-50">
          {reAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Réaudit
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
    fetch(`${apiBase}/dda/audit/${clientId}`, { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => setAudit(d.audit));
  }, [clientId]);

  const audit_now = async () => {
    setLoading(true);
    const r = await fetch(`${apiBase}/dda/audit/${clientId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
    const d = await r.json();
    if (d.success) setAudit(d.audit);
    setLoading(false);
  };

  if (!audit) return (
    <button onClick={audit_now} disabled={loading} className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 text-xs border border-slate-700/50 flex items-center gap-1.5 disabled:opacity-50">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />} Auditer conformité
    </button>
  );

  const level = LEVEL_STYLES[audit.compliance_level];
  const Icon = level.icon;
  const colorMap = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    red: 'bg-red-500/15 text-red-300 border-red-500/30'
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorMap[level.color]}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold">DDA {audit.global_score}/100</span>
      <span className="text-[10px] uppercase">{level.label}</span>
    </div>
  );
}
