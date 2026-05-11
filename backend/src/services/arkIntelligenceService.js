/**
 * ARK Predictive Intelligence — Churn / Cross-sell / Renewal optimizer
 * Service déterministe basé sur les données client (heuristiques + scoring).
 * Compatible CRM Aurora (compagnies fictives : Aurora, Novalia, Helios, Serenis, Atlas, Oria, Nivalis, Solenys).
 */

const pool = require('../db')

// ──────────────────────────────────────────────────────────────────────────
// CHURN PREDICTOR
// ──────────────────────────────────────────────────────────────────────────

function daysSince(date) {
  if (!date) return 9999
  const d = new Date(date)
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
}

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)) }

async function computeChurnForUser(userId) {
  // Récupère tous les clients du courtier avec leurs métriques associées
  const { rows: clients } = await pool.query(`
    SELECT
      c.id, c.first_name, c.last_name, c.email, c.phone, c.city, c.status,
      c.loyalty_score, c.risk_score, c.last_contact, c.lifetime_value,
      c.silent_alert, c.nb_sinistres_3ans, c.created_at,
      (SELECT COUNT(*) FROM quotes q WHERE q.client_id = c.id) AS quotes_count,
      (SELECT COUNT(*) FROM appointments a WHERE a.client_id = c.id) AS rdv_count,
      (SELECT MAX(updated_at) FROM quotes q WHERE q.client_id = c.id) AS last_quote_at
    FROM clients c
    WHERE c.courtier_id = $1
    ORDER BY c.id ASC
  `, [userId])

  const results = clients.map((c) => {
    const factors = []
    let score = 0

    const silence = daysSince(c.last_contact)
    if (silence > 180) { score += 35; factors.push({ key: 'silence_extreme', label: `Silence ${silence}j sans contact`, weight: 35 }) }
    else if (silence > 90) { score += 22; factors.push({ key: 'silence_long', label: `Silence prolongé (${silence}j)`, weight: 22 }) }
    else if (silence > 45) { score += 10; factors.push({ key: 'silence_moyen', label: `Pas de contact depuis ${silence}j`, weight: 10 }) }

    const loyalty = Number(c.loyalty_score || 50)
    if (loyalty < 30) { score += 25; factors.push({ key: 'loyalty_low', label: 'Score fidélité faible (<30)', weight: 25 }) }
    else if (loyalty < 50) { score += 12; factors.push({ key: 'loyalty_mid', label: 'Fidélité en baisse', weight: 12 }) }

    const sinistres = Number(c.nb_sinistres_3ans || 0)
    if (sinistres >= 2) { score += 18; factors.push({ key: 'claims', label: `${sinistres} sinistres en 3 ans`, weight: 18 }) }

    const quotes = Number(c.quotes_count || 0)
    if (quotes <= 1) { score += 12; factors.push({ key: 'mono_equipement', label: 'Mono-équipement (1 produit ou moins)', weight: 12 }) }

    if (c.silent_alert) { score += 15; factors.push({ key: 'silent_alert', label: 'Alerte silence ARK déclenchée', weight: 15 }) }

    score = clamp(score)
    const risk_level = score >= 75 ? 'critical' : score >= 55 ? 'high' : score >= 30 ? 'medium' : 'low'

    return {
      client_id: c.id,
      client_name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Client',
      city: c.city,
      score,
      risk_level,
      factors,
      lifetime_value: Number(c.lifetime_value || 0),
      last_contact: c.last_contact,
      silence_days: silence === 9999 ? null : silence,
      quotes_count: quotes,
      retention_plan: buildRetentionPlan(c, factors, score),
    }
  })

  // Top 20 par score décroissant (= plus à risque)
  results.sort((a, b) => b.score - a.score)
  const topRisks = results.slice(0, 20)

  // Persist top risks
  for (const r of topRisks) {
    await pool.query(`
      INSERT INTO ark_churn_scores (user_id, client_id, score, risk_level, factors, retention_plan, computed_at, expires_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW() + INTERVAL '7 days')
      ON CONFLICT (user_id, client_id) DO UPDATE
      SET score = EXCLUDED.score,
          risk_level = EXCLUDED.risk_level,
          factors = EXCLUDED.factors,
          retention_plan = EXCLUDED.retention_plan,
          computed_at = NOW(),
          expires_at = NOW() + INTERVAL '7 days'
    `, [userId, r.client_id, r.score, r.risk_level, JSON.stringify(r.factors), JSON.stringify(r.retention_plan)])
  }

  return {
    total_clients_scanned: results.length,
    at_risk_count: results.filter(r => r.score >= 55).length,
    average_score: Math.round(results.reduce((s, r) => s + r.score, 0) / Math.max(results.length, 1)),
    top_risks: topRisks,
    computed_at: new Date().toISOString(),
  }
}

