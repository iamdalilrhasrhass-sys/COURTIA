// ============================================================
// /srv/courtia/backend/src/routes/killerFeatures2.js
// Routes Express vague 2 — Voice + Email + DDA
// À brancher dans server.js (voir INTEGRATION.md)
// ============================================================

const express = require('express');
const path = require('path');
const router = express.Router();

const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const porteeCabinet = require('../lib/porteeCabinet');
const marcheCabinet = require('../lib/marcheCabinet');

const voice = require('../services/arkVoice');
const email = require('../services/emailParser');
const dda = require('../services/ddaAudit');
const secretsEntrants = require('../lib/secretsEntrants');

// ============================================================
// FEATURE 6 — ARK VOICE
// ============================================================
/**
 * Réglages vocaux — DEVISE DU CABINET (correction 20/09/2026, P3 « D-22 »)
 *
 * POURQUOI : la réponse servait `daily_budget_eur: 5` à TOUT LE MONDE, y compris
 * à un cabinet suisse : le nom du champ affirme une devise qui n'est pas la
 * sienne. Le budget saisi est un montant dans la devise du CABINET ; on sert
 * donc `devise` + `daily_budget` (nom neutre) et on ne conserve le nom historique
 * `daily_budget_eur` QUE pour un cabinet français, où il est exact.
 */
