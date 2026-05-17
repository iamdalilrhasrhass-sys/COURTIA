// ============================================================
// /root/courtia/frontend/src/portal/PortalApp.jsx
// PWA Portail Client COURTIA
// Routes : /portail (login), /portail/dashboard, /portail/sinistre
// ============================================================

import { useState, useEffect } from 'react';
import { Shield, Mail, FileText, AlertCircle, MessageSquare, LogOut, Upload, Loader2, Send, ChevronRight, Phone } from 'lucide-react';

const PORTAL_API = '/api/portal';

function getToken() { return localStorage.getItem('courtia_portal_token'); }
function setToken(t) { localStorage.setItem('courtia_portal_token', t); }
function clearToken() { localStorage.removeItem('courtia_portal_token'); }

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${PORTAL_API}${path}`, { ...options, headers });
  if (r.status === 401) { clearToken(); window.location.href = '/portail'; throw new Error('unauthorized'); }
  return r.json();
}

export default function PortalApp() {
  const [view, setView] = useState('loading');
  const [data, setData] = useState(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const magicToken = url.searchParams.get('token');
    if (magicToken) {
      api('/auth/verify', { method: 'POST', body: JSON.stringify({ token: magicToken }) })
        .then(r => {
          if (r.success) {
            setToken(r.token);
            window.history.replaceState({}, '', '/portail');
            setView('dashboard');
          } else setView('login');
        })
        .catch(() => setView('login'));
    } else if (getToken()) {
      setView('dashboard');
    } else {
      setView('login');
    }
  }, []);

  useEffect(() => {
    if (view === 'dashboard') {
      api('/me').then(r => { if (r.success) setData(r); });
    }
  }, [view]);

  if (view === 'loading') return <FullPageSpinner />;
  if (view === 'login') return <LoginScreen onSent={() => setView('login_sent')} />;
  if (view === 'login_sent') return <LoginSentScreen onBack={() => setView('login')} />;
  if (view === 'dashboard' && data) return <Dashboard data={data} onReload={() => api('/me').then(r => r.success && setData(r))} />;
  return <FullPageSpinner />;
}

function FullPageSpinner() {
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;
}

function LoginScreen({ onSent }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await api('/auth/request', { method: 'POST', body: JSON.stringify({ email }) });
      onSent();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Espace client COURTIA</h1>
          <p className="text-sm text-slate-400 mt-1">Connectez-vous avec votre email</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="votre.email@exemple.fr"
            className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:border-cyan-500/50 outline-none" />
          <button type="submit" disabled={loading} className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Recevoir le lien d'accès
          </button>
        </form>
        <p className="text-xs text-slate-500 text-center mt-4">Vous recevrez un email avec un lien sécurisé valable 15 minutes.</p>
      </div>
    </div>
  );
}

function LoginSentScreen({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="rounded-3xl bg-slate-900/80 border border-emerald-500/30 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-emerald-300" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">Lien envoyé</h2>
        <p className="text-slate-300 text-sm">Si cet email correspond à un dossier client, vous recevez un lien d'accès sécurisé dans votre boîte mail.</p>
        <button onClick={onBack} className="mt-5 text-xs text-cyan-400 hover:text-cyan-300">← Retour</button>
      </div>
    </div>
  );
}

function Dashboard({ data, onReload }) {
  const [tab, setTab] = useState('home');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-400" />
          <span className="text-white font-semibold">COURTIA</span>
        </div>
        <button onClick={() => { clearToken(); window.location.reload(); }} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </header>

      <main className="p-4 pb-24 max-w-2xl mx-auto">
        {tab === 'home' && <HomeTab data={data} setTab={setTab} />}
        {tab === 'contracts' && <ContractsTab contracts={data.contrats} />}
        {tab === 'documents' && <DocumentsTab documents={data.documents} onReload={onReload} />}
        {tab === 'sinistre' && <SinistreTab onCreated={onReload} />}
        {tab === 'messages' && <MessagesTab />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 grid grid-cols-5 z-10">
        {[
          { id: 'home', icon: Shield, label: 'Accueil' },
          { id: 'contracts', icon: FileText, label: 'Contrats' },
          { id: 'documents', icon: Upload, label: 'Docs' },
          { id: 'sinistre', icon: AlertCircle, label: 'Sinistre' },
          { id: 'messages', icon: MessageSquare, label: 'Messages' }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`py-3 flex flex-col items-center gap-1 ${tab === t.id ? 'text-cyan-400' : 'text-slate-400'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function HomeTab({ data, setTab }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 p-5">
        <div className="text-xs uppercase tracking-wider text-cyan-300 mb-1">Bonjour</div>
        <div className="text-2xl font-bold text-white">{data.client?.prenom} {data.client?.nom}</div>
        <div className="text-sm text-slate-300 mt-2">Votre espace personnel pour gérer vos contrats, documents et sinistres.</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <CardLink icon={FileText} label="Contrats" count={data.contrats?.length || 0} onClick={() => setTab('contracts')} />
        <CardLink icon={Upload} label="Documents" count={data.documents?.length || 0} onClick={() => setTab('documents')} />
        <CardLink icon={AlertCircle} label="Sinistres" count={data.sinistres?.length || 0} onClick={() => setTab('sinistre')} />
        <CardLink icon={MessageSquare} label="Messages" count={data.messages?.filter(m => !m.read_at).length || 0} onClick={() => setTab('messages')} />
      </div>
    </div>
  );
}

