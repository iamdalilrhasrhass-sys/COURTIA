import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Key, Zap, Globe, CheckSquare, AlertTriangle, Activity } from 'lucide-react';
import api from '../api';
import toast from 'react-hot-toast';
import { REACH, RAYON, TEINTE, pastille } from '../lib/reachTheme';

const accent = 'var(--accent-violet, #5B4DF5)';

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
          mode: 'configuration_required',
          status_note: 'Configuration requise : ajoutez GOOGLE_PLACES_API_KEY pour la recherche externe et DEEPSEEK_API_KEY pour les analyses ARK.',
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
      <Activity size={28} className="animate-pulse" style={REACH.discret} />
    </div>
  );

  const s = settings || {};

  return (
    <div className="p-6 max-w-3xl mx-auto" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={REACH.titre}>
          <Settings size={22} color={accent} /> Réglages REACH
        </h1>
        <p className="text-sm mt-1" style={REACH.libelle}>Configuration du moteur d&apos;acquisition</p>
      </div>

      {/* Mode badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 mb-6"
        style={{ ...pastille(s.mode === 'live' ? TEINTE.vert : TEINTE.ambre), borderRadius: RAYON.lg }}
      >
        <div className="flex items-center gap-3">
          {s.mode === 'live' ? (
            <CheckSquare size={20} color={TEINTE.vert} />
          ) : (
            <AlertTriangle size={20} color={TEINTE.ambre} />
          )}
          <div>
            <div className="font-semibold text-sm">
              {s.mode === 'live' ? 'Mode production' : 'Configuration requise'}
            </div>
            <p className="text-xs mt-0.5">
              {s.status_note || 'Connectez les providers pour activer REACH en production.'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* API Status */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 mb-4" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={REACH.titre}>
          <Key size={16} color={accent} /> Intégrations API
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-3" style={{ borderBottom: REACH.separateur }}>
            <div className="flex items-center gap-3">
              <Globe size={18} color={TEINTE.neutre} />
              <div>
                <div className="text-sm font-medium" style={REACH.titre}>Google Places API</div>
                <div className="text-xs" style={REACH.discret}>Recherche de commerces et professions</div>
              </div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1" style={{ ...pastille(s.google_places_configured ? TEINTE.vert : TEINTE.ambre), borderRadius: RAYON.full }}>
              {s.google_places_configured ? '✓ Configurée' : 'Configuration requise'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Zap size={18} color={TEINTE.neutre} />
              <div>
                <div className="text-sm font-medium" style={REACH.titre}>Intelligence ARK (Claude)</div>
                <div className="text-xs" style={REACH.discret}>Analyse et scoring des prospects</div>
              </div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1" style={{ ...pastille(s.anthropic_configured ? TEINTE.vert : TEINTE.ambre), borderRadius: RAYON.full }}>
              {s.anthropic_configured ? '✓ Configurée' : 'Mode local assisté'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Compliance */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="rounded-2xl p-6 mb-4" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={REACH.titre}>
          <Shield size={16} color={TEINTE.vert} /> Conformité
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 py-2">
            <CheckSquare size={16} color={TEINTE.vert} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium" style={REACH.titre}>LinkedIn assisté uniquement</div>
              <div className="text-xs" style={REACH.discret}>Pas d&apos;automatisation des envois LinkedIn. L&apos;humain valide et envoie.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <CheckSquare size={16} color={TEINTE.vert} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium" style={REACH.titre}>Google Places — API officielle</div>
              <div className="text-xs" style={REACH.discret}>Aucun scraping. Uniquement via l&apos;API Google autorisée.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <CheckSquare size={16} color={TEINTE.vert} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium" style={REACH.titre}>Validation humaine obligatoire</div>
              <div className="text-xs" style={REACH.discret}>Chaque message doit être validé avant envoi. Pas d&apos;envoi automatique.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <CheckSquare size={16} color={TEINTE.vert} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium" style={REACH.titre}>RGPD — Opt-out</div>
              <div className="text-xs" style={REACH.discret}>Droit d&apos;opposition, historique conservé, finalité explicite.</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Opt-out section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="rounded-2xl p-6" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={REACH.titre}>
          <AlertTriangle size={16} color={TEINTE.rouge} /> Gestion des opt-out
        </h3>
        <p className="text-sm mb-3" style={REACH.libelle}>
          Conformément au RGPD, les prospects peuvent demander le retrait de leurs données.
          Cette action est irréversible et enregistrée dans l&apos;historique.
        </p>
        <button
          onClick={() => toast('Aucun opt-out enregistré', { icon: '✅' })}
          className="px-4 py-2 text-sm font-medium transition"
          style={{ ...pastille(TEINTE.rouge), borderRadius: RAYON.md }}
        >
          Voir les opt-out (0)
        </button>
      </motion.div>
    </div>
  );
}
