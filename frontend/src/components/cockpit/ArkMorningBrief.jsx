// ============================================================
// /root/courtia/frontend/src/components/cockpit/ArkMorningBrief.jsx
// FRONTEND — Cockpit IA quotidien
// Aurora Bubble C — dark glass premium
// ============================================================

import { useState, useEffect } from 'react';
import { Sparkles, Clock, TrendingUp, AlertTriangle, CheckCircle2, Send, Calendar, FileText, Loader2 } from 'lucide-react';

const PRIORITY_STYLES = {
  1: { bg: 'from-red-500/20 to-orange-500/10', border: 'border-red-500/40', label: 'Critique' },
  2: { bg: 'from-orange-500/20 to-amber-500/10', border: 'border-orange-500/40', label: 'Haute' },
  3: { bg: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/40', label: 'Moyenne' },
  4: { bg: 'from-sky-500/20 to-blue-500/10', border: 'border-sky-500/40', label: 'Standard' },
  5: { bg: 'from-slate-500/20 to-slate-600/10', border: 'border-slate-500/40', label: 'Basse' }
};

const TYPE_ICONS = {
  relance: Send,
  rdv: Calendar,
  document: FileText,
  signature: CheckCircle2,
  cross_sell: TrendingUp,
  rappel: Clock
};

export default function ArkMorningBrief({ apiBase = '/api', authToken }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completed, setCompleted] = useState(new Set());

  const fetchBrief = async (force = false) => {
    setRefreshing(force);
    if (!force) setLoading(true);
    try {
      const r = await fetch(`${apiBase}/ark/brief${force ? '?force=1' : ''}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await r.json();
      if (data.success) setBrief(data.brief);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchBrief(); }, []);

  const markDone = async (index) => {
    setCompleted(prev => new Set([...prev, index]));
    await fetch(`${apiBase}/ark/brief/action/${index}/done`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief_date: new Date().toISOString().split('T')[0] })
    });
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl p-8 min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">ARK analyse ta journée…</p>
        </div>
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl">
      {/* Aurora orbs background */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-semibold text-white">Morning Brief</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">ARK</span>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchBrief(true)}
            disabled={refreshing}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50 transition"
          >
            {refreshing ? '…' : 'Actualiser'}
          </button>
        </div>

        {/* Headline */}
        <div className="mb-6">
          <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
            {brief.headline}
          </h3>
          <p className="text-slate-300 mt-2 leading-relaxed">{brief.summary}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Potentiel jour</div>
            <div className="text-2xl font-bold text-cyan-300 mt-1">{Math.round(brief.revenue_potential || 0).toLocaleString('fr')}€</div>
          </div>
          <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Actions</div>
            <div className="text-2xl font-bold text-white mt-1">{brief.actions?.length || 0}</div>
          </div>
          <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Faites</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{completed.size}</div>
          </div>
        </div>

        {/* Alert critique */}
        {brief.alert && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/40 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-100 text-sm">{brief.alert}</p>
          </div>
        )}

        {/* Actions list */}
        <div className="space-y-3">
          {(brief.actions || []).map((action, i) => {
            const style = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES[3];
            const Icon = TYPE_ICONS[action.type] || CheckCircle2;
            const isDone = completed.has(i);

            return (
              <div
                key={i}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${style.bg} border ${style.border} backdrop-blur-sm p-4 md:p-5 transition-all ${isDone ? 'opacity-50' : 'hover:scale-[1.01]'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/60 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-300 px-2 py-0.5 rounded bg-slate-900/40">
                        {style.label}
                      </span>
                      <span className="text-slate-400 text-xs">~{action.estimated_minutes}min</span>
                      {action.expected_value > 0 && (
                        <span className="text-cyan-300 text-xs font-medium">+{action.expected_value.toLocaleString('fr')}€</span>
                      )}
                    </div>
                    <div className="text-white font-semibold">{action.action}</div>
                    <div className="text-slate-300 text-sm mt-0.5">{action.client_name}</div>
                    <div className="text-slate-400 text-xs mt-1.5 italic">{action.reason}</div>

                    {action.draft_message && (
                      <details className="mt-3">
                        <summary className="text-xs text-cyan-400 cursor-pointer hover:text-cyan-300">Voir le message IA →</summary>
                        <div className="mt-2 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-200 text-sm whitespace-pre-wrap">
                          {action.draft_message}
                        </div>
                      </details>
                    )}
                  </div>
                  <button
                    onClick={() => markDone(i)}
                    disabled={isDone}
                    className={`flex-shrink-0 w-9 h-9 rounded-full border transition ${isDone ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/40'}`}
                  >
                    <CheckCircle2 className="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {(!brief.actions || brief.actions.length === 0) && (
          <div className="text-center py-12 text-slate-400">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Journée calme — bon moment pour prospecter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
