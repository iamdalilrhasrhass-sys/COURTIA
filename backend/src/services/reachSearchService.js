/**
 * COURTIA REACH — Search Service
 * Google Places API si clé présente, sinon mock intelligent.
 */

const { generateProspects } = require('./reachMockService');

/**
 * Recherche des prospects selon critères.
 * @param {Object} params
 * @param {string} params.category - garage, agent_assurance, courtier, artisan, taxi_vtc, restaurant, mandataire
 * @param {string} params.city - ville cible
 * @param {number} params.radius - rayon en km (optionnel)
 * @param {string} params.niche - besoin assurance spécifique (optionnel)
 * @param {number} params.limit - nombre max de résultats (défaut 10)
 */
async function searchProspects({ category, city, radius, niche, limit = 10 }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (apiKey) {
    try {
      return await googlePlacesSearch({ category, city, radius, apiKey, limit });
    } catch (err) {
      console.error('[reachSearch] Google Places failed, fallback mock:', err.message);
    }
  }

  return mockSearch({ category, city, radius, niche, limit });
}

// ── Google Places API ──────────────────────────────────────────────────
async function googlePlacesSearch({ category, city, radius, apiKey, limit }) {
  const axios = require('axios');

  // Text Search
  const query = `${category.replace(/_/g, ' ')} ${city}`;
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params: {
      query,
      radius: (radius || 30) * 1000,
      key: apiKey,
    },
    timeout: 10000,
  });

  if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${response.data.status} - ${response.data.error_message || ''}`);
  }

  const results = (response.data.results || []).slice(0, limit).map(place => ({
    company_name: place.name,
    category,
    city: city,
    address: place.formatted_address || place.vicinity,
    rating: place.rating || 0,
    review_count: place.user_ratings_total || 0,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    google_maps_url: `https://maps.google.com/?q=place_id:${place.place_id}`,
    source: 'google_places',
    raw_data: place,
  }));

  return results;
}

// ── Mock Search ────────────────────────────────────────────────────────
function mockSearch({ category, city, radius, niche, limit }) {
  return generateProspects({ category, city, count: limit });
}

module.exports = { searchProspects };
