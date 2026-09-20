const express = require('express')
const router = express.Router()
const OpenAI = require('openai')
const { verifyToken } = require('../middleware/auth')
const { requireUnderLimit } = require('../middleware/planGuard')
const { incrementUsage } = require('../services/planService')
const { trackEvent } = require('../services/analyticsService')
const logger = require('../lib/logger')
// Réponses IA normalisées : une indisponibilité du moteur IA se traduit par un
// 503 lisible, jamais par un 500 portant l'erreur brute du fournisseur.
const {
  estErreurIa,
  repondreIaIndisponible,
  repondreIaNonConfiguree,
  journaliserErreurIa,
} = require('../services/iaErreurs')
const pool = require('../db')
// Montants : cast tolérant, pour qu'une prime illisible en base ne fasse pas
// tomber la lecture du portefeuille par l'assistant (lib/montants.js).
const { montantSur } = require('../lib/montants')
const { requireCabinetFeature } = require('../middleware/cabinetAccess')
// Portée CABINET (le dossier appartient au cabinet, pas à la colonne
// `broker_id` — jamais écrite par le produit) : autorité unique de l'autorisation.
const porteeCabinet = require('../lib/porteeCabinet')
const marcheCabinet = require('../lib/marcheCabinet')
const {
  buildAndStoreMorningBrief,
  chargeArkRun,
  computeAndStoreRiskScores,
  ensureArkBudget,
  rewriteFallback,
} = require('../services/arkProactiveService')

// LOT 3: Services ARK Anthropic Claude
const { callArk, callArkLight, callArkStructured, checkRateLimit } = require('../services/arkEngine')
const { getClientContext, getPortfolioContext, getMorningBriefContext, getMessageContext, getComplianceContext } = require('../services/arkContext')
const { getPrompt, PROMPTS, MARCHES, personaDuMarche, construireBlocMarche, chargerMarcheCabinet } = require('../services/arkPrompts')

// Initialisation client DeepSeek (compatible OpenAI SDK)
const { clientIA } = require('../lib/aiClient')
const openai = clientIA(OpenAI, { apiKeyVar: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com/v1' })

function arkConfigurationRequired(res) {
  return res.status(503).json({
    error: 'configuration_required',
    provider: 'deepseek',
    message: 'Configuration ARK requise. Ajoutez DEEPSEEK_API_KEY pour activer le chat IA.',
  })
}

/**
 * VÉRITÉ DES RÉPONSES IA — correction 20/09/2026.
 *
 * Toutes les routes ARK de ce fichier répondaient `success: true` avec un
 * objet de repli FABRIQUÉ quand le moteur IA ne renvoyait pas de JSON
 * exploitable (`{summary: result.text}`, `{actions: []}`,
 * `{overallStatus:'unknown', checks: []}`, `{overallScore:0, metrics:{}}`…).
 * Le courtier croyait lire un brief, un audit de conformité ou des actions
 * calculées alors qu'aucune analyse n'avait été produite.
 *
 * Règle désormais appliquée : `success: true` EXIGE un contenu réel
 * (`result.structured`, ou — pour les routes dont la réponse est du texte —
 * un `result.text` non vide). Sinon la route répond 503 `ia_indisponible` avec
 * un message produit. Aucune donnée inventée n'est renvoyée.
 */
const MESSAGE_IA_INEXPLOITABLE =
  "L'assistant IA n'a pas renvoyé de résultat exploitable : aucune donnée n'a été produite. Réessayez dans quelques instants."

/** 503 « réponse IA inexploitable » (aucun `success:true` vide). */
function refuserResultatIaInexploitable(res, contexte = {}) {
  journaliserErreurIa(new Error('réponse IA sans contenu exploitable'), {
    ...contexte,
    motif: 'reponse_ia_inexploitable',
  })
  return res.status(503).json({ error: 'ia_indisponible', message: MESSAGE_IA_INEXPLOITABLE })
}

/** Traduit `result.error` (moteur absent / KO) en 503 produit, sans clé API ni erreur fournisseur. */
function repondreErreurMoteurIa(res, result, contexte = {}) {
  if (result?.error === 'configuration_required') return repondreIaNonConfiguree(res, contexte)
  return repondreIaIndisponible(res, new Error(String(result?.error || 'ia_indisponible')), contexte)
}

/**
 * Contrôle commun avant toute réponse en succès.
 * @returns {null|import('express').Response} null = contenu exploitable.
 */
function verifierResultatIa(res, result, contexte = {}, { structureRequise = true } = {}) {
  if (result?.error) return repondreErreurMoteurIa(res, result, contexte)
  const structure = result?.structured
  if (structure !== null && structure !== undefined) return null
  if (!structureRequise && typeof result?.text === 'string' && result.text.trim().length > 0) return null
  return refuserResultatIaInexploitable(res, contexte)
}

function getCurrentUserId(req) {
  return Number(req.user?.userId || req.user?.id || 0)
}

/**
 * MARCHÉ DU CABINET POUR CETTE REQUÊTE — correction 20/09/2026 (défaut P0).
 *
 * POURQUOI CE HELPER
 * Les huit routes IA de ce fichier appelaient `getPrompt('…')` SANS argument :
 * le marché valait donc toujours 'FR' et l'assistant ARK se présentait à un
 * cabinet suisse comme « expert en courtage d'assurance français » (DDA, ORIAS,
 * ACPR, loi Hamon, primes en €) — référentiels qui ne s'appliquent pas à lui et
 * registre qu'il ne possède pas. Le marché se lit UNE fois par requête, depuis
 * le CABINET (lib/marcheCabinet : cabinet → référent → profil si compte sans
 * cabinet), jamais depuis la fiche de la personne connectée.
 */
async function marcheDeLaRequete(req, userId) {
  return chargerMarcheCabinet(req.app.locals.pool || pool, userId)
}

function normalizeRecommendation(row = {}) {
  return {
    ...row,
    suggested_action: typeof row.suggested_action === 'string'
      ? JSON.parse(row.suggested_action || '{}')
      : (row.suggested_action || {}),
  }
}

const proactiveGuard = requireCabinetFeature('v1_ark_proactive')

router.get('/budget', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const budget = await ensureArkBudget(req.app.locals.pool || pool, userId)
    res.json({
      ...budget,
      mode: process.env.ANTHROPIC_API_KEY ? 'llm_ready' : 'local_fallback',
      configuration_required: !process.env.ANTHROPIC_API_KEY,
    })
  } catch (err) {
    res.status(500).json({ error: 'ark_budget_unavailable', message: 'Budget ARK indisponible.' })
  }
})

router.post('/score-clients', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const rows = await computeAndStoreRiskScores(req.app.locals.pool || pool, userId)
    res.json({ data: rows, total: rows.length })
  } catch (err) {
    res.status(500).json({ error: 'ark_score_failed', message: 'Calcul des scores ARK impossible.' })
  }
})

router.post('/morning-brief', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await buildAndStoreMorningBrief(req.app.locals.pool || pool, userId)
    await trackEvent({
      userId,
      event: 'ark_morning_brief_opened',
      properties: { source: result.source || 'unknown' },
    }).catch(() => {})
    res.json({
      ...result,
      mode: result.source === 'deterministic_fallback' ? 'local_fallback' : 'llm_ready',
      configuration_required: !process.env.ANTHROPIC_API_KEY,
    })
  } catch (err) {
    if (err.status === 402) {
      return res.status(402).json({
        error: 'ark_budget_exceeded',
        message: 'ARK est temporairement suspendu pour ce cabinet car le plafond mensuel est atteint.',
      })
    }
    res.status(500).json({ error: 'ark_morning_brief_failed', message: 'Morning Brief ARK indisponible.' })
  }
})

