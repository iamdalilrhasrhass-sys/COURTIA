/**
 * Comparator Engine — MOTEUR DE SIMULATION TARIFAIRE.
 *
 * ⚠️ CE MOTEUR NE CONSULTE AUCUN ASSUREUR. Il produit huit offres SIMULÉES à
 * partir de profils tarifaires internes (multiplicateurs par produit/profil),
 * pour permettre au courtier de travailler un scénario avant d'avoir obtenu de
 * vrais tarifs. Les « assureurs » ci-dessous ne sont pas des personnes du
 * marché : ils sont volontairement nommés « Simulation A…H » et chaque offre
 * porte `is_simulation: true`, `source: 'simulation'` et un `simulation_notice`
 * en clair.
 *
 * CONSÉQUENCE : une offre produite ici ne peut JAMAIS devenir un PDF ou un
 * e-mail client (voir routes/devis.js `wizard/finalize` et
 * lib/donneesReelles.js). Les primes, notations et délais sont pseudo-aléatoires
 * (déterministes) : ils ne reflètent aucun tarif réel, aucune notation réelle
 * et aucun niveau de service réel d'un assureur.
 *
 * "ADN tarifaire" par profil simulé : multiplicateurs par produit/profil.
 */

/** Message en clair opposé à toute offre issue de ce moteur. */
const SIMULATION_NOTICE =
  'SIMULATION — aucun tarif réel : ces offres sont calculées par le moteur de simulation COURTIA, '
  + 'elles ne proviennent d\'aucun assureur et ne peuvent pas être remises à un client.'

/** Clé de provenance des offres simulées (opposée à 'manual' | 'imported' | 'api'). */
const SOURCE_SIMULATION = 'simulation'

const SIMULATEURS = {
  'Simulation A': { code: 'SIM_A', dna: { age_jeune: 1.05, age_senior: 0.95, urbain: 1.00, rural: 1.00, sinistre: 1.20 }, brand: 'Profil simulé type « acteur premium » — multiplicateurs internes, aucun assureur réel' },
  'Simulation B': { code: 'SIM_B', dna: { age_jeune: 0.92, age_senior: 1.10, urbain: 0.95, rural: 1.05, sinistre: 1.15 }, brand: 'Profil simulé type « spécialiste jeunes » — multiplicateurs internes, aucun assureur réel' },
  'Simulation C': { code: 'SIM_C', dna: { age_jeune: 1.10, age_senior: 0.88, urbain: 0.93, rural: 1.10, sinistre: 1.25 }, brand: 'Profil simulé type « seniors / patrimoine » — multiplicateurs internes, aucun assureur réel' },
  'Simulation D': { code: 'SIM_D', dna: { age_jeune: 1.00, age_senior: 1.00, urbain: 1.00, rural: 1.00, sinistre: 1.10 }, brand: 'Profil simulé « tarif équilibré » — multiplicateurs internes, aucun assureur réel' },
  'Simulation E': { code: 'SIM_E', dna: { age_jeune: 0.98, age_senior: 1.02, urbain: 1.08, rural: 0.90, sinistre: 1.30 }, brand: 'Profil simulé « urbain multi-équipement » — multiplicateurs internes, aucun assureur réel' },
  'Simulation F': { code: 'SIM_F', dna: { age_jeune: 1.15, age_senior: 0.92, urbain: 0.92, rural: 1.12, sinistre: 1.10 }, brand: 'Profil simulé « rural mutualiste » — multiplicateurs internes, aucun assureur réel' },
  'Simulation G': { code: 'SIM_G', dna: { age_jeune: 0.95, age_senior: 1.05, urbain: 0.98, rural: 1.02, sinistre: 1.18 }, brand: 'Profil simulé « digital-first » — multiplicateurs internes, aucun assureur réel' },
  'Simulation H': { code: 'SIM_H', dna: { age_jeune: 1.02, age_senior: 0.98, urbain: 1.05, rural: 0.97, sinistre: 1.22 }, brand: 'Profil simulé « niche premium » — multiplicateurs internes, aucun assureur réel' },
}

const BASE_PRIME = {
  Auto: 580,
  MRH: 280,
  Santé: 740,
  Prévoyance: 540,
  'RC Pro': 1100,
  'Flotte Auto': 2400,
  Cyber: 850,
  Décennale: 1800,
  PJ: 120,
}

