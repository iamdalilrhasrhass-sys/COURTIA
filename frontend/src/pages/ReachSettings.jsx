import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Key, Zap, Globe, CheckSquare, AlertTriangle, Activity } from 'lucide-react';
import api from '../api';

const accent = '#5B4DF5';

export default function ReachSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/reach/settings');
        if (data.success) setSettings(data.data);
      } catch {
        setSettings({
          google_places_configured: false,
          anthropic_configured: false,
          mode: 'demo',
          demo_note: 'Mode démo : données fictives réalistes. Ajoutez GOOGLE_PLACES_API_KEY pour activer la recherche réelle.',
          compliance: {
            linkedin: "Assisté uniquement — pas d'automatisation",
            google: 'API officielle uniquement',
            rgpd: 'Opt-out disponible, historique conservé, finalité explicite',
          },
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-[40vh]">
      <Activity size={28} className="animate-pulse text-gray-300" />
    </div>
  );

  const s = settings || {};

  return (
    <div className="p-6 max-w-3xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={22} color={accent} /> Réglages REACH
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configuration du moteur d'acquisition</p>
      </div>

      {/* Mode badge */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-5 mb-6 border ${s.mode === 'demo' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center gap-3">
          {s.mode === 'demo' ? (
            <AlertTriangle size={20} className="text-amber-600" />
          ) : (
            <CheckSquare size={20} className="text-green-600" />
          )}
          <div>
            <div className="font-semibold text-sm">
              Mode {s.mode === 'live' ? 'Production' : 'Démo'}
            </div>
            <p className="text-xs mt-0.5" style={{ color: s.mode === 'demo' ? '#92400E' : '#166534' }}>
              {s.demo_note || 'Mode actif'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* API Status */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Key size={16} color={accent} /> Intégrations API
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-gray-400" />
              <div>
                <div className="text-sm font-medium">Google Places API</div>
                <div className="text-xs text-gray-400">Recherche de commerces et professions</div>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.google_places_configured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {s.google_places_configured ? '✓ Configurée' : 'Mode mock'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-gray-400" />
              <div>
                <div className="text-sm font-medium">Intelligence ARK (Claude)</div>
                <div className="text-xs text-gray-400">Analyse et scoring des prospects</div>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.anthropic_configured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {s.anthropic_configured ? '✓ Configurée' : 'Mode rule-based'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Compliance */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Shield size={16} color="#10B981" /> Conformité
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 py-2">
            <CheckSquare size={16} className="text-green-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">LinkedIn assisté uniquement</div>
              <div className="text-xs text-gray-400">Pas d'automatisation des envois LinkedIn. L'humain valide et envoie.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <CheckSquare size={16} className="text-green-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">Google Places — API officielle</div>
              <div className="text-xs text-gray-400">Aucun scraping. Uniquement via l'API Google autorisée.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <CheckSquare size={16} className="text-green-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">Validation humaine obligatoire</div>
              <div className="text-xs text-gray-400">Chaque message doit être validé avant envoi. Pas d'envoi automatique.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <CheckSquare size={16} className="text-green-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium">RGPD — Opt-out</div>
              <div className="text-xs text-gray-400">Droit d'opposition, historique conservé, finalité explicite.</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Opt-out section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} color="#EF4444" /> Gestion des opt-out
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Conformément au RGPD, les prospects peuvent demander le retrait de leurs données.
          Cette action est irréversible et enregistrée dans l'historique.
        </p>
        <button className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition">
          Voir les opt-out (0)
        </button>
      </motion.div>
    </div>
  );
}