router.get('/recommendations', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await (req.app.locals.pool || pool).query(
      `SELECT ar.*, CONCAT(c.first_name, ' ', c.last_name) AS client_name
       FROM ark_recommendations ar
       LEFT JOIN clients c ON c.id = ar.client_id
       WHERE ar.user_id = $1
         AND ar.dismissed_at IS NULL
         AND (ar.expires_at IS NULL OR ar.expires_at > NOW())
       ORDER BY ar.priority DESC, ar.created_at DESC
       LIMIT 50`,
      [userId]
    )
    res.json({ data: result.rows.map(normalizeRecommendation), total: result.rows.length })
  } catch (err) {
    res.status(500).json({ error: 'ark_recommendations_unavailable', message: 'Recommandations ARK indisponibles.' })
  }
})

router.post('/recommendations/:id/act', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    const id = Number(req.params.id)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await (req.app.locals.pool || pool).query(
      `UPDATE ark_recommendations
       SET acted_on_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'recommendation_not_found' })
    res.json(normalizeRecommendation(result.rows[0]))
  } catch (err) {
    res.status(500).json({ error: 'ark_recommendation_action_failed', message: 'Action ARK impossible.' })
  }
})

router.post('/recommendations/:id/dismiss', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    const id = Number(req.params.id)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const result = await (req.app.locals.pool || pool).query(
      `UPDATE ark_recommendations
       SET dismissed_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'recommendation_not_found' })
    res.json(normalizeRecommendation(result.rows[0]))
  } catch (err) {
    res.status(500).json({ error: 'ark_recommendation_dismiss_failed', message: 'Masquage ARK impossible.' })
  }
})

router.post('/rewrite', proactiveGuard, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })
    const text = String(req.body?.text || '').trim()
    const mode = String(req.body?.mode || 'rephrase')
    if (!text) return res.status(400).json({ error: 'text_required', message: 'Texte requis.' })

    // VÉRITÉ DE LA FACTURATION — correction 20/09/2026 (défaut IA-009).
    // Cette route n'appelle AUCUN modèle : elle applique `rewriteFallback`, une
    // transformation locale déterministe. Elle était pourtant journalisée dans
    // `ark_runs` avec le modèle `ARK_LIGHT_MODEL`, un statut
    // « llm_ready_fallback_text » et des jetons DEVINÉS (length/4) — donc
    // facturés au cabinet ; le plafond mensuel ARK pouvait être atteint sans
    // qu'aucune requête IA n'ait été émise. On journalise désormais la vérité :
    // modèle 'local', statut 'local_fallback', ZÉRO jeton, coût nul.
    const rewritten = rewriteFallback(text, mode)
    await chargeArkRun(req.app.locals.pool || pool, {
      userId,
      feature: `rewrite.${mode}`,
      model: 'local',
      inputTokens: 0,
      outputTokens: 0,
      status: 'local_fallback',
    })
    res.json({
      text: rewritten,
      mode,
      source: 'local_fallback',
      ia_appelee: false,
      configuration_required: !process.env.ANTHROPIC_API_KEY,
    })
  } catch (err) {
    if (err.status === 402) return res.status(402).json({ error: 'ark_budget_exceeded' })
    res.status(500).json({ error: 'ark_rewrite_failed', message: 'Réécriture ARK indisponible.' })
  }
})

/**
 * POST /api/ark/chat
 * Chat avec ARK — utilisable depuis la fiche client ET le drawer global
 */
