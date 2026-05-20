const express = require('express');
const pool = require('../db');
const router = express.Router();
const { calculateRiskScore } = require('../utils/riskCalculator');
const { requireUnderLimit } = require('../middleware/planGuard');
const { getUserPlanInfo } = require('../services/planService');
const { getClientScoreBreakdown } = require('../services/portfolioAnalyzer');
const { listClientInteractions } = require('../services/integrationsStore');
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
        status, risk_score,
        bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        notes, created_at, company_name, type as segment,
        city, postal_code, silent_alert, last_contact, loyalty_score, lifetime_value,
        (
          SELECT COUNT(*)::int
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status = 'actif'
        ) AS contracts_count,
        (
          SELECT COALESCE(SUM(NULLIF(q.quote_data->>'prime_annuelle', '')::numeric), 0)
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status = 'actif'
        ) AS prime_totale,
        (
          SELECT MIN(NULLIF(q.quote_data->>'date_echeance', '')::date)
          FROM quotes q
          WHERE q.client_id = clients.id AND q.status = 'actif'
        ) AS next_echeance
      FROM clients 
      WHERE courtier_id = $3
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset, req.user.id]
    );

    // Compter le total
    const countResult = await pool.query('SELECT COUNT(*) as count FROM clients WHERE courtier_id = $1', [req.user.id]);
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
        status, risk_score,
        bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        notes, created_at, company_name, type as segment,
        loyalty_score, lifetime_value, civility, postal_code, city, country,
        silent_alert, last_contact
      FROM clients WHERE id = $1 AND courtier_id = $2`,
      [req.params.id, req.user.id]
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
      `SELECT q.id,
              q.client_id,
              q.status,
              q.status as statut,
              quote_data->>'type_contrat' as type_contrat,
              quote_data->>'compagnie' as compagnie,
              quote_data->>'numero' as numero,
              (quote_data->>'prime_annuelle')::numeric as prime_annuelle,
              (quote_data->>'date_effet')::date as date_effet,
              (quote_data->>'date_echeance')::date as date_echeance
       FROM quotes q
       JOIN clients c ON q.client_id = c.id AND c.courtier_id = $2
       WHERE q.client_id = $1
       ORDER BY (q.quote_data->>'date_echeance')::date ASC NULLS LAST`,
      [req.params.id, req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/clients/:id/contrats error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/clients/:id/interactions — Timeline interactions multi-canaux
 */
router.get('/:id/interactions', async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const clientId = Number.parseInt(req.params.id, 10)
    const userId = req.user.id
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 300)

    if (!Number.isFinite(clientId) || clientId <= 0) {
      return res.status(400).json({ error: 'invalid_client_id' })
    }

    const ownResult = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND courtier_id = $2 LIMIT 1',
      [clientId, userId]
    )

    if (!ownResult.rowCount) {
      return res.status(404).json({ error: 'Client non trouvé' })
    }

    const [storedInteractions, taskRows, contractRows] = await Promise.all([
      listClientInteractions(pool, userId, clientId, { limit }),
      pool.query(
        `SELECT id, title, status, start_time, created_at
         FROM appointments
         WHERE client_id = $1 AND user_id = $2
         ORDER BY COALESCE(start_time, created_at) DESC
         LIMIT 30`,
        [clientId, userId]
      ).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT id, status, quote_data, created_at
         FROM quotes
         WHERE client_id = $1
         ORDER BY created_at DESC
         LIMIT 30`,
        [clientId]
      ).catch(() => ({ rows: [] })),
    ])

    const mappedTasks = (taskRows.rows || []).map((task) => ({
      id: `task-${task.id}`,
      provider: 'task',
      direction: 'system',
      subject: `Tâche: ${task.title || 'Action'}`,
      body_preview: `Statut: ${task.status || 'a_faire'}`,
      occurred_at: task.start_time || task.created_at,
      metadata: { task_id: task.id, status: task.status || null },
      source: 'appointments',
    }))

    const mappedContracts = (contractRows.rows || []).map((contract) => {
      let quoteData = contract.quote_data || {}
      if (typeof contract.quote_data === 'string') {
        try {
          quoteData = JSON.parse(contract.quote_data)
        } catch {
          quoteData = {}
        }
      }
      const typeContrat = quoteData.type_contrat || 'Contrat'
      const compagnie = quoteData.compagnie || 'Compagnie'
      const echeance = quoteData.date_echeance || null
      return {
        id: `contract-${contract.id}`,
        provider: 'contract',
        direction: 'system',
        subject: `${typeContrat} - ${compagnie}`,
        body_preview: echeance ? `Échéance: ${echeance}` : `Statut: ${contract.status || 'actif'}`,
        occurred_at: contract.created_at,
        metadata: { contract_id: contract.id, status: contract.status || null, quote_data: quoteData },
        source: 'quotes',
      }
    })

    const merged = [...storedInteractions, ...mappedTasks, ...mappedContracts]
      .sort((a, b) => {
        const aTs = new Date(a.occurred_at || a.created_at || 0).getTime()
        const bTs = new Date(b.occurred_at || b.created_at || 0).getTime()
        return bTs - aTs
      })
      .slice(0, limit)

    return res.json({
      success: true,
      client_id: clientId,
      count: merged.length,
      rows: merged,
    })
  } catch (err) {
    console.error('GET /api/clients/:id/interactions error:', err.message)
    return res.status(500).json({ error: 'client_interactions_unavailable' })
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
       postal_code, city, civility, country, courtier_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *`,
      [
        prenom, nom, email, telephone, adresse, statut || 'prospect', segment || 'particulier',
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country, req.user.id
      ]
    );

    // Notification email (non-blocking)
    try {
      const { emailNouveauClient } = require('../services/emailService')
      const fullName = [req.body.prenom, req.body.nom].filter(Boolean).join(' ') || 'Nouveau client'
      if (req.user?.email) {
        await emailNouveauClient({ courtierEmail: req.user.email, clientNom: fullName })
      }
    } catch(e) { console.error('Email notification skipped:', e.message) }

    try {
      const { trackEvent } = require('../services/analyticsService')
      await trackEvent({
        userId: req.user.id || req.user.userId,
        event: 'client_created',
        properties: { client_id: result.rows[0].id, status: result.rows[0].status },
      })
    } catch (e) { console.error('Product event skipped:', e.message) }

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
      WHERE id = $20 AND courtier_id = $21 RETURNING *`,
      [
        prenom, nom, email, telephone, adresse, statut, segment,
        score, notes, bonus_malus, annees_permis, nb_sinistres_3ans,
        zone_geographique, profession, situation_familiale,
        postal_code, city, civility, country, req.params.id, req.user.id
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
    await pool.query('DELETE FROM clients WHERE id = $1 AND courtier_id = $2', [req.params.id, req.user.id]);
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
    const courtierId = req.user.id || req.user.id;
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
    const courtierId = req.user.id || req.user.id;
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/:id/cross-sell
// Détecte les produits non souscrits par le client + estime le potentiel
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/cross-sell', async (req, res) => {
  try {
    const courtierId = req.user.id || req.user.userId;
    const clientId   = parseInt(req.params.id, 10);
    if (!Number.isFinite(clientId)) return res.status(400).json({ error: 'ID invalide' });

    // Vérifier accès
    const cliRes = await pool.query(
      `SELECT id, first_name, last_name, type, status, profession, situation_familiale, lifetime_value
       FROM clients WHERE id=$1 AND courtier_id=$2`, [clientId, courtierId]);
    if (!cliRes.rows[0]) return res.status(404).json({ error: 'Client non trouvé' });
    const client = cliRes.rows[0];

    // Produits existants
    let produitsExistants = [];
    try {
      const qr = await pool.query(
        `SELECT DISTINCT LOWER(COALESCE(quote_data->>'type_contrat','')) AS produit
         FROM quotes WHERE client_id=$1 AND status='actif'`, [clientId]);
      produitsExistants = qr.rows.map(r => r.produit).filter(Boolean);
    } catch (_) { /* fallthrough */ }

    // Catalogue de référence — produits éligibles selon profil
    const CATALOGUE = [
      { code: 'auto',        label: 'Auto',         estPrime: 1100, profil: ['particulier','pro'] },
      { code: 'mrh',         label: 'MRH',          estPrime: 480,  profil: ['particulier'] },
      { code: 'habitation',  label: 'Habitation',   estPrime: 380,  profil: ['particulier'] },
      { code: 'sante',       label: 'Santé',        estPrime: 720,  profil: ['particulier','pro'] },
      { code: 'prevoyance',  label: 'Prévoyance',   estPrime: 520,  profil: ['particulier','pro'] },
      { code: 'rc_pro',      label: 'RC Pro',       estPrime: 2400, profil: ['pro'] },
      { code: 'pj',          label: 'Protection Juridique', estPrime: 220,  profil: ['particulier','pro'] },
      { code: 'cyber',       label: 'Cyber',        estPrime: 1800, profil: ['pro'] },
    ];

    const typeNorm = (client.type || 'particulier').toLowerCase().includes('pro') ? 'pro' : 'particulier';
    const has = (code) => produitsExistants.some(p => p.includes(code));

    const opportunites = CATALOGUE
      .filter(p => p.profil.includes(typeNorm))
      .filter(p => !has(p.code) && !has(p.label.toLowerCase()))
      .map(p => {
        // Score : 80 pour produits "core" manquants, 60 pour autres
        const isCore = ['rc_pro','sante','mrh','auto'].includes(p.code);
        const score = isCore ? 82 : 65;
        const rationale = isCore
          ? `Profil ${typeNorm} sans ${p.label} — produit core manquant.`
          : `Opportunité ${p.label} cohérente avec le profil.`;
        return {
          produit: p.code,
          label: p.label,
          prime_estimee: p.estPrime,
          commission_estimee: Math.round(p.estPrime * 0.15),
          score,
          rationale,
          cta: 'Créer devis',
        };
      })
      .sort((a,b) => b.score - a.score)
      .slice(0, 4);

    const potentielCA = opportunites.reduce((s,o) => s + (o.prime_estimee || 0), 0);

    res.json({
      client_id: clientId,
      client_type: typeNorm,
      produits_existants: produitsExistants,
      opportunites,
      potentiel_ca_annuel: potentielCA,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GET /api/clients/:id/cross-sell error:', err.message);
    res.status(500).json({ error: 'cross_sell_failed', message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/:id/dossier — Dossier prêt à tarifer
// Score complétude, docs manquants, risques, partenaires recommandés
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/dossier', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const clientId = parseInt(req.params.id);
    if (!Number.isFinite(clientId)) return res.status(400).json({ error: 'ID invalide' });

    const { rows: clients } = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND courtier_id = $2',
      [clientId, userId]
    );
    if (!clients[0]) return res.status(404).json({ error: 'client_not_found' });
    const c = clients[0];

    const { rows: docs } = await pool.query(
      "SELECT id, document_type, original_filename, status FROM client_documents WHERE client_id = $1 AND status != 'deleted'",
      [clientId]
    );

    const LABELS = { piece_identite:'Pièce d\'identité', justif_domicile:'Justificatif de domicile', releve_information:'Relevé d\'information', permis_conduire:'Permis de conduire', carte_grise:'Carte grise', rib:'RIB' };
    const REQUIRED = ['piece_identite','justif_domicile','releve_information','permis_conduire','carte_grise','rib'];
    const docTypes = new Set(docs.map(d => d.document_type));
    const present = [], missing = [];
    for (const t of REQUIRED) {
      const has = [...docTypes].some(dt => dt === t || dt === t.replace(/_/g,'-'));
      if (has) present.push({ type:t, label:LABELS[t]||t });
      else missing.push({ type:t, label:LABELS[t]||t });
    }
    const rate = Math.round((present.length / REQUIRED.length) * 100);

    const riskTags = [];
    const sinistres = parseInt(c.nb_sinistres_3ans || 0);
    if (sinistres >= 2) riskTags.push({ tag:'resiliation', severity:'high', label:'Résiliation non-paiement' });
    if (sinistres >= 1) riskTags.push({ tag:'sinistres', severity:'medium', label:'Sinistres récents' });
    if (c.bonus_malus && parseFloat(c.bonus_malus) > 1) riskTags.push({ tag:'bonus_malus', severity:'high', label:'Bonus/malus dégradé' });
    if ((c.age||35) < 26) riskTags.push({ tag:'jeune_conducteur', severity:'medium', label:'Jeune conducteur' });

    const { rows: partners } = await pool.query(
      'SELECT id, nom, type_partenaire, statut, access_type FROM partners WHERE user_id = $1 ORDER BY priorite ASC LIMIT 20',
      [userId]
    );
    const recommended = partners.filter(p => p.statut === 'Actif' || p.statut === 'En_cours' || p.type_partenaire === 'Spécialisé');

    const ark = { score:rate, niveau:rate>=80?'Prêt':rate>=50?'En_cours':'Incomplet', next_action:rate>=80?'Créer un dossier de tarification':'Récupérer '+missing.length+' document(s)', risque_principal:riskTags.filter(r=>r.severity==='high').map(r=>r.label).join(', ')||'Aucun' };

    res.json({ success:true, client:{id:c.id,first_name:c.first_name,last_name:c.last_name,email:c.email,phone:c.phone}, dossier:{completion_rate:rate,documents_presents:present,documents_manquants:missing}, risques:riskTags, partenaires_recommandes:recommended.map(p=>({id:p.id,nom:p.nom,type:p.type_partenaire,statut:p.statut,access:p.access_type})), ark_summary:ark });
  } catch(err) {
    console.error('GET /api/clients/:id/dossier error:', err.message);
    res.status(500).json({ error:'dossier_failed', message:err.message });
  }
});

module.exports = router;
