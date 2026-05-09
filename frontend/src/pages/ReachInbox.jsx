import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Inbox, MessageSquare, ArrowRight, UserPlus, CheckSquare } from 'lucide-react';
import useReachStore from '../stores/reachStore';
import toast from 'react-hot-toast';

const accent = '#5B4DF5';

const SENTIMENT_COLORS = {
  interested: 'bg-green-50 text-green-700 border-green-200',
  quote_request: 'bg-blue-50 text-blue-700 border-blue-200',
  objection: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-gray-50 text-gray-500 border-gray-200',
  not_now: 'bg-purple-50 text-purple-700 border-purple-200',
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
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Inbox size={22} color={accent} /> Boîte de réponses
          </h1>
          <p className="text-gray-500 text-sm mt-1">{unreadCount} réponses non lues</p>
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
                className={`bg-white rounded-2xl p-4 border shadow-sm cursor-pointer transition hover:shadow-md ${selected?.id === r.id ? 'ring-2 ring-purple-300' : 'border-gray-100'} ${!r.is_read ? 'border-l-4 border-l-purple-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{companyName}</span>
                      {!r.is_read && <span className="w-2 h-2 rounded-full bg-purple-500"></span>}
                    </div>
                    <p className="text-xs text-gray-500">{city || '-'} · {category?.replace('_', ' ') || '-'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${SENTIMENT_COLORS[r.sentiment] || ''}`}>
                    {SENTIMENT_LABELS[r.sentiment] || r.sentiment}
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-medium">{r.subject}</p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.body?.substring(0, 100)}</p>
              </motion.div>
            );
          })}
          {replyRows.length === 0 && (
            <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center text-gray-400">
              <Inbox size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-600">Aucune réponse reçue</p>
              <p className="text-xs mt-1">COURTIA affichera ici les réponses REACH dès que vos campagnes recevront des retours.</p>
            </div>
          )}
        </div>

        {/* Détail */}
        <div className="lg:col-span-1">
          {selected ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm sticky top-20">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${SENTIMENT_COLORS[selected.sentiment] || ''}`}>
                  {SENTIMENT_LABELS[selected.sentiment] || selected.sentiment}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-2">{selected.subject}</p>
              <p className="text-sm text-gray-600 whitespace-pre-line mb-4">{selected.body}</p>

              <div className="bg-purple-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-purple-700 mb-1">ARK recommande</p>
                <p className="text-sm text-gray-700">{selected.ark_recommended_reply || 'À mesurer après analyse ARK.'}</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={async () => {
                    const res = await useReachStore.getState().handleReply(selected.id, 'create_task');
                    if (res.success) toast.success('Tâche créée');
                    else toast.error('Impossible de créer la tâche.');
                  }}
                  className="w-full py-2.5 text-sm font-medium text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2" style={{ background: accent }}
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
                  className="w-full py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <UserPlus size={14} /> Convertir en client
                </button>
                <button
                  onClick={() => toast.error('Configuration relance requise.')}
                  className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition flex items-center justify-center gap-1"
                >
                  <ArrowRight size={14} /> Relancer plus tard
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center text-gray-400">
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
