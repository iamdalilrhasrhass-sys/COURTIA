import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://api.courtiark.fr";
const NIVEAUX_COLORS = { debutant:'text-green-400', intermediaire:'text-amber-400', avance:'text-red-400' };

export default function ArkFormateur() {
  const [modules, setModules] = useState([]);
  const [progression, setProgression] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [reponses, setReponses] = useState({});
  const [result, setResult] = useState(null);
  const [quizStep, setQuizStep] = useState(0);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${API}/api/formation/modules`, { headers }).then(r => r.json()).then(setModules);
    fetch(`${API}/api/formation/progression`, { headers }).then(r => r.json()).then(setProgression);
  }, []);

  function startQuiz(mod) {
    setActiveQuiz(mod);
    setReponses({});
    setResult(null);
    setQuizStep(0);
  }

  async function submitQuiz() {
    const reponsesArray = activeQuiz.questions.map((_, i) => reponses[i] ?? -1);
    const res = await fetch(`${API}/api/formation/modules/${activeQuiz.id}/submit`, {
      method: "POST", headers, body: JSON.stringify({ reponses: reponsesArray })
    });
    const data = await res.json();
    setResult(data);
    if (data.termine) {
      setProgression(prev => ({ ...prev, modules_termines: (prev?.modules_termines || 0) + 1 }));
    }
  }

  if (activeQuiz && !result) {
    const q = activeQuiz.questions[quizStep];
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">{activeQuiz.titre}</h2>
          <button onClick={() => setActiveQuiz(null)} className="text-gray-400 hover:text-white text-sm">✕ Quitter</button>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Question {quizStep + 1} / {activeQuiz.questions.length}</span>
            <span>{Math.round((quizStep / activeQuiz.questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-cyan-400 h-2 rounded-full transition-all" style={{ width: `${(quizStep / activeQuiz.questions.length) * 100}%` }} />
          </div>
        </div>

        <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
          <p className="text-white font-medium mb-4">{q.q}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => setReponses(r => ({ ...r, [quizStep]: i }))}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition ${
                  reponses[quizStep] === i
                    ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300'
                    : 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700/30'
                }`}>
                <span className="text-gray-500 mr-2">{['A','B','C','D'][i]}.</span>{opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {quizStep > 0 && (
            <button onClick={() => setQuizStep(s => s - 1)} className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">← Précédent</button>
          )}
          {quizStep < activeQuiz.questions.length - 1 ? (
            <button onClick={() => setQuizStep(s => s + 1)} disabled={reponses[quizStep] === undefined}
              className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm disabled:opacity-50">
              Suivant →
            </button>
          ) : (
            <button onClick={submitQuiz} disabled={Object.keys(reponses).length < activeQuiz.questions.length}
              className="flex-1 py-2 rounded-lg bg-green-500 text-black font-medium text-sm disabled:opacity-50">
              ✓ Terminer le quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <p className="text-5xl mb-3">{result.termine ? '🎓' : '📚'}</p>
          <p className={`text-2xl font-bold ${result.termine ? 'text-green-400' : 'text-amber-400'}`}>{result.score}/100</p>
          <p className="text-gray-300 mt-1">{result.correct}/{result.total} bonnes réponses</p>
          {result.termine ? (
            <p className="text-green-400 text-sm mt-2">Module validé ! Certificat disponible au téléchargement.</p>
          ) : (
            <p className="text-amber-400 text-sm mt-2">Score minimum de 70 requis. Réessaie !</p>
          )}
        </div>

        <div className="space-y-3">
          {result.details?.map((d, i) => (
            <div key={i} className={`rounded-lg p-3 border ${d.correct ? 'border-green-700/40 bg-green-900/10' : 'border-red-700/40 bg-red-900/10'}`}>
              <div className="flex items-start gap-2">
                <span>{d.correct ? '✅' : '❌'}</span>
                <div>
                  <p className="text-xs text-gray-300">{d.question}</p>
                  {!d.correct && <p className="text-xs text-red-400 mt-0.5">Réponse correcte : {d.reponse_correcte}</p>}
                  <p className="text-xs text-gray-500 mt-1 italic">{d.explication}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setActiveQuiz(null); setResult(null); }} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm">
            ← Retour
          </button>
          {result.termine && (
            <a href={`${API}/api/formation/certificat/${activeQuiz?.id}`} target="_blank"
              className="flex-1 py-2 rounded-lg bg-cyan-500 text-black font-medium text-sm text-center">
              📜 Télécharger certificat
            </a>
          )}
          {!result.termine && (
            <button onClick={() => { setResult(null); setReponses({}); setQuizStep(0); }}
              className="flex-1 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm">
              🔄 Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">🎓 ARK Formateur DDA</h2>
        <p className="text-sm text-gray-400 mt-1">Formation continue réglementaire · Objectif 15h/an</p>
      </div>

      {/* Progression globale */}
      {progression && (
        <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/20 rounded-xl p-4 border border-purple-700/30">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-white font-medium">{progression.heures_formation}h de formation validées</p>
              <p className="text-xs text-gray-400">Objectif : 15h/an · {progression.modules_termines}/{progression.modules_total} modules</p>
            </div>
            <span className={`text-sm font-bold ${progression.pct_objectif >= 100 ? 'text-green-400' : 'text-amber-400'}`}>
              {progression.pct_objectif}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${progression.pct_objectif >= 100 ? 'bg-green-500' : 'bg-cyan-400'}`}
              style={{ width: `${Math.min(100, progression.pct_objectif)}%` }} />
          </div>
          {progression.pct_objectif >= 100 && (
            <p className="text-green-400 text-xs mt-2">✅ Objectif DDA atteint pour cette année !</p>
          )}
        </div>
      )}

      {/* Modules */}
      <div className="space-y-3">
        {modules.map(m => {
          const prog = m.progression;
          return (
            <div key={m.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white">{m.titre}</p>
                    {prog.termine && <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">✓ Validé</span>}
                  </div>
                  <p className="text-xs text-gray-400">{m.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className={NIVEAUX_COLORS[m.niveau]}>{m.niveau}</span>
                    <span>·</span>
                    <span>⏱ {m.duree_minutes} min</span>
                    <span>·</span>
                    <span>{m.questions?.length} questions</span>
                    {prog.tentatives > 0 && <><span>·</span><span>Meilleur score : {prog.score}/100</span></>}
                  </div>
                </div>
                <button onClick={() => startQuiz(m)}
                  className={`ml-3 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    prog.termine
                      ? 'border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                  }`}>
                  {prog.termine ? 'Repasser' : 'Commencer'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
