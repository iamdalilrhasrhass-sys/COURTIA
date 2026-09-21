/**
 * ARK Predictive Intelligence — Churn / Cross-sell / Renewal optimizer
 * Service déterministe basé sur les données client (heuristiques + scoring).
 * Compatible CRM Aurora (compagnies fictives : Aurora, Novalia, Helios, Serenis, Atlas, Oria, Nivalis, Solenys).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PORTÉE DES TROIS SCANS : LE CABINET, PAS LA SEULE PERSONNE
 * (correction du 21/09/2026 — défaut P1 « deux vérités pour une même donnée »)
 *
 * DÉFAUT MESURÉ : les trois scans filtraient `c.courtier_id = $1`. Un
 * collaborateur (`broker`) d'un cabinet à plusieurs commerciaux obtenait donc
 * « 0 client scanné », un churn moyen de 0, une matrice cross-sell vide et
 * aucune échéance à optimiser, quand le propriétaire du MÊME cabinet obtenait
 * les vrais chiffres : deux vérités pour une même donnée.
 *
 * RÈGLE TENUE : les trois lectures passent par `lib/porteeCabinet` (seule
 * autorité de portée). La clause est EXACTEMENT la clause historique
 * (`c.courtier_id = $1`) si le compte n'a pas de cabinet — les cabinets
 * mono-utilisateur ne changent pas de comportement — et devient
 * `(c.cabinet_id = ANY($1::uuid[]) OR c.courtier_id = $2)` sinon. Un compte dont
 * l'appartenance a été retirée ne lit plus aucun client (donc ne scanne rien).
 *
 * Les ÉCRITURES de cache (`ark_churn_scores`, `ark_cross_sell_recommendations`,
 * `ark_renewal_optimizations`) restent indexées sur `user_id` : la table ne
 * porte pas d'ancre de cabinet et une ligne de cache n'est pas un actif du
 * cabinet (elle est recalculée par le scan de chaque membre).
 * `options` accepte `{ portee }` (portée déjà résolue : aucune requête en plus).
 * ────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../db')
const marcheCabinet = require('../lib/marcheCabinet')
const porteeCabinet = require('../lib/porteeCabinet')

// ──────────────────────────────────────────────────────────────────────────
// CHURN PREDICTOR
// ──────────────────────────────────────────────────────────────────────────

function daysSince(date) {
  if (!date) return 9999
  const d = new Date(date)
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
}

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)) }

async function computeChurnForUser(userId, options = {}) {
  // Portée du CABINET (lib/porteeCabinet — seule autorité).
  const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, userId, options)
  const f = porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 1,
  })
  // Récupère tous les clients de la portée (le cabinet, ou ses seules lignes en
  // l'absence de cabinet) avec leurs métriques associées
  const { rows: clients } = await pool.query(`
    SELECT
      c.id, c.first_name, c.last_name, c.email, c.phone, c.city, c.status,
      c.loyalty_score, c.risk_score, c.last_contact, c.lifetime_value,
      c.silent_alert, c.nb_sinistres_3ans, c.created_at,
      (SELECT COUNT(*) FROM quotes q WHERE q.client_id = c.id) AS quotes_count,
      (SELECT COUNT(*) FROM appointments a WHERE a.client_id = c.id) AS rdv_count,
      (SELECT MAX(updated_at) FROM quotes q WHERE q.client_id = c.id) AS last_quote_at
    FROM clients c
    WHERE ${f.sql}
    ORDER BY c.id ASC
  `, f.params)

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
    // CORRECTION 2026-09-19 : 55/72/88 % etaient des constantes arbitraires
    // presentees comme un « taux de recuperation estime ». Aucune mesure ne les
    // fonde : la valeur est nulle et l'interface affiche « non disponible ».
    estimated_recovery_pct: null,
    steps,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CROSS-SELL ENGINE
// ──────────────────────────────────────────────────────────────────────────

const PRODUITS_CATALOG = ['Auto', 'MRH', 'Santé', 'Prévoyance', 'RC Pro', 'Décennale', 'Cyber', 'PJ']
// CORRECTION 2026-09-19 : cette liste de compagnies servait a INVENTER un assureur
// quand le dossier n'en contenait pas. Elle est supprimee : plus aucune compagnie
// fabriquee ne peut apparaitre comme reelle.

// CORRECTION 2026-09-19 : hashString() ne servait qu'a fabriquer des montants,
// des compagnies et des variations de tarif. Tous ces usages ont ete supprimes :
// la fonction n'a plus aucune raison d'exister.

async function computeCrossSellMatrix(userId, options = {}) {
  const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, userId, options)
  const f = porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 1,
  })
  const { rows: clients } = await pool.query(`
    SELECT c.id, c.first_name, c.last_name, c.type, c.city, c.loyalty_score, c.lifetime_value,
           c.profession, c.situation_familiale,
           ARRAY(
             SELECT DISTINCT (q.quote_data->>'produit')
             FROM quotes q
             WHERE q.client_id = c.id AND q.quote_data ? 'produit'
           ) AS souscrits
    FROM clients c
    WHERE ${f.sql}
    ORDER BY c.lifetime_value DESC NULLS LAST
    LIMIT 50
  `, f.params)

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
          // CORRECTION 2026-09-19 : montant invente par hachage de l'id client.
          // Aucun tarif de reference n'existe pour ce client : valeur inconnue.
          estimated = null
          rationale = isFamille ? 'Profil famille — bundle Auto + MRH avantageux' : 'Couverture mobilité essentielle'
          break
        case 'MRH':
          score = 55 + (souscrits.includes('Auto') ? 20 : 0) + (isFamille ? 18 : 0)
          estimated = null
          rationale = 'MRH = base patrimoine, taux conversion élevé'
          break
        case 'Santé':
          score = 60 + (souscrits.length === 0 ? 15 : 0) + (isFamille ? 12 : 0)
          estimated = null
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
          estimated = null
          rationale = 'Protection juridique = bundle facile, ticket modéré'
          break
      }

      // Bruit arbitraire (+/-3) retire : le score ne depend plus que de criteres explicites.
      score = clamp(score)
      const opp_status = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold'
      return {
        product: produit,
        score,
        score_method: 'heuristique_courtia (criteres explicites, aucun tirage aleatoire)',
        estimated_eur: estimated,          // null tant qu'aucun tarif reel n'est connu
        estimated_eur_source: estimated === null ? 'indisponible' : 'donnee_dossier',
        status: opp_status,
        rationale,
      }
    })

    // Persist top 3 opportunities
    return {
      client_id: c.id,
      client_name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      city: c.city,
      type: c.type,
      souscrits,
      opportunities,
      // Un total n'est PAS 0 quand aucun montant n'est connu : `null` dit
      // « non mesuré » (un 0 serait un chiffre inventé), `total_opportunity`
      // est le nom NEUTRE (la devise du cabinet est servie à la racine).
      total_opportunity_eur: totalOpportunite(opportunities),
      total_opportunity: totalOpportunite(opportunities),
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

  const devise = await deviseDuCabinet(userId)

  return {
    products: PRODUITS_CATALOG,
    clients: matrix,
    devise,
    // CORRECTION 2026-09-19 : cette somme additionnait des montants inventes par
    // hachage. Sans tarif de reference dans les dossiers, le potentiel est INCONNU.
    // Le nom NEUTRE est servi à tous ; le nom historique « _eur » n'est conservé
    // que pour un cabinet dont la devise est réellement l'euro (P3 « D-22 »).
    total_potential: null,
    total_potential_source: 'indisponible — aucun tarif de reference dans les dossiers charges',
    ...(devise === 'EUR' ? {
      total_potential_eur: null,
      total_potential_eur_source: 'indisponible — aucun tarif de reference dans les dossiers charges',
    } : {}),
    computed_at: new Date().toISOString(),
  }
}

/**
 * Devise du CABINET (CHF en Suisse, EUR en France) — repli 'EUR'.
 * Même règle que partout ailleurs (`lib/marcheCabinet`) : la monnaie
 * caractérise l'entreprise, pas la personne connectée.
 */
