import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, MapPin } from 'lucide-react';
import useReachStore from '../stores/reachStore';
import { REACH, RAYON, TEINTE, pastille } from '../lib/reachTheme';
import { fmtMontantCourt } from '../lib/monnaie';

const accent = 'var(--accent-violet, #5B4DF5)';

// Pastilles de statut : teintes du design system (--accent-*), pas la palette
// claire de Tailwind (bg-blue-50/text-blue-700) qui jurait avec le cockpit sombre.
const STATUS_COLORS = {
  nouveau: TEINTE.cyan,
  a_contacter: TEINTE.ambre,
  contacte: TEINTE.violet,
  interesse: TEINTE.vert,
  rdv_pris: TEINTE.vert,
  signe: TEINTE.vert,
  perdu: TEINTE.neutre,
};

const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'garage', label: 'Garage' },
  { value: 'taxi_vtc', label: 'Taxi/VTC' },
  { value: 'artisan', label: 'Artisan' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'courtier', label: 'Courtier' },
];

const ScoreBadge = ({ score }) => {
  const teinte = score >= 70 ? TEINTE.vert : score >= 50 ? TEINTE.ambre : TEINTE.neutre;
  return (
    <span className="text-xs font-bold px-2 py-0.5" style={{ ...pastille(teinte), borderRadius: RAYON.full }}>
      {score}/100
    </span>
  );
};

export default function ReachProspects() {
  const navigate = useNavigate()
  const { prospects, fetchProspects, _loading } = useReachStore();
  const [filters, setFilters] = useState({ category: '', city: '', status: '' });

  useEffect(() => {
    fetchProspects({ limit: 30 });
  }, []);

  const lignes = prospects.filter(p => !filters.category || p.category === filters.category);

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={REACH.titre}>
            <Target size={22} color={accent} /> Prospects
          </h1>
          <p className="text-sm mt-1" style={REACH.libelle}>{prospects.length} prospects dans votre pipeline</p>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilters(f => ({ ...f, category: c.value }))}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap transition"
            style={filters.category === c.value
              ? { background: accent, color: '#FFFFFF', borderRadius: RAYON.md }
              : { ...REACH.carte, ...REACH.libelle, borderRadius: RAYON.md }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: REACH.separateur }}>
                <th className="text-left p-4 text-xs font-semibold uppercase" style={REACH.discret}>Entreprise</th>
                <th className="text-left p-4 text-xs font-semibold uppercase" style={REACH.discret}>Catégorie</th>
                <th className="text-left p-4 text-xs font-semibold uppercase" style={REACH.discret}>Ville</th>
                <th className="text-left p-4 text-xs font-semibold uppercase" style={REACH.discret}>Score</th>
                <th className="text-left p-4 text-xs font-semibold uppercase" style={REACH.discret}>Prime est.</th>
                <th className="text-left p-4 text-xs font-semibold uppercase" style={REACH.discret}>Statut</th>
                <th className="text-left p-4 text-xs font-semibold uppercase" style={REACH.discret}></th>
              </tr>
            </thead>
            <tbody>
              {lignes.slice(0, 20).map((p, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ borderBottom: REACH.separateur }}
                >
                  <td className="p-4">
                    <div className="font-medium text-sm" style={REACH.titre}>{p.company_name}</div>
                    <div className="text-xs" style={REACH.discret}>{p.contact_first_name} {p.contact_last_name}</div>
                  </td>
                  <td className="p-4 text-sm" style={REACH.libelle}>{p.category?.replace(/_/g, ' ') || '-'}</td>
                  <td className="p-4 text-sm flex items-center gap-1" style={REACH.libelle}>
                    <MapPin size={12} color={TEINTE.neutre} /> {p.city}
                  </td>
                  <td className="p-4"><ScoreBadge score={p.opportunity_score || 0} /></td>
                  <td className="p-4 text-sm font-medium" style={REACH.titre}>
                    {p.estimated_annual_premium ? fmtMontantCourt(p.estimated_annual_premium) : '-'}
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-medium px-2 py-1" style={{ ...pastille(STATUS_COLORS[p.status] || STATUS_COLORS.nouveau), borderRadius: RAYON.full }}>
                      {p.status || 'nouveau'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => navigate(`/reach/prospects/${p.id || i}`)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition"
                      style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
                    >
                      Voir
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {lignes.length === 0 && (
          <div className="py-14 text-center" style={REACH.discret}>
            <Target size={38} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium" style={REACH.libelle}>Aucun prospect pour l’instant</p>
            <p className="text-xs mt-1">Lancez une recherche REACH ou importez une audience qualifiée.</p>
          </div>
        )}
      </div>
    </div>
  );
}
