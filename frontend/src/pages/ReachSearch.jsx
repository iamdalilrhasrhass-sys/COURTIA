import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Target, Loader2, Phone, Star, ExternalLink, TrendingUp, Mail } from 'lucide-react';
import useReachStore from '../stores/reachStore';

const accent = '#5B4DF5';

const CATEGORIES = [
  { value: 'garage', label: 'Garage automobile', icon: '🔧' },
  { value: 'taxi_vtc', label: 'Taxi / VTC', icon: '🚕' },
  { value: 'artisan', label: 'Artisan BTP', icon: '🔨' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { value: 'courtier', label: 'Courtier assurance', icon: '💼' },
  { value: 'agent_assurance', label: 'Agent général', icon: '🏢' },
  { value: 'mandataire', label: 'Mandataire immo', icon: '🏠' },
];

const NICHES = [
  { value: '', label: 'Tous les besoins' },
  { value: 'flotte_auto', label: 'Flotte Auto' },
  { value: 'rc_pro', label: 'RC Pro' },
  { value: 'decennale', label: 'Décennale' },
  { value: 'multirisque', label: 'Multirisque Pro' },
  { value: 'assurance_taxi_vtc', label: 'Assurance Taxi/VTC' },
  { value: 'prevoyance', label: 'Prévoyance' },
  { value: 'sante_collective', label: 'Santé Collective' },
];

export default function ReachSearch() {
  const { searchProspects, prospects, loading } = useReachStore();
  const [category, setCategory] = useState('garage');
  const [city, setCity] = useState('Sens');
  const [niche, setNiche] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setSearched(true);
    await searchProspects({ category, city, niche, limit: 12 });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target size={22} color={accent} /> Recherche de prospects
        </h1>
        <p className="text-gray-500 mt-1">Étape 1 : Trouver — Choisissez une cible et une ville</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cible métier</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Sens, Paris, Lyon..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Besoin assurance</label>
            <select
              value={niche}
              onChange={e => setNiche(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
            >
              {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full md:w-auto px-8 py-3 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
          style={{ background: accent }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Lancer ARK
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {prospects.length} prospects trouvés
            </h2>
            <span className="text-xs text-gray-400">Mode démo — données fictives</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prospects.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{p.company_name}</h3>
                    <p className="text-xs text-gray-500">{p.city}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <Star size={12} fill="#F59E0B" color="#F59E0B" /> {p.rating}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  {p.contact_first_name} {p.contact_last_name} · {p.role}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <Phone size={12} /> {p.phone}
                </div>
                {p.insurance_need && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 mb-3">
                    {p.insurance_need.replace(/_/g, ' ')}
                  </span>
                )}
                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <button className="text-xs font-medium px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition flex items-center gap-1" style={{ background: accent }}>
                    <TrendingUp size={12} /> Analyser
                  </button>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition flex items-center gap-1">
                      <ExternalLink size={12} /> Site
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