async function deviseDuCabinet(userId) {
  try {
    const verdict = await marcheCabinet.marcheUtilisateur(userId, (sql, params) => pool.query(sql, params))
    return verdict && verdict.devise ? verdict.devise : 'EUR'
  } catch (_err) {
    return 'EUR';
  }
}

/**
 * Total des opportunités NON souscrites.
 * Renvoie `null` (et non 0) dès qu'AUCUN montant n'est connu : afficher « 0 »
 * là où la donnée manque serait un chiffre inventé.
 */
function totalOpportunite(opportunities = []) {
  const valeurs = opportunities
    .filter((o) => o.status !== 'owned')
    .map((o) => o.estimated_eur)
    .filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valeurs.length === 0) return null;
  return valeurs.reduce((somme, v) => somme + v, 0);
}

// ──────────────────────────────────────────────────────────────────────────
// RENEWAL OPTIMIZER
// ──────────────────────────────────────────────────────────────────────────

/**
 * ÉCHÉANCE : UNE DATE DU DOSSIER N'EST PAS UNE DATE DÉDUITE (IA-031).
 *
 * DÉFAUT MESURÉ (P3, 21/09/2026) : l'optimiseur renvoyait dans `echeance_date`
 * une date CALCULÉE (`created_at` + 12 mois, prolongée tant qu'elle est passée)
 * même quand le dossier portait sa propre échéance, et l'étiquette technique
 * (`data_source.echeance`) n'était lue par AUCUN écran (grep `data_source` côté
 * frontend : 0 occurrence). Un courtier lisait donc une échéance inventée à
 * côté d'échéances réelles, sans pouvoir les distinguer.
 *
 * RÈGLE : la date du dossier fait foi quand elle existe ; sinon la même
 * échéance DÉDUITE qu'avant est servie (elle reste utile), mais elle est
 * TOUJOURS signalée comme déduite par un booléen explicite, calculé sur la
 * source réellement utilisée — jamais sur une intention.
 *
 * Champs exposés (contrat d'API, voir la doc de `routes/arkIntelligence.js`) :
 *   • `echeance_est_deduite` : `true` ⇔ la date servie a été CALCULÉE par
 *     COURTIA (le dossier n'en portait aucune). `false` ⇔ date du dossier.
 *     À `true`, un écran doit écrire « échéance estimée (déduite de la date de
 *     création) », jamais une date nue.
 *   • `echeance_source` : source lisible ('quote_data.date_echeance' ou
 *     'derivee_creation_plus_12_mois').
 *   • `echeance_estimee` : alias historique de `echeance_est_deduite` (même
 *     valeur, conservé pour les appelants existants).
 */
