/**
 * Comparator Engine — Moteur de scoring déterministe 8 compagnies fictives.
 * Génère 8 devis comparatifs cohérents basés sur le profil client.
 *
 * "ADN tarifaire" par compagnie : multiplicateurs par produit/profil.
 */

const COMPAGNIES = {
  Aurora:  { dna: { age_jeune: 1.05, age_senior: 0.95, urbain: 1.00, rural: 1.00, sinistre: 1.20 }, brand: 'Acteur premium FR — réputation solide' },
  Novalia: { dna: { age_jeune: 0.92, age_senior: 1.10, urbain: 0.95, rural: 1.05, sinistre: 1.15 }, brand: 'Spécialiste jeunes & profils tech' },
  Helios:  { dna: { age_jeune: 1.10, age_senior: 0.88, urbain: 0.93, rural: 1.10, sinistre: 1.25 }, brand: 'Best price seniors / patrimoine' },
  Serenis: { dna: { age_jeune: 1.00, age_senior: 1.00, urbain: 1.00, rural: 1.00, sinistre: 1.10 }, brand: 'Tarif équilibré, large couverture' },
  Atlas:   { dna: { age_jeune: 0.98, age_senior: 1.02, urbain: 1.08, rural: 0.90, sinistre: 1.30 }, brand: 'Urbain & multi-équipement' },
  Oria:    { dna: { age_jeune: 1.15, age_senior: 0.92, urbain: 0.92, rural: 1.12, sinistre: 1.10 }, brand: 'Régional rural, mutualiste' },
  Nivalis: { dna: { age_jeune: 0.95, age_senior: 1.05, urbain: 0.98, rural: 1.02, sinistre: 1.18 }, brand: 'Innovant, digital-first' },
  Solenys: { dna: { age_jeune: 1.02, age_senior: 0.98, urbain: 1.05, rural: 0.97, sinistre: 1.22 }, brand: 'Premium niche — services VIP' },
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

  // Bruit déterministe pour différencier compagnies (±5%)
  const noise = ((hash(code + produit + JSON.stringify(profile)) % 100) - 50) / 1000
  prime *= (1 + noise)

  const primeAnnuelle = Math.round(prime)
  return {
    provider: code,
    brand_tagline: COMPAGNIES[code].brand,
    produit,
    level,
    prime_annuelle_eur: primeAnnuelle,
    prime_mensuelle_eur: Math.round(primeAnnuelle / 12),
    franchise_eur: franchiseFor(level),
    garanties: preset(produit, level),
    delai_carence_jours: produit === 'Santé' ? 30 : 0,
    notation: 4.0 + ((hash(code + 'note') % 9) / 10), // 4.0 - 4.9
    delai_traitement_jours: 3 + (hash(code + 'delai') % 7),
  }
}

function computeAllQuotes(profile = {}, opts = {}) {
  const produit = opts.produit || profile.produit || 'Auto'
  const level = opts.level || 'confort'
  const quotes = Object.entries(COMPAGNIES).map(([code, info]) =>
    computeProviderQuote({ code, dna: info.dna, produit, profile, level })
  )

  // Ranking & badges
  quotes.sort((a, b) => a.prime_annuelle_eur - b.prime_annuelle_eur)

  // Calcul du "score ARK" : équilibre prix / couverture / fiabilité
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

  // Re-sort par ark_score pour le "ARK recommande"
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
    if (q.provider === bestPrice) q.badges.push({ key: 'best_price', label: '💰 Meilleur prix', tone: 'success' })
    if (q.provider === arkRecommends) q.badges.push({ key: 'ark_pick', label: '⚡ ARK recommande', tone: 'ark' })
    if (q.provider === bestCoverage) q.badges.push({ key: 'best_cover', label: '🛡️ Meilleure couverture', tone: 'cyan' })
    if (q.provider === bestSaving && refPrime - q.prime_annuelle_eur > 100) {
      q.badges.push({ key: 'max_saving', label: `📉 Économie max (-${refPrime - q.prime_annuelle_eur}€)`, tone: 'warning' })
    }
    if (sortedByArk[0].ark_score - q.ark_score < 5 && q.provider !== arkRecommends) {
      q.badges.push({ key: 'best_value', label: '⭐ Meilleur rapport', tone: 'violet' })
    }
  })

  // Re-sort by ark_score (best first)
  quotes.sort((a, b) => b.ark_score - a.ark_score)

  const summary = {
    cheapest_provider: bestPrice,
    cheapest_eur: sortedByPrice[0].prime_annuelle_eur,
    most_expensive_eur: refPrime,
    economy_eur: refPrime - sortedByPrice[0].prime_annuelle_eur,
    ark_recommendation: arkRecommends,
    ark_explanation: `${arkRecommends} offre le meilleur rapport prix / couverture / fiabilité (score ARK ${sortedByArk[0].ark_score}/100). ${
      bestSaving === arkRecommends ? "C'est aussi le moins cher." : `Économie possible de ${refPrime - sortedByPrice[0].prime_annuelle_eur}€ avec ${bestPrice} si le budget prime.`
    }`,
    profile_used: profile,
    produit,
    level,
  }

  return { quotes, summary }
}

module.exports = { computeAllQuotes, COMPAGNIES, BASE_PRIME, GARANTIES_PRESETS }
