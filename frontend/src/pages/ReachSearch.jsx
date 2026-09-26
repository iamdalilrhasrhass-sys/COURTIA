import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Target, Loader2, Phone, Star, ExternalLink, TrendingUp } from 'lucide-react';
import useReachStore from '../stores/reachStore';
import { marcheCourante, libellesMarche } from '../lib/marche';
import { REACH, RAYON, TEINTE, pastille } from '../lib/reachTheme';

const accent = 'var(--accent-violet, #5B4DF5)';

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
  const navigate = useNavigate();
  const { searchProspects, prospects, searchMeta, loading } = useReachStore();
  // Marché du CABINET (profil réel) : la zone de recherche, l'exemple de saisie
  // et le rappel affiché à l'écran en dépendent. Aucune ville n'est posée en
  // valeur par défaut — un cabinet ne se voit pas ouvrir une recherche sur une
  // ville qu'il n'a pas demandée (UX-026).
  const marche = marcheCourante();
  const libelles = libellesMarche(marche);
  const [category, setCategory] = useState('garage');
  const [city, setCity] = useState('');
  const [niche, setNiche] = useState('');
  const [searched, setSearched] = useState(false);

  const villeRenseignee = city.trim().length > 0;

  const handleSearch = async () => {
    if (!villeRenseignee) return;
    setSearched(true);
    await searchProspects({ category, city: city.trim(), niche, limit: 12 });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={REACH.titre}>
          <Target size={22} color={accent} /> Recherche de prospects
        </h1>
        <p className="mt-1" style={REACH.libelle}>
          Étape 1 : Trouver — Choisissez une cible et une ville de votre marché ({libelles.pays}).
        </p>
      </div>

      {/* Search Form */}
      <div className="rounded-2xl p-6 mb-8" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={REACH.libelle}>Cible métier</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-sm outline-none"
              style={{ ...REACH.champ, borderRadius: RAYON.md }}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={REACH.libelle}>
              Ville ({libelles.pays})
            </label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder={libelles.villesExemple}
              className="w-full px-4 py-2.5 text-sm outline-none"
              style={{ ...REACH.champ, borderRadius: RAYON.md }}
            />
            <p className="text-xs mt-1" style={REACH.discret}>
              Exemples : {libelles.villesExemple}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={REACH.libelle}>Besoin assurance</label>
            <select
              value={niche}
              onChange={e => setNiche(e.target.value)}
              className="w-full px-4 py-2.5 text-sm outline-none"
              style={{ ...REACH.champ, borderRadius: RAYON.md }}
            >
              {NICHES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !villeRenseignee}
          title={villeRenseignee ? undefined : 'Indiquez une ville pour lancer la recherche.'}
          className="w-full md:w-auto px-8 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
          style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md, cursor: (loading || !villeRenseignee) ? 'not-allowed' : 'pointer', opacity: (loading || !villeRenseignee) ? 0.55 : 1 }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Lancer ARK
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={REACH.titre}>
              {prospects.length} prospects trouvés
            </h2>
            <span className="text-xs" style={searchMeta?.configuration_required ? { color: TEINTE.ambre } : REACH.discret}>
              {searchMeta?.configuration_required ? 'Configuration Google Places requise' : 'Résultats COURTIARK'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prospects.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-5 transition-all group"
                style={{ ...REACH.carte, borderRadius: RAYON.lg }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm" style={REACH.titre}>{p.company_name}</h3>
                    <p className="text-xs" style={REACH.libelle}>{p.city}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: TEINTE.ambre }}>
                    <Star size={12} fill={TEINTE.ambre} color={TEINTE.ambre} /> {p.rating}
                  </div>
                </div>
                <div className="text-xs mb-3" style={REACH.libelle}>
                  {p.contact_first_name} {p.contact_last_name} · {p.role}
                </div>
                <div className="flex items-center gap-2 text-xs mb-3" style={REACH.discret}>
                  <Phone size={12} /> {p.phone}
                </div>
                {p.insurance_need && (
                  <span className="inline-block text-xs px-2 py-0.5 mb-3" style={{ ...pastille(TEINTE.violet), borderRadius: RAYON.full }}>
                    {p.insurance_need.replace(/_/g, ' ')}
                  </span>
                )}
                <div className="flex gap-2 pt-2" style={{ borderTop: REACH.separateur }}>
                  <button
                    onClick={() => navigate('/reach/prospects')}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                    style={{ ...REACH.boutonPrincipal, borderRadius: RAYON.md }}
                  >
                    <TrendingUp size={12} /> Analyser
                  </button>
                  {p.website && (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                      style={{ ...REACH.boutonSecondaire, borderRadius: RAYON.md }}
                    >
                      <ExternalLink size={12} /> Site
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          {prospects.length === 0 && (
            <div className="rounded-2xl py-14 text-center" style={{ ...REACH.carte, borderRadius: RAYON.lg }}>
              <Search size={38} className="mx-auto mb-3 opacity-30" style={REACH.discret} />
              <p className="text-sm font-medium" style={REACH.libelle}>Aucun prospect trouvé</p>
              <p className="text-xs mt-1" style={REACH.discret}>
                {searchMeta?.message || `Essayez une autre cible ou une autre ville (${libelles.pays}).`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