router.post('/chat', verifyToken, requireUnderLimit('ark_messages'), async (req, res) => {
  try {
    // Accepter plusieurs formats de payload
    const message = req.body.message || req.body.userMessage || req.body.question || ''
    const clientData = req.body.clientData || null
    const conversationHistory = Array.isArray(req.body.conversationHistory) ? req.body.conversationHistory : []

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message vide ou manquant' })
    }

    // ────────────────────────────────────────────────────────────────────────
    // PORTÉE DU DOSSIER — correction P1 SEC-004 (défaut mesuré le 20/09/2026)
    //
    // DÉFAUT : `req.body.clientData` venait de l'APPELANT et les requêtes
    // d'autocomplétion ne portaient AUCUNE condition d'appartenance
    // (`WHERE client_id = $1`). Un appelant qui connaissait l'identifiant d'un
    // client d'un AUTRE cabinet faisait donc lire ses contrats et ses tâches, qui
    // partaient dans le prompt ARK — et cette lecture avait lieu AVANT le
    // contrôle de configuration IA, donc même sans clé IA.
    //
    // RÈGLE APPLIQUÉE : le corps de la requête ne fournit plus qu'un IDENTIFIANT,
    // jamais des données. L'identifiant doit être résolu DANS LA PORTÉE de
    // l'appelant (lib/porteeCabinet : le cabinet de l'utilisateur, ou ses propres
    // lignes s'il n'a pas de cabinet). Hors portée ⇒ 404, AVANT toute lecture de
    // contrat ou de tâche : aucune donnée d'un autre cabinet n'est atteignable.
    // ────────────────────────────────────────────────────────────────────────
    const clientIdDemande = Number.parseInt(clientData && clientData.id, 10)
    const clientId = Number.isFinite(clientIdDemande) && clientIdDemande > 0 ? clientIdDemande : null
    let ficheClient = null
    let porteeDossier = null

    if (clientId) {
      // Portée de l'appelant, résolue UNE fois pour toute la requête.
      porteeDossier = await porteeCabinet.resoudrePortee(pool, req)
      const fClient = porteeCabinet.fragment(porteeDossier, {
        cabinet: 'c.cabinet_id',
        proprietaire: 'c.courtier_id',
        depart: 2,
      })
      const ficheRes = await pool.query(
        `SELECT c.* FROM clients c WHERE c.id = $1 AND ${fClient.sql} LIMIT 1`,
        [clientId, ...fClient.params]
      )
      ficheClient = ficheRes.rows[0] || null
      if (!ficheClient) {
        // Même réponse pour « inexistant » et « d'un autre cabinet » : la route
        // ne révèle pas l'existence d'un dossier qu'elle ne peut pas ouvrir.
        return res.status(404).json({
          error: 'client_introuvable',
          message: "Ce client n'appartient pas à votre cabinet.",
        })
      }
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return arkConfigurationRequired(res)
    }

    // Construire le prompt système selon le contexte
    // Le marché est lu depuis le CABINET une seule fois, et sert à la fois au
    // persona et à la devise des montants affichés au modèle.
    const marche = await marcheDeLaRequete(req, getCurrentUserId(req) || Number(req.user?.userId || req.user?.id || 0))
    const devise = (MARCHES[marche] || MARCHES.FR).devise
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    let systemPrompt
    if (ficheClient) {
      // Contrats et tâches lus SOUS PORTÉE (jamais depuis le corps de requête) :
      // `client_id = $1` est TOUJOURS accompagné du fragment de portée cabinet,
      // qui joint `clients c`. Le dossier d'un autre cabinet a déjà été refusé
      // (404) ci-dessus, et la clause SQL le re-vérifie : la lecture ne peut pas
      // atteindre une ligne hors périmètre.
      const fQuotes = porteeCabinet.fragment(porteeDossier, {
        cabinet: 'c.cabinet_id',
        proprietaire: 'c.courtier_id',
        depart: 2,
      })
      let contrats = []
      try {
        const contratsResult = await pool.query(
          `SELECT 
            q.status,
            q.quote_data->>'type_contrat' as type_contrat,
            q.quote_data->>'compagnie' as compagnie,
            ${montantSur('q')} as prime_annuelle,
            q.quote_data->>'date_echeance' as date_echeance
          FROM quotes q
          JOIN clients c ON c.id = q.client_id
          WHERE q.client_id = $1 AND ${fQuotes.sql} /* portée cabinet */`,
          [clientId, ...fQuotes.params]
        )
        contrats = contratsResult.rows || []
      } catch (fetchErr) {
        logger.warn({ error: fetchErr.message }, 'ark client context fetch failed')
      }

      const fTaches = porteeCabinet.fragment(porteeDossier, {
        cabinet: 'c.cabinet_id',
        proprietaire: 'c.courtier_id',
        depart: 2,
      })
      let tachesActives = []
      try {
        const tachesResult = await pool.query(
          `SELECT t.titre as title, t.priorite as priority, t.statut as status, t.echeance as due_date
           FROM taches t
           JOIN clients c ON c.id = t.client_id
           WHERE t.client_id = $1 AND ${fTaches.sql} /* portée cabinet */
           ORDER BY t.echeance ASC LIMIT 5`,
          [clientId, ...fTaches.params]
        )
        tachesActives = tachesResult.rows || []
      } catch (fetchErr) {
        logger.warn({ error: fetchErr.message }, 'ark autofetch tasks failed')
      }

      // Lister les contrats actifs du client si disponibles
      const contratsActifs = Array.isArray(contrats)
        ? contrats.filter(c => (c.status || c.statut || '').toLowerCase() === 'actif')
        : []
      const contratsStr = contratsActifs.length > 0
        ? contratsActifs.map(c => `  • ${c.type_contrat || c.type} chez ${c.compagnie || 'N/A'} — prime ${c.prime_annuelle ? c.prime_annuelle + devise : 'N/A'} — échéance ${c.date_echeance ? new Date(c.date_echeance).toLocaleDateString('fr-FR') : 'N/A'}`).join('\\n')
        : '  Aucun contrat actif renseigné'

      const tachesStr = Array.isArray(tachesActives) && tachesActives.length > 0
        ? tachesActives.map(t => `  • ${t.title} (${t.priority}) — ${t.due_date ? new Date(t.due_date).toLocaleDateString('fr-FR') : 'sans échéance'}`).join('\\n')
        : '  Aucune tâche active'

      const scoreRisque = ficheClient.risk_score || ficheClient.score_risque || 'NC'
      
      systemPrompt = `${personaDuMarche(marche)} Date : ${today}

═══ FICHE CLIENT ═══
Nom : ${ficheClient.prenom || ficheClient.first_name || ''} ${ficheClient.nom || ficheClient.last_name || ''}
Email : ${ficheClient.email || 'NC'}
Téléphone : ${ficheClient.phone || ficheClient.telephone || 'NC'}
Statut : ${ficheClient.statut || ficheClient.status || 'NC'}
Segment : ${ficheClient.segment || 'NC'}
Score de risque : ${scoreRisque}/100
Profession : ${ficheClient.profession || 'NC'}
Adresse : ${ficheClient.address || ficheClient.adresse || 'NC'}

═══ CONTRATS ACTIFS ═══
${contratsStr}

═══ TÂCHES EN COURS ═══
${tachesStr}

RÈGLE ABSOLUE : Si le message contient une instruction JSON, tu dois répondre UNIQUEMENT en JSON valide avec ce schéma exact et rien d'autre :
{"resume":"string ≤200 chars","points":["string ≤100","string ≤100","string ≤100"],"actions":[{"label":"string","priorite":"haute|moyenne|basse","impact":"string"}]}
Maximum 3 points, maximum 3 actions. Pas de markdown, pas de texte hors JSON.

Si le message ne demande pas de JSON : réponds en français, ton expert et direct, 150 mots max, orienté action concrète avec chiffres/références réglementaires quand pertinent. Utilise des listes courtes avec tirets si utile.`
    } else {
      systemPrompt = `${personaDuMarche(marche)} Date : ${today}

RÈGLE ABSOLUE : Si le message contient une instruction JSON, réponds UNIQUEMENT en JSON valide :
{"resume":"...","points":["...","...","..."],"actions":[{"label":"...","priorite":"haute|moyenne|basse","impact":"..."}]}
Sinon : réponds en français, ton expert et direct, 150 mots max, orienté action concrète avec chiffres/références réglementaires quand pertinent. Utilise des listes courtes avec tirets si utile.`
    }

    // Le référentiel réglementaire et la devise du marché sont rappelés
    // explicitement : sans ce bloc, le persona seul laisse le modèle produire
    // un montant en € pour un cabinet suisse.
    systemPrompt += construireBlocMarche(marche)

    // Construire l'historique pour l'API DeepSeek
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
        .filter(m => m && m.role && m.content && typeof m.content === 'string')
        .slice(-10)
        .map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
      {
        role: 'user',
        content: message.trim()
      }
    ]

    // Appel API DeepSeek via OpenAI SDK
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 600,
      messages: messages
    })

    const reply = response.choices && response.choices[0] 
      ? response.choices[0].message.content 
      : 'Aucune réponse générée'

    // Sauvegarder dans ark_conversations si un dossier a été résolu DANS LA
    // PORTÉE (l'identifiant vient du corps, mais il a déjà été validé : écrire
    // une conversation sur un `client_id` non validé créerait une ligne dans le
    // dossier d'un autre cabinet).
    if (ficheClient && clientId) {
      try {
        const existing = await pool.query(
          'SELECT id, messages FROM ark_conversations WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
          [clientId]
        )

        const timestamp = new Date().toISOString()
        const newMsg = [
          { role: 'user', content: message, timestamp },
          { role: 'assistant', content: reply, timestamp }
        ]

        if (existing.rows.length > 0) {
          const currentMessages = existing.rows[0].messages || []
          const updatedMessages = [...currentMessages, ...newMsg].slice(-50)
          // `AND client_id = $3` : la conversation est écrite sur le dossier
          // VALIDÉ en portée, jamais sur un identifiant venu d'ailleurs (même
          // défense que la lecture ci-dessus).
          await pool.query(
            'UPDATE ark_conversations SET messages = $1, updated_at = NOW() WHERE id = $2 AND client_id = $3',
            [JSON.stringify(updatedMessages), existing.rows[0].id, clientId]
          )
        } else {
          await pool.query(
            'INSERT INTO ark_conversations (client_id, messages, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
            [clientId, JSON.stringify(newMsg)]
          )
        }
      } catch (saveErr) {
        logger.warn({ error: saveErr.message }, 'ark conversation save failed')
      }
    }

    // Répondre au frontend
    res.json({ reply })

    // Incrémenter usage APRÈS réponse réussie
    try {
      const userId = req.user.userId || req.user.id
      await incrementUsage(userId, 'ark_messages')
    } catch (err) {
      logger.warn({ error: err.message }, 'ark usage increment failed')
    }

  } catch (err) {
    logger.error({ err }, 'ark chat failed')

    // Gérer les erreurs DeepSeek spécifiques
    if (err.status === 401 || (err.message && err.message.includes('api_key'))) {
      return res.status(503).json({
        error: 'configuration_required',
        provider: 'deepseek',
        message: 'Clé API DeepSeek invalide ou expirée.'
      })
    }

    if (err.status === 429 || (err.message && err.message.includes('rate_limit'))) {
      return res.status(429).json({
        error: 'Limite d\'utilisation ARK atteinte',
        details: 'Réessayez dans quelques instants'
      })
    }

    if (err.status === 404 || (err.message && err.message.includes('model'))) {
      return res.status(503).json({
        error: 'provider_unavailable',
        provider: 'deepseek',
        message: 'Modèle ARK indisponible. Contactez le support COURTIA.'
      })
    }

    res.status(503).json({
      error: 'provider_unavailable',
      provider: 'deepseek',
      message: 'ARK temporairement indisponible.'
    })
  }
})