const GARANTIES_PRESETS = {
  Auto: {
    essentiel: ['Responsabilité civile', 'Défense recours', 'Assistance 50km'],
    confort: ['RC + Vol + Incendie', 'Bris de glace', 'Assistance 0km', 'Conducteur+'],
    premium: ['Tous risques', 'Bris glace illimité', 'Effets perso', 'Véhicule remplacement', 'Conducteur 100%'],
  },
  MRH: {
    essentiel: ['RC vie privée', 'Incendie', 'Dégâts eaux'],
    confort: ['RC + Vol + Vandalisme', 'Bris de glace', 'Objets de valeur 5k€'],
    premium: ['Tous dommages', 'Objets valeur 30k€', 'Multi-résidences', 'Annulation séjour'],
  },
  Santé: {
    essentiel: ['Hospi 100%', 'Soins courants 100%', 'Optique standard'],
    confort: ['Hospi 200%', 'Soins 150%', 'Optique 200€', 'Dentaire 200%'],
    premium: ['Hospi 300%', 'Soins 200%', 'Optique 500€', 'Dentaire 400%', 'Médecine douce'],
  },
  Prévoyance: {
    essentiel: ['IJ 50€/j', 'Capital décès 50k€'],
    confort: ['IJ 100€/j', 'Capital décès 150k€', 'Invalidité 70%'],
    premium: ['IJ 200€/j', 'Capital 300k€', 'Invalidité 100%', 'Rente conjoint'],
  },
  'RC Pro': {
    essentiel: ['RC dommages tiers', 'Défense pénale'],
    confort: ['RC + Cyber 25k€', 'Protection juridique', 'Pertes exploitation'],
    premium: ['RC étendue', 'Cyber 100k€', 'Décennale incluse', 'Reconstruction image'],
  },
}

/** Marque une offre comme simulation, quel que soit son chemin de fabrication. */
function marquerSimulation(offre) {
  return {
    ...offre,
    is_simulation: true,
    source: SOURCE_SIMULATION,
    simulation_notice: SIMULATION_NOTICE,
  }
}

