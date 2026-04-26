const express = require('express');
const pool = require('../db');
const router = express.Router();
const { calculateRiskScore } = require('../utils/riskCalculator');
const { requireUnderLimit } = require('../middleware/planGuard');
const { getUserPlanInfo } = require('../services/planService');
const { getClientScoreBreakdown } = require('../services/portfolioAnalyzer');
const Anthropic = require('@anthropic-ai/sdk');

/**
 * GET /api/clients — Lister tous les clients avec pagination
 */
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // Récupérer les clients
    const result = await pool.query(
      `SELECT 
        id, first_name as prenom, last_name as nom, 
        email, phone as telephone, address as adresse,
        status as statut, risk_score as score_risque,
        bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        notes, created_at, company_name, type as segment
      FROM clients 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Compter le total
    const countResult = await pool.query('SELECT COUNT(*) as count FROM clients');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('GET /api/clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/clients/:id — Récupérer un client par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      `SELECT 
        id, first_name as prenom, last_name as nom,
        email, phone as telephone, address as adresse,
        status as statut, risk_score as score_risque,
        bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        notes, created_at, company_name, type as segment,
        loyalty_score, lifetime_value, civility, postal_code, city, country
      FROM clients WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/clients/:id/contrats — Contrats d'un client
 */
router.get('/:id/contrats', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const result = await pool.query(
      `SELECT id,
              quote_data->>'type_contrat' as type_contrat,
              quote_data->>'compagnie' as compagnie,
              (quote_data->>'prime_annuelle')::numeric as prime_annuelle,
              status as statut,
              (quote_data->>'date_effet')::date as date_effet,
              (quote_data->>'date_echeance')::date as date_echeance
       FROM quotes WHERE client_id = $1
       ORDER BY (quote_data->>'date_echeance')::date ASC NULLS LAST`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/clients/:id/contrats error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/clients — Créer un client
 */
router.post('/', requireUnderLimit('clients'), async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      nom, prenom, email, telephone, adresse, statut, segment,
      notes, zone_geographique, profession, situation_familiale,
      postal_code, city, civility, country
    } = req.body;

    // Parser les champs numériques (le frontend peut les envoyer en string)
    const bonus_malus        = parseFloat(req.body.bonus_malus) || 1.0;
    const annees_permis      = parseInt(req.body.annees_permis, 10) || 0;
    const nb_sinistres_3ans  = parseInt(req.body.nb_sinistres_3ans, 10) || 0;

    // Calculer le score risque
    const score = calculateRiskScore({
      bonus_malus,
      annees_permis,
      nb_sinistres_3ans,
      zone_geographique
    });

    const result = await pool.query(
      `INSERT INTO clients 
      (first_name, last_name, email, phone, address, status, type,
       risk_score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
       zone_geographique, profession, situation_familiale,
       postal_code, city, civility, country, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      RETURNING *`,
      [
        prenom, nom, email, telephone, adresse, statut || 'prospect', segment || 'particulier',
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country
      ]
    );

    // Notification email (non-blocking)
    try {
      const { emailNouveauClient } = require('../services/emailService')
      const fullName = [req.body.prenom, req.body.nom].filter(Boolean).join(' ') || 'Nouveau client'
      await emailNouveauClient({ courtierEmail: req.user?.email || 'arkcourtia@gmail.com', clientNom: fullName })
    } catch(e) { console.error('Email notification skipped:', e.message) }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/clients error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/clients/:id — Modifier un client
 */
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      nom, prenom, email, telephone, adresse, statut, segment,
      notes, zone_geographique, profession, situation_familiale,
      postal_code, city, civility, country
    } = req.body;

    // Parser les champs numériques (le frontend peut les envoyer en string)
    const bonus_malus        = parseFloat(req.body.bonus_malus) || 1.0;
    const annees_permis      = parseInt(req.body.annees_permis, 10) || 0;
    const nb_sinistres_3ans  = parseInt(req.body.nb_sinistres_3ans, 10) || 0;

    // Recalculer le score
    const score = calculateRiskScore({
      bonus_malus,
      annees_permis,
      nb_sinistres_3ans,
      zone_geographique
    });

    const result = await pool.query(
      `UPDATE clients SET
       first_name = $1, last_name = $2, email = $3, phone = $4,
       address = $5, status = $6, type = $7, risk_score = $8,
       notes = $9, bonus_malus = $10, annees_permis = $11,
       nb_sinistres_3ans = $12, zone_geographique = $13,
       profession = $14, situation_familiale = $15,
       postal_code = $16, city = $17, civility = $18, country = $19,
       updated_at = NOW()
      WHERE id = $20 RETURNING *`,
      [
        prenom, nom, email, telephone, adresse, statut, segment,
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country, req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/clients/:id — Supprimer un client
 */
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/clients/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/:id/score
// Score de santé individuel du client.
// Tout plan : score brut visible.
// Pro/Elite : breakdown complet (client_score_breakdown).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/score', async (req, res) => {
  try {
    const courtierId = req.user.id || req.user.userId;
    const clientId   = parseInt(req.params.id);
    if (isNaN(clientId)) return res.status(400).json({ error: 'ID invalide' });

    const [planInfo, breakdown] = await Promise.all([
      getUserPlanInfo(courtierId),
      getClientScoreBreakdown(clientId, courtierId),
    ]);

    if (!breakdown) {
      return res.status(404).json({ error: 'Client non trouvé ou accès refusé' });
    }

    const plan    = planInfo?.plan || 'start';
    const hasBreakdown = planInfo?.limits?.features?.client_score_breakdown === true;

    if (!hasBreakdown) {
      // Start : score brut uniquement
      return res.json({
        client_id:       clientId,
        score:           breakdown.score,
        grade:           breakdown.grade,
        plan,
        upgrade_required: true,
        upgrade_message:  'Le détail par dimension est disponible avec le plan Pro ou Elite.',
      });
    }

    res.json({ ...breakdown, plan });

  } catch (err) {
    console.error('GET /api/clients/:id/score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/:id/ark-action-plan
// ARK génère un plan d'action personnalisé pour ce client (Elite uniquement).
// Claude Opus 4.6 : 5 actions concrètes, impact en points, délai, message suggéré.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/ark-action-plan', async (req, res) => {
  try {
    const courtierId = req.user.id || req.user.userId;
    const clientId   = parseInt(req.params.id);
    if (isNaN(clientId)) return res.status(400).json({ error: 'ID invalide' });

    // Vérifier le plan (Elite uniquement)
    const planInfo = await getUserPlanInfo(courtierId);
    const plan     = planInfo?.plan || 'start';
    const hasFeature = planInfo?.limits?.features?.client_ark_action_plan === true;

    if (!hasFeature) {
      return res.status(402).json({
        error:            'plan_upgrade_required',
        feature:          'client_ark_action_plan',
        required_plan:    'elite',
        plan,
        message: plan === 'start'
          ? 'Le plan d\'action ARK personnalisé est disponible avec le plan Elite.'
          : 'Passez au plan Elite pour accéder au plan d\'action ARK personnalisé.',
      });
    }

    // Récupérer le breakdown
    const breakdown = await getClientScoreBreakdown(clientId, courtierId);
    if (!breakdown) {
      return res.status(404).json({ error: 'Client non trouvé ou accès refusé' });
    }

    // Données client pour le contexte
    const clientRes = await pool.query(
      `SELECT first_name, last_name, email, phone, profession,
              situation_familiale, address, created_at, notes
       FROM clients WHERE id = $1 AND courtier_id = $2`,
      [clientId, courtierId]
    );
    const client = clientRes.rows[0];

    const dimLines = breakdown.breakdown.map(d =>
      `- ${d.label} : ${d.score}/100 (${d.reason}) — ${d.impact}`
    ).join('\n');

    const prompt = `Tu es ARK, expert en courtage d'assurance français. Analyse ce client et génère un plan d'action personnalisé.

CLIENT :
- Nom : ${client.first_name || ''} ${client.last_name || ''}
- Profession : ${client.profession || 'Non renseignée'}
- Situation familiale : ${client.situation_familiale || 'Non renseignée'}
- Email : ${client.email ? 'OK' : 'MANQUANT'}
- Téléphone : ${client.phone ? 'OK' : 'MANQUANT'}
- Adresse : ${client.address ? 'OK' : 'MANQUANTE'}
- Client depuis : ${client.created_at ? new Date(client.created_at).toLocaleDateString('fr-FR') : 'inconnu'}
- Contrats actifs : ${breakdown.total_quotes}

SCORE ACTUEL : ${breakdown.score}/100 (grade ${breakdown.grade})
SCORE POTENTIEL : ${breakdown.potential_score}/100

DIMENSIONS :
${dimLines}

VALEUR CLIENT ESTIMÉE : ${breakdown.client_value_estimate.min}–${breakdown.client_value_estimate.max}€ LTV (${breakdown.client_value_estimate.label})

Génère exactement 5 actions concrètes et prioritaires pour améliorer ce score. Chaque action doit être réaliste, spécifique à ce profil, et inclure un message de contact (email ou SMS).

Réponds UNIQUEMENT en JSON valide, aucun texte avant ou après, aucun bloc markdown :
{
  "actions": [
    {
      "order": 1,
      "title": "<max 80 chars>",
      "description": "<max 200 chars>",
      "dimension": "multi_equipment|compliance|recency|diversification|growth",
      "score_impact": <nombre de points gagnés estimés>,
      "delay_days": <délai recommandé en jours>,
      "priority": "critical|high|medium",
      "suggested_message": {
        "channel": "email|sms|call",
        "subject": "<sujet si email>",
        "body": "<max 300 chars — message personnalisé>"
      }
    }
  ],
  "projected_score": <score estimé si toutes les actions faites>,
  "time_to_100": "<estimation ex: 30 jours | 3 mois | 6 mois>",
  "coaching_summary": "<max 200 chars — synthèse ARK pour le courtier>"
}`;

    let result = {
      actions:          [],
      projected_score:  breakdown.potential_score,
      time_to_100:      'Non estimable',
      coaching_summary: 'Analyse ARK non disponible (clé API manquante).',
    };

    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response   = await anthropic.messages.create({
        model:      'claude-opus-4-6',
        max_tokens: 2500,
        messages:   [{ role: 'user', content: prompt }],
      });

      const rawText = response.content?.[0]?.text || '{}';
      const cleaned = rawText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

      try {
        const parsed = JSON.parse(cleaned);
        result = { ...result, ...parsed };
      } catch (parseErr) {
        console.error('[clients/ark-action-plan] Erreur JSON Opus:', parseErr.message);
      }
    }

    res.json({
      client_id:       clientId,
      current_score:   breakdown.score,
      current_grade:   breakdown.grade,
      ltv:             breakdown.client_value_estimate,
      breakdown_short: breakdown.breakdown.map(d => ({
        dim: d.dim, score: d.score, points_lost: d.points_lost
      })),
      action_plan: result,
      plan,
    });

  } catch (err) {
    console.error('GET /api/clients/:id/ark-action-plan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