/**
 * GET /api/ark/conversations/:clientId
 * GET /api/ark/history/:clientId
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * P0 — FUITE INTER-CABINETS (mesurée en production le 20/09/2026)
 *
 * DÉFAUT : les deux routes lisaient la conversation ARK avec
 *   `SELECT messages FROM ark_conversations WHERE client_id = $1`
 * — AUCUN filtre de cabinet, AUCUN filtre d'utilisateur. Un compte de n'importe
 * quel cabinet qui connaissait l'identifiant d'un client (identifiant entier
 * devinable) relisait l'intégralité de sa conversation ARK : elle contient le
 * nom, la situation familiale, les contrats et les primes du client, et les
 * réponses de l'assistant. Reproduit avec quatre comptes de trois cabinets
 * différents (marqueur relu depuis trois cabinets étrangers au dossier).
 * Aggravant : `getConversationHistory` était enregistré DEUX fois
 * (`/conversations` et `/history`), et un second gestionnaire `/history` —
 * inatteignable — portait une lecture tout aussi peu filtrée ; deux écritures
 * divergentes pour une même route est exactement ce qui laisse un trou se
 * rouvrir.
 *
 * RÈGLE APPLIQUÉE (la même que POST /ark/chat, SEC-004) : l'identifiant de
 * l'URL n'est qu'un identifiant. Le dossier est résolu DANS LA PORTÉE DE
 * L'APPELANT (lib/porteeCabinet : le cabinet de l'utilisateur, ou ses propres
 * lignes s'il n'a pas de cabinet) AVANT toute lecture de `ark_conversations`.
 * Hors portée ⇒ 404, et la requête de lecture n'est même pas émise : aucune
 * ligne d'un autre cabinet ne peut être atteinte, et la route ne révèle pas
 * l'existence d'un dossier qu'elle ne peut pas ouvrir.
 *
 * La réponse garde le contrat attendu par l'écran (ARKChatTab lit
 * `data.messages`) au lieu du tableau brut que le second gestionnaire
 * inatteignable ne renvoyait jamais.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const getConversationHistory = async (req, res) => {
  const pool = req.app.locals.pool || require('../db')
  const clientId = validateClientId(req.params.clientId)
  if (!clientId) {
    return res.status(400).json({ error: 'invalid_client_id', message: 'Identifiant client invalide.' })
  }

  // 1. PORTÉE : le dossier doit appartenir au cabinet de l'appelant.
  let portee
  try {
    portee = await porteeCabinet.resoudrePortee(pool, req)
  } catch (err) {
    logger.warn({ error: err.message, clientId }, 'ark conversations : portée illisible')
    return res.status(503).json({
      error: 'conversations_indisponibles',
      message: "L'historique ARK est momentanément indisponible. Aucune donnée n'a été transmise.",
    })
  }
  const fClient = porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 2,
  })
  let dossier
  try {
    dossier = await pool.query(
      `SELECT c.id FROM clients c WHERE c.id = $1 AND ${fClient.sql} /* portée cabinet */ LIMIT 1`,
      [clientId, ...fClient.params]
    )
  } catch (err) {
    logger.warn({ error: err.message, clientId }, 'ark conversations : dossier illisible')
    return res.status(503).json({
      error: 'conversations_indisponibles',
      message: "L'historique ARK est momentanément indisponible. Aucune donnée n'a été transmise.",
    })
  }
  if (!dossier?.rows?.[0]) {
    // Même réponse pour « inexistant » et « d'un autre cabinet » : la route ne
    // confirme jamais l'existence d'un dossier hors de la portée de l'appelant.
    return res.status(404).json({
      error: 'client_introuvable',
      message: "Ce client n'appartient pas à votre cabinet.",
    })
  }

  // 2. LECTURE : seulement maintenant, et seulement sur un dossier en portée.
  try {
    const result = await pool.query(
      'SELECT messages FROM ark_conversations WHERE client_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [clientId]
    )
    return res.json({ messages: result.rows[0]?.messages || [] })
  } catch (err) {
    // Une panne de lecture ne doit pas se présenter comme « aucune conversation » :
    // l'écran afficherait un historique vide, donc faux.
    logger.warn({ error: err.message, clientId }, 'ark conversations unavailable')
    return res.status(503).json({
      error: 'conversations_indisponibles',
      message: "L'historique ARK est momentanément indisponible. Réessayez dans quelques instants.",
    })
  }
}
router.get('/conversations/:clientId', verifyToken, getConversationHistory)
router.get('/history/:clientId', verifyToken, getConversationHistory)

// ── Extension Chrome: analyser une page web ────────────────────────
router.post('/extension/analyze', verifyToken, async (req, res) => {
  try {
    if (!process.env.DEEPSEEK_API_KEY) return arkConfigurationRequired(res)
    const { url, title, text, forms } = req.body.pageData || req.body;
    if (!text && (!forms || forms.length === 0)) {
      return res.status(400).json({ error: 'Donnees de page requises' });
    }

    const pageContext = `URL: ${url || 'inconnue'}
Titre: ${title || ''}

Contenu de la page:
${(text || '').substring(0, 3000)}

Formulaires detectes:
${(forms || []).map((f, i) =>
  `Formulaire #${i + 1}: ${f.title || f.action || 'sans titre'}
  ${(f.fields || []).map(fd =>
    `  - ${fd.label || fd.name || '?'} (${fd.type || 'text'})${fd.required ? ' *requis' : ''}`
  ).join('\n')}`
).join('\n\n')}`;

    const systemPrompt = `Tu es ARK, l'assistant intelligent de COURTIA, un logiciel pour courtiers en assurances.
Analyse le contenu de la page web et les formulaires detectes.

Reponds UNIQUEMENT avec un objet JSON valide :
{
  "analysis": "analyse concise de la page en 2-3 phrases (en francais)",
  "suggestions": [
    {
      "field_name": "nom du champ",
      "field_label": "label du champ",
      "suggested_value": "valeur suggeree",
      "selector": "selecteur CSS du champ si disponible",
      "confidence": 0.0 a 1.0,
      "reason": "pourquoi cette valeur"
    }
  ]
}

Regles de securite ABSOLUES :
- NE JAMAIS suggerer de mots de passe
- NE JAMAIS suggerer d'informations bancaires
- NE JAMAIS suggerer de donnees personnelles reelles
- Les suggestions doivent etre des valeurs par defaut ou des aides (ex: type d'assurance, civilité)
- Si le formulaire est inconnu ou sans rapport avec l'assurance, reponds {"analysis": "Aucune suggestion pertinente pour cette page.", "suggestions": []}`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: pageContext }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    let result;
    try { result = JSON.parse(cleaned); }
    catch { result = { analysis: raw.substring(0, 500), suggestions: [] }; }

    return res.json(result);
  } catch (err) {
    logger.error({ err }, 'ark extension analyze failed');
    return res.status(503).json({ error: 'provider_unavailable', analysis: 'Analyse ARK indisponible.', suggestions: [] });
  }
});