function CardLink({ icon: Icon, label, count, onClick }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-4 text-left hover:border-cyan-500/40 transition">
      <Icon className="w-6 h-6 text-cyan-400 mb-2" />
      <div className="text-white text-sm font-medium">{label}</div>
      <div className="text-xs text-slate-400">{count}</div>
    </button>
  );
}

function ContractsTab({ contracts }) {
  return (
    <div className="space-y-3">
      <h2 className="text-white font-semibold">Mes contrats</h2>
      {contracts?.length === 0 ? <div className="text-slate-400 text-sm">Aucun contrat actif.</div> :
       contracts?.map(c => (
         <div key={c.id} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-4">
           <div className="text-white font-medium">{c.produit}</div>
           <div className="text-xs text-slate-400 mt-0.5">Contrat {c.numero_contrat} · {c.compagnie}</div>
           <div className="text-xs text-slate-300 mt-2">Effet : {c.date_effet ? new Date(c.date_effet).toLocaleDateString('fr') : '—'} · Échéance : {c.date_echeance ? new Date(c.date_echeance).toLocaleDateString('fr') : '—'}</div>
           <div className="text-sm text-cyan-300 font-medium mt-2">{c.prime_annuelle}€/an</div>
         </div>
       ))}
    </div>
  );
}

function DocumentsTab({ documents, onReload }) {
  const [uploading, setUploading] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type_document', prompt('Type de document (carte_grise, rib, permis, etc.)') || 'autre');
    await fetch(`${PORTAL_API}/documents/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd });
    setUploading(false);
    onReload();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Mes documents</h2>
        <label className="px-3 py-2 rounded-xl bg-cyan-500 text-white text-xs font-medium cursor-pointer flex items-center gap-1.5">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Uploader
          <input type="file" className="hidden" onChange={upload} />
        </label>
      </div>
      {documents?.length === 0 ? <div className="text-slate-400 text-sm">Aucun document. Upload ton premier document pour ton courtier.</div> :
       documents?.map(d => (
         <div key={d.id} className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3 flex items-center gap-3">
           <FileText className="w-5 h-5 text-cyan-400" />
           <div className="flex-1 min-w-0">
             <div className="text-white text-sm truncate">{d.type_document}</div>
             <div className="text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString('fr')} · {d.statut}</div>
           </div>
         </div>
       ))}
    </div>
  );
}

const SINISTRE_TYPES = [
  { id: 'auto_accident', label: 'Accident auto' },
  { id: 'auto_vol', label: 'Vol véhicule' },
  { id: 'auto_bris_glace', label: 'Bris de glace' },
  { id: 'habitation_degat_eaux', label: 'Dégât des eaux' },
  { id: 'habitation_vol', label: 'Vol habitation' },
  { id: 'habitation_incendie', label: 'Incendie' },
  { id: 'sante', label: 'Sinistre santé' }
];

function SinistreTab({ onCreated }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState(null);
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const selectType = async (t) => {
    setType(t);
    const r = await api(`/sinistre/required-docs/${t.id}`);
    if (r.success) setRequiredDocs(r.required_documents);
    setStep(1);
  };

  const declare = async () => {
    setLoading(true);
    try {
      const r = await api('/sinistre/declare', { method: 'POST', body: JSON.stringify({ ...data, type_sinistre: type.id }) });
      if (r.success) {
        alert('Sinistre déclaré — votre courtier prend contact sous 24h');
        setStep(0); setType(null); setData({});
        onCreated();
      }
    } finally { setLoading(false); }
  };

  if (step === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-white font-semibold">Déclarer un sinistre</h2>
        <p className="text-sm text-slate-400">Sélectionnez le type de sinistre. ARK vous guidera pour rassembler les bons documents.</p>
        <div className="space-y-2">
          {SINISTRE_TYPES.map(t => (
            <button key={t.id} onClick={() => selectType(t)} className="w-full rounded-xl bg-slate-900/60 border border-slate-700/50 p-4 text-left text-white flex items-center justify-between hover:border-cyan-500/40">
              {t.label} <ChevronRight className="w-4 h-4 text-cyan-400" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-white font-semibold">{type.label}</h2>
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
        <div className="text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">Documents à préparer</div>
        <ul className="space-y-1">
          {requiredDocs.map((d, i) => <li key={i} className="text-amber-100 text-sm">· {d}</li>)}
        </ul>
      </div>
      <input type="date" required placeholder="Date du sinistre" onChange={e => setData({ ...data, date_sinistre: e.target.value })}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm" />
      <input type="text" placeholder="Lieu" onChange={e => setData({ ...data, lieu: e.target.value })}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm" />
      <textarea placeholder="Description détaillée" rows="5" onChange={e => setData({ ...data, description: e.target.value })}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm" />
      <button onClick={declare} disabled={loading || !data.date_sinistre || !data.description} className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium disabled:opacity-50">
        {loading ? 'Envoi…' : 'Déclarer le sinistre'}
      </button>
      <button onClick={() => setStep(0)} className="w-full text-xs text-slate-400">← Changer de type</button>
    </div>
  );
}

function MessagesTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);

  const load = async () => {
    const r = await api('/messages');
    if (r.success) setMessages(r.messages.reverse());
  };

  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    await api('/messages/send', { method: 'POST', body: JSON.stringify({ message: input }) });
    setInput('');
    await load();
    setLoading(false);
  };

  const askArk = async () => {
    const q = prompt('Posez une question à ARK :');
    if (!q) return;
    setAsking(true);
    await api('/ark/ask', { method: 'POST', body: JSON.stringify({ question: q }) });
    await load();
    setAsking(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Messages</h2>
        <button onClick={askArk} disabled={asking} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
          {asking ? '…' : '🤖 Demander à ARK'}
        </button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {messages.map(m => {
          const fromCourtier = m.sender_type === 'courtier';
          const fromArk = m.sender_type === 'ark';
          const fromSystem = m.sender_type === 'system';
          return (
            <div key={m.id} className={`rounded-xl p-3 max-w-[85%] ${fromCourtier || fromArk || fromSystem ? 'bg-slate-800/40 border border-slate-700/30' : 'ml-auto bg-cyan-500/20 border border-cyan-500/30'}`}>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{fromCourtier ? 'Courtier' : fromArk ? 'ARK' : fromSystem ? 'Système' : 'Vous'}</div>
              <div className="text-white text-sm whitespace-pre-wrap">{m.message}</div>
              <div className="text-[10px] text-slate-500 mt-1">{new Date(m.created_at).toLocaleString('fr')}</div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Votre message"
          className="flex-1 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm" />
        <button onClick={send} disabled={loading || !input.trim()} className="px-4 py-2.5 rounded-xl bg-cyan-500 text-white disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
