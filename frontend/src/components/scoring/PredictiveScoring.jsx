// ============================================================
// /root/courtia/frontend/src/components/scoring/PredictiveScoring.jsx
// FRONTEND — Top risks + Top upsells côte à côte
// ============================================================

import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Loader2, RefreshCw, Phone, Mail } from 'lucide-react';

function ScoreCard({ score, type }) {
  const isRisk = type === 'risk';
  const value = isRisk ? score.churn_risk : score.upsell_potential;
  const color = isRisk
    ? (value >= 70 ? 'red' : value >= 40 ? 'amber' : 'emerald')
    : 'cyan';

  const colorMap = {
    red: 'from-red-500/15 to-orange-500/5 border-red-500/30 text-red-300',
    amber: 'from-amber-500/15 to-yellow-500/5 border-amber-500/30 text-amber-300',
    emerald: 'from-emerald-500/15 to-cyan-500/5 border-emerald-500/30 text-emerald-300',
    cyan: 'from-cyan-500/15 to-purple-500/5 border-cyan-500/30 text-cyan-300'
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${colorMap[color]} border backdrop-blur-sm p-4 transition hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-white font-semibold truncate">{score.client_name}</div>
          <div className="text-xs text-slate-400 mt-0.5">LTV est. {Math.round(score.ltv_estimated || 0).toLocaleString('fr')}€</div>
        </div>
        <div className={`text-2xl font-bold ${colorMap[color].split(' ').pop()}`}>
          {isRisk ? `${value}` : `${Math.round(value).toLocaleString('fr')}€`}
        </div>
      </div>

      {isRisk && score.churn_drivers && (
        <div className="mt-2 space-y-1">
          {score.churn_drivers.slice(0, 2).map((d, i) => (
            <div key={i} className="text-xs text-slate-300 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-current opacity-50" />
              {d.detail}
            </div>
          ))}
        </div>
      )}

      {!isRisk && score.upsell_products && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(typeof score.upsell_products === 'string' ? JSON.parse(score.upsell_products) : score.upsell_products).slice(0, 3).map((p, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-300 border border-slate-700/50">
              {p.produit}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-700/30">
        <div className="text-xs text-slate-300 italic line-clamp-2">→ {score.next_best_action}</div>
        <div className="flex gap-2 mt-2">
          {score.telephone && (
            <a href={`tel:${score.telephone}`} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/60 text-white border border-slate-700/50 hover:bg-slate-700/60 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Appeler
            </a>
          )}
          {score.email && (
            <a href={`mailto:${score.email}`} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/60 text-white border border-slate-700/50 hover:bg-slate-700/60 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PredictiveScoring({ apiBase = '/api', authToken }) {
  const [risks, setRisks] = useState([]);
  const [upsells, setUpsells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${apiBase}/scoring/top-risks?limit=6`, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json()),
        fetch(`${apiBase}/scoring/top-upsells?limit=6`, { headers: { 'Authorization': `Bearer ${authToken}` } }).then(r => r.json())
      ]);
      if (r1.success) setRisks(r1.risks);
      if (r2.success) setUpsells(r2.upsells);
    } finally {
      setLoading(false);
    }
  };

  const recomputeAll = async () => {
    setScoring(true);
    try {
      await fetch(`${apiBase}/scoring/batch`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
      await loadData();
    } finally {
      setScoring(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const totalUpsell = upsells.reduce((s, u) => s + parseFloat(u.upsell_potential || 0), 0);
  const highRisks = risks.filter(r => r.churn_risk >= 70).length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/30 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span className="text-xs text-red-300 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">Churn</span>
          </div>
          <div className="text-3xl font-bold text-white">{highRisks}</div>
          <div className="text-sm text-slate-400">clients à risque élevé</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/5 border border-cyan-500/30 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <span className="text-xs text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">Upsell</span>
          </div>
          <div className="text-3xl font-bold text-white">{Math.round(totalUpsell).toLocaleString('fr')}€</div>
          <div className="text-sm text-slate-400">commissions potentielles</div>
        </div>
      </div>

      <button
        onClick={recomputeAll}
        disabled={scoring}
        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-sm border border-slate-700/50 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${scoring ? 'animate-spin' : ''}`} />
        {scoring ? 'ARK recalcule tous les scores…' : 'Recalculer tous les scores clients'}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" /> Top risques de churn
          </h3>
          <div className="space-y-3">
            {risks.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">Aucun client à risque détecté</div>
            ) : risks.map(r => <ScoreCard key={r.client_id} score={r} type="risk" />)}
          </div>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" /> Top opportunités upsell
          </h3>
          <div className="space-y-3">
            {upsells.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8">Aucune opportunité détectée</div>
            ) : upsells.map(u => <ScoreCard key={u.client_id} score={u} type="upsell" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