// ── Extension Chrome: suggestion de remplissage pour un champ ────────
router.post('/extension/fill', verifyToken, async (req, res) => {
  try {
    if (!process.env.DEEPSEEK_API_KEY) return arkConfigurationRequired(res)
    const { field_name, field_label, form_title, page_title } = req.body;

    const prompt = `Tu es ARK, assistant pour courtiers en assurances COURTIA.
Un courtier remplit un formulaire et a besoin d'une suggestion pour un champ.

Champ: ${field_label || field_name || 'inconnu'}
Formulaire: ${form_title || 'inconnu'}
Page: ${page_title || 'inconnue'}

Suggestions:
1. Si le champ est un type d'assurance: "Auto", "Moto", "Habitation", "Sante", "Professionnelle", "MRH"
2. Si le champ est une civilite: "M.", "Mme", "Mlle"
3. Si le champ est un pays: "France"
4. Si le champ est une date: la date courante approximee
5. Sinon, une valeur par defaut pertinente

REGLES DE SECURITE:
- Ne jamais suggerer de mot de passe, numero de carte, ou donnees personnelles
- Si le champ est sensible, reponds {"suggestion": null, "raison": "Champ sensible, remplissage manuel requis"}

Reponds UNIQUEMENT avec ce JSON:
{"suggestion": "valeur ou null", "confiance": 0.0-1.0, "raison": "explication courte"}`;

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '{"suggestion":null,"confiance":0,"raison":"Erreur"}';
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

    let result;
    try { result = JSON.parse(cleaned); }
    catch { result = { suggestion: null, confiance: 0, raison: 'Erreur de parsing' }; }

    return res.json(result);
  } catch (err) {
    logger.error({ err }, 'ark extension fill failed');
    return res.status(503).json({ error: 'provider_unavailable', message: 'Suggestion ARK indisponible.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LOT 3: Routes ARK avec Anthropic Claude (implémentation réelle)
// ═══════════════════════════════════════════════════════════════════════════

// Helper: obtenir userId de façon sécurisée
function getArkUserId(req) {
  return Number(req.user?.userId || req.user?.id || 0)
}

// Helper: valider clientId (numérique uniquement)
function validateClientId(id) {
  const parsed = parseInt(id, 10)
  if (isNaN(parsed) || parsed <= 0) return null
  return parsed
}

// POST /api/ark/actions — Dispatcher central des actions ARK
router.post('/actions', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const { action, params = {}, context = {} } = req.body
    if (!action) return res.status(400).json({ error: 'action_required', message: 'Action requise' })

    logger.info({ userId, action, params }, 'ARK action requested')

    const prompt = getPrompt('actions', await marcheDeLaRequete(req, userId))
    const result = await callArk({
      system: prompt.system,
      user: `Action demandée: ${action}\nParamètres: ${JSON.stringify(params)}\nContexte page: ${JSON.stringify(context)}`,
      context: { action, params, pageContext: context },
      maxTokens: prompt.maxTokens,
      jsonMode: true,
      userId,
      route: 'actions'
    })

    if (result.error) {
      return repondreErreurMoteurIa(res, result, { route: 'ark_actions', action })
    }
    // `/actions` peut légitimement répondre du texte (pas seulement du JSON) :
    // on exige alors un texte NON VIDE. Avant, un résultat vide partait en
    // `success: true` avec `{summary: undefined}`.
    const refus = verifierResultatIa(res, result, { route: 'ark_actions', action }, { structureRequise: false })
    if (refus) return refus

    res.json({
      success: true,
      action,
      data: result.structured || { summary: result.text },
      usage: result.usage,
      model: result.model,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err }, 'ARK actions failed')
    if (estErreurIa(err)) return repondreIaIndisponible(res, err, { route: 'ark_actions' })
    res.status(500).json({ error: 'ark_actions_failed', message: 'Le traitement ARK de cette action est momentanément indisponible.' })
  }
})

// GET /api/ark/client/:id/brief — Résumé client compact
router.get('/client/:id/brief', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const clientId = validateClientId(req.params.id)
    if (!clientId) return res.status(400).json({ error: 'invalid_client_id' })

    // Récupérer contexte client
    const clientContext = await getClientContext(clientId, userId, { req })
    if (clientContext.error) {
      return res.status(404).json({ error: clientContext.error, message: clientContext.message })
    }

    const prompt = getPrompt('clientBrief', await marcheDeLaRequete(req, userId))
    const result = await callArkLight({
      system: prompt.system,
      user: `Génère un brief pour ce client.`,
      context: clientContext,
      maxTokens: prompt.maxTokens,
      jsonMode: true,
      userId,
      clientId,
      route: 'client_brief'
    })

    if (result.error) {
      return repondreErreurMoteurIa(res, result, { route: 'client_brief', clientId })
    }
    // Un brief est un objet structuré : sans JSON exploitable, la route échoue
    // (503) au lieu de renvoyer `success:true` avec un brief vide/fabriqué.
    const refus = verifierResultatIa(res, result, { route: 'client_brief', clientId })
    if (refus) return refus

    res.json({
      success: true,
      action: 'client_brief',
      data: {
        clientId,
        ...result.structured
      },
      usage: result.usage,
      model: result.model,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err, clientId: req.params.id }, 'ARK client brief failed')
    // IA indisponible => 503 lisible (jamais 500 avec l'erreur du fournisseur).
    if (estErreurIa(err)) return repondreIaIndisponible(res, err, { route: 'client_brief', clientId: req.params.id })
    if (/configuration/i.test(String(err.message || ''))) return repondreIaNonConfiguree(res, { route: 'client_brief' })
    res.status(500).json({ error: 'ark_client_brief_failed', message: 'Le brief client est momentanément indisponible.' })
  }
})

// GET /api/ark/client/:id/next-best-actions — Meilleures actions client
router.get('/client/:id/next-best-actions', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const clientId = validateClientId(req.params.id)
    if (!clientId) return res.status(400).json({ error: 'invalid_client_id' })

    const clientContext = await getClientContext(clientId, userId, { req })
    if (clientContext.error) {
      return res.status(404).json({ error: clientContext.error, message: clientContext.message })
    }

    const prompt = getPrompt('nextBestActions', await marcheDeLaRequete(req, userId))
    const result = await callArk({
      system: prompt.system,
      user: `Calcule les 5 meilleures actions pour ce client. Priorise selon urgence, valeur et probabilité de succès.`,
      context: clientContext,
      maxTokens: prompt.maxTokens,
      jsonMode: true,
      userId,
      clientId,
      route: 'next_best_actions'
    })

    if (result.error) {
      return repondreErreurMoteurIa(res, result, { route: 'next_best_actions', clientId })
    }
    // Sans JSON exploitable, l'ancien code renvoyait `success:true` avec
    // `{actions: []}` — un « aucune action » qui n'était pas le résultat d'une
    // analyse mais un objet fabriqué. On refuse.
    const refus = verifierResultatIa(res, result, { route: 'next_best_actions', clientId })
    if (refus) return refus

    res.json({
      success: true,
      action: 'next_best_actions',
      data: {
        clientId,
        ...result.structured
      },
      usage: result.usage,
      model: result.model,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err, clientId: req.params.id }, 'ARK next-best-actions failed')
    if (estErreurIa(err)) return repondreIaIndisponible(res, err, { route: 'next_best_actions', clientId: req.params.id })
    if (/configuration/i.test(String(err.message || ''))) return repondreIaNonConfiguree(res, { route: 'next_best_actions' })
    res.status(500).json({ error: 'ark_nba_failed', message: 'Les prochaines actions sont momentanément indisponibles.' })
  }
})

// POST /api/ark/client/:id/documents-analysis — Analyse documents client
// NOTE: Implémentation complète avec OCR + Claude Vision prévue dans LOT 4
router.post('/client/:id/documents-analysis', verifyToken, async (req, res) => {
  const userId = getArkUserId(req)
  if (!userId) return res.status(401).json({ error: 'auth_required' })

  const clientId = validateClientId(req.params.id)
  if (!clientId) return res.status(400).json({ error: 'invalid_client_id' })

  // ───────────────────────────────────────────────────────────────────────────
  // PORTÉE D'ABORD (P3 de la deuxième QA adverse, mesuré le 20/09/2026)
  //
  // DÉFAUT : cette route répondait 501 à TOUT LE MONDE, y compris à un cabinet
  // ÉTRANGER qui visait le client d'un autre cabinet. Le code annonçait donc
  // « fonctionnalité non implémentée » là où la vraie réponse était « cette
  // ressource n'existe pas pour vous » : une ressource hors cabinet doit
  // répondre 404, comme /brief, /next-best-actions et /quote-assistant, qui
  // résolvent le dossier avant tout traitement. Le résolveur de portée
  // (`services/arkContext.getClientContext`) est le MÊME que celui de ces trois
  // routes : une seule interprétation de « ce dossier est-il à moi ? ».
  //
  // Le refus « non implémentée » (501) ne subsiste que pour un dossier RÉELLEMENT
  // dans le périmètre de l'appelant : il est alors exact, porte un message
  // produit, et ne fabrique aucune donnée (aucun `success: true`).
  // ───────────────────────────────────────────────────────────────────────────
  let contexteDossier
  try {
    contexteDossier = await getClientContext(clientId, userId, { req })
  } catch (errDossier) {
    logger.error({ err: errDossier, clientId }, 'ARK documents-analysis : portée du dossier illisible')
    return res.status(503).json({
      error: 'ia_indisponible',
      message: "L'analyse documentaire ARK est momentanément indisponible. Réessayez dans quelques instants.",
    })
  }
  if (contexteDossier.error) {
    return res.status(404).json({ error: contexteDossier.error, message: contexteDossier.message })
  }

  // Le refus « non souscrite » ne s'adresse qu'à un dossier RÉELLEMENT dans le
  // périmètre de l'appelant : il est alors exact, porte un message produit, et
  // ne fabrique aucune donnée (aucun `success: true`). Le code est 403 — et non
  // plus 501 — parce que la deuxième QA adverse relève que « non implémenté »
  // est un 5xx nu sur un point d'entrée du produit : la fonctionnalité n'est pas
  // SOUSCRITE sur cette installation, ce que 403 dit sans compter comme une
  // erreur serveur. Aucune donnée client n'est lue, aucun document n'est produit.
  logger.warn(
    { userId, clientId },
    'ARK documents-analysis appelée : fonctionnalité non souscrite (LOT 4) — réponse 403'
  )
  return res.status(403).json({
    error: 'fonctionnalite_non_souscrite',
    fonctionnalite: 'documents_analysis',
    message: "L'analyse documentaire ARK (OCR et lecture des contrats) n'est pas disponible sur cette installation. "
      + 'Aucun document n’a été analysé.',
  })
})

