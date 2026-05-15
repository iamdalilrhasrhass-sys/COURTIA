// ============================================================
// /root/courtia/frontend/src/components/relances/SmartRelances.jsx
// FRONTEND — Génération IA + A/B + séquence automatique
// ============================================================

import { useState } from 'react';
import { MessageSquare, Mail, Phone, Send, Sparkles, Loader2, Check, Zap } from 'lucide-react';

const CHANNELS = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'call', label: 'Appel', icon: Phone }
];

export default function SmartRelances({ clientId, opportunityId, apiBase = '/api', authToken }) {
  const [channel, setChannel] = useState('email');
  const [step, setStep] = useState(1);
  const [variants, setVariants] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [sequenceMode, setSequenceMode] = useState(false);

  const generate = async () => {
    setLoading(true);
    setVariants(null);
    setChosen(null);
    try {
      const r = await fetch(`${apiBase}/relances/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, opportunity_id: opportunityId, channel, sequence_step: step })
      });
      const data = await r.json();
      if (data.success) {
        setVariants(data.variants);
        setChosen(data.variants.recommended || 'a');
      }
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setLoading(true);
    try {
      const endpoint = sequenceMode ? `${apiBase}/relances/sequence` : `${apiBase}/relances/create`;
      const body = sequenceMode
        ? { client_id: clientId, opportunity_id: opportunityId, channel }
        : {
            client_id: clientId, opportunity_id: opportunityId, channel,
            variants, chosen_variant: chosen, scheduled_for: scheduledFor || new Date().toISOString(), sequence_step: step
          };
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (data.success) setCreated(true);
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/40 p-6 text-center backdrop-blur-xl">
        <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
        <div className="text-white font-semibold">{sequenceMode ? 'Séquence créée' : 'Relance programmée'}</div>
        <div className="text-slate-300 text-sm mt-1">
          {sequenceMode ? '3 messages : J+1, J+4, J+10 — auto-annulés en cas de réponse' : 'Visible dans le pipeline relances'}
        </div>
        <button onClick={() => { setCreated(false); setVariants(null); setChosen(null); }} className="mt-4 text-xs text-cyan-300 hover:text-cyan-200">
          Créer une nouvelle relance
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Smart Relance IA</h3>
          <p className="text-slate-400 text-xs">ARK rédige 2 variantes A/B + prédit le taux de réponse</p>
        </div>
      </div>

      {/* Channel selector */}
      <div className="grid grid-cols-4 gap-2">
        {CHANNELS.map(c => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setChannel(c.id)}
              className={`px-3 py-2.5 rounded-xl border text-sm flex items-center justify-center gap-2 transition ${
                channel === c.id
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" /> {c.label}
            </button>
          );
        })}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div>
          <div className="text-sm text-white font-medium">Séquence automatique 3 étapes</div>
          <div className="text-xs text-slate-400">J+1, J+4, J+10 — auto-stoppée si réponse</div>
        </div>
        <button
          onClick={() => setSequenceMode(!sequenceMode)}
          className={`w-11 h-6 rounded-full transition ${sequenceMode ? 'bg-cyan-500' : 'bg-slate-700'} relative`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${sequenceMode ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>

      {!sequenceMode && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Étape:</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                  step === s ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-200' : 'bg-slate-800/40 border border-slate-700/50 text-slate-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            {step === 1 ? 'Rappel doux' : step === 2 ? 'Valeur ajoutée' : 'Dernière chance'}
          </span>
        </div>
      )}

      {!variants ? (
        <button
          onClick={sequenceMode ? create : generate}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> ARK rédige…</> :
           <><Sparkles className="w-4 h-4" /> {sequenceMode ? 'Générer la séquence' : 'Générer 2 variantes'}</>}
        </button>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {['a', 'b'].map(v => {
              const variant = variants[`variant_${v}`];
              const isChosen = chosen === v;
              const isRecommended = variants.recommended === v;
              return (
                <button
                  key={v}
                  onClick={() => setChosen(v)}
                  className={`text-left rounded-xl border p-4 transition ${
                    isChosen ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Variante {v.toUpperCase()}</span>
                      {isRecommended && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ARK recommande
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-cyan-300">{Math.round((variant.predicted_response_rate || 0) * 100)}%</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">Angle: {variant.tone_used}</div>
                  {variant.subject && (
                    <div className="text-xs text-slate-300 mb-2 font-medium">Sujet: {variant.subject}</div>
                  )}
                  <div className="text-sm text-slate-200 whitespace-pre-wrap line-clamp-6">{variant.message}</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={e => setScheduledFor(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm"
              placeholder="Envoi planifié"
            />
            <button
              onClick={create}
              disabled={loading || !chosen}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Programmer la relance
            </button>
          </div>

          <div className="text-xs text-slate-500 text-center">
            Heure optimale ARK : {variants.best_send_time || '10:00'}
          </div>
        </>
      )}
    </div>
  );
}
