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
const { processInboundEmail } = require('../services/inboundProcessor');
const { getWhatsAppStatus } = require('../services/whatsappService');
const { getIMAPStatus } = require('../services/imapService');
const { runDailyRelances } = require('../jobs/relanceScheduler');

// ─── Helper : extraire userId du JWT ────────────────────────
function getUserId(req) {
  return req.user?.id || req.user?.userId;
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
    console.error('[Messaging] Erreur send:', err.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi du message',
      details: err.message,
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
    console.error('[Messaging] Erreur send-bulk:', err.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi groupé',
      details: err.message,
    });
  }
});

// ===================================================================
//  GET /history/:clientId — Historique des messages d'un client
// ===================================================================
router.get('/history/:clientId', verifyToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit, offset, canal } = req.query;

    const messages = await messagingService.getHistory(clientId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      canal: canal || null,
    });

    res.status(200).json({
      success: true,
      clientId,
      total: messages.length,
      data: messages,
    });
  } catch (err) {
    console.error('[Messaging] Erreur history:', err.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
      details: err.message,
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
    console.error('[Messaging] Erreur channels:', err.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des canaux',
      details: err.message,
    });
  }
});

// ===================================================================
//  POST /webhook/inbound — Webhook entrant (PUBLIC, pas d'auth)
//  Reçoit les emails entrants et les analyse avec Claude
// ===================================================================
router.post('/webhook/inbound', async (req, res) => {
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
    console.error('[Messaging] Erreur webhook inbound:', err.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement du message entrant',
      details: err.message,
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
    console.error('[Messaging] Erreur status:', err.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du statut',
      details: err.message,
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
    console.error('[Messaging] Erreur relance trigger:', err.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déclenchement de la relance',
      details: err.message,
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
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs',
      });
    }

    console.log('[Messaging] Déclenchement manuel de toutes les relances...');
    const summary = await runDailyRelances(pool);

    res.status(200).json({
      success: true,
      message: 'Relances déclenchées avec succès',
      data: summary,
    });
  } catch (err) {
    console.error('[Messaging] Erreur relance trigger-all:', err.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déclenchement des relances',
      details: err.message,
    });
  }
});

module.exports = router;