router.get('/voice/settings', verifyToken, async (req, res) => {
  try {
    const s = await voice.getVoiceSettings(req.user.userId);
    const marche = await marcheCabinet.marcheDeLaRequete(req, (sql, params) => (req.app.locals.pool || pool).query(sql, params));
    const devise = marche && marche.devise ? marche.devise : 'EUR';
    const settings = { ...s, devise, daily_budget: s.daily_budget_eur };
    if (devise === 'EUR') settings.daily_budget_eur = s.daily_budget_eur; else delete settings.daily_budget_eur;
    res.json({ success: true, settings, marche: marche ? marche.marche : 'FR' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/voice/settings', verifyToken, async (req, res) => {
  try {
    await voice.updateVoiceSettings(req.user.userId, req.body);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/voice/morning-brief', verifyToken, async (req, res) => {
  try {
    const result = await voice.placeMorningBriefCall(req.user.userId);
    res.json({ success: result.success, ...result });
  } catch (e) {
    console.error('[voice/morning-brief]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/voice/call-client', verifyToken, async (req, res) => {
  try {
    const { client_id, call_type } = req.body;
    const call = await voice.placeClientCall(req.user.userId, client_id, call_type || 'qualification');
    res.json({ success: true, call });
  } catch (e) {
    console.error('[voice/call-client]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/voice/history', verifyToken, async (req, res) => {
  try {
    const history = await voice.getCallHistory(req.user.userId, pool, { limit: parseInt(req.query.limit) || 20 });
    res.json({ success: true, history });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ============================================================
// Webhook Vapi (PUBLIC — pas de verifyToken)
//
// DÉFAUTS FERMÉS (P1 IA-018 et P1 « secret par défaut », mesurés le 20/09/2026)
//   1. La route n'était PAS ATTEINTE : `server.js` montait
//      `app.use('/api/voice', verifyToken, voiceRouter)` AVANT ce routeur
//      (server.js:449 vs :491). Vapi recevait donc 401 « En-tête
//      d'authentification manquant » pour tous ses appels : la téléphonie ne
//      pouvait pas remonter un seul événement d'appel. Le webhook est désormais
//      monté AVANT le préfixe protégé (`webhookVoicePublic`, exporté ci-dessous).
//   2. Le secret était FACULTATIF : `if (process.env.VAPI_WEBHOOK_SECRET && …)`
//      laissait passer n'importe quel appelant quand la variable n'était pas
//      configurée — et `services/arkVoice.js` transmettait à Vapi la valeur par
//      défaut EN DUR 'courtia-default-secret', publique dans le dépôt. Un secret
//      par défaut n'est pas un secret : toute personne connaissant le dépôt
//      pouvait poster de faux événements d'appel.
// RÈGLE APPLIQUÉE : sans secret configuré, le point d'entrée répond 503 et ne
// traite rien ; avec un secret configuré, un en-tête absent ou faux répond 401.
// ============================================================
async function traiterWebhookVoix(req, res) {
  const secret = secretsEntrants.lireSecret(secretsEntrants.SECRETS.voix)
  if (!secret) {
    // Aucune écriture, aucun appel sortant : le service n'est pas configuré.
    return secretsEntrants.repondreSecretAbsent(
      res,
      'vapi_webhook_secret',
      "Le webhook de téléphonie est fermé : le secret partagé avec l'opérateur d'appels (VAPI_WEBHOOK_SECRET) n'est pas configuré sur ce serveur."
    )
  }
  const verdict = secretsEntrants.verifierSecretSimple({
    secret,
    fourni: req.headers['x-vapi-secret'],
  })
  if (!verdict.valide) {
    return res.status(401).json({ error: 'unauthorized', message: 'Secret de webhook invalide.' })
  }

  try {
    await voice.handleWebhook(req.body || {})
    return res.json({ success: true })
  } catch (e) {
    console.error('[voice/webhook]', e)
    // 500 explicite : ne jamais répondre « success » sur un événement qu'on n'a
    // pas pu enregistrer (l'opérateur croirait l'appel traité et ne rejouerait pas).
    return res.status(500).json({ success: false, error: 'voice_webhook_failed' })
  }
}

/** Routeur PUBLIC du webhook de téléphonie, monté avant `/api/voice` protégé. */
const webhookVoicePublic = express.Router()
webhookVoicePublic.post('/webhook', traiterWebhookVoix)
// Le préfixe monté étant `/api/voice/webhook`, on accepte aussi la racine.
webhookVoicePublic.post('/', traiterWebhookVoix)

router.post('/voice/webhook', traiterWebhookVoix)

// ============================================================
// FEATURE 7 — EMAIL PARSER
// ============================================================
router.get('/email/settings', verifyToken, async (req, res) => {
  try {
    const s = await email.getEmailSettings(req.user.userId);
    if (s) delete s.imap_password;
    res.json({ success: true, settings: s });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/email/settings', verifyToken, async (req, res) => {
  try {
    await email.saveEmailSettings(req.user.userId, req.body);
    if (req.body.enabled) email.startAutoScan(req.user.userId);
    else email.stopAutoScan(req.user.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/email/scan', verifyToken, async (req, res) => {
  try {
    const result = await email.scanInbox(req.user.userId);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('[email/scan]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/email/inbox', verifyToken, async (req, res) => {
  try {
    const inbox = await email.getInbox(req.user.userId, { status: req.query.status, limit: parseInt(req.query.limit) || 50 });
    res.json({ success: true, inbox });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/email/:id/replied', verifyToken, async (req, res) => {
  await email.markReplied(req.params.id, req.user.userId);
  res.json({ success: true });
});

router.post('/email/:id/reviewed', verifyToken, async (req, res) => {
  await email.markReviewed(req.params.id, req.user.userId);
  res.json({ success: true });
});

router.post('/email/:id/ignore', verifyToken, async (req, res) => {
  await email.ignoreEmail(req.params.id, req.user.userId);
  res.json({ success: true });
});

// ============================================================
// FEATURE 9 — AUTO-AUDIT DE CONFORMITÉ (vocabulaire = marché du cabinet)
//
// CORRECTION 20/09/2026 — DEUX DÉFAUTS SUR CES ROUTES
//   1. Les lectures/écritures d'audit étaient en portée MONO-UTILISATEUR
//      (`dda_audits WHERE user_id = …`) : un collaborateur qui venait d'auditer
//      un dossier du cabinet voyait un tableau de bord vide, et le propriétaire
//      ne voyait pas les audits de son équipe.
//   2. Le dossier audité n'était lié à AUCUN contrôle d'appartenance : un client
//      d'un AUTRE cabinet était audité (et son contenu résumé) dès qu'on
//      connaissait son identifiant. La portée cabinet répond 404 hors
//      périmètre — la ressource n'existe pas pour l'appelant.
// ============================================================
function identifiantAnalyse(valeur) {
  const brut = String(valeur ?? '').trim();
  return /^\d+$/.test(brut) ? Number.parseInt(brut, 10) : null;
}

/** Traduit un refus de portée en 404 (jamais 500 pour une ressource hors cabinet). */
function repondreErreurAudit(e, res) {
  const horsPerimetre = e && (e.statut === 404 || /introuvable/i.test(String(e.message || '')));
  if (horsPerimetre) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Dossier introuvable pour ce cabinet.' });
  }
  console.error('[dda/audit]', e);
  return res.status(500).json({ success: false, error: 'audit_indisponible', message: "L'audit de conformité n'a pas pu être produit." });
}

router.post('/dda/audit/:clientId', verifyToken, async (req, res) => {
  try {
    const clientId = identifiantAnalyse(req.params.clientId);
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'identifiant_invalide', message: "L'identifiant du client doit être un nombre entier." });
    }
    const audit = await dda.auditClient(clientId, req.user.userId, { req });
    res.json({ success: true, audit });
  } catch (e) {
    repondreErreurAudit(e, res);
  }
});

router.post('/dda/batch-audit', verifyToken, async (req, res) => {
  try {
    const result = await dda.batchAudit(req.user.userId, { req });
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('[dda/batch]', e);
    res.status(500).json({ success: false, error: 'audit_indisponible', message: "L'audit de conformité n'a pas pu être produit." });
  }
});

router.get('/dda/dashboard', verifyToken, async (req, res) => {
  try {
    const dashboard = await dda.getAuditDashboard(req.user.userId, { req });
    res.json({ success: true, dashboard });
  } catch (e) {
    console.error('[dda/dashboard]', e);
    res.status(500).json({ success: false, error: 'audit_indisponible', message: "Le tableau de bord de conformité n'a pas pu être chargé." });
  }
});

router.get('/dda/audit/:clientId', verifyToken, async (req, res) => {
  try {
    const clientId = identifiantAnalyse(req.params.clientId);
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'identifiant_invalide', message: "L'identifiant du client doit être un nombre entier." });
    }
    // Portée CABINET : l'audit d'un collègue sur un dossier du cabinet est
    // légitime ; un dossier d'un autre cabinet reste introuvable.
    const portee = await porteeCabinet.resoudrePortee(req.app.locals.pool || pool, req);
    const f = porteeCabinet.fragment(portee, { cabinet: 'c.cabinet_id', proprietaire: 'c.courtier_id', depart: 2 });
    const r = await pool.query(
      `SELECT da.* FROM dda_audits da JOIN clients c ON c.id = da.client_id
        WHERE da.client_id=$1 AND ${f.sql}`,
      [clientId, ...f.params]
    );
    res.json({ success: true, audit: r.rows[0] || null });
  } catch (e) {
    console.error('[dda/audit:get]', e);
    res.status(500).json({ success: false, error: 'audit_indisponible', message: "L'audit de conformité n'a pas pu être chargé." });
  }
});

router.get('/dda/report/:clientId', verifyToken, async (req, res) => {
  try {
    const clientId = identifiantAnalyse(req.params.clientId);
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'identifiant_invalide', message: "L'identifiant du client doit être un nombre entier." });
    }
    const portee = await porteeCabinet.resoudrePortee(req.app.locals.pool || pool, req);
    const f = porteeCabinet.fragment(portee, { cabinet: 'c.cabinet_id', proprietaire: 'c.courtier_id', depart: 2 });
    const r = await pool.query(
      `SELECT da.report_pdf_path FROM dda_audits da JOIN clients c ON c.id = da.client_id
        WHERE da.client_id=$1 AND ${f.sql}`,
      [clientId, ...f.params]
    );
    if (!r.rows[0]?.report_pdf_path) return res.status(404).json({ success: false, error: 'rapport_indisponible', message: 'Aucun rapport disponible pour ce dossier.' });
    res.download(r.rows[0].report_pdf_path, `conformite_client_${clientId}.pdf`);
  } catch (e) {
    console.error('[dda/report]', e);
    res.status(500).json({ success: false, error: 'rapport_indisponible', message: "Le rapport de conformité n'a pas pu être téléchargé." });
  }
});

module.exports = router;
// Exporté séparément : ce routeur PUBLIC doit être monté par `server.js` AVANT
// le préfixe `/api/voice` protégé, sinon le `verifyToken` du préfixe répond 401
// à l'opérateur d'appels et le webhook reste inatteignable (P1 IA-018).
module.exports.webhookVoicePublic = webhookVoicePublic;