function buildRetentionPlan(client, factors, score) {
  const name = `${client.first_name || ''} ${client.last_name || ''}`.trim()
  const focus = factors.slice(0, 2).map(f => f.label).join(' + ') || 'consolidation relation'
  const steps = []

  // Étape 1 : appel scripté
  const call = score >= 75
    ? `Appel prioritaire dans les 24h. Pitch : "Bonjour ${name}, je suis votre courtier référent. J'ai préparé un point complet sur votre situation, vous avez 10 minutes ?" — Reconnaitre le silence, désamorcer, écouter.`
    : score >= 55
    ? `Appel sous 48h. Pitch : "Bonjour ${name}, j'ai analysé votre dossier et identifié une opportunité d'économie. Avez-vous 5 minutes ?"`
    : `Email personnalisé + appel sous 7j si non répondu.`
  steps.push({ ordre: 1, type: 'appel', titre: 'Reconnexion humaine', script: call })

  // Étape 2 : offre cross-sell
  const offer = score >= 75
    ? 'Geste commercial fort : audit gratuit + remise 10% sur cross-sell (MRH ou Prévoyance) + assistance dédiée 6 mois.'
    : score >= 55
    ? 'Audit complet + proposition Bundle (Auto + MRH = -8%) ou Santé Premium.'
    : 'Proposition multi-équipement : option Bundle ou contrat complémentaire.'
  steps.push({ ordre: 2, type: 'offre', titre: 'Cross-sell stratégique', script: offer })

  // Étape 3 : RDV
  const rdv = score >= 75
    ? 'RDV physique ou visio sous 14 jours, conseiller principal. Objectif : sceller la relation, signer un nouveau mandat, renforcer engagement.'
    : 'RDV visio 30 min sous 21 jours pour bilan annuel.'
  steps.push({ ordre: 3, type: 'rdv', titre: 'Rendez-vous engagement', script: rdv })

  return {
    focus,
    urgency: score >= 75 ? 'immediat' : score >= 55 ? 'haute' : 'normale',
    estimated_recovery_pct: score >= 75 ? 55 : score >= 55 ? 72 : 88,
    steps,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CROSS-SELL ENGINE
// ──────────────────────────────────────────────────────────────────────────

const PRODUITS_CATALOG = ['Auto', 'MRH', 'Santé', 'Prévoyance', 'RC Pro', 'Décennale', 'Cyber', 'PJ']
const COMPAGNIES = ['Aurora', 'Novalia', 'Helios', 'Serenis', 'Atlas', 'Oria', 'Nivalis', 'Solenys']

function hashString(s) {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

async function computeCrossSellMatrix(userId) {
  const { rows: clients } = await pool.query(`
    SELECT c.id, c.first_name, c.last_name, c.type, c.city, c.loyalty_score, c.lifetime_value,
           c.profession, c.situation_familiale,
           ARRAY(
             SELECT DISTINCT (q.quote_data->>'produit')
             FROM quotes q
             WHERE q.client_id = c.id AND q.quote_data ? 'produit'
           ) AS souscrits
    FROM clients c
    WHERE c.courtier_id = $1
    ORDER BY c.lifetime_value DESC NULLS LAST
    LIMIT 50
  `, [userId])

  const matrix = clients.map(c => {
    const souscrits = (c.souscrits || []).map(String)
    const opportunities = PRODUITS_CATALOG.map(produit => {
      const already = souscrits.includes(produit)
      let score = 0
      let estimated = 0
      let rationale = ''

      if (already) {
        return { product: produit, score: 0, estimated_eur: 0, status: 'owned', rationale: 'Déjà souscrit' }
      }

      // Heuristiques profil
      const isPro = (c.type || '').toLowerCase().includes('pro') || (c.type || '').toLowerCase().includes('entreprise')
      const isFamille = ['marie', 'pacs', 'concubinage'].includes((c.situation_familiale || '').toLowerCase())
      const baseLTV = Number(c.lifetime_value || 0)

      switch (produit) {
        case 'Auto':
          score = 50 + (souscrits.includes('MRH') ? 25 : 0) + (isFamille ? 15 : 0)
          estimated = 600 + (hashString(c.id + 'auto') % 400)
          rationale = isFamille ? 'Profil famille — bundle Auto + MRH avantageux' : 'Couverture mobilité essentielle'
          break
        case 'MRH':
          score = 55 + (souscrits.includes('Auto') ? 20 : 0) + (isFamille ? 18 : 0)
          estimated = 280 + (hashString(c.id + 'mrh') % 220)
          rationale = 'MRH = base patrimoine, taux conversion élevé'
          break
        case 'Santé':
          score = 60 + (souscrits.length === 0 ? 15 : 0) + (isFamille ? 12 : 0)
          estimated = 850 + (hashString(c.id + 'sante') % 600)
          rationale = 'Santé = produit ARK star, marge récurrente'
          break
        case 'Prévoyance':
          score = isPro ? 75 : 35
          estimated = isPro ? 950 : 480
          rationale = isPro ? 'TNS : Prévoyance loi Madelin obligatoire' : 'Sécurité patrimoine famille'
          break
        case 'RC Pro':
          score = isPro ? 88 : 5
          estimated = isPro ? 1200 : 0
          rationale = isPro ? 'RC Pro légalement obligatoire pour activité' : 'N/A particulier'
          break
        case 'Décennale':
          score = isPro && (c.profession || '').match(/(bâtiment|btp|maçon|électr|plomb)/i) ? 92 : 8
          estimated = score > 50 ? 1800 : 0
          rationale = score > 50 ? 'BTP : Décennale obligatoire' : 'Hors cible'
          break
        case 'Cyber':
          score = isPro ? 62 : 18
          estimated = isPro ? 850 : 120
          rationale = isPro ? 'Cyber-risques en explosion sur PME' : 'Particulier connecté'
          break
        case 'PJ':
          score = 42 + (baseLTV > 3000 ? 10 : 0)
          estimated = 120 + (hashString(c.id + 'pj') % 80)
          rationale = 'Protection juridique = bundle facile, ticket modéré'
          break
      }

      score = clamp(score + (hashString(c.id + produit) % 7) - 3)
      const opp_status = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold'
      return { product: produit, score, estimated_eur: estimated, status: opp_status, rationale }
    })

    // Persist top 3 opportunities
    return {
      client_id: c.id,
      client_name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      city: c.city,
      type: c.type,
      souscrits,
      opportunities,
      total_opportunity_eur: opportunities.filter(o => o.status !== 'owned').reduce((s, o) => s + o.estimated_eur, 0),
    }
  })

  // Persist matrix
  for (const row of matrix) {
    for (const opp of row.opportunities) {
      if (opp.status === 'owned' || opp.score < 30) continue
      await pool.query(`
        INSERT INTO ark_cross_sell_recommendations (user_id, client_id, product, opportunity_score, estimated_eur_year, rationale, computed_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id, client_id, product) DO UPDATE
        SET opportunity_score = EXCLUDED.opportunity_score,
            estimated_eur_year = EXCLUDED.estimated_eur_year,
            rationale = EXCLUDED.rationale,
            computed_at = NOW()
      `, [userId, row.client_id, opp.product, opp.score, opp.estimated_eur, opp.rationale])
    }
  }

  return {
    products: PRODUITS_CATALOG,
    clients: matrix,
    total_potential_eur: matrix.reduce((s, r) => s + r.total_opportunity_eur, 0),
    computed_at: new Date().toISOString(),
  }
}

// ──────────────────────────────────────────────────────────────────────────
// RENEWAL OPTIMIZER
// ──────────────────────────────────────────────────────────────────────────

async function computeRenewalOptimizations(userId) {
  // Heuristique : on génère des renouvellements simulés basés sur les quotes existantes
  // (le schéma "contracts" n'existe pas — on s'appuie sur quotes.quote_data)
  const { rows: quotes } = await pool.query(`
    SELECT q.id, q.client_id, q.quote_data, q.status, q.created_at, q.updated_at,
           c.first_name, c.last_name, c.city, c.loyalty_score, c.lifetime_value
    FROM quotes q
    JOIN clients c ON c.id = q.client_id
    WHERE c.courtier_id = $1 AND q.status = 'actif'
    ORDER BY q.created_at DESC
    LIMIT 80
  `, [userId])

  const renewals = quotes.map(q => {
    const data = q.quote_data || {}
    const produit = data.produit || 'Auto'
    const currentProvider = data.compagnie || COMPAGNIES[hashString(`${q.id}cp`) % COMPAGNIES.length]
    const currentPremium = Number(data.prime_annuelle || 600 + (hashString(`${q.id}pa`) % 800))

    // Date d'échéance simulée à partir de created_at + 12 mois
    const created = new Date(q.created_at)
    let echeance = new Date(created)
    echeance.setFullYear(echeance.getFullYear() + 1)
    while (echeance < new Date()) echeance.setFullYear(echeance.getFullYear() + 1)
    const daysToEcheance = Math.floor((echeance.getTime() - Date.now()) / 86400000)

    // Trouver une compagnie alternative avec gain potentiel
    const alternates = COMPAGNIES.filter(c => c !== currentProvider)
    const altIndex = hashString(`${q.id}alt`) % alternates.length
    const altProvider = alternates[altIndex]
    const variation = (hashString(`${q.id}var`) % 30) - 12 // -12% à +18%
    const altPremium = Math.max(200, Math.round(currentPremium * (1 + variation / 100)))
    const saving = currentPremium - altPremium

    const recommendation = saving > 50 ? 'migrate' : 'renew'
    const rationale = saving > 100
      ? `Économie ${saving}€/an chez ${altProvider} (couverture équivalente)`
      : saving > 30
      ? `Économie modeste de ${saving}€ — fidélité ${currentProvider} préférable`
      : `Tarif ${currentProvider} compétitif — reconduction recommandée`

    return {
      contract_id: q.id,
      client_id: q.client_id,
      client_name: `${q.first_name || ''} ${q.last_name || ''}`.trim(),
      product: produit,
      current_provider: currentProvider,
      current_premium_eur: currentPremium,
      recommended_provider: recommendation === 'migrate' ? altProvider : currentProvider,
      alternative_premium_eur: altPremium,
      saving_eur: saving,
      recommendation,
      echeance_date: echeance.toISOString().slice(0, 10),
      days_to_echeance: daysToEcheance,
      rationale,
    }
  }).filter(r => r.days_to_echeance <= 90 && r.days_to_echeance >= -7)

  // Persist
  for (const r of renewals) {
    await pool.query(`
      INSERT INTO ark_renewal_optimizations
        (user_id, client_id, contract_ref, product, current_provider, current_premium_cents,
         recommendation, recommended_provider, estimated_saving_cents, echeance_date, rationale, computed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    `, [userId, r.client_id, String(r.contract_id), r.product, r.current_provider,
        Math.round(r.current_premium_eur * 100), r.recommendation, r.recommended_provider,
        Math.round(r.saving_eur * 100), r.echeance_date, r.rationale])
  }

  return {
    renewals,
    total_contracts_90d: renewals.length,
    total_potential_saving_eur: renewals.reduce((s, r) => s + Math.max(0, r.saving_eur), 0),
    migrate_count: renewals.filter(r => r.recommendation === 'migrate').length,
    renew_count: renewals.filter(r => r.recommendation === 'renew').length,
    computed_at: new Date().toISOString(),
  }
}

module.exports = {
  computeChurnForUser,
  computeCrossSellMatrix,
  computeRenewalOptimizations,
  buildRetentionPlan,
}
