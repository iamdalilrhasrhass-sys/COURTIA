// ArkActivityFeed.jsx
// Journal live des appels ARK avec modèle, latence, confidence, coût estimé.
// Props :
//   activities {Array} — [{id, action, dossierLabel, model, latencyMs, confidence, costCents, timestamp}]
//   onRefresh {function} — callback pour recharger depuis /api/ark/activity
//   autoRefresh {boolean} — si true, refresh toutes les 8s

import { useEffect, useRef, useState } from 'react'

const ACTION_LABELS = {
  analyze_dossier:     { label: 'Analyse dossier',         icon: '🔍', color: '#534AB7' },
  recommend:           { label: 'Recommandation',          icon: '⭐', color: '#1D9E75' },
  draft_message:       { label: 'Rédaction message',       icon: '✍️',  color: '#378ADD' },
  compare_offers:      { label: 'Comparaison offres',      icon: '⚖️',  color: '#EF9F27' },
  extract_document:    { label: 'Extraction document',     icon: '📄', color: '#7F77DD' },
  readiness_check:     { label: 'Check complétude',        icon: '✅', color: '#1D9E75' },
  risk_qualification:  { label: 'Qualification risque',    icon: '⚠️',  color: '#D85A30' },
}

const MODEL_BADGES = {
  'claude-haiku-4-5-20251001':   { label: 'Haiku',  color: '#1D9E75' },
  'claude-sonnet-4-20250514':    { label: 'Sonnet', color: '#534AB7' },
  'deepseek-v3':                 { label: 'DeepSeek', color: '#378ADD' },
}

function generateMockActivities(n = 15) {
  const actions = Object.keys(ACTION_LABELS)
  const models = Object.keys(MODEL_BADGES)
  const dossiers = ['Dupont Jean', 'Martin Sophie', 'Bernard Paul', 'Garcia Ana', 'Thomas Luc']
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    action: actions[i % actions.length],
    dossierLabel: dossiers[i % dossiers.length],
    model: models[Math.floor(Math.random() * 2)],
    latencyMs: Math.round(200 + Math.random() * 2000),
    confidence: Math.round(70 + Math.random() * 30),
    costCents: +(Math.random() * 0.8).toFixed(3),
    timestamp: new Date(Date.now() - i * 1000 * 60 * (1 + Math.random() * 5)),
  }))
}

const FILTER_OPTIONS = [
  { id: 'all',               label: 'Tout' },
  { id: 'analyze_dossier',   label: 'Analyse' },
  { id: 'recommend',         label: 'Reco' },
  { id: 'draft_message',     label: 'Messages' },
  { id: 'compare_offers',    label: 'Comparaison' },
]

export default function ArkActivityFeed({
  activities: propActivities,
  onRefresh,
  autoRefresh = false,
}) {
  const [activities, setActivities] = useState(propActivities ?? generateMockActivities())
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (propActivities) setActivities(propActivities)
  }, [propActivities])

  const refresh = async () => {
    setLoading(true)
    try {
      if (onRefresh) {
        const fresh = await onRefresh()
        if (fresh) setActivities(fresh)
      } else {
        // Mock refresh: prepend a new entry
        setActivities(prev => [generateMockActivities(1)[0], ...prev.slice(0, 29)])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!autoRefresh) return
    intervalRef.current = setInterval(refresh, 8000)
    return () => clearInterval(intervalRef.current)
  }, [autoRefresh, onRefresh])

  const filtered = filter === 'all' ? activities : activities.filter(a => a.action === filter)

  const totalCost = activities.reduce((s, a) => s + (a.costCents ?? 0), 0)
  const avgLatency = activities.length ? Math.round(activities.reduce((s, a) => s + a.latencyMs, 0) / activities.length) : 0
  const avgConf = activities.length ? Math.round(activities.reduce((s, a) => s + a.confidence, 0) / activities.length) : 0

  const fmtTime = (d) => {
    const diff = Math.round((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 60) return `il y a ${diff}s`
    if (diff < 3600) return `il y a ${Math.round(diff/60)}min`
    return `il y a ${Math.round(diff/3600)}h`
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
      {/* Header + stats */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">ARK Activity</p>
          </div>
          <button
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? (
              <span className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin" />
            ) : '↻'} Actualiser
          </button>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Appels', value: activities.length, suffix: '' },
            { label: 'Latence moy.', value: avgLatency, suffix: 'ms' },
            { label: 'Confiance', value: avgConf, suffix: '%' },
          ].map(m => (
            <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-400">{m.label}</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{m.value}{m.suffix}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f.id}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-violet-600 text-white'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">Aucune activité</p>
        )}
        {filtered.map(activity => {
          const def = ACTION_LABELS[activity.action] ?? { label: activity.action, icon: '⚡', color: '#888780' }
          const modelDef = MODEL_BADGES[activity.model] ?? { label: activity.model, color: '#888780' }
          const confColor = activity.confidence >= 85 ? '#1D9E75' : activity.confidence >= 70 ? '#EF9F27' : '#E24B4A'

          return (
            <div key={activity.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              {/* Icon */}
              <span className="text-base flex-shrink-0" style={{ filter: 'none' }}>
                {def.icon}
              </span>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                    {def.label}
                  </span>
                  <span className="text-xs text-slate-400 truncate">· {activity.dossierLabel}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-xs px-1.5 py-0 rounded font-medium"
                    style={{ backgroundColor: modelDef.color + '18', color: modelDef.color }}
                  >
                    {modelDef.label}
                  </span>
                  <span className="text-xs text-slate-400">{activity.latencyMs}ms</span>
                  <span className="text-xs font-medium" style={{ color: confColor }}>{activity.confidence}%</span>
                </div>
              </div>

              {/* Right: cost + time */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-400">{fmtTime(activity.timestamp)}</p>
                {activity.costCents != null && (
                  <p className="text-xs text-slate-300 dark:text-slate-600">
                    {activity.costCents.toFixed(3)}€
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Coût session : {totalCost.toFixed(3)} €
        </span>
        {autoRefresh && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        )}
      </div>
    </div>
  )
}