// POST /api/ark/client/:id/quote-assistant — Assistant devis
router.post('/client/:id/quote-assistant', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const clientId = validateClientId(req.params.id)
    if (!clientId) return res.status(400).json({ error: 'invalid_client_id' })

    const { productType, needs, budget } = req.body || {}

    const clientContext = await getClientContext(clientId, userId, { req })
    if (clientContext.error) {
      return res.status(404).json({ error: clientContext.error, message: clientContext.message })
    }

    const prompt = getPrompt('quoteAssistant', await marcheDeLaRequete(req, userId))
    const userMessage = `Aide-moi à préparer un devis pour ce client.
Type de produit souhaité: ${productType || 'Non spécifié'}
Besoins exprimés: ${needs || 'À déterminer'}
Budget indicatif: ${budget || 'Non communiqué'}`

    const result = await callArk({
      system: prompt.system,
      user: userMessage,
      context: {
        ...clientContext,
        quoteRequest: { productType, needs, budget }
      },
      maxTokens: prompt.maxTokens,
      jsonMode: true,
      userId,
      clientId,
      route: 'quote_assistant'
    })

    if (result.error) {
      return repondreErreurMoteurIa(res, result, { route: 'quote_assistant', clientId })
    }
    // Le repli `{analysis: result.text, questionsToAsk: [], documentsRequired:
    // [], coverageSuggestions: []}` présentait une liste de questions et de
    // pièces VIDE comme une préparation de devis aboutie. Sans JSON
    // exploitable, on refuse.
    const refus = verifierResultatIa(res, result, { route: 'quote_assistant', clientId })
    if (refus) return refus

    res.json({
      success: true,
      action: 'quote_assistant',
      data: {
        clientId,
        ...result.structured
      },
      usage: result.usage,
      model: result.model,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err, clientId: req.params.id }, 'ARK quote-assistant failed')
    if (estErreurIa(err)) return repondreIaIndisponible(res, err, { route: 'quote_assistant', clientId: req.params.id })
    if (/configuration/i.test(String(err.message || ''))) return repondreIaNonConfiguree(res, { route: 'quote_assistant' })
    res.status(500).json({ error: 'ark_quote_assistant_failed', message: "L'assistant de devis est momentanément indisponible." })
  }
})

// POST /api/ark/compliance-check — Vérification conformité
router.post('/compliance-check', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const { clientId } = req.body || {}
    const parsedClientId = clientId ? validateClientId(clientId) : null

    let complianceContext = {}
    if (parsedClientId) {
      complianceContext = await getComplianceContext(parsedClientId, userId, { req })
      if (complianceContext.error) {
        return res.status(404).json({ error: complianceContext.error, message: complianceContext.message })
      }
    }

    const prompt = getPrompt('complianceCheck', await marcheDeLaRequete(req, userId))
    const result = await callArk({
      system: prompt.system,
      user: parsedClientId
        ? `Audite la conformité du dossier client.`
        : `Génère un checklist de conformité générale pour un courtier.`,
      context: complianceContext,
      maxTokens: prompt.maxTokens,
      jsonMode: true,
      userId,
      clientId: parsedClientId,
      route: 'compliance_check'
    })

    if (result.error) {
      return repondreErreurMoteurIa(res, result, { route: 'compliance_check', clientId: parsedClientId })
    }
    // Le repli `{overallStatus: 'unknown', checks: [], recommendations: []}`
    // ressemblait à un audit de conformité rendu — sans audit. On refuse.
    const refus = verifierResultatIa(res, result, { route: 'compliance_check', clientId: parsedClientId })
    if (refus) return refus

    res.json({
      success: true,
      action: 'compliance_check',
      data: {
        clientId: parsedClientId,
        ...result.structured
      },
      usage: result.usage,
      model: result.model,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err }, 'ARK compliance-check failed')
    if (estErreurIa(err)) return repondreIaIndisponible(res, err, { route: 'compliance_check' })
    res.status(500).json({ error: 'ark_compliance_check_failed', message: 'La vérification de conformité est momentanément indisponible.' })
  }
})

// GET /api/ark/portfolio-health — Santé portefeuille
router.get('/portfolio-health', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const portfolioContext = await getPortfolioContext(userId)

    const prompt = getPrompt('portfolioHealth', await marcheDeLaRequete(req, userId))
    const result = await callArk({
      system: prompt.system,
      user: `Analyse la santé de mon portefeuille et génère un rapport.`,
      context: portfolioContext,
      maxTokens: prompt.maxTokens,
      jsonMode: true,
      userId,
      route: 'portfolio_health'
    })

    if (result.error) {
      return repondreErreurMoteurIa(res, result, { route: 'portfolio_health' })
    }
    // Le repli `{overallScore: 0, metrics: {}, alerts: [], recommendations: []}`
    // affichait un score de portefeuille de 0 comme un résultat d'analyse (et
    // « 0 » se lit comme une note, pas comme une absence de mesure). On refuse.
    const refus = verifierResultatIa(res, result, { route: 'portfolio_health' })
    if (refus) return refus

    res.json({
      success: true,
      action: 'portfolio_health',
      data: result.structured,
      usage: result.usage,
      model: result.model,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err }, 'ARK portfolio-health failed')
    if (estErreurIa(err)) return repondreIaIndisponible(res, err, { route: 'portfolio_health' })
    res.status(500).json({ error: 'ark_portfolio_health_failed', message: "L'analyse du portefeuille est momentanément indisponible." })
  }
})

// POST /api/ark/generate — Générer contenu (email/sms/whatsapp)
// Alias: POST /api/ark/generate-message
router.post('/generate', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const { type, clientId, channel, intent, tone, context: bodyContext } = req.body || {}
    const messageChannel = channel || type || 'email'
    const parsedClientId = clientId ? validateClientId(clientId) : (bodyContext?.clientId ? validateClientId(bodyContext.clientId) : null)

    let messageContext = {}
    if (parsedClientId) {
      messageContext = await getMessageContext(parsedClientId, userId, { req })
      if (messageContext.error) {
        return res.status(404).json({ error: messageContext.error, message: messageContext.message })
      }
    }

    const prompt = getPrompt('generateMessage', await marcheDeLaRequete(req, userId))
    const userMessage = `Génère un message ${messageChannel.toUpperCase()} pour ce client.
Intent: ${intent || 'relance'}
Ton souhaité: ${tone || 'professionnel'}
${bodyContext?.subject ? 'Sujet: ' + bodyContext.subject : ''}`

    const result = await callArkLight({
      system: prompt.system,
      user: userMessage,
      context: {
        ...messageContext,
        channel: messageChannel,
        intent,
        tone
      },
      maxTokens: prompt.maxTokens,
      jsonMode: true,
      userId,
      clientId: parsedClientId,
      route: 'generate_message'
    })

    if (result.error) {
      return repondreErreurMoteurIa(res, result, { route: 'generate_message', clientId: parsedClientId })
    }
    // Un message généré peut être du texte : on exige alors un texte NON VIDE
    // (avant, `generated: {content: result.text}` partait en `success:true` même
    // avec `content: undefined`).
    const refus = verifierResultatIa(res, result, { route: 'generate_message', clientId: parsedClientId }, { structureRequise: false })
    if (refus) return refus

    res.json({
      success: true,
      action: 'generate',
      data: {
        type: messageChannel,
        clientId: parsedClientId,
        generated: result.structured || { content: result.text },
        variables: result.structured?.variables || []
      },
      usage: result.usage,
      model: result.model,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err }, 'ARK generate failed')
    if (estErreurIa(err)) return repondreIaIndisponible(res, err, { route: 'generate_message' })
    res.status(500).json({ error: 'ark_generate_failed', message: 'La génération de message est momentanément indisponible.' })
  }
})

