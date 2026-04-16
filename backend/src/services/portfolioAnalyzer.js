/**
 * portfolioAnalyzer.js — Moteur d'analyse nocturne du Portefeuille Vivant
 *
 * Health Score : indicateur composite 0-100 en 6 dimensions pondérées.
 * Sources : L'Argus de l'Assurance, MMA, Custy, AssurCessions, ACPR 2024-R-03.
 *
 * Pondérations :
 *   25% Multi-équipement   (MMA, Custy)
 *   20% Taux de rétention  (AssurCessions, Vena)
 *   15% Engagement client  (ACPR 2024-R-03, ASSUR3D)
 *   15% Diversification    (Selectra, AssurCessions)
 *   15% Conformité DDA     (Brokin, OGGO Data)
 *   10% Croissance         (Plecto)
 *
 * Adaptations DB :
 *   clients.courtier_id (pas user_id)
 *   quotes : jointure via clients.courtier_id
 *   appointments.start_time (pas appointment_date)
 *   quotes.quote_data JSONB → compagnie, type_contrat
 */

const pool      = require('../db');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── HELPERS INTERNES ──────────────────────────────────────────────────────

/** Interpole linéairement v entre [a,b] → [scoreMin,scoreMax], capé. */
function lerp(v, a, b, scoreMin, scoreMax) {
  if (v <= a) return scoreMin;
  if (v >= b) return scoreMax;
  return scoreMin + ((v - a) / (b - a)) * (scoreMax - scoreMin);
}

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

/** Convertit un score en grade lettre. */
function scoreToGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'E';
}

/** Multiplicateur de valorisation selon AssurCessions / Selectra. */
function getMultiplier(score) {
  if (score >= 90) return { min: 2.5, max: 3.0, label: 'Premium' };
  if (score >= 75) return { min: 2.0, max: 2.5, label: 'Standard+' };
  if (score >= 60) return { min: 1.5, max: 2.0, label: 'Standard' };
  if (score >= 45) return { min: 1.2, max: 1.5, label: 'Décoté' };
  return { min: 0.8, max: 1.2, label: 'Risqué' };
}

function getComparableProfile(score) {
  if (score >= 90) return "Cabinet d'excellence — comparable aux 5% supérieurs du marché français";
  if (score >= 80) return "Cabinet performant — comparable au top 15% du marché";
  if (score >= 70) return "Cabinet solide — au-dessus de la médiane sectorielle";
  if (score >= 60) return "Cabinet médian — performances dans la moyenne ORIAS";
  if (score >= 45) return "Cabinet en construction — fondamentaux à renforcer";
  return "Cabinet à risque — actions correctives prioritaires";
}

/** Fourchette arrondie à la dizaine pour le bridage Start. */
function scoreToRange(score) {
  const lower = Math.floor(score / 10) * 10;
  return `${lower}-${Math.min(lower + 10, 100)}`;
}

// ─── COLLECTE DES DONNÉES ──────────────────────────────────────────────────