function hash(s) {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function ageFromBirthYear(annee) {
  if (!annee) return 35
  const a = new Date().getFullYear() - Number(annee)
  return a > 0 && a < 110 ? a : 35
}

function buildProfileMultipliers(profile) {
  const age = profile.age || ageFromBirthYear(profile.annee_naissance)
  const zone = (profile.zone || profile.zone_geographique || 'urbain').toLowerCase()
  const sinistres = Number(profile.sinistres_3ans || 0)
  return {
    age_jeune_w: age < 28 ? 1 : 0,
    age_senior_w: age >= 60 ? 1 : 0,
    urbain_w: zone.startsWith('urb') ? 1 : 0,
    rural_w: zone.startsWith('rur') ? 1 : 0,
    sinistre_factor: 1 + (sinistres * 0.07),
    age,
    zone,
    sinistres,
  }
}

function preset(produit, level = 'confort') {
  const map = GARANTIES_PRESETS[produit] || GARANTIES_PRESETS.Auto
  return map[level] || map.confort
}

function franchiseFor(level) {
  return level === 'premium' ? 100 : level === 'confort' ? 200 : 350
}

function computeProviderQuote({ code, dna, produit, profile, level }) {
  const base = BASE_PRIME[produit] || 600
  const mult = buildProfileMultipliers(profile)
  let prime = base
  prime *= (1 + (dna.age_jeune - 1) * mult.age_jeune_w)
  prime *= (1 + (dna.age_senior - 1) * mult.age_senior_w)
  prime *= (1 + (dna.urbain - 1) * mult.urbain_w)
  prime *= (1 + (dna.rural - 1) * mult.rural_w)
  prime *= mult.sinistre_factor

  // Niveau garanties
  const levelMult = level === 'premium' ? 1.45 : level === 'confort' ? 1.15 : 0.85
  prime *= levelMult

  // Bruit déterministe pour différencier les profils simulés (±5%)
  const noise = ((hash(code + produit + JSON.stringify(profile)) % 100) - 50) / 1000
  prime *= (1 + noise)

  const primeAnnuelle = Math.round(prime)
  return marquerSimulation({
    provider: code,
    provider_code: SIMULATEURS[code].code,
    brand_tagline: SIMULATEURS[code].brand,
    produit,
    level,
    prime_annuelle_eur: primeAnnuelle,
    prime_mensuelle_eur: Math.round(primeAnnuelle / 12),
    prime_source: SOURCE_SIMULATION,
    franchise_eur: franchiseFor(level),
    garanties: preset(produit, level),
    delai_carence_jours: produit === 'Santé' ? 30 : 0,
    // Notation et délai : valeurs pseudo-aléatoires du simulateur. Elles ne
    // mesurent ni la qualité ni la réactivité d'un assureur réel.
    notation: 4.0 + ((hash(code + 'note') % 9) / 10), // 4.0 - 4.9
    notation_source: SOURCE_SIMULATION,
    delai_traitement_jours: 3 + (hash(code + 'delai') % 7),
    delai_source: SOURCE_SIMULATION,
  })
}

function computeAllQuotes(profile = {}, opts = {}) {
  const produit = opts.produit || profile.produit || 'Auto'
  const level = opts.level || 'confort'
  const quotes = Object.entries(SIMULATEURS).map(([code, info]) =>
    computeProviderQuote({ code, dna: info.dna, produit, profile, level })
  )

  // Ranking & badges
  quotes.sort((a, b) => a.prime_annuelle_eur - b.prime_annuelle_eur)

  // Score de simulation : équilibre prix / couverture / « fiabilité » simulée
  quotes.forEach((q, idx) => {
    const priceRank = idx + 1 // 1 = moins cher
    const coverageScore = q.garanties.length
    const trustScore = q.notation
    q.ark_score = Math.round(
      (100 - (priceRank - 1) * 8) * 0.5 +
      (coverageScore * 8) * 0.3 +
      (trustScore * 20) * 0.2
    )
  })

  // Re-sort par ark_score pour le meilleur score simulé
  const sortedByArk = [...quotes].sort((a, b) => b.ark_score - a.ark_score)
  const sortedByPrice = [...quotes].sort((a, b) => a.prime_annuelle_eur - b.prime_annuelle_eur)
  const sortedByCoverage = [...quotes].sort((a, b) => b.garanties.length - a.garanties.length)

  const bestPrice = sortedByPrice[0].provider
  const arkRecommends = sortedByArk[0].provider
  const bestCoverage = sortedByCoverage[0].provider
  const bestSaving = sortedByPrice[0].provider
  const refPrime = sortedByPrice[sortedByPrice.length - 1].prime_annuelle_eur

  quotes.forEach(q => {
    q.badges = []
    if (q.provider === bestPrice) q.badges.push({ key: 'best_price', label: '💰 Meilleur prix (simulé)', tone: 'success' })
    if (q.provider === arkRecommends) q.badges.push({ key: 'ark_pick', label: '⚡ Meilleur score (simulé)', tone: 'ark' })
    if (q.provider === bestCoverage) q.badges.push({ key: 'best_cover', label: '🛡️ Meilleure couverture (simulée)', tone: 'cyan' })
    if (q.provider === bestSaving && refPrime - q.prime_annuelle_eur > 100) {
      q.badges.push({ key: 'max_saving', label: `📉 Écart max simulé (-${refPrime - q.prime_annuelle_eur}€)`, tone: 'warning' })
    }
    if (sortedByArk[0].ark_score - q.ark_score < 5 && q.provider !== arkRecommends) {
      q.badges.push({ key: 'best_value', label: '⭐ Meilleur rapport (simulé)', tone: 'violet' })
    }
  })

  // Re-sort by ark_score (best first)
  quotes.sort((a, b) => b.ark_score - a.ark_score)

  const summary = {
    is_simulation: true,
    source: SOURCE_SIMULATION,
    simulation_notice: SIMULATION_NOTICE,
    cheapest_provider: bestPrice,
    cheapest_eur: sortedByPrice[0].prime_annuelle_eur,
    most_expensive_eur: refPrime,
    economy_eur: refPrime - sortedByPrice[0].prime_annuelle_eur,
    ark_recommendation: arkRecommends,
    ark_explanation: `Simulation : « ${arkRecommends} » obtient le meilleur score interne (${sortedByArk[0].ark_score}/100). ${
      bestSaving === arkRecommends ? 'C\'est aussi le scénario le moins cher.' : `Écart simulé de ${refPrime - sortedByPrice[0].prime_annuelle_eur}€ avec « ${bestPrice} ».`
    } Aucun de ces montants ne provient d'un assureur : obtenez des tarifs réels avant toute remise au client.`,
    profile_used: profile,
    produit,
    level,
  }

  return { quotes, summary, is_simulation: true, source: SOURCE_SIMULATION, simulation_notice: SIMULATION_NOTICE }
}

module.exports = {
  computeAllQuotes,
  SIMULATEURS,
  SIMULATION_NOTICE,
  SOURCE_SIMULATION,
  marquerSimulation,
  BASE_PRIME,
  GARANTIES_PRESETS,
}
