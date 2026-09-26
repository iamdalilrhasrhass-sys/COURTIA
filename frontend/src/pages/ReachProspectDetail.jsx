import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, Zap, Phone, MessageSquare, MapPin,
  Star, Building, ArrowLeft, UserPlus, CheckSquare, Shield,
  Send, ExternalLink, Loader2, AlertTriangle
} from 'lucide-react';
import useReachStore from '../stores/reachStore';
import toast from 'react-hot-toast';
import { REACH, RAYON, TEINTE, pastille } from '../lib/reachTheme';
import { fmtMontantCourt } from '../lib/monnaie';

const accent = 'var(--accent-violet, #5B4DF5)';

const ScoreBar = ({ label, score, color }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs mb-1" style={REACH.libelle}>
      <span>{label}</span>
      <span className="font-semibold" style={{ color }}>{score}/100</span>
    </div>
    <div className="h-1.5 overflow-hidden" style={{ background: 'var(--bg-elevated)', borderRadius: RAYON.full }}>
      <div className="h-full transition-all duration-700" style={{ width: `${score}%`, background: color, borderRadius: RAYON.full }} />
    </div>
  </div>
);

const SCRIPT_TABS = ['Appel', 'Email', 'SMS', 'LinkedIn'];

export default function ReachProspectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prospectDetail, fetchProspectDetail, analyzeProspect, convertToClient, createTask } = useReachStore();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [activeTab, setActiveTab] = useState('Appel');

  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetchProspectDetail(id);
      if (res?.success) {
        setData(res.data);
      } else {
        setData(null);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const result = await analyzeProspect(id, data);
    if (result?.success) {
      toast.success('Analyse ARK complétée');
    } else {
      toast.error(result?.message || 'Configuration ARK requise.');
    }
    setAnalyzing(false);
    // Refresh
    const res = await fetchProspectDetail(id);
    if (res?.success) setData(res.data);
  };

  const handleConvert = async () => {
    setConverting(true);
    const res = await convertToClient(data);
    if (res?.success) {
      toast.success(res.message || 'Prospect converti en client COURTIARK');
    } else if (res.already_client) {
      toast('Déjà client COURTIARK', { icon: '✅' });
    } else {
      toast.error('Conversion impossible pour le moment.');
    }
    setConverting(false);
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin" style={REACH.discret} />
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center py-16" style={REACH.discret}>
      <AlertTriangle size={40} className="mx-auto mb-3" />
      <p>Prospect introuvable</p>
    </div>
  );

  const analysis = data.analysis || {};
  const isConverted = data.converted_client_id;

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/reach/prospects')}
        className="mb-4 flex items-center gap-2 text-sm transition"
        style={REACH.libelle}
      >
        <ArrowLeft size={14} /> Retour aux prospects
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 mb-6" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold" style={REACH.titre}>{data.company_name}</h1>
              {isConverted && (
                <span className="text-xs font-medium px-2 py-1 flex items-center gap-1" style={{ ...pastille(TEINTE.vert), borderRadius: RAYON.full }}>
                  <UserPlus size={10} /> Déjà client
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm" style={REACH.libelle}>
              <span className="flex items-center gap-1"><Building size={14} /> {data.category?.replace(/_/g, ' ')}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {data.city}</span>
              <span className="flex items-center gap-1"><Star size={14} color={TEINTE.ambre} /> {data.rating} ({data.review_count})</span>
              <span className="flex items-center gap-1"><Phone size={14} /> {data.phone}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-2 text-sm font-medium rounded-xl transition flex items-center gap-2"
              style={{ ...REACH.boutonSecondaire, borderRadius: RAYON.md }}
            >
              {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Ré-analyser
            </button>
            {!isConverted && (
              <button
                onClick={handleConvert}
                disabled={converting}
                className="px-4 py-2 text-sm font-medium transition flex items-center gap-2"
                style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
              >
                {converting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Convertir en client
              </button>
            )}
          </div>
        </div>

        {/* Contact info row */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: REACH.separateur }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs" style={REACH.discret}>Contact</span>
            <span className="font-medium" style={REACH.titre}>{data.contact_first_name} {data.contact_last_name}</span>
            {data.role && <span style={REACH.discret}>· {data.role}</span>}
          </div>
          {data.email && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs" style={REACH.discret}>Email</span>
              <span style={REACH.libelle}>{data.email}</span>
            </div>
          )}
          {data.website && (
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm" style={{ color: TEINTE.cyan }}>
              <ExternalLink size={12} /> Site web
            </a>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Scoring */}
        <div className="space-y-4">
          {/* Scoring */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-6" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={REACH.titre}>
              <Target size={16} color={accent} /> Scoring ARK
            </h3>
            <ScoreBar label="Opportunité" score={data.opportunity_score || 0} color={accent} />
            <ScoreBar label="Urgence" score={data.urgency_score || 0} color={TEINTE.ambre} />
            <ScoreBar label="Facilité" score={data.ease_score || 0} color={TEINTE.vert} />
            <div className="mt-4 pt-4" style={{ borderTop: REACH.separateur }}>
              <div className="text-xs mb-1" style={REACH.libelle}>Produit recommandé</div>
              <div className="text-sm font-semibold" style={REACH.titre}>{data.recommended_product || 'À déterminer'}</div>
            </div>
            <div className="mt-3">
              <div className="text-xs mb-1" style={REACH.libelle}>Prime annuelle estimée</div>
              <div className="text-lg font-bold" style={{ color: accent }}>
                {data.estimated_annual_premium ? fmtMontantCourt(data.estimated_annual_premium) : '—'}
              </div>
            </div>
          </motion.div>

          {/* Conformity badge */}
          <div className="rounded-2xl p-4" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
            <div className="flex items-center gap-2 text-sm">
              <Shield size={16} color={TEINTE.vert} />
              <span className="font-medium" style={REACH.titre}>Conformité RGPD</span>
            </div>
            <div className="mt-2 text-xs space-y-1" style={REACH.libelle}>
              <div className="flex items-center gap-1"><CheckSquare size={10} color={TEINTE.vert} /> LinkedIn assisté uniquement</div>
              <div className="flex items-center gap-1"><CheckSquare size={10} color={TEINTE.vert} /> Validation humaine obligatoire</div>
              <div className="flex items-center gap-1"><CheckSquare size={10} color={TEINTE.vert} /> Opt-out disponible</div>
            </div>
          </div>
        </div>

        {/* Center column - Approach & Objection */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl p-6" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={REACH.titre}>
            <Zap size={16} color={accent} /> Stratégie d&apos;approche
          </h3>

          <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.10)', borderRadius: RAYON.md }}>
            <div className="text-xs font-semibold mb-1" style={{ color: '#C4B5FD' }}>Angle d&apos;approche</div>
            <p className="text-sm" style={REACH.libelle}>{data.approach_angle || 'À analyser'}</p>
          </div>

          <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.10)', borderRadius: RAYON.md }}>
            <div className="text-xs font-semibold mb-1" style={{ color: TEINTE.ambre }}>Objection probable</div>
            <p className="text-sm" style={REACH.libelle}>{data.probable_objection || 'À analyser'}</p>
          </div>

          {analysis.next_best_action && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.10)', borderRadius: RAYON.md }}>
              <div className="text-xs font-semibold mb-1" style={{ color: TEINTE.vert }}>Meilleure action</div>
              <p className="text-sm" style={REACH.libelle}>{analysis.next_best_action}</p>
            </div>
          )}
        </motion.div>

        {/* Right column - Scripts */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-6" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={REACH.titre}>
            <MessageSquare size={16} color={accent} /> Scripts générés
          </h3>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 p-1" style={{ ...REACH.carteElevee, borderRadius: RAYON.md }}>
            {SCRIPT_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-1.5 text-xs font-medium transition"
                style={{
                  background: activeTab === tab ? accent : 'transparent',
                  color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                  borderRadius: RAYON.md,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Script content */}
          <div className="text-sm whitespace-pre-line leading-relaxed" style={REACH.libelle}>
            {activeTab === 'Appel' && (analysis.call_script || 'Script d\'appel à générer. Lancez l\'analyse ARK.')}
            {activeTab === 'Email' && (analysis.email_template || 'Template email à générer. Lancez l\'analyse ARK.')}
            {activeTab === 'SMS' && (analysis.sms_template || 'Template SMS à générer. Lancez l\'analyse ARK.')}
            {activeTab === 'LinkedIn' && (analysis.linkedin_message || 'Message LinkedIn à générer. Lancez l\'analyse ARK.')}
          </div>
        </motion.div>
      </div>

      {/* Actions bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="mt-6 rounded-2xl p-4 flex flex-wrap gap-3 items-center" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
        <button
          onClick={handleConvert}
          disabled={converting || isConverted}
          className="px-5 py-2.5 text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
          style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
        >
          {isConverted ? <CheckSquare size={14} /> : converting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          {isConverted ? 'Déjà client COURTIARK' : 'Convertir en client'}
        </button>
        <button
          onClick={async () => {
            const result = await createTask(prospectDetail?.id || id, { title: 'Suivi ' + (data.company_name || 'prospect') });
            if (result?.success) toast.success('Tâche créée : Suivi ' + (data.company_name || 'prospect'));
            else toast.error('Création de tâche impossible.');
          }}
          className="px-4 py-2.5 text-sm font-medium transition flex items-center gap-2"
          style={{ ...REACH.boutonSecondaire, borderRadius: RAYON.md }}
        >
          <CheckSquare size={14} /> Créer une tâche
        </button>
        <button
          onClick={() => navigate('/reach/campaigns')}
          className="px-4 py-2.5 text-sm font-medium transition flex items-center gap-2"
          style={{ ...REACH.boutonSecondaire, borderRadius: RAYON.md }}
        >
          <Send size={14} /> Ajouter à une campagne
        </button>
      </motion.div>
    </div>
  );
}