async function collectPortfolioData(userId) {
  const [
    clientsRes,
    quotesRes,
    appointmentsRes,
    arkRes,
    growthRes,
  ] = await Promise.all([
    pool.query(
      `SELECT id, email, phone, address, profession, situation_familiale,
              status, created_at, notes
       FROM clients WHERE courtier_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT q.id, q.client_id, q.status,
              q.quote_data->>'compagnie'     AS compagnie,
              q.quote_data->>'type_contrat'  AS type_contrat,
              q.created_at, q.updated_at
       FROM quotes q
       JOIN clients c ON q.client_id = c.id
       WHERE c.courtier_id = $1`,
      [userId]
    ),
    // Dernière interaction par client via rendez-vous
    pool.query(
      `SELECT a.client_id, MAX(a.start_time) AS last_appt
       FROM appointments a
       WHERE a.user_id = $1
         AND a.client_id IS NOT NULL
       GROUP BY a.client_id`,
      [userId]
    ),
    // Dernière conversation ARK par client
    pool.query(
      `SELECT ac.client_id, MAX(ac.created_at) AS last_ark
       FROM ark_conversations ac
       WHERE ac.client_id IN (SELECT id FROM clients WHERE courtier_id = $1)
       GROUP BY ac.client_id`,
      [userId]
    ),
    // Nouvelles souscriptions pour calcul de croissance
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE q.created_at > NOW() - INTERVAL '30 days')   AS last_30,
         COUNT(*) FILTER (WHERE q.created_at > NOW() - INTERVAL '60 days'
                               AND q.created_at <= NOW() - INTERVAL '30 days') AS prev_30
       FROM quotes q
       JOIN clients c ON q.client_id = c.id
       WHERE c.courtier_id = $1`,
      [userId]
    ),
  ]);

  // Index par client_id pour les lookups O(1)
  const lastApptByClient = {};
  appointmentsRes.rows.forEach(r => { lastApptByClient[r.client_id] = r.last_appt; });

  const lastArkByClient = {};
  arkRes.rows.forEach(r => { lastArkByClient[r.client_id] = r.last_ark; });

  return {
    clients:        clientsRes.rows,
    quotes:         quotesRes.rows,
    lastApptByClient,
    lastArkByClient,
    growth:         growthRes.rows[0],
  };
}

// ─── DIMENSION 1 — MULTI-ÉQUIPEMENT (25%) ─────────────────────────────────

function calcMultiEquipScore(data) {
  const { clients, quotes } = data;
  const activeClients = clients.filter(c =>
    ['actif', 'active', 'prospect'].includes((c.status || '').toLowerCase())
  );
  const activeQuotes = quotes.filter(q =>
    ['actif', 'active'].includes((q.status || '').toLowerCase())
  );
  if (activeClients.length === 0) return { score: 0, ratio: 0 };

  const ratio = activeQuotes.length / activeClients.length;
  let score;
  if      (ratio < 1.0) score = lerp(ratio, 0,   1.0, 0,  30);
  else if (ratio < 1.5) score = lerp(ratio, 1.0, 1.5, 30, 60);
  else if (ratio < 2.5) score = lerp(ratio, 1.5, 2.5, 60, 90);
  else if (ratio < 4.0) score = lerp(ratio, 2.5, 4.0, 90, 100);
  else                  score = 100;

  return { score: clamp(Math.round(score)), ratio: Math.round(ratio * 10) / 10 };
}

// ─── DIMENSION 2 — TAUX DE RÉTENTION (20%) ────────────────────────────────

function calcRetentionScore(data) {
  const { quotes, clients } = data;
  const now = Date.now();
  const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;

  const renewed = quotes.filter(q => {
    const status = (q.status || '').toLowerCase();
    const created = new Date(q.created_at).getTime();
    return ['actif', 'active', 'renewed'].includes(status)
      && (now - created) < twelveMonthsMs;
  }).length;

  const resiliated = quotes.filter(q => {
    const status = (q.status || '').toLowerCase();
    const updated = new Date(q.updated_at || q.created_at).getTime();
    return ['cancelled', 'lapsed', 'resilié', 'resilie'].includes(status)
      && (now - updated) < twelveMonthsMs;
  }).length;

  const total = renewed + resiliated;

  // Portefeuille < 3 mois → pas assez de recul
  const oldestClient = clients.reduce((min, c) =>
    Math.min(min, new Date(c.created_at).getTime()), Infinity
  );
  const portfolioAgeMs = now - oldestClient;
  if (portfolioAgeMs < 90 * 24 * 60 * 60 * 1000) {
    return { score: null, rate: null, note: 'young_portfolio' };
  }

  if (total === 0) return { score: 50, rate: null, note: 'no_churn_data' };

  const rate = renewed / total;
  let score;
  if      (rate < 0.70) score = lerp(rate, 0,    0.70, 0,  30);
  else if (rate < 0.85) score = lerp(rate, 0.70, 0.85, 30, 70);
  else if (rate < 0.92) score = lerp(rate, 0.85, 0.92, 70, 90);
  else if (rate < 0.98) score = lerp(rate, 0.92, 0.98, 90, 100);
  else                  score = 100;

  return {
    score: clamp(Math.round(score)),
    rate:  Math.round(rate * 1000) / 10,  // % avec 1 décimale
    renewed, resiliated,
  };
}

// ─── DIMENSION 3 — ENGAGEMENT CLIENT / RÉCENCE (15%) ─────────────────────

function calcRecencyScore(data) {
  const { clients, quotes, lastApptByClient, lastArkByClient } = data;
  const now = Date.now();
  const activeClients = clients.filter(c =>
    ['actif', 'active'].includes((c.status || '').toLowerCase())
  );
  if (activeClients.length === 0) return { score: null, note: 'no_active_clients' };

  const WEIGHTS = [
    { maxDaysMs: 90  * 86400000, w: 1.0 },   // < 3 mois
    { maxDaysMs: 180 * 86400000, w: 0.7 },   // 3-6 mois
    { maxDaysMs: 365 * 86400000, w: 0.4 },   // 6-12 mois
    { maxDaysMs: 730 * 86400000, w: 0.2 },   // 12-24 mois
  ];                                          // > 24 mois → 0.0

  let totalWeight = 0;

  for (const client of activeClients) {
    // Dernière interaction = MAX(appt, ark, dernière mise à jour contrat)
    const lastQuoteMs = quotes
      .filter(q => q.client_id === client.id)
      .reduce((max, q) => Math.max(max, new Date(q.updated_at || q.created_at).getTime()), 0);

    const lastApptMs  = lastApptByClient[client.id]
      ? new Date(lastApptByClient[client.id]).getTime() : 0;
    const lastArkMs   = lastArkByClient[client.id]
      ? new Date(lastArkByClient[client.id]).getTime() : 0;

    const lastInteraction = Math.max(lastQuoteMs, lastApptMs, lastArkMs);
    if (lastInteraction === 0) continue; // Aucune donnée

    const ageMs = now - lastInteraction;
    const bucket = WEIGHTS.find(b => ageMs < b.maxDaysMs);
    totalWeight += bucket ? bucket.w : 0.0;
  }

  const rawScore = (totalWeight / activeClients.length) * 100;
  return {
    score: clamp(Math.round(rawScore)),
    active_clients: activeClients.length,
  };
}

// ─── DIMENSION 4 — DIVERSIFICATION (15%) ──────────────────────────────────

function calcDiversificationScore(data) {
  const { quotes } = data;
  const activeQ = quotes.filter(q =>
    ['actif', 'active'].includes((q.status || '').toLowerCase())
  );

  // 4a. Compagnies
  const companies = new Set(activeQ.map(q => (q.compagnie || '').trim().toLowerCase()).filter(Boolean));
  const n = companies.size;
  let scoreA;
  if      (n === 0) scoreA = 0;
  else if (n === 1) scoreA = 0;
  else if (n === 2) scoreA = 30;
  else if (n <= 4)  scoreA = 60;
  else if (n <= 7)  scoreA = 85;
  else              scoreA = 100;

  // 4b. Produits
  const products = new Set(activeQ.map(q => (q.type_contrat || '').trim().toLowerCase()).filter(Boolean));
  const p = products.size;
  let scoreB;
  if      (p === 0) scoreB = 0;
  else if (p === 1) scoreB = 0;
  else if (p === 2) scoreB = 25;
  else if (p === 3) scoreB = 50;
  else if (p <= 5)  scoreB = 75;
  else              scoreB = 100;

  const score = Math.round((scoreA + scoreB) / 2);
  return {
    score: clamp(score),
    companies: n,
    products:  p,
    companies_list: [...companies].slice(0, 10),
    products_list:  [...products].slice(0, 10),
  };
}

// ─── DIMENSION 5 — CONFORMITÉ DDA (15%) ──────────────────────────────────

function calcComplianceScore(data) {
  const { clients, quotes, lastApptByClient, lastArkByClient } = data;
  const now = Date.now();
  const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;

  if (clients.length === 0) return { score: null, note: 'no_clients' };

  // 5a. Complétude fiche (60% de la dimension)
  const completionScores = clients.map(c => {
    let pts = 0;
    if (c.email    && c.email.includes('@'))     pts += 20;
    if (c.phone    && /\d{8,}/.test(c.phone))    pts += 20;
    if (c.address  && c.address.length > 5)      pts += 20;
    if (c.profession)                            pts += 20;
    if (c.situation_familiale)                   pts += 20;
    return pts;
  });
  const avgCompletion = completionScores.reduce((a, b) => a + b, 0) / clients.length;
  const scoreA = Math.round(avgCompletion); // 0-100

  // 5b. Traçabilité interactions (40% de la dimension)
  const interactionScores = clients.map(c => {
    const appts = lastApptByClient[c.id]
      && (now - new Date(lastApptByClient[c.id]).getTime()) < twelveMonthsMs ? 1 : 0;
    const arks = lastArkByClient[c.id]
      && (now - new Date(lastArkByClient[c.id]).getTime()) < twelveMonthsMs ? 1 : 0;
    const hasNotes = c.notes && c.notes.trim().length > 0 ? 1 : 0;

    const nbInteractions = appts + arks + hasNotes;
    if      (nbInteractions === 0) return 0;
    else if (nbInteractions === 1) return 30;
    else if (nbInteractions <= 3)  return 60;
    else if (nbInteractions <= 6)  return 85;
    else                           return 100;
  });
  const avgInteraction = interactionScores.reduce((a, b) => a + b, 0) / clients.length;
  const scoreB = Math.round(avgInteraction);

  const score = Math.round(scoreA * 0.6 + scoreB * 0.4);
  return {
    score: clamp(score),
    avg_completion:   Math.round(avgCompletion),
    avg_interaction:  Math.round(avgInteraction),
  };
}

// ─── DIMENSION 6 — CROISSANCE (10%) ───────────────────────────────────────

function calcGrowthScore(data) {
  const { growth } = data;
  const last30 = parseInt(growth.last_30 || 0);
  const prev30 = parseInt(growth.prev_30 || 0);

  if (prev30 === 0) {
    const score = clamp(50 + last30 * 5, 0, 100);
    return { score: Math.round(score), last_30, prev_30, growth_rate: null };
  }

  const rate = (last30 - prev30) / prev30;
  let score;
  if      (rate < -0.20) score = lerp(rate, -1.0, -0.20, 0,  20);
  else if (rate < 0)     score = lerp(rate, -0.20, 0,    20, 50);
  else if (rate < 0.10)  score = lerp(rate,  0,    0.10, 50, 70);
  else if (rate < 0.30)  score = lerp(rate,  0.10, 0.30, 70, 90);
  else                   score = lerp(rate,  0.30, 1.0,  90, 100);

  return {
    score:       clamp(Math.round(score)),
    last_30,
    prev_30,
    growth_rate: Math.round(rate * 1000) / 10,
  };
}

// ─── CALCUL FINAL DU HEALTH SCORE ─────────────────────────────────────────

async function calculateHealthScore(userId) {
  const data = await collectPortfolioData(userId);
  const { clients, quotes } = data;

  // Cas particuliers
  const portfolioAge = clients.length > 0
    ? Date.now() - Math.min(...clients.map(c => new Date(c.created_at).getTime()))
    : 0;
  const isYoung  = portfolioAge < 90 * 24 * 60 * 60 * 1000;
  const isSmall  = clients.length < 10;

  // Calculer chaque dimension
  const d1 = calcMultiEquipScore(data);
  const d2 = calcRetentionScore(data);
  const d3 = calcRecencyScore(data);
  const d4 = calcDiversificationScore(data);
  const d5 = calcComplianceScore(data);
  const d6 = calcGrowthScore(data);

  // Dimensions nulles → redistribution proportionnelle du poids
  const FULL_WEIGHTS = { d1: 0.25, d2: 0.20, d3: 0.15, d4: 0.15, d5: 0.15, d6: 0.10 };
  const dims = [
    { key: 'd1', res: d1, w: FULL_WEIGHTS.d1 },
    { key: 'd2', res: d2, w: FULL_WEIGHTS.d2 },
    { key: 'd3', res: d3, w: FULL_WEIGHTS.d3 },
    { key: 'd4', res: d4, w: FULL_WEIGHTS.d4 },
    { key: 'd5', res: d5, w: FULL_WEIGHTS.d5 },
    { key: 'd6', res: d6, w: FULL_WEIGHTS.d6 },
  ];

  const available = dims.filter(d => d.res.score !== null);
  const totalAvailW = available.reduce((sum, d) => sum + d.w, 0);
  const nullCount   = dims.length - available.length;

  let finalScore;
  if (available.length === 0) {
    finalScore = 0;
  } else {
    finalScore = available.reduce((sum, d) => {
      const normalizedW = d.w / totalAvailW;
      return sum + d.res.score * normalizedW;
    }, 0);
  }
  finalScore = clamp(Math.round(finalScore));

  // Confidence level
  const dataCompleteness = available.length / dims.length;
  const hasSufficientClients = clients.length >= 10;
  const hasSufficientQuotes  = quotes.length >= 5;
  let confidence;
  if      (dataCompleteness >= 0.9 && hasSufficientClients && hasSufficientQuotes) confidence = 90 + Math.round(dataCompleteness * 10);
  else if (dataCompleteness >= 0.6 && hasSufficientClients)                        confidence = 60 + Math.round(dataCompleteness * 30);
  else if (dataCompleteness >= 0.3)                                                confidence = 30 + Math.round(dataCompleteness * 30);
  else                                                                              confidence = Math.round(dataCompleteness * 30);

  return {
    health_score: finalScore,
    total_clients: clients.length,
    total_contracts: quotes.length,
    total_premium: quotes.reduce((sum, q) => {
      const p = parseFloat(q.quote_data?.prime_annuelle || 0);
      return sum + (isNaN(p) ? 0 : p);
    }, 0),
    breakdown: {
      multi_equipment:  { score: d1.score, weight: 25, label: 'Multi-équipement',        detail: d1 },
      retention:        { score: d2.score, weight: 20, label: 'Taux de rétention',        detail: d2 },
      recency:          { score: d3.score, weight: 15, label: 'Engagement client (DDA)',   detail: d3 },
      diversification:  { score: d4.score, weight: 15, label: 'Diversification',           detail: d4 },
      compliance:       { score: d5.score, weight: 15, label: 'Conformité DDA',            detail: d5 },
      growth:           { score: d6.score, weight: 10, label: 'Croissance commerciale',    detail: d6 },
    },
    grade:            scoreToGrade(finalScore),
    confidence_level: clamp(confidence),
    sector_benchmark: {
      portfolio_value_multiplier: getMultiplier(finalScore),
      comparable_to:              getComparableProfile(finalScore),
    },
    flags: {
      is_young_portfolio:   isYoung,
      is_small_portfolio:   isSmall,
      missing_dimensions:   nullCount,
    },
    score_range: scoreToRange(finalScore), // pour le bridage Start
    data, // brut, utilisé par analyzePortfolio
  };
}

// ─── ANALYSE COMPLÈTE (CLAUDE OPUS + SAUVEGARDE) ──────────────────────────

async function analyzePortfolio(userId) {
  console.log(`[portfolioAnalyzer] Début analyse user ${userId}`);

  // 1. Vérifier dernière analyse < 6h (protection double-exécution cron)
  const lastInsight = await pool.query(
    `SELECT generated_at FROM portfolio_insights
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY generated_at DESC LIMIT 1`,
    [userId]
  );
  if (lastInsight.rows.length > 0) {
    const ageMs = Date.now() - new Date(lastInsight.rows[0].generated_at).getTime();
    if (ageMs < 6 * 60 * 60 * 1000) {
      console.log(`[portfolioAnalyzer] User ${userId} — analyse récente (${Math.round(ageMs/3600000)}h), skip`);
      return null;
    }
  }

  // 2. Créer l'entrée insight en statut 'processing'
  const insightRow = await pool.query(
    `INSERT INTO portfolio_insights (user_id, status, generated_at)
     VALUES ($1, 'processing', NOW())
     RETURNING id`,
    [userId]
  );
  const insightId = insightRow.rows[0].id;

  try {
    // 3. Calculer le health score
    const scoreResult = await calculateHealthScore(userId);
    const { data, score_range, ...scoreData } = scoreResult;
    const { clients, quotes } = data;

    // 4. Préparer le contexte pour Claude Opus
    const topClients = clients.slice(0, 30).map(c => ({
      id:       c.id,
      statut:   c.status,
      email_ok: !!c.email,
      phone_ok: !!c.phone,
      profession: c.profession || null,
    }));

    const quoteSummary = {
      total:      quotes.length,
      actifs:     quotes.filter(q => ['actif','active'].includes((q.status||'').toLowerCase())).length,
      companies:  [...new Set(quotes.map(q => q.compagnie).filter(Boolean))],
      products:   [...new Set(quotes.map(q => q.type_contrat).filter(Boolean))],
    };

    // 5. Appel Claude Opus 4.6 — JSON STRICT
    const prompt = `Tu es ARK, expert en courtage d'assurance français.
Analyse ce portefeuille et génère 10 à 15 actions prioritaires.

CONTEXTE PORTEFEUILLE :
- Score de santé : ${scoreData.health_score}/100 (grade ${scoreData.grade})
- Clients : ${clients.length} (dont ${topClients.filter(c=>['actif','active'].includes((c.statut||'').toLowerCase())).length} actifs)
- Contrats : ${quoteSummary.actifs} actifs / ${quoteSummary.total} total
- Multi-équipement : ratio ${scoreData.breakdown.multi_equipment.detail.ratio || 'N/A'}
- Diversification : ${quoteSummary.companies.length} compagnie(s), ${quoteSummary.products.length} produit(s)
- Compagnies : ${quoteSummary.companies.slice(0,8).join(', ') || 'Non renseigné'}
- Produits : ${quoteSummary.products.slice(0,8).join(', ') || 'Non renseigné'}
- Clients sans email : ${topClients.filter(c=>!c.email_ok).length}
- Clients sans téléphone : ${topClients.filter(c=>!c.phone_ok).length}

ÉCHANTILLON CLIENTS (max 30) :
${JSON.stringify(topClients, null, 0)}

DIMENSIONS DU SCORE :
${Object.entries(scoreData.breakdown).map(([k,v]) => `- ${v.label} : ${v.score ?? 'N/A'}/100 (poids ${v.weight}%)`).join('\n')}

Génère les actions les plus impactantes. Priorise :
1. Les clients à risque de churn (contrats anciens, aucune interaction récente)
2. Les opportunités de cross-sell sur les mono-détenteurs
3. Les renouvellements proches
4. Les fiches incomplètes prioritaires
5. Les axes de diversification produits/compagnies

Réponds UNIQUEMENT en JSON valide, aucun texte avant ou après, aucun bloc markdown :
{
  "actions": [
    {
      "client_id": <number|null>,
      "type": "churn_risk|cross_sell|renewal|birthday|sinistre_followup|document_missing|sleeping_client|diversification|compliance",
      "priority": "critical|high|medium|low",
      "title": "<max 80 chars>",
      "description": "<max 200 chars>",
      "suggested_action": "<max 200 chars>",
      "reasoning": "<max 400 chars>",
      "estimated_impact": <number euros ou null>
    }
  ]
}`;

    let actionsData = { actions: [] };

    if (process.env.ANTHROPIC_API_KEY) {
      const response = await anthropic.messages.create({
        model:      'claude-opus-4-6',
        max_tokens: 4000,
        messages:   [{ role: 'user', content: prompt }],
      });

      const rawText = response.content?.[0]?.text || '{"actions":[]}';
      // Nettoyer les éventuels blocs markdown (```json ... ```)
      const cleaned = rawText
        .replace(/^```[a-z]*\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();

      try {
        actionsData = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error(`[portfolioAnalyzer] Erreur parsing JSON Opus user ${userId}:`, parseErr.message);
        console.error('[portfolioAnalyzer] Réponse brute:', rawText.substring(0, 300));
        // Continuer avec tableau vide plutôt que crasher
      }
    } else {
      console.warn('[portfolioAnalyzer] ANTHROPIC_API_KEY absente — actions IA non générées');
    }

    // 6. Mettre à jour portfolio_insights avec le score
    await pool.query(
      `UPDATE portfolio_insights
       SET total_clients    = $1,
           total_contracts  = $2,
           total_premium    = $3,
           health_score     = $4,
           health_breakdown = $5,
           status           = 'completed',
           raw_analysis     = $6
       WHERE id = $7`,
      [
        scoreData.total_clients,
        scoreData.total_contracts,
        scoreData.total_premium,
        scoreData.health_score,
        JSON.stringify(scoreData.breakdown),
        JSON.stringify({ grade: scoreData.grade, confidence: scoreData.confidence_level, benchmark: scoreData.sector_benchmark, flags: scoreData.flags }),
        insightId,
      ]
    );

    // 7. Insérer les actions dans portfolio_actions
    const actions = Array.isArray(actionsData.actions) ? actionsData.actions : [];
    for (const action of actions) {
      try {
        await pool.query(
          `INSERT INTO portfolio_actions
             (insight_id, user_id, client_id, action_type, priority,
              title, description, suggested_action, ai_reasoning, estimated_impact)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            insightId,
            userId,
            action.client_id || null,
            action.type || 'general',
            action.priority || 'medium',
            (action.title || 'Action').substring(0, 255),
            action.description || null,
            action.suggested_action || null,
            action.reasoning || null,
            action.estimated_impact || null,
          ]
        );
      } catch (insertErr) {
        console.error(`[portfolioAnalyzer] Erreur insertion action:`, insertErr.message);
      }
    }

    console.log(`[portfolioAnalyzer] User ${userId} — score ${scoreData.health_score} — ${actions.length} actions générées`);
    return { insightId, score: scoreData.health_score, actionsCount: actions.length };

  } catch (err) {
    // Marquer l'insight en erreur
    await pool.query(
      `UPDATE portfolio_insights SET status = 'error' WHERE id = $1`,
      [insightId]
    );
    console.error(`[portfolioAnalyzer] Erreur analyse user ${userId}:`, err.message);
    throw err;
  }
}

// ─── SCORE INDIVIDUEL PAR CLIENT ──────────────────────────────────────────
//
// 5 dimensions (rétention non applicable pour un client unique) :
//   Multi-équipement  30%  — nb contrats actifs (cap 5)
//   Conformité DDA    25%  — complétude fiche + traçabilité
//   Récence           20%  — dernière interaction
//   Diversification   15%  — compagnies + produits
//   Croissance        10%  — nouveaux contrats sur 12 mois
//
// ─────────────────────────────────────────────────────────────────────────────

/** Collecte les données d'un seul client. */
async function collectClientData(clientId, courtierId) {
  const [clientRes, quotesRes, apptRes, arkRes] = await Promise.all([
    pool.query(
      `SELECT id, email, phone, address, profession, situation_familiale,
              notes, status, created_at
       FROM clients
       WHERE id = $1 AND courtier_id = $2`,
      [clientId, courtierId]
    ),
    pool.query(
      `SELECT id, status,
              quote_data->>'compagnie'    AS compagnie,
              quote_data->>'type_contrat' AS type_contrat,
              quote_data->>'prime_annuelle' AS prime_annuelle,
              created_at, updated_at
       FROM quotes
       WHERE client_id = $1`,
      [clientId]
    ),
    pool.query(
      `SELECT MAX(start_time) AS last_appt
       FROM appointments
       WHERE client_id = $1 AND user_id = $2`,
      [clientId, courtierId]
    ),
    pool.query(
      `SELECT MAX(created_at) AS last_ark
       FROM ark_conversations
       WHERE client_id = $1`,
      [clientId]
    ),
  ]);

  if (clientRes.rows.length === 0) return null;

  return {
    client:       clientRes.rows[0],
    quotes:       quotesRes.rows,
    lastAppt:     apptRes.rows[0]?.last_appt || null,
    lastArk:      arkRes.rows[0]?.last_ark || null,
  };
}

/** Dim 1 — Multi-équipement (30%) : nb contrats actifs, capé à 5. */
function calcClientMultiEquip(data) {
  const active = data.quotes.filter(q =>
    ['actif', 'active'].includes((q.status || '').toLowerCase())
  ).length;

  const STEPS = [[0, 0], [1, 20], [2, 50], [3, 75], [4, 90]];
  let score = 100;
  for (const [n, s] of STEPS) {
    if (active <= n) { score = s; break; }
  }

  return {
    score,
    active_contracts: active,
    reason: active === 0 ? 'Aucun contrat actif'
      : active === 1 ? '1 seul contrat — fort risque churn'
      : active === 2 ? '2 contrats — multi-équipement partiel'
      : active <= 4 ? `${active} contrats — bon multi-équipement`
      : `${active} contrats — client premium`,
  };
}

/** Dim 2 — Conformité DDA (25%) : complétude fiche + traçabilité. */
function calcClientCompliance(data) {
  const { client, quotes, lastAppt, lastArk } = data;
  const now = Date.now();

  // 5a. Complétude fiche (60%)
  let pts = 0;
  if (client.email    && client.email.includes('@'))       pts += 20;
  if (client.phone    && /\d{8,}/.test(client.phone))      pts += 20;
  if (client.address  && client.address.length > 5)        pts += 20;
  if (client.profession)                                   pts += 20;
  if (client.situation_familiale)                          pts += 20;
  const scoreA = pts; // 0-100

  // 5b. Traçabilité 12 mois (40%)
  const twelveMs = 365 * 24 * 60 * 60 * 1000;
  const apptOk = lastAppt && (now - new Date(lastAppt).getTime()) < twelveMs ? 1 : 0;
  const arkOk  = lastArk  && (now - new Date(lastArk).getTime())  < twelveMs ? 1 : 0;
  const noteOk = client.notes && client.notes.trim().length > 0 ? 1 : 0;
  const nb = apptOk + arkOk + noteOk;

  const scoreB = nb === 0 ? 0 : nb === 1 ? 30 : nb <= 3 ? 60 : 85;

  const score = Math.round(scoreA * 0.6 + scoreB * 0.4);
  const missingFields = [];
  if (!(client.email    && client.email.includes('@')))    missingFields.push('email');
  if (!(client.phone    && /\d{8,}/.test(client.phone)))   missingFields.push('téléphone');
  if (!(client.address  && client.address.length > 5))     missingFields.push('adresse');
  if (!client.profession)                                  missingFields.push('profession');
  if (!client.situation_familiale)                         missingFields.push('situation familiale');

  return {
    score: clamp(score),
    completion_score: scoreA,
    traceability_score: scoreB,
    missing_fields: missingFields,
    reason: missingFields.length === 0
      ? 'Fiche complète — conformité DDA satisfaisante'
      : `Champs manquants : ${missingFields.join(', ')}`,
  };
}

/** Dim 3 — Récence (20%) : dernière interaction toutes sources. */
function calcClientRecency(data) {
  const { client, quotes, lastAppt, lastArk } = data;
  const now = Date.now();

  const lastQuoteMs = quotes.reduce(
    (max, q) => Math.max(max, new Date(q.updated_at || q.created_at).getTime()), 0
  );
  const lastApptMs = lastAppt ? new Date(lastAppt).getTime() : 0;
  const lastArkMs  = lastArk  ? new Date(lastArk).getTime()  : 0;
  const lastMs     = Math.max(lastQuoteMs, lastApptMs, lastArkMs);

  if (lastMs === 0) {
    return { score: 0, days_since: null, reason: 'Aucune interaction enregistrée' };
  }

  const days = Math.floor((now - lastMs) / 86400000);

  let score;
  let reason;
  if (days < 90) {
    score  = lerp(days, 0, 90, 100, 70);
    reason = `Vu il y a ${days} jours — contact récent`;
  } else if (days < 180) {
    score  = lerp(days, 90, 180, 70, 40);
    reason = `Vu il y a ${days} jours — à relancer`;
  } else if (days < 365) {
    score  = lerp(days, 180, 365, 40, 20);
    reason = `Vu il y a ${days} jours — risque de départ`;
  } else if (days < 730) {
    score  = lerp(days, 365, 730, 20, 5);
    reason = `Vu il y a ${Math.floor(days/30)} mois — client dormant`;
  } else {
    score  = 0;
    reason = `Vu il y a ${Math.floor(days/365)} an(s) — client perdu ?`;
  }

  return { score: clamp(Math.round(score)), days_since: days, reason };
}

/** Dim 4 — Diversification (15%) : compagnies + produits chez ce client. */
function calcClientDiversification(data) {
  const active = data.quotes.filter(q =>
    ['actif', 'active'].includes((q.status || '').toLowerCase())
  );

  const companies = new Set(active.map(q => (q.compagnie || '').toLowerCase()).filter(Boolean));
  const products  = new Set(active.map(q => (q.type_contrat || '').toLowerCase()).filter(Boolean));

  const cScore = companies.size <= 1 ? companies.size * 40 : Math.min(100, 40 + companies.size * 20);
  const pScore = products.size  <= 1 ? products.size  * 30 : Math.min(100, 30 + products.size  * 25);
  const score  = Math.round((cScore + pScore) / 2);

  return {
    score: clamp(score),
    companies: companies.size,
    products:  products.size,
    reason: companies.size <= 1 && products.size <= 1
      ? 'Mono-compagnie + mono-produit — opportunités cross-sell'
      : `${companies.size} compagnie(s) · ${products.size} produit(s)`,
  };
}

/** Dim 5 — Croissance (10%) : nouveaux contrats sur 12 mois. */
function calcClientGrowth(data) {
  const twelveMs = 365 * 24 * 60 * 60 * 1000;
  const now      = Date.now();

  const newContracts = data.quotes.filter(q =>
    (now - new Date(q.created_at).getTime()) < twelveMs
  ).length;

  const STEPS = [[0, 20], [1, 50], [2, 75]];
  let score = 100;
  for (const [n, s] of STEPS) {
    if (newContracts <= n) { score = s; break; }
  }

  return {
    score,
    new_contracts_12m: newContracts,
    reason: newContracts === 0 ? 'Aucun nouveau contrat dans les 12 derniers mois'
      : `${newContracts} nouveau(x) contrat(s) en 12 mois`,
  };
}

/** Estimation de la valeur client (LTV sur 5 ans, €). */
function estimateClientLTV(data, score) {
  const activeQuotes = data.quotes.filter(q =>
    ['actif', 'active'].includes((q.status || '').toLowerCase())
  );

  // Somme des primes annuelles renseignées, sinon 600€/contrat par défaut
  const annualPremium = activeQuotes.reduce((sum, q) => {
    const p = parseFloat(q.prime_annuelle || 0);
    return sum + (isNaN(p) || p === 0 ? 600 : p);
  }, 0);

  // Probabilité de rétention sur 5 ans selon le score
  const retentionFactor = score >= 80 ? 4.2 : score >= 60 ? 3.5 : score >= 40 ? 2.5 : 1.5;
  const ltv = Math.round(annualPremium * retentionFactor);

  const label = score >= 80 ? 'Fort LTV'
    : score >= 60 ? 'LTV moyen'
    : score >= 40 ? 'Faible LTV'
    : 'Très faible LTV';

  return {
    min:   Math.round(ltv * 0.85),
    max:   Math.round(ltv * 1.15),
    label,
    annual_premium: Math.round(annualPremium),
  };
}

// ─── calculateClientScore ─────────────────────────────────────────────────

/**
 * Calcule le score de santé d'un client individuel (0-100).
 * @param {number} clientId
 * @param {number} courtierId  — users.id du courtier (pour vérifier l'ownership)
 * @returns {object|null}  null si le client n'appartient pas au courtier
 */
async function calculateClientScore(clientId, courtierId) {
  const data = await collectClientData(clientId, courtierId);
  if (!data) return null;

  const WEIGHTS = { d1: 0.30, d2: 0.25, d3: 0.20, d4: 0.15, d5: 0.10 };

  const d1 = calcClientMultiEquip(data);
  const d2 = calcClientCompliance(data);
  const d3 = calcClientRecency(data);
  const d4 = calcClientDiversification(data);
  const d5 = calcClientGrowth(data);

  const finalScore = clamp(Math.round(
    d1.score * WEIGHTS.d1 +
    d2.score * WEIGHTS.d2 +
    d3.score * WEIGHTS.d3 +
    d4.score * WEIGHTS.d4 +
    d5.score * WEIGHTS.d5
  ));

  return {
    client_id:    clientId,
    score:        finalScore,
    grade:        scoreToGrade(finalScore),
    dimensions:   { d1, d2, d3, d4, d5 },
    ltv:          estimateClientLTV(data, finalScore),
    total_quotes: data.quotes.length,
  };
}

// ─── getClientScoreBreakdown ──────────────────────────────────────────────

/**
 * Retourne le breakdown complet avec points perdus, raisons et score potentiel.
 * @param {number} clientId
 * @param {number} courtierId
 * @returns {object|null}
 */
async function getClientScoreBreakdown(clientId, courtierId) {
  const raw = await calculateClientScore(clientId, courtierId);
  if (!raw) return null;

  const DIMS = [
    { key: 'multi_equipment', label: 'Multi-équipement',   weight: 30, d: raw.dimensions.d1 },
    { key: 'compliance',      label: 'Conformité DDA',      weight: 25, d: raw.dimensions.d2 },
    { key: 'recency',         label: 'Engagement / Récence',weight: 20, d: raw.dimensions.d3 },
    { key: 'diversification', label: 'Diversification',     weight: 15, d: raw.dimensions.d4 },
    { key: 'growth',          label: 'Croissance',          weight: 10, d: raw.dimensions.d5 },
  ];

  const breakdown = DIMS.map(({ key, label, weight, d }) => {
    const maxContrib  = weight;                             // points max si score = 100
    const earned      = Math.round(d.score * weight / 100);
    const pointsLost  = maxContrib - earned;
    return {
      dim:         key,
      label,
      score:       d.score,
      weight,
      earned_pts:  earned,
      points_lost: pointsLost,
      reason:      d.reason,
      impact:      pointsLost > 0 ? `-${pointsLost} pts` : '✓',
    };
  });

  // Score potentiel = score actuel + points récupérables sur les dim < 100
  // (suppose que toutes les actions ARK sont faites)
  const recoverableByDim = {
    multi_equipment: 35,  // réaliste : atteindre 3-4 contrats
    compliance:      15,  // compléter les champs manquants
    recency:         12,  // reprendre contact sous 3 mois
    diversification: 10,  // 1 cross-sell = +1 produit/compagnie
    growth:           8,  // 1 nouveau contrat dans l'année
  };

  let potentialGain = 0;
  for (const { key, weight, d } of DIMS.map(x => ({ ...x, ...x }))) {
    if (raw.dimensions[`d${DIMS.findIndex(x => x.key === key) + 1}`]?.score < 100) {
      const maxRecover = recoverableByDim[key] || 0;
      const actualGap  = Math.round((100 - (raw.dimensions[`d${DIMS.findIndex(x => x.key === key) + 1}`]?.score || 0)) * weight / 100);
      potentialGain += Math.min(maxRecover, actualGap);
    }
  }
  const potentialScore = clamp(raw.score + potentialGain);

  return {
    client_id:              clientId,
    score:                  raw.score,
    grade:                  raw.grade,
    client_value_estimate:  raw.ltv,
    breakdown,
    can_reach_score_100:    potentialScore >= 95,
    potential_score:        potentialScore,
    total_quotes:           raw.total_quotes,
  };
}

module.exports = {
  calculateHealthScore,
  analyzePortfolio,
  scoreToRange,
  calculateClientScore,
  getClientScoreBreakdown,
};
