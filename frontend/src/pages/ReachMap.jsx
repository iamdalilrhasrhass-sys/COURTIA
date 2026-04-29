import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Target, Filter, TrendingUp } from 'lucide-react';
import useReachStore from '../stores/reachStore';

const accent = '#5B4DF5';

// Mock city coordinates (France)
const CITY_COORDS = {
  'Sens': { lat: 48.2007, lng: 3.2827 },
  'Montereau': { lat: 48.3839, lng: 2.9542 },
  'Melun': { lat: 48.5412, lng: 2.6609 },
  'Fontainebleau': { lat: 48.4047, lng: 2.7016 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Boulogne': { lat: 48.8359, lng: 2.2407 },
};

const CITY_COLORS = [
  '#5B4DF5', '#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#8B5CF6', '#14B8A6', '#F97316',
];

export default function ReachMap() {
  const { prospects, fetchProspects } = useReachStore();
  const [selectedCity, setSelectedCity] = useState(null);

  useEffect(() => {
    fetchProspects({ limit: 100 });
  }, []);

  // Group prospects by city
  const cityGroups = {};
  prospects.forEach(p => {
    const city = p.city || 'Inconnue';
    if (!cityGroups[city]) cityGroups[city] = [];
    cityGroups[city].push(p);
  });

  const cities = Object.entries(cityGroups).sort((a, b) => b[1].length - a[1].length);
  const maxCount = Math.max(...cities.map(([, list]) => list.length), 1);

  // Calculate pseudo-positions for layout
  const MAP_WIDTH = 800;
  const MAP_HEIGHT = 400;
  const PADDING = 60;

  const getPosition = (cityName, index, total) => {
    const coords = CITY_COORDS[cityName];
    if (coords) {
      // Normalize French coordinates to canvas
      const x = PADDING + ((coords.lng - 2.2) / (5.4 - 2.2)) * (MAP_WIDTH - 2 * PADDING);
      const y = MAP_HEIGHT - PADDING - ((coords.lat - 43.2) / (48.9 - 43.2)) * (MAP_HEIGHT - 2 * PADDING);
      return { x, y };
    }
    // Fallback: grid layout
    const cols = 5;
    return {
      x: PADDING + (index % cols) * ((MAP_WIDTH - 2 * PADDING) / cols),
      y: PADDING + Math.floor(index / cols) * ((MAP_HEIGHT - 2 * PADDING) / 3),
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin size={22} color={accent} /> Carte des prospects
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {prospects.length} prospects dans {cities.length} villes
        </p>
      </div>

      {/* Stats strip */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {cities.slice(0, 8).map(([city, list], i) => (
          <button
            key={city}
            onClick={() => setSelectedCity(selectedCity === city ? null : city)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition border ${
              selectedCity === city
                ? 'text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            style={selectedCity === city ? { background: CITY_COLORS[i % CITY_COLORS.length], borderColor: 'transparent' } : {}}
          >
            {city} <span className="ml-1 opacity-70">{list.length}</span>
          </button>
        ))}
      </div>

      {/* Pseudo Map */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 overflow-hidden">
        <div className="relative" style={{ height: MAP_HEIGHT, maxWidth: '100%' }}>
          {/* Background grid lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
            {/* Subtle grid */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`h${i}`} x1={PADDING} y1={PADDING + i * ((MAP_HEIGHT - 2 * PADDING) / 7)} x2={MAP_WIDTH - PADDING} y2={PADDING + i * ((MAP_HEIGHT - 2 * PADDING) / 7)} stroke="#F3F4F6" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`v${i}`} x1={PADDING + i * ((MAP_WIDTH - 2 * PADDING) / 9)} y1={PADDING} x2={PADDING + i * ((MAP_WIDTH - 2 * PADDING) / 9)} y2={MAP_HEIGHT - PADDING} stroke="#F3F4F6" strokeWidth="0.5" />
            ))}

            {/* City dots */}
            {cities.map(([city, list], idx) => {
              const pos = getPosition(city, idx);
              const radius = 8 + (list.length / maxCount) * 20;
              const color = CITY_COLORS[idx % CITY_COLORS.length];
              const isSelected = selectedCity === city || !selectedCity;

              return (
                <g key={city} style={{ cursor: 'pointer', opacity: isSelected ? 1 : 0.3 }}>
                  {/* Glow */}
                  <circle cx={pos.x} cy={pos.y} r={radius + 6} fill={color} opacity="0.08" />
                  {/* Main circle */}
                  <circle cx={pos.x} cy={pos.y} r={radius} fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
                  {/* Inner dot */}
                  <circle cx={pos.x} cy={pos.y} r={4} fill={color} />
                  {/* Label */}
                  <text x={pos.x} y={pos.y - radius - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151">
                    {city}
                  </text>
                  <text x={pos.x} y={pos.y - radius + 6} textAnchor="middle" fontSize="10" fill="#6B7280">
                    {list.length} prospects
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="text-center mt-3">
          <span className="text-xs text-gray-400 bg-amber-50 px-3 py-1 rounded-full">
            Mode démo — carte schématique · Activez Google Places API pour la carte réelle
          </span>
        </div>
      </motion.div>

      {/* City breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Filter size={16} color={accent} /> Détail par ville
        </h3>
        <div className="space-y-2">
          {cities.map(([city, list], i) => {
            const hotCount = list.filter(p => (p.opportunity_score || 0) >= 70).length;
            const totalPremium = list.reduce((sum, p) => sum + (p.estimated_annual_premium || 0), 0);
            const avgScore = Math.round(list.reduce((s, p) => s + (p.opportunity_score || 0), 0) / list.length);
            return (
              <div key={city} className="flex items-center justify-between py-2.5 px-4 rounded-xl hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: CITY_COLORS[i % CITY_COLORS.length] }} />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{city}</div>
                    <div className="text-xs text-gray-400">
                      {list.length} prospects · Score moyen {avgScore}/100
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} className="text-green-500" /> {hotCount} chauds
                  </span>
                  <span className="font-medium text-gray-700">{totalPremium > 0 ? `${Math.round(totalPremium / 1000)}k€` : '-'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
