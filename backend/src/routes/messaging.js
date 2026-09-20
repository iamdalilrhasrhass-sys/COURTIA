/**
 * Routes API Messaging — COURTIA
 * /api/messaging/*
 *
 * Endpoints :
 *   POST   /send              — Envoyer un message à un client
 *   POST   /send-bulk         — Envoyer un message groupé
 *   GET    /history/:clientId — Historique des messages d'un client
 *   GET    /channels          — Canaux disponibles
 *   POST   /webhook/inbound   — Webhook entrant (emails, SMS) — PUBLIC
 *   GET    /status            — État WhatsApp, IMAP, prochaine relance
 *   POST   /relance/trigger   — Déclencher une relance pour un client
 *   POST   /relance/trigger-all — Déclencher toutes les relances (admin)
 */

const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const pool = require('../db');
const messagingService = require('../services/messagingService');
const porteeCabinet = require('../lib/porteeCabinet');
const { processInboundEmail } = require('../services/inboundProcessor');
const { getWhatsAppStatus } = require('../services/whatsappService');
const { getIMAPStatus } = require('../services/imapService');
const { runDailyRelances } = require('../jobs/relanceScheduler');
const { isAdminRole } = require('../constants/roles');
const logger = require('../lib/logger');
const secretsEntrants = require('../lib/secretsEntrants');

// ─── Helper : extraire userId du JWT ────────────────────────
function getUserId(req) {
  return req.user?.id || req.user?.userId;
}

/**
 * ────────────────────────────────────────────────────────────────────────────
 * PORTÉE DU DOSSIER AVANT TOUTE LECTURE OU ÉCRITURE DE MESSAGERIE
 * (correction du 20/09/2026 — troisième QA adverse, défaut D3-01, P1)
 *
 * DÉFAUT MESURÉ : `GET /api/messaging/history/:clientId` portait le seul
 * `verifyToken` et lisait `messages` par `client_id`, SANS filtre. Tout compte
 * authentifié — y compris un compte en lecture seule d'un AUTRE cabinet —
 * recevait le sujet, le corps et le contenu de la conversation d'un client
 * étranger (marqueur relu depuis trois cabinets étrangers). Même classe que le
 * P0 des conversations ARK, sur une autre route.
 *
 * RÈGLE TENUE : toute route de messagerie résout d'abord le DOSSIER dans la
 * portée du cabinet (`lib/porteeCabinet`, seule autorité). Un dossier hors
 * cabinet répond 404 AVANT qu'une seule ligne de `messages` soit lue ou écrite :
 * aucune donnée d'autrui n'est confirmée, ni par un succès, ni par un refus
 * différent.
 *
 * @returns {Promise<object|null>} la portée résolue, ou `null` si la réponse
 *          (404) a déjà été envoyée — la route doit alors `return`.
 * ────────────────────────────────────────────────────────────────────────────
 */
async function resoudreDossierDansPortee(req, res, clientId) {
  const portee = await porteeCabinet.resoudrePortee(req.app.locals.pool || pool, req);
  const f = porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 2,
  });
  const dossier = await pool.query(
    `SELECT c.id FROM clients c WHERE c.id = $1 AND ${f.sql} LIMIT 1`,
    [clientId, ...f.params]
  );
  if (!dossier.rows.length) {
    res.status(404).json({
      success: false,
      error: 'client_introuvable',
      message: 'Client introuvable.',
    });
    return null;
  }
  return portee;
}

// ===================================================================
//  POST /send — Envoyer un message à un client
// ===================================================================
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { clientId, canal, message, subject } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'clientId requis pour identifier le destinataire',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Le champ message est obligatoire',
      });
    }

    // Vérifier que le client appartient AU CABINET (portée unique) : un dossier
    // hors cabinet est INTROUVABLE (404), jamais confirmé par un 403.
    const portee = await resoudreDossierDansPortee(req, res, clientId);
    if (!portee) return;

    const result = await messagingService.sendMessage({
      clientId,
      canal,
      message,
      subject,
    });

    if (!result.success) {
      return res.status(422).json(result);
    }

    res.status(200).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: result,
    });
  } catch (err) {
    logger.error({ error: err.message }, '[Messaging] Erreur send');
    res.status(500).json({
      success: false,
      error: 'envoi_message_impossible',
      message: "L'envoi du message n'a pas pu aboutir.",
    });
  }
});

