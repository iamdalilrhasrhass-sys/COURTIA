// ============================================================
// /root/courtia/frontend/src/components/inbox/EmailInboxUnified.jsx
// FRONTEND — Inbox emails classifiés IA avec réponses suggérées
// ============================================================

import { useState, useEffect } from 'react';
import { Mail, RefreshCw, Loader2, MessageSquare, ThumbsUp, AlertTriangle, X, Sparkles, Settings, CheckCheck } from 'lucide-react';

const CLASSIFICATION_STYLES = {
  positive_response: { color: 'emerald', icon: ThumbsUp, label: 'Réponse positive' },
  signed: { color: 'emerald', icon: CheckCheck, label: 'Signé' },
  question: { color: 'cyan', icon: MessageSquare, label: 'Question' },
  objection: { color: 'amber', icon: AlertTriangle, label: 'Objection' },
  refusal: { color: 'red', icon: X, label: 'Refus' },
  complaint: { color: 'red', icon: AlertTriangle, label: 'Réclamation' },
  new_lead: { color: 'purple', icon: Sparkles, label: 'Nouveau lead' },
  unrelated: { color: 'slate', icon: Mail, label: 'Hors sujet' }
};

export default function EmailInboxUnified({ apiBase = '/api', authToken }) {
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [showSettings, setShowSettings] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/email/inbox?status=${filter}&limit=50`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) setInbox(d.inbox);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const scanNow = async () => {
    setScanning(true);
    try {
      const r = await fetch(`${apiBase}/email/scan`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
      const d = await r.json();
      if (d.success) {
        alert(`Scan terminé : ${d.scanned} mails scannés, ${d.processed} traités par ARK`);
        await load();
      } else if (d.error === 'not_configured') {
        setShowSettings(true);
      }
    } finally { setScanning(false); }
  };

  const markAction = async (id, action) => {
    await fetch(`${apiBase}/email/${id}/${action}`, { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` } });
    setSelected(null);
    await load();
  };

  const openMailto = (em) => {
    const body = encodeURIComponent(em.suggested_reply || '');
    const subject = encodeURIComponent(em.suggested_subject || `Re: ${em.subject}`);
    window.location.href = `mailto:${em.from_email}?subject=${subject}&body=${body}`;
    markAction(em.id, 'replied');
  };

  if (showSettings) return <EmailSettings apiBase={apiBase} authToken={authToken} onClose={() => { setShowSettings(false); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Inbox unifié</h2>
            <p className="text-xs text-slate-400">ARK lit, classe et propose les réponses</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700/50">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={scanNow} disabled={scanning} className="px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-sm flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} /> Scanner
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['pending', 'reviewed', 'replied', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${filter === f ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' : 'bg-slate-800/40 text-slate-400 border border-slate-700/50'}`}>
            {f === 'pending' ? 'À traiter' : f === 'reviewed' ? 'Lus' : f === 'replied' ? 'Répondus' : 'Tous'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {inbox.length === 0 ? (
              <div className="text-slate-400 text-sm text-center py-8 rounded-xl bg-slate-900/40 border border-slate-700/30">Aucun email à traiter</div>
            ) : inbox.map(em => {
              const s = CLASSIFICATION_STYLES[em.classification] || CLASSIFICATION_STYLES.unrelated;
              const Icon = s.icon;
              const isSelected = selected?.id === em.id;
              return (
                <button key={em.id} onClick={() => setSelected(em)} className={`w-full text-left rounded-xl border p-3 transition ${isSelected ? `bg-${s.color}-500/10 border-${s.color}-500/50` : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-${s.color}-500/15 text-${s.color}-300 border border-${s.color}-500/30 flex items-center gap-1 flex-shrink-0`}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </span>
                    {em.urgency === 'haute' && <span className="text-[10px] text-red-300">urgent</span>}
                  </div>
                  <div className="text-white text-sm font-medium truncate">{em.client_name || em.from_name || em.from_email}</div>
                  <div className="text-xs text-slate-400 truncate">{em.subject}</div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {!selected ? (
              <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-12 text-center text-slate-400 backdrop-blur-xl">
                <Mail className="w-10 h-10 mx-auto mb-2 opacity-40" />
                Sélectionne un email pour voir l'analyse ARK
              </div>
            ) : (
              <EmailDetail email={selected} onReply={() => openMailto(selected)} onReviewed={() => markAction(selected.id, 'reviewed')} onIgnore={() => markAction(selected.id, 'ignore')} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmailDetail({ email, onReply, onReviewed, onIgnore }) {
  const s = CLASSIFICATION_STYLES[email.classification] || CLASSIFICATION_STYLES.unrelated;
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
      <div className={`p-4 border-b border-slate-700/50 bg-${s.color}-500/5`}>
        <div className="text-xs text-slate-400">De {email.from_name || email.from_email}</div>
        <div className="text-white font-semibold mt-0.5">{email.subject}</div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-${s.color}-500/20 text-${s.color}-300 border border-${s.color}-500/40`}>{s.label}</span>
          <span className="text-[10px] text-slate-400">sentiment : {email.sentiment}</span>
          <span className="text-[10px] text-slate-400">urgence : {email.urgency}</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {email.intent && (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Analyse ARK</div>
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3 space-y-1.5 text-sm">
              <div><span className="text-slate-400">Demande : </span><span className="text-white">{email.intent.demande_principale}</span></div>
              <div><span className="text-slate-400">Attente : </span><span className="text-slate-200">{email.intent.attente_client}</span></div>
              {email.intent.blocage_eventuel && <div><span className="text-amber-400">Blocage : </span><span className="text-slate-200">{email.intent.blocage_eventuel}</span></div>}
            </div>
          </div>
        )}

        {email.key_questions && JSON.parse(email.key_questions || '[]').length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Questions posées</div>
            <ul className="space-y-1">
              {JSON.parse(email.key_questions).map((q, i) => <li key={i} className="text-sm text-slate-200 flex items-start gap-2"><span className="text-cyan-400">·</span>{q}</li>)}
            </ul>
          </div>
        )}

        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Réponse suggérée par ARK</div>
          <div className="rounded-xl bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-cyan-500/30 p-4">
            <div className="text-cyan-300 text-xs font-medium mb-2">Sujet : {email.suggested_subject}</div>
            <div className="text-slate-200 text-sm whitespace-pre-wrap">{email.suggested_reply}</div>
          </div>
        </div>

        {email.suggested_next_action && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Sparkles className="w-4 h-4 text-cyan-400" /> Prochaine action : {email.suggested_next_action}
          </div>
        )}

        <div className="pt-3 border-t border-slate-700/30 flex flex-wrap gap-2">
          <button onClick={onReply} className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition">Répondre avec ce brouillon</button>
          <button onClick={onReviewed} className="px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-sm border border-slate-700/50">Marqué lu</button>
          <button onClick={onIgnore} className="px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-red-300 text-sm border border-slate-700/50">Ignorer</button>
        </div>
      </div>
    </div>
  );
}

function EmailSettings({ apiBase, authToken, onClose }) {
  const [s, setS] = useState({ imap_host: '', imap_port: 993, imap_user: '', imap_password: '', imap_tls: true, enabled: false, scan_interval_minutes: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${apiBase}/email/settings`, { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => { if (d.success && d.settings) setS({ ...s, ...d.settings, imap_password: '' }); });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch(`${apiBase}/email/settings`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="rounded-3xl bg-slate-900/80 border border-slate-700/50 backdrop-blur-xl p-6 max-w-2xl">
      <h3 className="text-white font-semibold mb-4">Configuration IMAP</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Serveur IMAP" value={s.imap_host} onChange={v => setS({ ...s, imap_host: v })} placeholder="imap.gmail.com" />
        <Input label="Port" value={s.imap_port} type="number" onChange={v => setS({ ...s, imap_port: parseInt(v) })} />
        <Input label="Utilisateur" value={s.imap_user} onChange={v => setS({ ...s, imap_user: v })} placeholder="dalil@arkcourtia.fr" />
        <Input label="Mot de passe (chiffré)" value={s.imap_password} type="password" onChange={v => setS({ ...s, imap_password: v })} placeholder="••••••••" />
      </div>
      <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
        <div className="text-sm text-white">Activer le scan automatique (toutes les 5 min)</div>
        <button onClick={() => setS({ ...s, enabled: !s.enabled })} className={`w-11 h-6 rounded-full transition relative ${s.enabled ? 'bg-cyan-500' : 'bg-slate-700'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${s.enabled ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Sauvegarde…' : 'Enregistrer'}</button>
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 text-sm border border-slate-700/50">Annuler</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:border-cyan-500/50 outline-none" />
    </div>
  );
}
