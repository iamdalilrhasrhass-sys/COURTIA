const nodemailer = require('nodemailer');
const axios = require('axios');
const { buildBillingTemplate } = require('../emails/templates/billingTemplates');
const { buildAccessTemplate } = require('../emails/templates/accessTemplates');
const logger = require('../lib/logger');

const RESEND_API_URL = 'https://api.resend.com/emails';

function getEmailFrom() {
  return process.env.EMAIL_FROM || 'COURTIA <noreply@courtiark.fr>';
}

/** Adresse de RÉPONSE. Sans elle, un e-mail sortant ne peut pas être répondu :
 *  la déclarer dans .env.example ne suffisait pas, il fallait la transmettre au
 *  fournisseur (Resend attend `reply_to`, nodemailer attend `replyTo`). */
function getReplyTo() {
  return String(process.env.EMAIL_REPLY_TO || '').trim();
}

function getEmailStatus() {
  const replyTo = getReplyTo();
  const base = { from: getEmailFrom(), reply_to: replyTo || null, reply_to_configured: Boolean(replyTo) };

  if (process.env.RESEND_API_KEY) {
    return {
      ...base,
      configured: true,
      status: 'configured',
      provider: 'resend',
      missing: [],
    };
  }

  const provider = String(process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'smtp') {
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'].filter((key) => !process.env[key]);
    return {
      ...base,
      configured: missing.length === 0,
      status: missing.length === 0 ? 'configured' : 'configuration_required',
      provider: 'smtp',
      missing,
    };
  }

  if (provider === 'gmail') {
    const missing = ['EMAIL_USER', 'EMAIL_PASSWORD'].filter((key) => !process.env[key]);
    return {
      ...base,
      configured: missing.length === 0,
      status: missing.length === 0 ? 'configured' : 'configuration_required',
      provider: 'gmail',
      missing,
    };
  }

  return {
    ...base,
    configured: false,
    status: 'configuration_required',
    provider: 'none',
    missing: ['RESEND_API_KEY'],
  };
}

function isEmailEnabled() {
  return getEmailStatus().configured;
}

/** Un envoi COMMERCIAL (relance, prospection, réponse à une demande de démo)
 *  n'a de sens que si le destinataire peut répondre. Tant que EMAIL_REPLY_TO
 *  n'est pas configurée, ces envois échouent volontairement — en le disant. */
function isCommercialEmailReady() {
  return isEmailEnabled() && Boolean(getReplyTo());
}

function createTransporter(provider) {
  if (provider === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASSWORD || '',
    },
  });
}

async function sendEmail({ to, subject, html, text, replyTo }) {
  const status = getEmailStatus();
  if (!status.configured) {
    logger.warn({ payload: { to, subject, provider: status.provider, missing: status.missing } }, 'Email configuration required - send skipped');
    return {
      success: false,
      skipped: true,
      error: 'configuration_required',
      provider: status.provider,
      missing: status.missing,
      message: 'Configuration email transactionnel requise.',
    };
  }

  // replyTo explicite > EMAIL_REPLY_TO > aucune adresse de réponse.
  const adresseReponse = replyTo !== undefined ? String(replyTo).trim() : getReplyTo();

  try {
    if (status.provider === 'resend') {
      const charge = {
        from: getEmailFrom(),
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      };
      // Resend attend `reply_to` ; l'omettre rend la réponse impossible.
      if (adresseReponse) charge.reply_to = adresseReponse;
      const response = await axios.post(
        RESEND_API_URL,
        charge,
        {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return { success: true, provider: 'resend', id: response.data?.id || null };
    }

    const transporter = createTransporter(status.provider);
    await transporter.sendMail({
      from: getEmailFrom(),
      to,
      subject,
      html,
      text,
      // nodemailer attend `replyTo` (camelCase) : sans lui, même limite.
      ...(adresseReponse ? { replyTo: adresseReponse } : {}),
    });
    return { success: true, provider: status.provider, reply_to: adresseReponse || null };
  } catch (err) {
    logger.error({ err, payload: { to, subject, provider: status.provider } }, 'Email send failed');
    return { success: false, error: 'send_failed', provider: status.provider };
  }
}

/**
 * Envoi COMMERCIAL : refuse de partir si l'adresse de réponse n'est pas
 * configurée. Un message commercial sans adresse de retour est un prospect
 * perdu en silence — l'échec doit être visible, jamais silencieux.
 */
async function sendCommercialEmail({ to, subject, html, text, replyTo }) {
  const statut = getEmailStatus();
  const adresseReponse = replyTo !== undefined ? String(replyTo).trim() : getReplyTo();
  if (statut.configured && !adresseReponse) {
    logger.warn(
      { payload: { to, subject, provider: statut.provider } },
      'Envoi commercial refuse : EMAIL_REPLY_TO absent - aucune reponse ne pourrait etre recue'
    );
    return {
      success: false,
      skipped: true,
      error: 'reply_to_required',
      provider: statut.provider,
      missing: ['EMAIL_REPLY_TO'],
      message:
        'Envoi commercial refuse : configurez EMAIL_REPLY_TO (adresse de reponse) avant tout envoi sortant.',
    };
  }
  return sendEmail({ to, subject, html, text, replyTo: adresseReponse });
}

async function sendBillingEmail(kind, vars) {
  const template = buildBillingTemplate(kind, vars);
  return sendEmail({
    to: vars.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

async function emailNouveauClient({ courtierEmail, clientNom }) {
  return sendEmail({
    to: courtierEmail,
    subject: `Nouveau client ajouté — ${clientNom}`,
    html: `<p>Un nouveau client <strong>${clientNom}</strong> a été ajouté dans COURTIA.</p>`,
    text: `Un nouveau client ${clientNom} a été ajouté dans COURTIA.`,
  });
}

async function emailNouvelAbonnement({ courtierEmail, plan }) {
  return sendEmail({
    to: [courtierEmail].filter(Boolean),
    subject: `Nouvel abonnement COURTIA — Plan ${String(plan || '').toUpperCase()}`,
    html: `<p>Votre abonnement COURTIA (${plan}) est activé.</p>`,
    text: `Votre abonnement COURTIA (${plan}) est activé.`,
  });
}

/**
 * E-mail d'accès client : « Votre espace COURTIA est prêt. » avec identifiant,
 * mot de passe initial et bouton ACCÉDER À COURTIA (décision du 20/09/2026).
 * L'envoi suit le chemin normal (sendEmail) : sans fournisseur configuré, il
 * échoue proprement et le gabarit reste disponible pour l'exploitant.
 */
async function sendAccessEmail(vars = {}) {
  const template = buildAccessTemplate(vars);
  return sendEmail({
    to: [vars.to || vars.email].filter(Boolean),
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

async function emailEcheanceContrat({ courtierEmail, clientNom, dateEcheance }) {
  return sendEmail({
    to: courtierEmail,
    subject: `Échéance contrat — ${clientNom}`,
    html: `<p>Le contrat de ${clientNom} arrive à échéance le ${dateEcheance}.</p>`,
    text: `Le contrat de ${clientNom} arrive à échéance le ${dateEcheance}.`,
  });
}

module.exports = {
  getEmailStatus,
  isEmailEnabled,
  isCommercialEmailReady,
  getReplyTo,
  sendEmail,
  sendCommercialEmail,
  sendBillingEmail,
  sendAccessEmail,
  emailNouveauClient,
  emailNouvelAbonnement,
  emailEcheanceContrat,
};
