import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Star, TrendingUp, Target, ArrowRight, Zap, Phone, MapPin, Building } from 'lucide-react';
import useReachStore from '../stores/reachStore';

const accent = '#5B4DF5';

const STATUS_COLORS = {
  nouveau: 'bg-blue-50 text-blue-700',
  a_contacter: 'bg-amber-50 text-amber-700',
  contacte: 'bg-purple-50 text-purple-700',
  interesse: 'bg-green-50 text-green-700',
  rdv_pris: 'bg-emerald-50 text-emerald-700',
  signe: 'bg-teal-50 text-teal-700',
  perdu: 'bg-gray-50 text-gray-500',
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
  const color = score >= 70 ? 'text-green-600 bg-green-50' : score >= 50 ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}/100</span>;
};

export default function ReachProspects() {
  const { prospects, fetchProspects, loading } = useReachStore();
  const [filters, setFilters] = useState({ category: '', city: '', status: '' });

  useEffect(() => {
    fetchProspects({ limit: 30 });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target size={22} color={accent} /> Prospects
          </h1>
          <p className="text-gray-500 text-sm mt-1">{prospects.length} prospects dans votre pipeline</p>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilters(f => ({ ...f, category: c.value }))}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${filters.category === c.value ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            style={filters.category === c.value ? { background: accent } : {}}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Entreprise</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Catégorie</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Ville</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Score</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Prime est.</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase">Statut</th>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase"></th>
              </tr>
            </thead>
            <tbody>
              {prospects.filter(p => !filters.category || p.category === filters.category).slice(0, 20).map((p, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition"
                >
                  <td className="p-4">
                    <div className="font-medium text-gray-900 text-sm">{p.company_name}</div>
                    <div className="text-xs text-gray-400">{p.contact_first_name} {p.contact_last_name}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{p.category?.replace(/_/g, ' ') || '-'}</td>
                  <td className="p-4 text-sm text-gray-600 flex items-center gap-1"><MapPin size={12} className="text-gray-400" /> {p.city}</td>
                  <td className="p-4"><ScoreBadge score={p.opportunity_score || 0} /></td>
                  <td className="p-4 text-sm font-medium text-gray-900">{p.estimated_annual_premium ? `${(p.estimated_annual_premium/1000).toFixed(0)}k€` : '-'}</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[p.status] || STATUS_COLORS.nouveau}`}>
                      {p.status || 'nouveau'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-xs font-medium px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition" style={{ background: accent }}>
                      Voir
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