// Alias pour /generate-message
router.post('/generate-message', verifyToken, async (req, res) => {
  // Réutiliser la logique de /generate
  req.url = '/generate'
  router.handle(req, res)
})

// GET /api/ark/context-suggestions — Suggestions selon contexte page
router.get('/context-suggestions', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const { page, clientId } = req.query
    const parsedClientId = clientId ? validateClientId(clientId) : null

    // Suggestions par page (optimisées, pas besoin d'appel LLM pour ça)
    const suggestionsByPage = {
      dashboard: [
        { id: 's1', type: 'action', label: 'Voir le Morning Brief', priority: 'high', action: 'morning_brief' },
        { id: 's2', type: 'action', label: 'Analyser la santé du portefeuille', priority: 'medium', action: 'portfolio_health' }
      ],
      clients: [
        { id: 's1', type: 'action', label: 'Filtrer les clients à risque', priority: 'high', action: 'filter_risk' },
        { id: 's2', type: 'action', label: 'Voir les opportunités cross-sell', priority: 'medium', action: 'recommendations' }
      ],
      client_detail: [
        { id: 's1', type: 'action', label: 'Générer un brief client', priority: 'high', action: 'client_brief' },
        { id: 's2', type: 'action', label: 'Calculer les meilleures actions', priority: 'high', action: 'next_best_actions' },
        { id: 's3', type: 'action', label: 'Vérifier la conformité', priority: 'medium', action: 'compliance_check' }
      ],
      devis: [
        { id: 's1', type: 'action', label: 'Assistant devis ARK', priority: 'high', action: 'quote_assistant' },
        { id: 's2', type: 'action', label: 'Vérifier conformité DDA', priority: 'high', action: 'compliance_check' }
      ],
      calendar: [
        { id: 's1', type: 'action', label: 'Préparer mes RDV du jour', priority: 'high', action: 'morning_brief' }
      ]
    }

    const baseSuggestions = suggestionsByPage[page] || [
      { id: 's0', type: 'info', label: 'ARK est prêt à vous aider', priority: 'low' }
    ]

    // Si un client est sélectionné, ajouter des suggestions spécifiques
    let clientSuggestions = []
    if (parsedClientId) {
      clientSuggestions = [
        { id: 'cs1', type: 'action', label: 'Brief de ce client', priority: 'high', action: 'client_brief', clientId: parsedClientId },
        { id: 'cs2', type: 'action', label: 'Générer un email', priority: 'medium', action: 'generate_email', clientId: parsedClientId }
      ]
    }

    res.json({
      success: true,
      action: 'context_suggestions',
      data: {
        page: page || 'unknown',
        clientId: parsedClientId,
        suggestions: [...clientSuggestions, ...baseSuggestions].slice(0, 5),
        availableActions: [
          'morning_brief', 'client_brief', 'next_best_actions', 'recommendations',
          'quote_assistant', 'compliance_check', 'portfolio_health',
          'generate_email', 'generate_sms', 'generate_whatsapp'
        ]
      },
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err }, 'ARK context-suggestions failed')
    res.status(500).json({ error: 'ark_context_suggestions_failed', message: 'Les suggestions ARK pour ce dossier sont momentanément indisponibles.' })
  }
})

