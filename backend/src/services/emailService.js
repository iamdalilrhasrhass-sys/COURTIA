const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'arkcourtia@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'Champigny-89'
  }
})

async function sendEmail({ to, subject, html }) {
  console.log('[Email] Sending to', to, 'subject:', subject)
  return transporter.sendMail({
    from: '"COURTIA" <arkcourtia@gmail.com>',
    to,
    subject,
    html
  }).catch(err => {
    console.error('[Email] Failed:', err.message)
    return { error: err.message }
  })
}

async function emailNouveauClient({ courtierEmail, clientNom }) {
  return sendEmail({
    to: courtierEmail,
    subject: `Nouveau client ajouté — ${clientNom}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#2563eb">Nouveau client</h2>
      <p>Un nouveau client <strong>${clientNom}</strong> a été ajouté à votre portefeuille COURTIA.</p>
      <a href="https://courtia.vercel.app/clients" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:8px">Voir mes clients</a>
    </div>`
  })
}

async function emailNouvelAbonnement({ courtierEmail, plan }) {
  return sendEmail({
    to: [courtierEmail, 'arkcourtia@gmail.com'],
    subject: `Nouvel abonnement COURTIA — Plan ${plan.toUpperCase()}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#10b981">Nouvel abonnement !</h2>
      <p>Un courtier vient de souscrire au plan <strong>${plan.toUpperCase()}</strong>.</p>
      <p>Email : ${courtierEmail}</p>
    </div>`
  })
}

async function emailEcheanceContrat({ courtierEmail, clientNom, dateEcheance }) {
  return sendEmail({
    to: courtierEmail,
    subject: `Échéance contrat — ${clientNom}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#f59e0b">Échéance contrat</h2>
      <p>Le contrat de <strong>${clientNom}</strong> arrive à échéance le <strong>${dateEcheance}</strong>.</p>
      <a href="https://courtia.vercel.app/contrats" style="display:inline-block;padding:10px 20px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px">Gérer mes contrats</a>
    </div>`
  })
}

module.exports = { sendEmail, emailNouveauClient, emailNouvelAbonnement, emailEcheanceContrat }
