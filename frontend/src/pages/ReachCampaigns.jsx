import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Plus, Clock, Users, Play, Pause, Target } from 'lucide-react';
import useReachStore from '../stores/reachStore';
import toast from 'react-hot-toast';
import api from '../api';
import { REACH, RAYON, TEINTE, pastille } from '../lib/reachTheme';

const accent = 'var(--accent-violet, #5B4DF5)';

/** Statut de campagne → teinte du design system (jamais la palette claire). */
function statutCampagne(status) {
  if (status === 'running' || status === 'active') return { teinte: TEINTE.vert, label: 'Actif' };
  if (status === 'paused') return { teinte: TEINTE.ambre, label: 'Pause' };
  return { teinte: TEINTE.neutre, label: 'Brouillon' };
}

export default function ReachCampaigns() {
  const navigate = useNavigate();
  const { campaigns, fetchCampaigns, _loading, createCampaign } = useReachStore();
  const [showTemplates, setShowTemplates] = useState(false);

  const templates = [
    { name: 'Garages locaux — Assurance Pro', desc: 'Garages automobiles dans votre zone', channel: 'email', steps: 3 },
    { name: 'Taxis / VTC — Protection revenu + véhicule', desc: 'Taxis et VTC indépendants', channel: 'email', steps: 3 },
    { name: 'Artisans BTP — Décennale + RC Pro', desc: 'Artisans du bâtiment', channel: 'email', steps: 3 },
  ];

  const campaignRows = Array.isArray(campaigns) ? campaigns : [];

  useEffect(() => { fetchCampaigns(); }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={REACH.titre}>
            <Mail size={22} color={accent} /> Campagnes
          </h1>
          <p className="text-sm mt-1" style={REACH.libelle}>Étape 3 : Approcher — Gérez vos campagnes de prospection</p>
        </div>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2"
          style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
        >
          <Plus size={16} /> Nouvelle campagne
        </button>
      </div>

      {/* Templates popup */}
      {showTemplates && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 mb-6" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
          <h3 className="font-semibold mb-4" style={REACH.titre}>Templates prêts à l&apos;emploi</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((t, i) => (
              <div key={i} className="rounded-xl p-4 transition cursor-pointer" style={{ ...REACH.carte, border: '1px solid rgba(255,255,255,0.12)', borderRadius: RAYON.md }}>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} color={accent} />
                  <span className="font-medium text-sm" style={REACH.titre}>{t.name}</span>
                </div>
                <p className="text-xs mb-3" style={REACH.libelle}>{t.desc}</p>
                <div className="flex items-center gap-3 text-xs" style={REACH.discret}>
                  <span className="flex items-center gap-1"><Mail size={12} /> {t.channel}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {t.steps} étapes</span>
                </div>
                <button
                  onClick={async () => {
                    const result = await createCampaign({ name: t.name, target_description: t.desc, channel: t.channel, steps: t.steps });
                    if (result?.success) {
                      toast.success(`Campagne "${t.name}" créée !`);
                      setShowTemplates(false);
                    } else {
                      toast.error('Création de campagne indisponible.');
                    }
                  }}
                  className="mt-3 w-full py-2 text-xs font-medium transition"
                  style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
                >
                  Utiliser ce template
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Campaign list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaignRows.map((c, i) => {
          const statut = statutCampagne(c.status);
          const enCours = c.status === 'running' || c.status === 'active';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-5 transition"
              style={{ ...REACH.carte, borderRadius: RAYON.lg }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm" style={REACH.titre}>{c.name}</h3>
                  <p className="text-xs mt-0.5" style={REACH.libelle}>{c.target_description}</p>
                </div>
                <span className="text-xs font-medium px-2 py-0.5" style={{ ...pastille(statut.teinte), borderRadius: RAYON.full }}>
                  {statut.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs mb-4" style={REACH.discret}>
                <span className="flex items-center gap-1"><Users size={12} /> {c.prospect_count} prospects</span>
                <span className="flex items-center gap-1"><Mail size={12} /> {c.channel}</span>
              </div>
              <div className="flex gap-2">
                {enCours ? (
                  <button
                    onClick={async () => {
                      try {
                        await api.patch(`/reach/campaigns/${c.id}/status`, { status: 'paused' });
                        toast.success('Campagne mise en pause');
                      } catch {
                        toast.error('Mise en pause impossible.');
                      }
                    }}
                    className="text-xs px-3 py-1.5 transition flex items-center gap-1"
                    style={{ ...pastille(TEINTE.ambre), borderRadius: RAYON.md }}
                  >
                    <Pause size={12} /> Pause
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await api.patch(`/reach/campaigns/${c.id}/status`, { status: 'running' });
                        toast.success('Campagne lancée !');
                      } catch {
                        toast.error('Lancement impossible.');
                      }
                    }}
                    className="text-xs px-3 py-1.5 transition flex items-center gap-1"
                    style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
                  >
                    <Play size={12} /> Lancer
                  </button>
                )}
                <button
                  onClick={() => navigate(`/reach/campaigns/${c.id}`)}
                  className="text-xs px-3 py-1.5 transition"
                  style={{ ...REACH.boutonSecondaire, borderRadius: RAYON.md }}
                >
                  Voir
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {campaignRows.length === 0 && (
        <div className="text-center py-16" style={REACH.discret}>
          <Mail size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium" style={REACH.libelle}>Aucune campagne pour le moment</p>
          <p className="text-sm mt-1">Créez votre première campagne depuis un template, sans envoi automatique.</p>
        </div>
      )}
    </div>
  );
}
