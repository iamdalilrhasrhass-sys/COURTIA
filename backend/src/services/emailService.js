const nodemailer = require('nodemailer');
const axios = require('axios');
const { buildBillingTemplate } = require('../emails/templates/billingTemplates');
const logger = require('../lib/logger');

const RESEND_API_URL = 'https://api.resend.com/emails';

function getEmailFrom() {
  return process.env.EMAIL_FROM || 'COURTIA <noreply@courtia.fr>';
}

function getEmailStatus() {
  if (process.env.RESEND_API_KEY) {
    return {
      configured: true,
      status: 'configured',
      provider: 'resend',
      from: getEmailFrom(),
      missing: [],
    };
  }

  const provider = String(process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'smtp') {
    const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'].filter((key) => !process.env[key]);
    return {
      configured: missing.length === 0,
      status: missing.length === 0 ? 'configured' : 'configuration_required',
      provider: 'smtp',
      from: getEmailFrom(),
      missing,
    };
  }

  if (provider === 'gmail') {
    const missing = ['EMAIL_USER', 'EMAIL_PASSWORD'].filter((key) => !process.env[key]);
    return {
      configured: missing.length === 0,
      status: missing.length === 0 ? 'configured' : 'configuration_required',
      provider: 'gmail',
      from: getEmailFrom(),
      missing,
    };
  }

  return {
    configured: false,
    status: 'configuration_required',
    provider: 'none',
    from: getEmailFrom(),
    missing: ['RESEND_API_KEY'],
  };
}

function isEmailEnabled() {
  return getEmailStatus().configured;
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

async function sendEmail({ to, subject, html, text }) {
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

  try {
    if (status.provider === 'resend') {
      const response = await axios.post(
        RESEND_API_URL,
        {
          from: getEmailFrom(),
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
        },
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
    });
    return { success: true, provider: status.provider };
  } catch (err) {
    logger.error({ err, payload: { to, subject, provider: status.provider } }, 'Email send failed');
    return { success: false, error: 'send_failed', provider: status.provider };
  }
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
  sendEmail,
  sendBillingEmail,
  emailNouveauClient,
  emailNouvelAbonnement,
  emailEcheanceContrat,
};