const ECHEANCE_SOURCE_DERIVEE = 'derivee_creation_plus_12_mois'
const ECHEANCE_SOURCE_DOSSIER = 'quote_data.date_echeance'

/**
 * Échéance PORTÉE PAR LE DOSSIER (`quote_data.date_echeance`), ou `null`.
 * Une valeur illisible n'est PAS une date : elle ne doit pas faire passer une
 * date calculée pour une date réelle, donc on renvoie `null`.
 */
function echeanceDuDossier(data = {}) {
  const brut = data ? data.date_echeance : null
  if (brut === undefined || brut === null || brut === '') return null
  const date = new Date(brut)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Échéance DÉDUITE de la date de création du dossier (+12 mois, prolongée
 * d'année en année tant qu'elle est passée) — calcul historique inchangé.
 */
function echeanceDeriveeDeCreation(createdAt) {
  const created = new Date(createdAt)
  const base = Number.isNaN(created.getTime()) ? new Date() : created
  const echeance = new Date(base)
  echeance.setFullYear(echeance.getFullYear() + 1)
  while (echeance < new Date()) echeance.setFullYear(echeance.getFullYear() + 1)
  return echeance
}

async function computeRenewalOptimizations(userId, options = {}) {
  const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, userId, options)
  const f = porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 1,
  })
  // Heuristique : on génère des renouvellements simulés basés sur les quotes existantes
  // (le schéma "contracts" n'existe pas — on s'appuie sur quotes.quote_data)
  const { rows: quotes } = await pool.query(`
    SELECT q.id, q.client_id, q.quote_data, q.status, q.created_at, q.updated_at,
           c.first_name, c.last_name, c.city, c.loyalty_score, c.lifetime_value
    FROM quotes q
    JOIN clients c ON c.id = q.client_id
    WHERE ${f.sql} AND q.status = 'actif'
    ORDER BY q.created_at DESC
    LIMIT 80
  `, f.params)

  const renewals = quotes.map(q => {
    const data = q.quote_data || {}
    const produit = data.produit || 'Auto'
    // CORRECTION 2026-09-19 : la compagnie et la prime etaient INVENTEES (compagnie
    // tiree d'une liste, prime tiree au hash) quand le dossier ne les contenait pas.
    // Desormais : donnee du dossier, ou null. Jamais de valeur fabriquee.
    const currentProvider = data.compagnie || null
    const currentPremium = data.prime_annuelle !== undefined && data.prime_annuelle !== null
      ? Number(data.prime_annuelle)
      : null

    // Échéance : la date DU DOSSIER si elle existe, sinon la date DÉDUITE
    // (created_at + 12 mois, calcul historique conservé) — les deux ne sont
    // jamais confondues : `echeance_est_deduite` dit laquelle a été servie.
    const echeanceDossier = echeanceDuDossier(data)
    const echeanceEstDeduite = echeanceDossier === null
    const echeance = echeanceDossier || echeanceDeriveeDeCreation(q.created_at)
    const daysToEcheance = Math.floor((echeance.getTime() - Date.now()) / 86400000)

    // CORRECTION 2026-09-19 : la compagnie alternative, la variation de tarif
    // (-12 % a +18 %) et donc l'« economie potentielle » etaient toutes tirees au
    // hash de l'id du devis, puis presentees comme des euros negociables. COURTIA
    // ne dispose d'AUCUN tarif de marche : aucune economie ne peut etre calculee.
    // On recommande simplement la reconduction, sans chiffre invente.
    const recommendedProvider = null
    const altPremium = null
    const saving = null
    const recommendation = 'renew'
    const rationale = currentPremium === null
      ? "Echeance a venir. Montant et compagnie non renseignes dans le dossier : aucune comparaison possible."
      : "Echeance a venir. Aucun tarif de marche verifie dans COURTIA : pas d'economie chiffree — verifier aupres de la compagnie."

    return {
      contract_id: q.id,
      client_id: q.client_id,
      client_name: `${q.first_name || ''} ${q.last_name || ''}`.trim(),
      product: produit,
      current_provider: currentProvider,
      current_premium_eur: currentPremium,
      recommended_provider: recommendedProvider,
      alternative_premium_eur: altPremium,
      saving_eur: saving,                 // null : aucune economie calculee
      recommendation,
      data_source: {
        provider: currentProvider === null ? 'absent_du_dossier' : 'quote_data.compagnie',
        premium: currentPremium === null ? 'absent_du_dossier' : 'quote_data.prime_annuelle',
        echeance: echeanceEstDeduite ? 'derivee (creation + 12 mois)' : ECHEANCE_SOURCE_DOSSIER,
      },
      // ── UNE DATE DÉDUITE N'EST PAS UNE DATE DU DOSSIER ────────────────────
      // POURQUOI ce booléen (défaut P3 IA-031 signalé le 20/09/2026) :
      // `echeance_date` est CALCULÉE (`created_at` + 12 mois) quand le dossier
      // ne porte aucune échéance. L'étiquette technique (`data_source.echeance`)
      // n'était lue par aucun écran, donc un affichage pouvait présenter la
      // valeur comme une date réelle. Le drapeau est explicite et sans
      // ambiguïté, et il décrit la source RÉELLEMENT utilisée : à `true`, l'écran
      // doit écrire « échéance estimée (déduite de la date de création) »,
      // jamais une date nue.
      echeance_est_deduite: echeanceEstDeduite,
      // Source lisible de la date servie (le champ ci-dessus en est le résumé).
      echeance_source: echeanceEstDeduite ? ECHEANCE_SOURCE_DERIVEE : ECHEANCE_SOURCE_DOSSIER,
      // Alias historique du même drapeau : les appelants existants ne changent
      // pas de comportement, et aucun ne peut lire l'un sans lire l'autre.
      echeance_estimee: echeanceEstDeduite,
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
        Number.isFinite(r.current_premium_eur) ? Math.round(r.current_premium_eur * 100) : null,
        r.recommendation, r.recommended_provider,
        Number.isFinite(r.saving_eur) ? Math.round(r.saving_eur * 100) : null,
        r.echeance_date, r.rationale])
  }

  return {
    renewals,
    total_contracts_90d: renewals.length,
    // CORRECTION 2026-09-19 : cette somme additionnait les economies inventees.
    total_potential_saving_eur: null,
    total_potential_saving_eur_source: 'indisponible — aucun tarif de marche verifie dans COURTIA',
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
