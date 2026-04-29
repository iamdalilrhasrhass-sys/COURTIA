import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, TrendingUp, Zap, Phone, Mail, MessageSquare, MapPin,
  Star, Building, Calendar, ArrowLeft, UserPlus, CheckSquare, Shield,
  Send, ExternalLink, Loader2, AlertTriangle
} from 'lucide-react';
import useReachStore from '../stores/reachStore';
import toast from 'react-hot-toast';

const accent = '#5B4DF5';

const ScoreBar = ({ label, score, color }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs text-gray-600 mb-1">
      <span>{label}</span>
      <span className="font-semibold" style={{ color }}>{score}/100</span>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
    </div>
  </div>
);

const SCRIPT_TABS = ['Appel', 'Email', 'SMS', 'LinkedIn'];

export default function ReachProspectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { prospectDetail, fetchProspectDetail, analyzeProspect, convertToClient } = useReachStore();
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
        // Fallback mock prospect detail
        const mock = {
          id: id,
          company_name: 'Garage des Alpes',
          contact_first_name: 'Pierre',
          contact_last_name: 'Martin',
          role: 'Gérant',
          category: 'garage',
          city: 'Sens',
          phone: '03 86 95 12 34',
          email: 'contact@garagedesalpes.fr',
          website: 'https://garagedesalpes.fr',
          rating: 4.7,
          review_count: 42,
          opportunity_score: 85,
          urgency_score: 72,
          ease_score: 65,
          estimated_annual_premium: 28000,
          recommended_product: 'RC Pro Garage + Multirisque Pro',
          approach_angle: 'Proposer un bilan gratuit de leur couverture actuelle, mettre en avant les 32k courtiers qui font confiance à COURTIA REACH pour leur prospection',
          probable_objection: '"On est déjà assuré depuis 10 ans, on n\'a pas besoin de changer"',
          status: 'nouveau',
          analysis: {
            call_script: 'Bonjour M. Martin, je vous appelle de COURTIA. Nous aidons les garages comme le vôtre à optimiser leur couverture assurance. En 2 minutes, je peux vous dire si vous payez trop cher. Avez-vous 3 minutes ?',
            email_template: 'Objet: Optimisation assurance pour Garage des Alpes\n\nBonjour M. Martin,\n\nNotre analyse montre que votre garage pourrait économiser jusqu\'à 30% sur ses primes d\'assurance tout en renforçant sa couverture.\n\nJe vous propose un diagnostic gratuit de 15 minutes.\n\nSouhaitez-vous qu\'on en parle cette semaine ?',
            sms_template: 'Bonjour, COURTIA ici. Votre garage pourrait économiser sur son assurance pro. Diagnostic gratuit en 15 min. Intéressé ?',
            linkedin_message: 'Bonjour Pierre, je suis spécialisé en assurance pour l\'automobile. J\'ai remarqué votre garage à Sens — excellents avis ! Seriez-vous ouvert à échanger sur l\'optimisation de votre couverture pro ?',
            next_best_action: 'Appeler demain entre 9h30 et 11h — créneau garages',
            score_details: { opportunity: 85, urgency: 72, ease: 65 },
          }
        };
        setData(mock);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await analyzeProspect(id, data);
    toast.success('Analyse ARK complétée');
    setAnalyzing(false);
    // Refresh
    const res = await fetchProspectDetail(id);
    if (res?.success) setData(res.data);
  };

  const handleConvert = async () => {
    setConverting(true);
    const res = await convertToClient(data);
    if (res?.success) {
      toast.success(res.message || 'Prospect converti en client COURTIA');
    } else if (res.already_client) {
      toast('Déjà client COURTIA', { icon: '✅' });
    } else {
      toast.success('Conversion déclenchée (mode démo)');
    }
    setConverting(false);
  };

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Loader2 size={32} className="animate-spin text-gray-300" />
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center py-16 text-gray-400">
      <AlertTriangle size={40} className="mx-auto mb-3" />
      <p>Prospect introuvable</p>
    </div>
  );

  const analysis = data.analysis || {};
  const isConverted = data.converted_client_id;

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/reach/prospects')}
        className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        <ArrowLeft size={14} /> Retour aux prospects
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{data.company_name}</h1>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">Démo</span>
              {isConverted && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700 flex items-center gap-1">
                  <UserPlus size={10} /> Déjà client
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Building size={14} /> {data.category?.replace(/_/g, ' ')}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {data.city}</span>
              <span className="flex items-center gap-1"><Star size={14} className="text-amber-500" /> {data.rating} ({data.review_count})</span>
              <span className="flex items-center gap-1"><Phone size={14} /> {data.phone}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
            >
              {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Ré-analyser
            </button>
            {!isConverted && (
              <button
                onClick={handleConvert}
                disabled={converting}
                className="px-4 py-2 text-sm font-medium text-white rounded-xl hover:opacity-90 transition flex items-center gap-2"
                style={{ background: accent }}
              >
                {converting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Convertir en client
              </button>
            )}
          </div>
        </div>

        {/* Contact info row */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-gray-400">Contact</span>
            <span className="font-medium">{data.contact_first_name} {data.contact_last_name}</span>
            {data.role && <span className="text-gray-400">· {data.role}</span>}
          </div>
          {data.email && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-400">Email</span>
              <span className="text-gray-600">{data.email}</span>
            </div>
          )}
          {data.website && (
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
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
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target size={16} color={accent} /> Scoring ARK
            </h3>
            <ScoreBar label="Opportunité" score={data.opportunity_score || 0} color={accent} />
            <ScoreBar label="Urgence" score={data.urgency_score || 0} color="#F59E0B" />
            <ScoreBar label="Facilité" score={data.ease_score || 0} color="#10B981" />
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Produit recommandé</div>
              <div className="text-sm font-semibold text-gray-900">{data.recommended_product || 'À déterminer'}</div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Prime annuelle estimée</div>
              <div className="text-lg font-bold" style={{ color: accent }}>{data.estimated_annual_premium ? `${(data.estimated_annual_premium / 1000).toFixed(0)}k€` : '-'}</div>
            </div>
          </motion.div>

          {/* Conformity badge */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm">
              <Shield size={16} className="text-green-600" />
              <span className="font-medium text-gray-700">Conformité RGPD</span>
            </div>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <div className="flex items-center gap-1"><CheckSquare size={10} className="text-green-500" /> LinkedIn assisté uniquement</div>
              <div className="flex items-center gap-1"><CheckSquare size={10} className="text-green-500" /> Validation humaine obligatoire</div>
              <div className="flex items-center gap-1"><CheckSquare size={10} className="text-green-500" /> Opt-out disponible</div>
            </div>
          </div>
        </div>

        {/* Center column - Approach & Objection */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Zap size={16} color={accent} /> Stratégie d'approche
          </h3>

          <div className="mb-4 p-3 bg-purple-50 rounded-xl">
            <div className="text-xs font-semibold text-purple-700 mb-1">Angle d'approche</div>
            <p className="text-sm text-gray-700">{data.approach_angle || 'À analyser'}</p>
          </div>

          <div className="mb-4 p-3 bg-amber-50 rounded-xl">
            <div className="text-xs font-semibold text-amber-700 mb-1">Objection probable</div>
            <p className="text-sm text-gray-700">{data.probable_objection || 'À analyser'}</p>
          </div>

          {analysis.next_best_action && (
            <div className="p-3 bg-green-50 rounded-xl">
              <div className="text-xs font-semibold text-green-700 mb-1">Meilleure action</div>
              <p className="text-sm text-gray-700">{analysis.next_best_action}</p>
            </div>
          )}
        </motion.div>

        {/* Right column - Scripts */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MessageSquare size={16} color={accent} /> Scripts générés
          </h3>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-50 rounded-xl p-1">
            {SCRIPT_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg transition"
                style={{
                  background: activeTab === tab ? accent : 'transparent',
                  color: activeTab === tab ? '#fff' : '#6B7280',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Script content */}
          <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {activeTab === 'Appel' && (analysis.call_script || 'Script d\'appel à générer. Lancez l\'analyse ARK.')}
            {activeTab === 'Email' && (analysis.email_template || 'Template email à générer. Lancez l\'analyse ARK.')}
            {activeTab === 'SMS' && (analysis.sms_template || 'Template SMS à générer. Lancez l\'analyse ARK.')}
            {activeTab === 'LinkedIn' && (analysis.linkedin_message || 'Message LinkedIn à générer. Lancez l\'analyse ARK.')}
          </div>
        </motion.div>
      </div>

      {/* Actions bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="mt-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center">
        <button
          onClick={handleConvert}
          disabled={converting || isConverted}
          className="px-5 py-2.5 text-sm font-medium text-white rounded-xl hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
          style={{ background: accent }}
        >
          {isConverted ? <CheckSquare size={14} /> : converting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          {isConverted ? 'Déjà client COURTIA' : 'Convertir en client'}
        </button>
        <button className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-2">
          <CheckSquare size={14} /> Créer une tâche
        </button>
        <button
          onClick={() => navigate('/reach/campaigns')}
          className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
        >
          <Send size={14} /> Ajouter à une campagne
        </button>
      </motion.div>
    </div>
  );
}
