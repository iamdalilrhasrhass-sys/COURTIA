import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";

function ScoreBar({ label, score }) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-300">{label}</span>
        <span className={score >= 75 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400"}>{score}/100</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function ArkCoachDashboard() {
  const [data, setData] = useState(null);
  const [tips, setTips] = useState(null);
  const [selected, setSelected] = useState(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/api/ark-coach/progression`, { headers }).then(r => r.json()).then(setData);
    fetch(`${API}/api/ark-coach/tips`, { headers }).then(r => r.json()).then(setTips);
  }, []);

  if (!data) return <div className="p-6 text-gray-400">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">🎯 ARK Coach Commercial</h2>
        <p className="text-sm text-gray-400 mt-1">Analyse de tes appels · Score + coaching personnalisé</p>
      </div>

      {/* Tips du moment */}
      {tips?.tips && (
        <div className="bg-gradient-to-r from-purple-900/40 to-cyan-900/30 rounded-xl p-4 border border-purple-700/40">
          <p className="text-xs text-purple-300 uppercase tracking-wide mb-2">💡 Tips ARK cette semaine</p>
          <ul className="space-y-1">
            {tips.tips.map((t, i) => (
              <li key={i} className="text-sm text-gray-200 flex gap-2"><span className="text-purple-400">→</span>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Derniers coachings */}
      <div className="space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Derniers appels analysés</p>
        {data.derniers_coachings?.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Aucun appel analysé pour l'instant.<br/>Les appels ARK Voice sont analysés automatiquement.</p>
        )}
        {data.derniers_coachings?.map(c => (
          <div key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
            className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-4 cursor-pointer hover:border-gray-600 transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-white">Appel #{c.call_id || c.id}</p>
                <p className="text-xs text-gray-400">{new Date(c.analysed_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${c.score_global >= 75 ? "text-green-400" : c.score_global >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {c.score_global}
                </span>
                <span className="text-gray-500 text-xs">/100</span>
              </div>
            </div>

            {selected?.id === c.id && (
              <div className="mt-4 space-y-4 border-t border-gray-700 pt-4">
                <div className="space-y-2">
                  <ScoreBar label="Accroche" score={c.score_accroche} />
                  <ScoreBar label="Découverte" score={c.score_decouverte} />
                  <ScoreBar label="Argumentation" score={c.score_argumentation} />
                  <ScoreBar label="Closing" score={c.score_closing} />
                </div>
                {c.points_forts && (
                  <div>
                    <p className="text-xs text-green-400 mb-1">✅ Points forts</p>
                    {(typeof c.points_forts === 'string' ? JSON.parse(c.points_forts) : c.points_forts).map((p, i) => (
                      <p key={i} className="text-xs text-gray-300">· {p}</p>
                    ))}
                  </div>
                )}
                {c.axes_amelioration && (
                  <div>
                    <p className="text-xs text-amber-400 mb-1">⚠️ Axes d'amélioration</p>
                    {(typeof c.axes_amelioration === 'string' ? JSON.parse(c.axes_amelioration) : c.axes_amelioration).map((a, i) => (
                      <p key={i} className="text-xs text-gray-300">· {a}</p>
                    ))}
                  </div>
                )}
                {c.next_actions && (
                  <div>
                    <p className="text-xs text-cyan-400 mb-1">🎯 Actions</p>
                    {(typeof c.next_actions === 'string' ? JSON.parse(c.next_actions) : c.next_actions).map((a, i) => (
                      <p key={i} className="text-xs text-gray-300">· {a}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
