import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Inbox, MessageSquare, ArrowRight, UserPlus, CheckSquare } from 'lucide-react';
import useReachStore from '../stores/reachStore';
import toast from 'react-hot-toast';
import { REACH, RAYON, TEINTE, pastille } from '../lib/reachTheme';

const accent = 'var(--accent-violet, #5B4DF5)';

// Sentiments : teintes du design system, pas la palette claire (bg-*-50).
const SENTIMENT_COLORS = {
  interested: TEINTE.vert,
  quote_request: TEINTE.cyan,
  objection: TEINTE.ambre,
  cold: TEINTE.neutre,
  not_now: TEINTE.violet,
};

const SENTIMENT_LABELS = {
  interested: 'Intéressé 🔥',
  quote_request: 'Demande tarif 📋',
  objection: 'Objection 💭',
  cold: 'Froid 🥶',
  not_now: 'Pas maintenant ⏰',
};

export default function ReachInbox() {
  const { replies, fetchReplies } = useReachStore();
  const [selected, setSelected] = useState(null);
  const replyRows = Array.isArray(replies) ? replies : [];

  useEffect(() => { fetchReplies(); }, []);

  const unreadCount = replyRows.filter(r => !r.is_read).length;

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={REACH.titre}>
            <Inbox size={22} color={accent} /> Boîte de réponses
          </h1>
          <p className="text-sm mt-1" style={REACH.libelle}>{unreadCount} réponses non lues</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste */}
        <div className="lg:col-span-2 space-y-3">
          {replyRows.map((r, i) => {
            const companyName = r.prospect?.company_name || r.company_name || 'Prospect';
            const city = r.prospect?.city || r.city || '';
            const category = r.prospect?.category || r.category || '';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelected(r)}
                className="rounded-2xl p-4 cursor-pointer transition"
                style={{
                  ...REACH.carte,
                  borderRadius: RAYON.lg,
                  border: selected?.id === r.id ? '1px solid rgba(139, 92, 246, 0.45)' : REACH.carte.border,
                  borderLeft: !r.is_read ? `4px solid ${TEINTE.violet}` : REACH.carte.border,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={REACH.titre}>{companyName}</span>
                      {!r.is_read && <span className="w-2 h-2 rounded-full" style={{ background: TEINTE.violet }}></span>}
                    </div>
                    <p className="text-xs" style={REACH.libelle}>{city || '-'} · {category?.replace('_', ' ') || '-'}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1" style={{ ...pastille(SENTIMENT_COLORS[r.sentiment] || TEINTE.neutre), borderRadius: RAYON.full }}>
                    {SENTIMENT_LABELS[r.sentiment] || r.sentiment}
                  </span>
                </div>
                <p className="text-sm font-medium" style={REACH.libelle}>{r.subject}</p>
                <p className="text-xs mt-1 line-clamp-2" style={REACH.discret}>{r.body?.substring(0, 100)}</p>
              </motion.div>
            );
          })}
          {replyRows.length === 0 && (
            <div className="rounded-2xl p-10 text-center" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
              <Inbox size={36} className="mx-auto mb-3 opacity-30" style={REACH.discret} />
              <p className="text-sm font-medium" style={REACH.libelle}>Aucune réponse reçue</p>
              <p className="text-xs mt-1" style={REACH.discret}>COURTIARK affichera ici les réponses REACH dès que vos campagnes recevront des retours.</p>
            </div>
          )}
        </div>

        {/* Détail */}
        <div className="lg:col-span-1">
          {selected ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl p-5 sticky top-20"
              style={{ ...REACH.carte, borderRadius: RAYON.lg }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium px-2 py-1" style={{ ...pastille(SENTIMENT_COLORS[selected.sentiment] || TEINTE.neutre), borderRadius: RAYON.full }}>
                  {SENTIMENT_LABELS[selected.sentiment] || selected.sentiment}
                </span>
              </div>
              <p className="text-sm font-semibold mb-2" style={REACH.titre}>{selected.subject}</p>
              <p className="text-sm whitespace-pre-line mb-4" style={REACH.libelle}>{selected.body}</p>

              <div className="rounded-xl p-4 mb-4" style={{ ...REACH.encartARK, borderRadius: RAYON.md }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#C4B5FD' }}>ARK recommande</p>
                <p className="text-sm" style={REACH.libelle}>{selected.ark_recommended_reply || 'À mesurer après analyse ARK.'}</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={async () => {
                    const res = await useReachStore.getState().handleReply(selected.id, 'create_task');
                    if (res.success) toast.success('Tâche créée');
                    else toast.error('Impossible de créer la tâche.');
                  }}
                  className="w-full py-2.5 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
                  style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
                >
                  <CheckSquare size={14} /> Créer une tâche
                </button>
                <button
                  onClick={async () => {
                    const res = await useReachStore.getState().convertToClient({
                      id: selected.prospect?.id || selected.prospect_id,
                      company_name: selected.prospect?.company_name || selected.company_name,
                    });
                    if (res.success) toast.success('Prospect converti en client !');
                    else toast.error('Erreur conversion');
                  }}
                  className="w-full py-2.5 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
                  style={{ ...REACH.boutonSecondaire, borderRadius: RAYON.md }}
                >
                  <UserPlus size={14} /> Convertir en client
                </button>
                <button
                  onClick={() => toast.error('Configuration relance requise.')}
                  className="w-full py-2.5 text-sm font-medium transition flex items-center justify-center gap-1"
                  style={REACH.discret}
                >
                  <ArrowRight size={14} /> Relancer plus tard
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ ...REACH.carte, borderRadius: RAYON.lg, color: 'var(--text-tertiary)' }}>
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Sélectionnez une réponse</p>
              <p className="text-xs mt-1">pour voir les détails et actions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
