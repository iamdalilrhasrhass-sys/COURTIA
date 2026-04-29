import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Plus, Clock, Users, Play, Pause, Target } from 'lucide-react';
import useReachStore from '../stores/reachStore';

const accent = '#5B4DF5';

export default function ReachCampaigns() {
  const { campaigns, fetchCampaigns, loading } = useReachStore();
  const [showTemplates, setShowTemplates] = useState(false);

  const templates = [
    { name: 'Garages locaux — Assurance Pro', desc: 'Garages automobiles dans votre zone', channel: 'email', steps: 3 },
    { name: 'Taxis / VTC — Protection revenu + véhicule', desc: 'Taxis et VTC indépendants', channel: 'email', steps: 3 },
    { name: 'Artisans BTP — Décennale + RC Pro', desc: 'Artisans du bâtiment', channel: 'email', steps: 3 },
  ];

  const mockCampaigns = campaigns.length > 0 ? campaigns : [
    { id: 1, name: 'Garages Sens — Prospection Q2', target_description: 'Garages à Sens et alentours', channel: 'email', status: 'active', prospect_count: 8 },
    { id: 2, name: 'Taxis Montereau — Protection revenu', target_description: 'Taxis et VTC à Montereau', channel: 'email', status: 'draft', prospect_count: 5 },
    { id: 3, name: 'Courtiers — Démo COURTIA REACH', target_description: 'Courtiers indépendants Île-de-France', channel: 'email', status: 'paused', prospect_count: 12 },
  ];

  useEffect(() => { fetchCampaigns(); }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail size={22} color={accent} /> Campagnes
          </h1>
          <p className="text-gray-500 text-sm mt-1">Étape 3 : Approcher — Gérez vos campagnes de prospection</p>
        </div>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="px-4 py-2.5 text-white rounded-xl text-sm font-medium hover:opacity-90 transition flex items-center gap-2"
          style={{ background: accent }}
        >
          <Plus size={16} /> Nouvelle campagne
        </button>
      </div>

      {/* Templates popup */}
      {showTemplates && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Templates prêts à l'emploi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((t, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-purple-200 hover:shadow-sm transition cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} color={accent} />
                  <span className="font-medium text-sm text-gray-800">{t.name}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{t.desc}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Mail size={12} /> {t.channel}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {t.steps} étapes</span>
                </div>
                <button className="mt-3 w-full py-2 text-xs font-medium text-white rounded-lg hover:opacity-90 transition" style={{ background: accent }}>
                  Utiliser ce template
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Campaign list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockCampaigns.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{c.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{c.target_description}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                c.status === 'active' ? 'bg-green-50 text-green-700' :
                c.status === 'paused' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'
              }`}>
                {c.status === 'active' ? 'Actif' : c.status === 'paused' ? 'Pause' : 'Brouillon'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
              <span className="flex items-center gap-1"><Users size={12} /> {c.prospect_count} prospects</span>
              <span className="flex items-center gap-1"><Mail size={12} /> {c.channel}</span>
            </div>
            <div className="flex gap-2">
              {c.status === 'active' ? (
                <button className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition flex items-center gap-1">
                  <Pause size={12} /> Pause
                </button>
              ) : (
                <button className="text-xs px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition flex items-center gap-1" style={{ background: accent }}>
                  <Play size={12} /> Lancer
                </button>
              )}
              <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                Voir
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {mockCampaigns.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Mail size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune campagne pour le moment</p>
          <p className="text-sm mt-1">Créez votre première campagne en un clic</p>
        </div>
      )}
    </div>
  );
}