// GET /api/ark/client/:id/recommendations — Cross-sell recommendations
router.get('/client/:id/recommendations', verifyToken, async (req, res) => {
  try {
    const userId = getArkUserId(req)
    if (!userId) return res.status(401).json({ error: 'auth_required' })

    const clientId = validateClientId(req.params.id)
    if (!clientId) return res.status(400).json({ error: 'invalid_client_id' })

    const clientContext = await getClientContext(clientId, userId, { req })
    if (clientContext.error) {
      return res.status(404).json({ error: clientContext.error, message: clientContext.message })
    }

    const prompt = getPrompt('recommendations', await marcheDeLaRequete(req, userId))
    const result = await callArk({
      system: prompt.system,
      user: `Analyse ce client et détecte les opportunités de cross-sell et upsell.`,
      context: clientContext,
      maxTokens: prompt.maxTokens,
      jsonMode: true,
      userId,
      clientId,
      route: 'client_recommendations'
    })

    if (result.error) {
      return repondreErreurMoteurIa(res, result, { route: 'client_recommendations', clientId })
    }
    // Le repli `{recommendations: [], missingProducts: []}` affichait
    // « aucune opportunité de cross-sell » sans avoir analysé le client.
    const refus = verifierResultatIa(res, result, { route: 'client_recommendations', clientId })
    if (refus) return refus

    res.json({
      success: true,
      action: 'recommendations',
      data: {
        clientId,
        ...result.structured
      },
      usage: result.usage,
      model: result.model,
      latencyMs: result.latencyMs,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    logger.error({ err, clientId: req.params.id }, 'ARK client recommendations failed')
    if (estErreurIa(err)) return repondreIaIndisponible(res, err, { route: 'client_recommendations', clientId: req.params.id })
    res.status(500).json({ error: 'ark_recommendations_failed', message: 'Les recommandations ARK sont momentanément indisponibles.' })
  }
})

// ────────────────────────────────────────────────────────────────────────
// /api/ark/priorities — Priorités du jour pour le cockpit COURTIA
// Combine : recommandations actives + échéances proches + clients silencieux
// ────────────────────────────────────────────────────────────────────────
router.get('/priorities', verifyToken, async (req, res) => {
  try {
    const userId = getCurrentUserId(req)
    const limit = Math.min(parseInt(req.query.limit || '8', 10), 20)
    const items = []

    // DÉGRADATION VISIBLE — pourquoi ce tableau.
    // Les trois blocs ci-dessous avalaient leur erreur SQL (`catch` → simple
    // avertissement) et la route répondait 200 comme si la journée était vide :
    // une panne de base devenait « rien à faire aujourd'hui ». Le courtier agit
    // sur cette liste. On publie donc `degraded: true` et la liste des blocs en
    // échec dès qu'un seul bloc ne peut pas être lu — la liste reste servie pour
    // ce qui a réellement été lu, mais elle ne prétend plus être complète.
    const blocsEnEchec = []

    // 1) Recommandations ARK actives non traitées
    try {
      const recos = await pool.query(
        `SELECT id, client_id, kind, priority, title, rationale, suggested_action, created_at
         FROM ark_recommendations
         WHERE user_id=$1 AND acted_on_at IS NULL AND dismissed_at IS NULL
           AND (expires_at IS NULL OR expires_at >= NOW())
         ORDER BY priority DESC, created_at DESC
         LIMIT $2`, [userId, limit])
      for (const r of recos.rows) {
        items.push({
          id: `reco-${r.id}`,
          kind: r.kind,
          level: r.priority >= 80 ? 'urgent' : r.priority >= 60 ? 'haut' : 'moyen',
          score: r.priority,
          title: r.title,
          rationale: r.rationale,
          client_id: r.client_id,
          cta: (r.suggested_action && r.suggested_action.label) || 'Traiter',
          source: 'ark',
          at: r.created_at,
        })
      }
    } catch (e) {
      logger.warn({ err: e }, 'ARK priorities — recos query failed')
      blocsEnEchec.push('recommandations')
    }

    // 2) Échéances proches (≤30j) via quotes
    // La devise est celle du CABINET (un cabinet suisse lit des CHF, jamais des
    // €) : elle vient de l'autorité unique lib/marcheCabinet, comme ailleurs.
    const marcheDuCabinet = await marcheCabinet.marcheUtilisateur(userId, {
      query: (sql, params) => pool.query(sql, params),
    })
    const symbole = marcheDuCabinet.symbole
    if (items.length < limit) {
      try {
        const ech = await pool.query(
          `SELECT q.id, q.client_id, q.quote_data,
                  c.first_name, c.last_name,
                  EXTRACT(DAY FROM NULLIF(q.quote_data->>'date_echeance','')::date - NOW())::int AS jours
           FROM quotes q
           JOIN clients c ON c.id=q.client_id
           WHERE c.courtier_id=$1 AND q.status='actif'
             AND NULLIF(q.quote_data->>'date_echeance','')::date BETWEEN NOW() AND NOW()+INTERVAL '30 days'
           ORDER BY NULLIF(q.quote_data->>'date_echeance','')::date ASC
           LIMIT $2`, [userId, limit - items.length])
        for (const e of ech.rows) {
          const name = [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Client'
          const produit = e.quote_data?.type_contrat || 'Contrat'
          items.push({
            id: `ech-${e.id}`,
            kind: 'echeance',
            level: e.jours <= 14 ? 'urgent' : 'haut',
            score: 70 - Math.max(0, Math.min(30, e.jours||0)),
            title: `Renouvellement ${produit} — ${name}`,
            rationale: `J-${e.jours} • ${Number(e.quote_data?.prime_annuelle || 0).toLocaleString('fr-FR')}${symbole}`,
            client_id: e.client_id,
            cta: 'Préparer',
            source: 'echeance',
            at: new Date().toISOString(),
          })
        }
      } catch (e) {
        logger.warn({ err: e }, 'ARK priorities — echeances query failed')
        blocsEnEchec.push('échéances')
      }
    }

    // 3) Clients silencieux >45j
    if (items.length < limit) {
      try {
        const sil = await pool.query(
          `SELECT id, first_name, last_name, last_contact, risk_score
           FROM clients
           WHERE courtier_id=$1 AND (silent_alert IS TRUE OR last_contact < NOW() - INTERVAL '45 days')
           ORDER BY last_contact NULLS LAST, risk_score DESC
           LIMIT $2`, [userId, limit - items.length])
        for (const c of sil.rows) {
          const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Client'
          const days = c.last_contact ? Math.floor((Date.now() - new Date(c.last_contact).getTime())/86400000) : null
          items.push({
            id: `sil-${c.id}`,
            kind: 'silencieux',
            level: (days||0) >= 60 ? 'urgent' : 'haut',
            score: Math.min(100, 50 + (days||0)),
            title: `Client silencieux — ${name}`,
            rationale: days ? `${days} jours sans contact` : 'Pas d\'interaction récente',
            client_id: c.id,
            cta: 'Relancer',
            source: 'silence',
            at: new Date().toISOString(),
          })
        }
      } catch (e) {
        logger.warn({ err: e }, 'ARK priorities — silencieux query failed')
        blocsEnEchec.push('clients silencieux')
      }
    }

    res.json({
      generated_at: new Date().toISOString(),
      priorities: items.slice(0, limit),
      // `degraded: true` : la liste est PARTIELLE. L'écran doit le dire au lieu
      // d'afficher une journée vide comme si tout allait bien.
      degraded: blocsEnEchec.length > 0,
      degraded_blocs: blocsEnEchec,
    })
  } catch (err) {
    logger.error({ err }, 'ARK priorities failed')
    res.status(500).json({ error: 'ark_priorities_failed', message: 'Les priorités ARK sont momentanément indisponibles.' })
  }
})

// ────────────────────────────────────────────────────────────────────────
// /api/ark/clients/:id/insight — Insight ARK pour fiche client
// ────────────────────────────────────────────────────────────────────────
router.get('/clients/:id/insight', verifyToken, async (req, res) => {
  try {
    // Portée CABINET : le dossier doit appartenir au cabinet de l'appelant.
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const userId = portee.userId || getCurrentUserId(req)
    const clientId = parseInt(req.params.id, 10)
    if (!Number.isFinite(clientId)) return res.status(400).json({ error: 'invalid_client_id' })

    // La fiche est résolue DANS LA PORTÉE.
    // POURQUOI : la route répondait 200 avec le titre INVENTÉ « Profil client à
    // enrichir » pour un identifiant inexistant — ou appartenant à un AUTRE
    // cabinet — et trois `catch (_) {}` transformaient toute erreur SQL en
    // « portefeuille vide » (donc en un titre rassurant mais faux). Un dossier
    // hors portée est désormais un 404, une panne SQL remonte telle quelle, et
    // aucun titre n'est fabriqué.
    const fClients = porteeCabinet.fragment(portee, {
      cabinet: 'clients.cabinet_id',
      proprietaire: 'clients.courtier_id',
      depart: 2,
    })
    const cli = await pool.query(
      `SELECT id, first_name, last_name, type, status, risk_score, loyalty_score, last_contact, silent_alert, lifetime_value
       FROM clients WHERE id=$1 AND ${fClients.sql}`,
      [clientId, ...fClients.params]
    )
    const client = cli.rows[0] || null
    if (!client) {
      return res.status(404).json({
        error: 'client_introuvable',
        message: "Ce client n'appartient pas à votre cabinet.",
      })
    }

    const ct = await pool.query(
      `SELECT id, status, quote_data,
              EXTRACT(DAY FROM NULLIF(quote_data->>'date_echeance','')::date - NOW())::int AS jours
       FROM quotes WHERE client_id=$1 AND status='actif'`, [clientId]
    )
    const contracts = ct.rows || []

    const rc = await pool.query(
      `SELECT id, kind, priority, title, rationale, suggested_action
       FROM ark_recommendations
       WHERE user_id=$1 AND client_id=$2 AND acted_on_at IS NULL AND dismissed_at IS NULL
       ORDER BY priority DESC, created_at DESC LIMIT 5`, [userId, clientId]
    )
    const recos = rc.rows || []

    const signals = []
    if (client.silent_alert) signals.push({ kind: 'silent', level: 'high', label: 'Client silencieux détecté' })
    if (client.risk_score != null && client.risk_score >= 60) signals.push({ kind: 'risk', level: 'high', label: `Risque ${client.risk_score}%` })
    const echProches = contracts.filter(c => c.jours != null && c.jours <= 60 && c.jours >= 0)
    if (echProches.length) signals.push({ kind: 'echeance', level: echProches.some(c=>c.jours<=21)?'high':'medium', label: `${echProches.length} échéance(s) <60j` })
    if (contracts.length === 0) signals.push({ kind: 'no_contract', level: 'low', label: 'Aucun contrat actif' })

    let headline = `Profil ${client.type || 'client'} actif`
    if (echProches.some(c=>c.jours<=30)) {
      const next = echProches.sort((a,b)=>a.jours-b.jours)[0]
      const produit = next.quote_data?.type_contrat || 'Contrat'
      headline = `Renouvellement ${produit} dans ${next.jours} jours — préparer un comparatif avant échéance.`
    } else if (client.silent_alert) {
      headline = 'Client silencieux — relance prioritaire recommandée pour préserver la relation.'
    } else if (contracts.length === 1) {
      headline = 'Monocontrat — opportunité multi-équipement détectée.'
    } else if (recos.length) {
      headline = recos[0].title
    }

    res.json({
      client_id: clientId,
      headline,
      signals,
      recommendations: recos.map(r => ({
        id: r.id,
        kind: r.kind,
        priority: r.priority,
        title: r.title,
        rationale: r.rationale,
        action: r.suggested_action,
      })),
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    logger.error({ err }, 'ARK client insight failed')
    res.status(500).json({ error: 'ark_insight_failed', message: "L'analyse ARK de ce dossier est momentanément indisponible." })
  }
})

module.exports = router
