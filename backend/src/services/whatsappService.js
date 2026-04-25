/**
 * WhatsApp Service — Baileys (GRATUIT, auto-hébergé)
 * Simule WhatsApp Web, session persistante, QR code au démarrage.
 */

const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// ── État global ──────────────────────────────────────────────
let sock = null;
let isConnected = false;
let qrScanned = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30s max entre tentatives
const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH || path.join(__dirname, '..', '..', '..', '..', 'whatsapp-session');

// ── Logger ───────────────────────────────────────────────────
function log(level, msg) {
  const ts = new Date().toISOString();
  console.log(`[WhatsApp:${level}] ${ts} — ${msg}`);
}

// ── Connexion WhatsApp ───────────────────────────────────────
async function connectWhatsApp() {
  if (!process.env.WHATSAPP_ENABLED || process.env.WHATSAPP_ENABLED !== 'true') {
    log('INFO', 'WhatsApp désactivé (WHATSAPP_ENABLED != true)');
    return null;
  }

  try {
    // Créer le dossier de session s'il n'existe pas
    if (!fs.existsSync(SESSION_PATH)) {
      fs.mkdirSync(SESSION_PATH, { recursive: true });
      log('INFO', `Dossier session créé: ${SESSION_PATH}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
    const { version } = await fetchLatestBaileysVersion();

    log('INFO', `Lancement Baileys v${version.join('.')} — session: ${SESSION_PATH}`);

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false, // on gère l'affichage nous-mêmes avec qrcode-terminal
      browser: ['COURTIA CRM', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60_000,
      qrTimeout: 120_000, // 2 minutes pour scanner
    });

    // ── Événements socket ──
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR code reçu → afficher dans la console
      if (qr) {
        log('QR', '⬇ Scannez ce QR code avec WhatsApp sur votre téléphone :');
        console.log('\n');
        qrcode.generate(qr, { small: true });
        console.log('\n');
        qrScanned = false;
      }

      if (connection === 'open') {
        isConnected = true;
        qrScanned = true;
        reconnectAttempts = 0;
        log('OK', '✅ WhatsApp connecté !');
      }

      if (connection === 'close') {
        isConnected = false;
        const statusCode = lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 0;

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (statusCode === DisconnectReason.loggedOut) {
          log('WARN', 'Déconnecté (logged out) — session invalide, suppression du dossier de session...');
          // Supprimer la session pour permettre un nouveau scan
          try { fs.rmSync(SESSION_PATH, { recursive: true, force: true }); } catch (e) { /* ignore */ }
          log('INFO', 'Redémarrage pour nouveau QR code...');
          setTimeout(() => connectWhatsApp(), 3000);
          return;
        }

        if (shouldReconnect) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
          reconnectAttempts++;
          log('RECONNECT', `Tentative #${reconnectAttempts} dans ${delay / 1000}s (raison: ${statusCode || 'inconnue'})...`);
          setTimeout(() => connectWhatsApp(), delay);
        } else {
          log('ERROR', `Connexion fermée, pas de reconnexion. Code: ${statusCode}`);
        }
      }
    });

    // Sauvegarder les credentials à chaque mise à jour
    sock.ev.on('creds.update', saveCreds);

    // Log des messages reçus (debug)
    sock.ev.on('messages.upsert', (m) => {
      if (m.type === 'notify') {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            log('IN', `Message de ${msg.key.remoteJid}: ${msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[media]'}`);
          }
        }
      }
    });

    return sock;
  } catch (err) {
    log('ERROR', `Échec connexion: ${err.message}`);
    // Retenter après un délai
    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;
    log('RECONNECT', `Nouvelle tentative dans ${delay / 1000}s...`);
    setTimeout(() => connectWhatsApp(), delay);
    return null;
  }
}

// ── Envoyer un message WhatsApp ──────────────────────────────
async function sendWhatsApp({ to, message }) {
  if (!sock) {
    throw new Error('WhatsApp non connecté');
  }
  if (!to || !message) {
    throw new Error('Destinataire (to) et message requis');
  }

  // Normaliser le numéro : enlever espaces, +, -, parenthèses
  let jid = to.replace(/[\s+\-()]/g, '');
  // Ajouter @s.whatsapp.net si pas déjà présent
  if (!jid.includes('@')) {
    jid = jid + '@s.whatsapp.net';
  }

  log('SEND', `Envoi à ${jid}: "${message.substring(0, 50)}..."`);

  try {
    const result = await sock.sendMessage(jid, { text: message });
    log('OK', `Message envoyé à ${jid}`);
    return { success: true, jid, timestamp: new Date().toISOString(), messageId: result?.key?.id };
  } catch (err) {
    log('ERROR', `Échec envoi à ${jid}: ${err.message}`);
    throw err;
  }
}

// ── Statut de connexion ──────────────────────────────────────
function getWhatsAppStatus() {
  return {
    connected: isConnected,
    qrScanned,
    reconnectAttempts,
    sessionPath: SESSION_PATH,
    user: sock?.user ? {
      name: sock.user.name,
      jid: sock.user.id,
    } : null,
  };
}

// ── Déconnexion propre ───────────────────────────────────────
async function disconnectWhatsApp() {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      // ignore
    }
    sock = null;
    isConnected = false;
    log('INFO', 'WhatsApp déconnecté proprement');
  }
}

module.exports = {
  connectWhatsApp,
  sendWhatsApp,
  getWhatsAppStatus,
  disconnectWhatsApp,
};
