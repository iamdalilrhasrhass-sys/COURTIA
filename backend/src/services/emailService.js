const nodemailer = require('nodemailer');
const { buildBillingTemplate } = require('../emails/templates/billingTemplates');

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'disabled';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@courtia.fr';

function isEmailEnabled() {
  if (EMAIL_PROVIDER === 'disabled') return false;
  if (EMAIL_PROVIDER === 'smtp') {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  }
  if (EMAIL_PROVIDER === 'gmail') {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  }
  return false;
}

function createTransporter() {
  if (EMAIL_PROVIDER === 'smtp') {
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
  if (!isEmailEnabled()) {
    console.log(`[Email] disabled - skipped "${subject}" to ${Array.isArray(to) ? to.join(',') : to}`);
    return { skipped: true, reason: 'email_disabled' };
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    return { success: true };
  } catch (err) {
    console.error('[Email] send failed:', err.message);
    return { success: false, error: 'send_failed' };
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
  isEmailEnabled,
  sendEmail,
  sendBillingEmail,
  emailNouveauClient,
  emailNouvelAbonnement,
  emailEcheanceContrat,
};
