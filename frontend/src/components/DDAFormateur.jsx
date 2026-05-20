import { useState, useEffect } from "react";
import asArray from "../utils/asArray";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const CAT_ICONS = { devoir_conseil:"📋", conformite:"⚖️", iard:"🚗", sante:"🏥", prevoyance:"🛡️" };

export default function DDAFormateur() {
  const [dashboard, setDashboard] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [reponses, setReponses] = useState({});
  const [resultat, setResultat] = useState(null);
  const [tips, setTips] = useState(null);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/api/dda/dashboard`, { headers }).then(r => r.json()).then(setDashboard);
    fetch(`${API}/api/dda/tips`, { headers }).then(r => r.json()).then(d => setTips(asArray(d)));
  }, []);

  async function startQuiz(categorie = null) {
    const res = await fetch(`${API}/api/dda/quiz/start`, {
      method: "POST", headers, body: JSON.stringify({ nb: 8, categorie })
    });
    const data = await res.json();
    setQuiz(data);
    setReponses({});
    setResultat(null);
  }

  async function submitQuiz() {
    const reponsesArray = Object.entries(reponses).map(([qId, rep]) => ({
      question_id: parseInt(qId), reponse: parseInt(rep)
    }));
    const res = await fetch(`${API}/api/dda/quiz/${quiz.session_id}/submit`, {
      method: "POST", headers, body: JSON.stringify({ reponses: reponsesArray })
    });
    const data = await res.json();
    setResultat(data);
    setQuiz(null);
    fetch(`${API}/api/dda/dashboard`, { headers }).then(r => r.json()).then(setDashboard);
  }

  const scoreColor = s => s >= 80 ? "text-green-400" : s >= 60 ? "text-amber-400" : "text-red-400";
  const scoreLabel = s => s >= 80 ? "Excellent" : s >= 60 ? "Bien" : "À améliorer";
  const answered = Object.keys(reponses).length;
  const total = quiz?.questions?.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">📚 ARK Formateur DDA</h2>
          <p className="text-sm text-gray-400 mt-1">Formation continue · Quiz réglementaire · Certification COURTIA</p>
        </div>
        {!quiz && (
          <button onClick={() => startQuiz()} className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            🎯 Lancer un quiz
          </button>
        )}
      </div>

      {/* Score actuel */}
      {dashboard && !quiz && !resultat && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-900/40 to-cyan-900/30 rounded-xl p-4 border border-purple-700/40 col-span-2 text-center">
              <p className="text-xs text-gray-400 mb-1">Score DDA actuel</p>
              <p className={`text-5xl font-bold ${scoreColor(dashboard.score_actuel)}`}>{dashboard.score_actuel}</p>
              <p className={`text-sm ${scoreColor(dashboard.score_actuel)}`}>{scoreLabel(dashboard.score_actuel)}</p>
              {dashboard.certification_expiry && (
                <p className="text-xs text-gray-500 mt-2">Certification valable jusqu'au {new Date(dashboard.certification_expiry).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {dashboard.sessions_recentes?.slice(0,2).map((s, i) => (
                <div key={i} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700">
                  <p className="text-xs text-gray-400">{new Date(s.completed_at).toLocaleDateString('fr-FR')}</p>
                  <p className={`text-2xl font-bold ${scoreColor(s.score)}`}>{s.score}%</p>
                  <p className="text-xs text-gray-400">{s.nb_questions} questions · {Math.round(s.duree_secondes/60)}min</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {tips?.tips && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4 mt-4">
              <p className="text-xs text-purple-400 uppercase tracking-wide mb-2">💡 ARK te conseille</p>
              {tips.tips.map((t, i) => <p key={i} className="text-sm text-gray-300 mb-1">{i+1}. {t}</p>)}
            </div>
          )}

          {/* Quiz par catégorie */}
          <div className="mt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">S'entraîner par thème</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {["devoir_conseil","conformite","iard","sante","prevoyance"].map(cat => {
                const prog = dashboard.progression_par_categorie?.find(p => p.categorie === cat);
                return (
                  <button key={cat} onClick={() => startQuiz(cat)}
                    className="bg-gray-800/40 hover:bg-gray-700/60 rounded-xl border border-gray-700/50 p-3 text-left transition">
                    <p className="text-lg">{CAT_ICONS[cat]}</p>
                    <p className="text-xs font-medium text-white capitalize mt-1">{cat.replace(/_/g,' ')}</p>
                    {prog && <p className={`text-xs mt-0.5 ${scoreColor(parseFloat(prog.taux_reussite))}`}>{Math.round(parseFloat(prog.taux_reussite))}% réussite</p>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quiz en cours */}
      {quiz && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{answered}/{total} réponses</p>
            <div className="flex-1 mx-4 bg-gray-700 rounded-full h-1.5">
              <div className="bg-purple-400 h-1.5 rounded-full transition-all" style={{ width: `${(answered/total)*100}%` }} />
            </div>
            <button onClick={() => setQuiz(null)} className="text-xs text-gray-500 hover:text-gray-300">Quitter</button>
          </div>

          {quiz.questions.map((q, i) => (
            <div key={q.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-4">
              <p className="text-xs text-purple-400 mb-1">{CAT_ICONS[q.categorie]} Question {i+1}</p>
              <p className="text-sm font-medium text-white mb-3">{q.question}</p>
              <div className="grid grid-cols-1 gap-2">
                {(typeof q.options === 'string' ? JSON.parse(q.options) : q.options).map((opt, j) => (
                  <button key={j} onClick={() => setReponses(r => ({...r, [q.id]: j}))}
                    className={`text-left text-sm px-4 py-2.5 rounded-lg border transition ${
                      reponses[q.id] === j
                        ? 'border-purple-500 bg-purple-900/30 text-white'
                        : 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700/30'
                    }`}>
                    <span className="text-gray-500 mr-2">{String.fromCharCode(65+j)}.</span>{opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button onClick={submitQuiz} disabled={answered < total}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition disabled:opacity-40">
            {answered < total ? `Répondez à toutes les questions (${total-answered} restantes)` : "Valider le quiz →"}
          </button>
        </div>
      )}

      {/* Résultat */}
      {resultat && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-6 text-center border ${resultat.score >= 80 ? 'bg-green-900/20 border-green-700/40' : resultat.score >= 60 ? 'bg-amber-900/20 border-amber-700/40' : 'bg-red-900/20 border-red-700/40'}`}>
            <p className={`text-6xl font-bold ${scoreColor(resultat.score)}`}>{resultat.score}%</p>
            <p className="text-white font-medium mt-2">{scoreLabel(resultat.score)}</p>
            <p className="text-gray-400 text-sm">{resultat.correct}/{resultat.total} bonnes réponses · {Math.round(resultat.duree/60)} minutes</p>
            {resultat.certification && (
              <div className="mt-4 bg-green-900/30 border border-green-700/40 rounded-xl p-3">
                <p className="text-green-400 font-medium">🏆 Certification DDA obtenue !</p>
                <p className="text-xs text-gray-400 mt-1">Valable 1 an — téléchargeable dans vos certifications</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {resultat.corrections?.map((c, i) => (
              <div key={i} className={`rounded-lg p-3 border ${c.correct ? 'border-green-700/40 bg-green-900/10' : 'border-red-700/40 bg-red-900/10'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{c.correct ? '✅' : '❌'}</span>
                  <span className="text-xs text-gray-400">{CAT_ICONS[c.categorie]}</span>
                </div>
                {!c.correct && c.explication && (
                  <p className="text-xs text-gray-300 ml-6">{c.explication}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setResultat(null)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">
              Retour
            </button>
            <button onClick={() => startQuiz()} className="flex-1 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium">
              Refaire un quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
