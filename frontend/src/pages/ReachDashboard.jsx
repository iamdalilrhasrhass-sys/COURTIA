import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Mail, PhoneCall, Zap, ArrowRight, Star, Users, Calendar } from 'lucide-react';
import useReachStore from '../stores/reachStore';

const accent = '#5B4DF5';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
        <Icon size={20} />
      </div>
      {sub && <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#F0FDF4', color: '#166534' }}>{sub}</span>}
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-sm text-gray-500 mt-1">{label}</div>
  </div>
);

export default function ReachDashboard() {
  const navigate = useNavigate();
  const { dashboard, fetchDashboard, loading } = useReachStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboard().then(() => {
      const d = useReachStore.getState().dashboard;
      setData(d);
    });
  }, []);

  const stats = data || {
    total_prospects: 30,
    hot_prospects: 8,
    active_campaigns: 2,
    replies_to_process: 5,
    rdv_generated: 3,
    avg_score: 72,
    total_premium_potential: 145000,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
              <Target size={18} color={accent} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">REACH</h1>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">Démo</span>
          </div>
          <p className="text-gray-500 mt-1">Moteur d'acquisition intelligent pour courtiers</p>
        </motion.div>
      </div>

      {/* Parcours */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {['Trouver', 'Comprendre', 'Approcher', 'Convertir'].map((step, i) => (
          <button
            key={step}
            onClick={() => navigate(i === 0 ? '/reach/search' : i === 1 ? '/reach/prospects' : i === 2 ? '/reach/campaigns' : '/reach/prospects')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all whitespace-nowrap"
          >
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: accent }}>{i + 1}</span>
            {step}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Target} label="Prospects trouvés" value={stats.total_prospects} color={accent} />
        <StatCard icon={Zap} label="Prospects chauds" value={stats.hot_prospects} sub={`${stats.hot_prospects} à contacter`} color="#F59E0B" />
        <StatCard icon={Mail} label="Campagnes actives" value={stats.active_campaigns} color="#10B981" />
        <StatCard icon={TrendingUp} label="Score moyen" value={`${stats.avg_score}/100`} color="#3B82F6" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Calendar} label="RDV générés" value={stats.rdv_generated} color="#8B5CF6" />
        <StatCard icon={Star} label="Réponses à traiter" value={stats.replies_to_process} color="#EC4899" />
        <StatCard icon={TrendingUp} label="Potentiel primes" value={`${(stats.total_premium_potential / 1000).toFixed(0)}k€`} color="#14B8A6" />
      </div>

      {/* ARK recommande */}
      {stats.best_prospect_today && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} color="#F59E0B" />
            <span className="font-semibold text-sm text-gray-700">ARK recommande aujourd'hui</span>
          </div>
          <p className="text-gray-900 font-medium text-lg mb-1">{stats.best_prospect_today.name}</p>
          <p className="text-gray-500 text-sm mb-4">{stats.best_prospect_today.action}</p>
          <div className="flex gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">Score {stats.best_prospect_today.score}/100</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">Prime ~{stats.best_prospect_today.premium}€</span>
          </div>
        </motion.div>
      )}

      {/* Top action */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <p className="font-semibold text-gray-800 mb-2">⚡ Action prioritaire</p>
        <p className="text-gray-600 mb-4">{stats.top_action || 'Lancez une recherche pour trouver des prospects'}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/reach/search')} className="px-5 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition flex items-center gap-2" style={{ background: accent }}>
            <Target size={16} /> Lancer une recherche
          </button>
          <button onClick={() => navigate('/reach/prospects')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">Voir les prospects <ArrowRight size={14} className="inline" /></button>
        </div>
      </div>
    </div>
  );
}
