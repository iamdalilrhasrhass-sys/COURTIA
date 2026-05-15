// ============================================================
// /root/courtia/frontend/src/components/forecast/RevenueForecast.jsx
// FRONTEND — "Tu vas signer X € ce mois selon ARK"
// ============================================================

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Loader2, Target, Zap, Calendar } from 'lucide-react';

const PERIODS = [
  { id: 'week', label: '7 jours' },
  { id: 'month', label: 'Mois' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'year', label: 'Année' }
];

const CONFIDENCE_LABEL = {
  haute: { color: 'emerald', label: 'Confiance haute' },
  moyenne: { color: 'amber', label: 'Confiance moyenne' },
  faible: { color: 'red', label: 'Pipeline trop fin' }
};

export default function RevenueForecast({ apiBase = '/api', authToken }) {
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [evolution, setEvolution] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (p) => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/forecast/${p}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) {
        setData(d.forecast);
        setEvolution(d.evolution);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(period); }, [period]);

  if (loading || !data) {
    return (
      <div className="rounded-3xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const conf = CONFIDENCE_LABEL[data.confidence];
  const colorMap = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    red: 'text-red-300 bg-red-500/10 border-red-500/30'
  };

  const m = data.metrics;

  return (
    <div className="space-y-5">
      {/* Hero forecast */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/80 to-slate-950/90 border border-cyan-500/20 backdrop-blur-xl p-6 md:p-8">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Prévision Revenue</h2>
              <p className="text-slate-400 text-xs">{m.opportunities_count} opportunités analysées</p>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${colorMap[conf.color]}`}>
            {conf.label}
          </span>
        </div>

        <div className="relative flex gap-1 mb-6">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition ${
                period === p.id ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' : 'bg-slate-800/40 text-slate-400 border border-slate-700/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Tu vas signer selon ARK</div>
          <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent">
            {m.weighted_forecast.toLocaleString('fr')}€
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="text-slate-300">
              Commission estimée: <span className="text-cyan-300 font-semibold">{m.commission_estimated.toLocaleString('fr')}€</span>
            </div>
            {evolution && (
              <div className={`flex items-center gap-1 text-sm ${evolution.direction === 'hausse' ? 'text-emerald-300' : evolution.direction === 'baisse' ? 'text-red-300' : 'text-slate-400'}`}>
                {evolution.direction === 'hausse' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {evolution.evolution_pct > 0 ? '+' : ''}{evolution.evolution_pct}%
              </div>
            )}
          </div>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/30">
          <Metric label="Pipeline" value={`${m.pipeline_value.toLocaleString('fr')}€`} />
          <Metric label="Déjà signé" value={`${m.already_signed_revenue.toLocaleString('fr')}€`} accent />
          <Metric label="Win rate" value={`${m.win_rate}%`} />
          <Metric label="Vélocité" value={`${m.velocity_days}j`} />
        </div>
      </div>

      {/* Top opportunités */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" /> Top 10 opportunités (pondérées)
        </h3>
        <div className="space-y-2">
          {data.top_opportunities.map(o => (
            <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition">
              <div className="w-12 text-center">
                <div className="text-xs text-slate-400">P</div>
                <div className="text-sm font-bold text-cyan-300">{o.probabilite}%</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{o.client_name}</div>
                <div className="text-xs text-slate-400 truncate">{o.produit} · {o.stade}</div>
              </div>
              <div className="text-right">
                <div className="text-white text-sm font-semibold">{o.revenu_attendu.toLocaleString('fr')}€</div>
                <div className="text-xs text-cyan-300">+{o.commission_attendue.toLocaleString('fr')}€ comm.</div>
              </div>
            </div>
          ))}
          {data.top_opportunities.length === 0 && (
            <div className="text-slate-400 text-center py-8 text-sm">Pipeline vide — c'est le moment de prospecter.</div>
          )}
        </div>
      </div>

      {/* Breakdown produits */}
      {Object.keys(data.breakdown.par_produit).length > 0 && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" /> Commission attendue par produit
          </h3>
          <div className="space-y-2">
            {Object.entries(data.breakdown.par_produit).sort((a, b) => b[1] - a[1]).map(([produit, value]) => {
              const total = Object.values(data.breakdown.par_produit).reduce((s, v) => s + v, 0);
              const pct = (value / total) * 100;
              return (
                <div key={produit}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-300 capitalize">{produit.replace('_', ' ')}</span>
                    <span className="text-white font-medium">{Math.round(value).toLocaleString('fr')}€</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800/60 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
    </div>
  );
}
