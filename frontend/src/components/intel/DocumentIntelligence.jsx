// ============================================================
// /root/courtia/frontend/src/components/intel/DocumentIntelligence.jsx
// FRONTEND — Extraction IA avec validation visuelle
// ============================================================

import { useState } from 'react';
import { FileSearch, CheckCircle2, AlertTriangle, XCircle, Sparkles, Loader2, Wand2 } from 'lucide-react';

const STATUS_STYLES = {
  valide: { icon: CheckCircle2, color: 'emerald', label: 'Validé' },
  a_verifier: { icon: AlertTriangle, color: 'amber', label: 'À vérifier' },
  invalide: { icon: XCircle, color: 'red', label: 'Invalide' },
  pending: { icon: Loader2, color: 'slate', label: 'En cours' }
};

const ERROR_LABELS = {
  iban_invalide: 'IBAN invalide',
  siren_invalide: 'SIREN invalide',
  document_expire: 'Document expiré',
  confidence_faible: 'Confiance IA faible',
  champ_manquant: 'Champ manquant'
};

export default function DocumentIntelligence({ documentId, clientId, apiBase = '/api', authToken, onApplied }) {
  const [extraction, setExtraction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const extract = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/intel/extract/${documentId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      const data = await r.json();
      if (data.success) setExtraction(data.extraction);
    } finally {
      setLoading(false);
    }
  };

  const applyToClient = async () => {
    setApplying(true);
    try {
      const r = await fetch(`${apiBase}/intel/auto-fill/${documentId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await r.json();
      if (data.success && onApplied) onApplied(data.fields_updated);
    } finally {
      setApplying(false);
    }
  };

  if (!extraction) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <FileSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Analyse IA du document</h3>
            <p className="text-slate-400 text-xs">ARK extrait les champs, valide et auto-remplit la fiche</p>
          </div>
        </div>
        <button
          onClick={extract}
          disabled={loading}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> ARK analyse…</> : <><Sparkles className="w-4 h-4" /> Lancer l'analyse</>}
        </button>
      </div>
    );
  }

  const status = STATUS_STYLES[extraction.status] || STATUS_STYLES.pending;
  const StatusIcon = status.icon;
  const colorMap = {
    emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' },
    amber: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/40' },
    red: { text: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/40' },
    slate: { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/40' }
  }[status.color];

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
      <div className={`flex items-center justify-between p-4 ${colorMap.bg} border-b ${colorMap.border}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${colorMap.text}`} />
          <div>
            <div className="text-white font-medium">{extraction.doc_type?.toUpperCase().replace('_', ' ')}</div>
            <div className="text-xs text-slate-400">Confiance IA: {Math.round((extraction.confidence || 0) * 100)}%</div>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full ${colorMap.bg} ${colorMap.text} border ${colorMap.border}`}>
          {status.label}
        </span>
      </div>

      <div className="p-5">
        <div className="text-xs uppercase tracking-wider text-slate-400 mb-3">Champs extraits</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
          {Object.entries(extraction.fields || {}).map(([key, value]) => (
            <div key={key} className="rounded-lg bg-slate-800/40 border border-slate-700/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">{key.replace(/_/g, ' ')}</div>
              <div className="text-white text-sm font-medium mt-0.5 break-all">{Array.isArray(value) ? value.join(', ') : (value || '—')}</div>
            </div>
          ))}
        </div>

        {extraction.errors && extraction.errors.length > 0 && (
          <div className="mb-5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
            <div className="text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">Alertes</div>
            <ul className="space-y-1">
              {extraction.errors.map((err, i) => (
                <li key={i} className="text-amber-100 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> {ERROR_LABELS[err] || err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {extraction.suggested_client_fields && Object.keys(extraction.suggested_client_fields).length > 0 && (
          <button
            onClick={applyToClient}
            disabled={applying}
            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Application…</> : <><Wand2 className="w-4 h-4" /> Auto-remplir la fiche client ({Object.keys(extraction.suggested_client_fields).length} champs)</>}
          </button>
        )}
      </div>
    </div>
  );
}