// ===================================================================
//  POST /send-bulk — Envoi groupé à plusieurs clients
// ===================================================================
router.post('/send-bulk', verifyToken, async (req, res) => {
  try {
    const { clientIds, canal, message, subject } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'clientIds doit être un tableau non vide d\'identifiants clients',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Le champ message est obligatoire',
      });
    }

    // Un envoi groupé ne doit toucher QUE des dossiers du cabinet : on refuse
    // l'appel entier (404) dès qu'un identifiant est hors portée, plutôt que
    // d'envoyer à certains et de confirmer l'existence des autres.
    for (const clientId of clientIds) {
      const portee = await resoudreDossierDansPortee(req, res, clientId);
      if (!portee) return;
    }

    const result = await messagingService.sendBulk({
      clientIds,
      canal,
      message,
      subject,
    });

    res.status(200).json({
      success: true,
      data: {
        envoyes: result.sent,
        echoues: result.failed,
        total: result.total,
        details: result.results,
      },
    });
  } catch (err) {
    logger.error({ error: err.message }, '[Messaging] Erreur send-bulk');
    res.status(500).json({
      success: false,
      error: 'envoi_groupe_impossible',
      message: "L'envoi groupé n'a pas pu aboutir.",
    });
  }
});

// ===================================================================
//  GET /history/:clientId — Historique des messages d'un client
//
//  D3-01 (P1, fuite inter-cabinets) : le dossier est résolu dans la portée du
//  cabinet AVANT toute lecture ; hors cabinet = 404, sans qu'aucune ligne de
//  `messages` ne soit lue (le service reçoit la portée et la joint lui-même).
// ===================================================================
router.get('/history/:clientId', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit, offset, canal } = req.query;

    const portee = await resoudreDossierDansPortee(req, res, clientId);
    if (!portee) return;

    const messages = await messagingService.getHistory(clientId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      canal: canal || null,
      portee,
    });

    res.status(200).json({
      success: true,
      clientId,
      total: messages.length,
      data: messages,
    });
  } catch (err) {
    logger.error({ error: err.message }, '[Messaging] Erreur history');
    res.status(500).json({
      success: false,
      error: 'historique_indisponible',
      message: "L'historique des messages n'a pas pu être chargé.",
    });
  }
});

// ===================================================================
//  GET /channels — Liste des canaux disponibles
// ===================================================================
router.get('/channels', verifyToken, (req, res) => {
  try {
    const channels = messagingService.getAvailableChannels();

    res.status(200).json({
      success: true,
      data: channels,
    });
  } catch (err) {
    logger.error({ error: err.message }, '[Messaging] Erreur channels');
    res.status(500).json({
      success: false,
      error: 'canaux_indisponibles',
      message: "La liste des canaux de communication n'a pas pu être chargée.",
    });
  }
});

// ===================================================================
//  POST /webhook/inbound — Webhook entrant (PUBLIC, pas d'auth)
//  Reçoit les emails entrants et les analyse avec Claude
//
//  ─────────────────────────────────────────────────────────────────
//  DÉFAUT FERMÉ (P2 SEC-013, mesuré en production le 20/09/2026)
//  `POST /api/messaging/webhook/inbound` répondait 200 et ENREGISTRAIT le
//  message sans aucune authentification : n'importe qui pouvait injecter un
//  e-mail arbitraire dans le fil d'un client, en choisissant l'expéditeur.
//
//  CORRECTION : signature HMAC-SHA256 sur le CORPS BRUT (`req.rawBody`, jamais
//  `JSON.stringify(req.body)` — voir lib/secretsEntrants), en-tête
//  `x-courtia-signature: sha256=<hex>`. Même modèle que le webhook WhatsApp de
//  `integrations.js` (verifyMetaSignature).
//
//  RÈGLE : sans `MESSAGING_INBOUND_SECRET` configuré, la route répond 503 et
//  n'appelle PAS `processInboundEmail` — donc n'écrit rien. Une signature
//  absente ou fausse répond 401.
//  ─────────────────────────────────────────────────────────────────
router.post('/webhook/inbound', async (req, res) => {
  const secret = secretsEntrants.lireSecret(secretsEntrants.SECRETS.messagerie)
  if (!secret) {
    return secretsEntrants.repondreSecretAbsent(
      res,
      'messaging_inbound_secret',
      "Le webhook de messagerie entrante est fermé : le secret de signature (MESSAGING_INBOUND_SECRET) n'est pas configuré sur ce serveur."
    )
  }

  const verdict = secretsEntrants.verifierSignatureHmac({
    rawBody: req.rawBody,
    enteteSignature: req.headers['x-courtia-signature'],
    secret,
  })
  if (!verdict.valide) {
    return res.status(401).json({
      success: false,
      error: 'invalid_signature',
      message: "La signature du webhook est absente ou invalide : le message n'a pas été traité.",
    })
  }

  try {
    const { from, subject, body, attachments } = req.body;

    if (!from || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Champs requis : from, subject, body',
      });
    }

    const result = await processInboundEmail(pool, {
      from,
      subject,
      body,
      attachments,
    });

    res.status(200).json({
      success: true,
      message: 'Message entrant traité',
      data: result,
    });
  } catch (err) {
    logger.error({ error: err.message }, '[Messaging] Erreur webhook inbound');
    res.status(500).json({
      success: false,
      error: 'traitement_message_entrant_impossible',
      message: "Le message entrant n'a pas pu être traité.",
    });
  }
});

