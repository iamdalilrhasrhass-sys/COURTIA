/**
 * COURTIA REACH — Scoring Service
 * Moteur de scoring assurance vertical.
 * Claude AI si ANTHROPIC_API_KEY présente, sinon rule-based intelligent.
 */
const { generateAnalysis } = require('./reachMockService');

// ── Category → Assurance Product Mapping ─────────────────────────────
const CATEGORY_PRODUCT_MAP = {
  garage:          ['multirisque_professionnelle', 'flotte_auto', 'rc_pro'],
  agent_assurance: ['acquisition_clients', 'productivite', 'crm'],
  courtier:        ['acquisition_clients', 'productivite', 'crm'],
  artisan:         ['decennale', 'rc_pro', 'prevoyance'],
  taxi_vtc:        ['assurance_taxi_vtc', 'flotte_auto', 'protection_revenu'],
  restaurant:      ['multirisque_professionnelle', 'perte_exploitation', 'sante_collective'],
  mandataire:      ['rc_pro', 'protection_juridique', 'prevoyance'],
};

const PRODUCT_LABELS = {
  multirisque_professionnelle: 'Multirisque Professionnelle',
  flotte_auto: 'Flotte Auto',
  rc_pro: 'RC Pro',
  prevoyance: 'Prévoyance',
  decennale: 'Décennale',
  acquisition_clients: 'Acquisition Clients',
  productivite: 'Productivité',
  assurance_taxi_vtc: 'Assurance Taxi/VTC',
  protection_revenu: 'Protection Revenu',
  perte_exploitation: 'Perte d\'Exploitation',
  sante_collective: 'Santé Collective',
  protection_juridique: 'Protection Juridique',
  crm: 'CRM',
  local_commercial: 'Assurance Local Commercial',
};

const CATEGORY_LABELS = {
  garage: 'Garage automobile',
  agent_assurance: 'Agent général',
  courtier: 'Courtier',
  artisan: 'Artisan BTP',
  taxi_vtc: 'Taxi / VTC',
  restaurant: 'Restaurant',
  mandataire: 'Mandataire immobilier',
};

const PREMIUM_RANGES = {
  flotte_auto: [3000, 12000],
  auto_pro: [1800, 8000],
  rc_pro: [600, 4000],
  multirisque: [800, 5000],
  multirisque_professionnelle: [800, 5000],
  prevoyance: [400, 3000],
  decennale: [1500, 9000],
  assurance_taxi_vtc: [2500, 10000],
  protection_revenu: [500, 2500],
  perte_exploitation: [600, 4000],
  sante_collective: [1200, 8000],
  protection_juridique: [300, 1500],
  acquisition_clients: [500, 3000],
  productivite: [500, 3000],
  local_commercial: [400, 2500],
};

const OBJECTIONS = {
  garage: ['Déjà assuré depuis 10 ans', 'Pas le temps', 'Trop cher', 'Mon assureur actuel est un ami'],
  agent_assurance: ['Pas de budget prospection', 'Je gère seul mes clients', 'Le bouche-à-oreille suffit'],
  courtier: ['Pas de budget marketing', 'Mes clients viennent par recommandation', 'Pas prioritaire'],
  artisan: ['Ma décennale actuelle est suffisante', 'Pas le temps de comparer', 'Ça coûte trop cher'],
  taxi_vtc: ['Déjà couvert', 'Trop cher', 'Pas confiance dans les changements'],
  restaurant: ['Assuré depuis 20 ans', 'Pas le budget', 'Mon comptable gère ça'],
  mandataire: ['Je ne vois pas le risque', 'Mon activité est simple', 'Pas de budget pour ça'],
};

const ANGLES = {
  garage: 'Protection flotte + RC Pro pour vos véhicules clients',
  agent_assurance: 'Doublez vos rendez-vous qualifiés ce trimestre sans effort',
  courtier: 'Trouvez 12 prospects chauds par semaine automatiquement',
  artisan: 'Sécurisez vos chantiers avec la garantie décennale adaptée',
  taxi_vtc: 'Protection véhicule + perte de revenu en un seul contrat',
  restaurant: 'Couverture multirisque + perte d\'exploitation pour votre établissement',
  mandataire: 'Protection RC Pro et juridique pour vos transactions',
};

// ── Pseudo-random basé sur les propriétés du prospect ─────────────────
function seedFromProspect(prospect) {
  const key = `${prospect.company_name || ''}|${prospect.category || ''}|${prospect.city || ''}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pseudoRandom(seed) {
  const a = 1664525, c = 1013904223, m = Math.pow(2, 32);
  let s = seed;
  return function () {
    s = (a * s + c) % m;
    return s / m;
  };
}

// ── Helper pour normaliser le prospect ─────────────────────────────────
function normalizeProspect(prospect) {
  return {
    name: prospect.company_name || prospect.name || '',
    contact: `${prospect.contact_first_name || ''} ${prospect.contact_last_name || ''}`.trim() || 'Madame, Monsieur',
    category: prospect.category || 'artisan',
    city: prospect.city || '',
    rating: parseFloat(prospect.rating) || (3.0 + Math.random() * 1.5),
    review_count: parseInt(prospect.review_count, 10) || Math.floor(Math.random() * 50),
    insurance_need: prospect.insurance_need || '',
    estimated_annual_premium: prospect.estimated_annual_premium || null,
  };
}

// ── Scoring Rule-Based ──────────────────────────────────────────────────
function ruleBasedScore(prospect) {
  const p = normalizeProspect(prospect);
  const seed = seedFromProspect(prospect);
  const rand = pseudoRandom(seed);
  const cat = p.category;

  const products = CATEGORY_PRODUCT_MAP[cat] || ['rc_pro'];
  const recommendedProduct = products[Math.floor(rand() * products.length)];
  const rating = p.rating;
  const reviewCount = p.review_count;

  // Base scores par catégorie
  const baseScores = {
    garage: { opp: 72, urg: 55, ease: 65 },
    agent_assurance: { opp: 50, urg: 38, ease: 42 },
    courtier: { opp: 50, urg: 38, ease: 42 },
    artisan: { opp: 80, urg: 70, ease: 75 },
    taxi_vtc: { opp: 78, urg: 65, ease: 60 },
    restaurant: { opp: 68, urg: 50, ease: 55 },
    mandataire: { opp: 65, urg: 45, ease: 58 },
  };

  const bs = baseScores[cat] || { opp: 65, urg: 50, ease: 55 };
  const ratingBonus = Math.round((rating - 3.5) * 10);

  const opportunity = Math.min(100, Math.max(0, bs.opp + ratingBonus + Math.round(rand() * 20 - 10)));
  const urgency = Math.min(100, Math.max(0, bs.urg + Math.round((4 - rating) * 5) + Math.round(rand() * 15 - 7)));
  const ease = Math.min(100, Math.max(0, bs.ease + ratingBonus + Math.round(rand() * 12 - 6)));

  // Premium estimate
  let premium = p.estimated_annual_premium;
  if (!premium) {
    const range = PREMIUM_RANGES[recommendedProduct] || [500, 5000];
    premium = Math.round(range[0] + rand() * (range[1] - range[0]));
  }

  const premiumPotential = Math.min(100, Math.round((premium / 15000) * 100));
  const conversionLikelihood = Math.min(100, Math.round((ease + (rating * 10)) / 2));

  // Templates
  const angle = ANGLES[cat] || 'Protection complète pour votre activité professionnelle';
  const objections = OBJECTIONS[cat] || ['Déjà assuré'];
  const objection = objections[Math.floor(rand() * objections.length)];
  const productLabel = PRODUCT_LABELS[recommendedProduct] || recommendedProduct;

  const callScript = `Bonjour ${p.contact},\n\nJe suis courtier spécialisé en assurance professionnelle.\n\n${angle}\n\nJe vous propose un audit gratuit de 10 minutes de votre couverture actuelle. Sans engagement.\n\nQuand seriez-vous disponible cette semaine ?`;

  const emailTemplate = `Objet : ${angle}\n\nBonjour ${p.contact},\n\nJe me permets de vous contacter car j'accompagne des ${CATEGORY_LABELS[cat] || 'professionnels'} comme vous dans l'optimisation de leur couverture d'assurance.\n\n${angle}\n\nJe vous propose un audit gratuit de votre situation actuelle. Cela prend 10 minutes et peut vous faire économiser jusqu'à 30% sur vos contrats.\n\nQuand seriez-vous disponible pour un échange ?\n\nCordialement,\nVotre courtier COURTIA`;

  const linkedinMessage = `Bonjour ${p.contact.split(' ')[0] || ''}, je suis courtier spécialisé en assurance professionnelle. ${angle} Échangeons 5 minutes ?`;

  const smsTemplate = `Bonjour, ${angle.replace(/!/g,'')} Audit gratuit 10 min ? Répondez OUI.`;

  let nextBestAction;
  if (opportunity >= 75 && urgency >= 60) nextBestAction = '🔥 Appeler dans les 24h — prospect très chaud';
  else if (opportunity >= 60) nextBestAction = '📧 Envoyer email personnalisé + relancer J+3';
  else if (opportunity >= 40) nextBestAction = '📋 Ajouter à une campagne de prospection';
  else nextBestAction = '⏸️ Nurturing — recontacter dans 2-3 mois';

  return {
    opportunity_score: opportunity,
    urgency_score: urgency,
    ease_score: ease,
    premium_potential_score: premiumPotential,
    conversion_likelihood: conversionLikelihood,
    estimated_annual_premium: premium,
    recommended_product: recommendedProduct,
    recommended_product_label: productLabel,
    approach_angle: angle,
    probable_objection: objection,
    call_script: callScript,
    email_template: emailTemplate,
    linkedin_message: linkedinMessage,
    sms_template: smsTemplate,
    next_best_action: nextBestAction,
    score_justification: `Secteur ${CATEGORY_LABELS[cat] || cat}, note ${rating}/5, prime estimée ${premium}€/an.`,
    scoring_engine: 'rule-based',
  };
}

// ── Claude AI Scoring (fallback to rule-based on error) ─────────────────
async function claudeAiScore(prospect) {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic();
  const p = normalizeProspect(prospect);

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: `Tu es un expert en scoring de prospects assurance pour courtiers. Analyse le prospect et retourne UNIQUEMENT un JSON valide avec ces champs exacts :
{
  "opportunity_score": <0-100>,
  "urgency_score": <0-100>,
  "ease_score": <0-100>,
  "premium_potential_score": <0-100>,
  "conversion_likelihood": <0-100>,
  "estimated_annual_premium": <nombre>,
  "recommended_product": "<produit>",
  "approach_angle": "<angle>",
  "probable_objection": "<objection>",
  "call_script": "<script>",
  "email_template": "<email>",
  "linkedin_message": "<message>",
  "sms_template": "<sms>",
  "next_best_action": "<action>",
  "score_justification": "<justification>"
}
Sois réaliste. Catégories : garage, agent_assurance, courtier, artisan, taxi_vtc, restaurant, mandataire.`,
      messages: [{ role: 'user', content: `Prospect : ${p.name}, catégorie ${p.category}, ville ${p.city}, note ${p.rating}/5, ${p.review_count} avis.` }],
    });

    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    const clamp = v => Math.max(0, Math.min(100, Math.round(Number(v) || 50)));

    return {
      opportunity_score: clamp(json.opportunity_score),
      urgency_score: clamp(json.urgency_score),
      ease_score: clamp(json.ease_score),
      premium_potential_score: clamp(json.premium_potential_score),
      conversion_likelihood: clamp(json.conversion_likelihood),
      estimated_annual_premium: Math.round(Number(json.estimated_annual_premium) || 2000),
      recommended_product: String(json.recommended_product || 'rc_pro'),
      recommended_product_label: PRODUCT_LABELS[String(json.recommended_product)] || String(json.recommended_product),
      approach_angle: String(json.approach_angle || ''),
      probable_objection: String(json.probable_objection || ''),
      call_script: String(json.call_script || ''),
      email_template: String(json.email_template || ''),
      linkedin_message: String(json.linkedin_message || ''),
      sms_template: String(json.sms_template || ''),
      next_best_action: String(json.next_best_action || ''),
      score_justification: String(json.score_justification || ''),
      scoring_engine: 'claude-ai',
    };
  } catch (err) {
    console.error('[reachScoring] Claude failed, fallback rule-based:', err.message);
    const fb = ruleBasedScore(prospect);
    fb.scoring_engine = 'rule-based (Claude fallback)';
    return fb;
  }
}

// ── Public API ──────────────────────────────────────────────────────────
async function analyzeProspect(prospect) {
  if (!prospect) throw new Error('Prospect requis');

  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY);

  if (hasApiKey) {
    return claudeAiScore(prospect);
  }
  return ruleBasedScore(prospect);
}

// Batch analysis
async function analyzeProspects(prospects) {
  const results = [];
  for (const p of prospects) {
    try {
      const analysis = await analyzeProspect(p);
      results.push({ prospect: p, analysis });
    } catch (err) {
      results.push({ prospect: p, error: err.message });
    }
  }
  return results;
}

module.exports = {
  analyzeProspect,
  analyzeProspects,
  ruleBasedScore,
  CATEGORY_PRODUCT_MAP,
};