// ===================================================================
//  GET /status — État des services de messaging
// ===================================================================
router.get('/status', verifyToken, (req, res) => {
  try {
    const userId = getUserId(req);

    // Statut WhatsApp
    let whatsapp;
    try {
      whatsapp = getWhatsAppStatus();
    } catch {
      whatsapp = { error: 'Service WhatsApp non disponible' };
    }

    // Statut IMAP
    let imap;
    try {
      imap = getIMAPStatus();
    } catch {
      imap = { error: 'Service IMAP non disponible' };
    }

    // Prochaine relance (cron 09:00 Europe/Paris)
    const now = new Date();
    const nextRelance = new Date();
    nextRelance.setHours(9, 0, 0, 0);
    if (now >= nextRelance) {
      nextRelance.setDate(nextRelance.getDate() + 1);
    }
    const prochaineRelance = nextRelance.toISOString();

    res.status(200).json({
      success: true,
      user_id: userId,
      data: {
        whatsapp: whatsapp?.connected ? 'Connecté' : 'Déconnecté',
        whatsapp_details: whatsapp || {},
        imap: imap?.running ? 'En cours' : 'Arrêté',
        imap_details: imap || {},
        prochaine_relance: prochaineRelance,
        relance_active: process.env.DISABLE_RELANCES !== 'true',
      },
    });
  } catch (err) {
    logger.error({ error: err.message }, '[Messaging] Erreur status');
    res.status(500).json({
      success: false,
      error: 'statut_indisponible',
      message: "L'état des services de messagerie n'a pas pu être chargé.",
    });
  }
});

// ===================================================================
//  POST /relance/trigger — Déclencher une relance pour un client
// ===================================================================
router.post('/relance/trigger', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'clientId requis',
      });
    }

    // Une relance ÉCRIT (trace `messages`) et SORT (e-mail/SMS) : la portée du
    // dossier est vérifiée comme pour /send. Sans ce contrôle, un identifiant
    // étranger suffisait à déclencher un envoi vers le client d'un autre cabinet.
    const portee = await resoudreDossierDansPortee(req, res, clientId);
    if (!portee) return;

    // Envoyer un message de relance via le canal préféré du client
    const result = await messagingService.sendMessage({
      clientId,
      message: `Bonjour ! Votre conseiller COURTIA souhaite faire le point sur votre dossier. Merci de nous contacter ou de répondre à ce message pour avancer.`,
      subject: '📋 Relance — Votre dossier COURTIA',
    });

    res.status(200).json({
      success: true,
      message: 'Relance déclenchée avec succès',
      data: result,
    });
  } catch (err) {
    logger.error({ error: err.message }, '[Messaging] Erreur relance trigger');
    res.status(500).json({
      success: false,
      error: 'relance_impossible',
      message: "La relance n'a pas pu être déclenchée.",
    });
  }
});

// ===================================================================
//  POST /relance/trigger-all — Déclencher toutes les relances (admin)
// ===================================================================
router.post('/relance/trigger-all', verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);

    // Vérifier que l'utilisateur est admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    const role = userResult.rows[0]?.role;
    if (!isAdminRole(role)) {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs',
      });
    }

    logger.info({ admin_user_id: userId }, 'manual relance run requested');
    const summary = await runDailyRelances(pool);

    res.status(200).json({
      success: true,
      message: 'Relances déclenchées avec succès',
      data: summary,
    });
  } catch (err) {
    logger.error({ error: err.message }, '[Messaging] Erreur relance trigger-all');
    res.status(500).json({
      success: false,
      error: 'relances_impossibles',
      message: "Les relances n'ont pas pu être déclenchées.",
    });
  }
});

module.exports = router;
