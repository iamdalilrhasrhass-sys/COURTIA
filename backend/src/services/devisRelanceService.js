/**
 * Devis Relances — worker cron-like.
 * Lance toutes les heures un check :
 *   J+3  : relance "soft" si non ouvert
 *   J+7  : relance "valeur ajoutée" si non signé
 *   J+14 : relance "dernier appel" + expiration imminente
 * Stocke logs dans devis_relances.
 */
const pool = require('../db')
const { sendEmail } = require('./emailService')
const logger = require('../lib/logger')

const TEMPLATES = {
  J3: {
    subject: ({ cabinet, product }) => `Votre proposition ${product} (${cabinet}) — un petit mot`,
    html: ({ clientName, cabinet, product, reference, pdfUrl }) => `
      <div style="font-family:Inter,Arial;color:#1F2937;max-width:600px;margin:0 auto">
        <h2 style="color:#5B4DF5">Bonjour ${clientName || ''},</h2>
        <p>Je voulais m'assurer que la proposition <strong>${product}</strong> (référence ${reference}) que je vous ai envoyée vous est bien parvenue.</p>
        <p>Avez-vous des questions ? Je suis disponible pour en discuter cette semaine.</p>
        ${pdfUrl ? `<p><a href="${pdfUrl}" style="background:#5B4DF5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Revoir ma proposition</a></p>` : ''}
        <p style="color:#6B7280;font-size:12px">— ${cabinet}</p>
      </div>
    `,
  },
  J7: {
    subject: ({ cabinet, product }) => `${product} : pourquoi ce devis vaut le détour`,
    html: ({ clientName, cabinet, product, reference, pdfUrl, savingPct }) => `
      <div style="font-family:Inter,Arial;color:#1F2937;max-width:600px;margin:0 auto">
        <h2 style="color:#5B4DF5">Bonjour ${clientName || ''},</h2>
        <p>Petit rappel concernant votre proposition <strong>${product}</strong> (réf. ${reference}).</p>
        <p>${savingPct ? `Cette offre vous permet d'économiser <strong>${savingPct}%</strong> par rapport à la moyenne marché.` : 'Cette offre couvre tous vos besoins identifiés ensemble.'}</p>
        <p>Souhaitez-vous que je vous rappelle pour finaliser ?</p>
        ${pdfUrl ? `<p><a href="${pdfUrl}" style="background:#5B4DF5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Consulter la proposition</a></p>` : ''}
        <p style="color:#6B7280;font-size:12px">— ${cabinet}</p>
      </div>
    `,
  },
  J14: {
    subject: ({ cabinet, product }) => `Dernier rappel : votre devis ${product} expire bientôt`,
    html: ({ clientName, cabinet, product, reference, pdfUrl }) => `
      <div style="font-family:Inter,Arial;color:#1F2937;max-width:600px;margin:0 auto">
        <h2 style="color:#EF4444">Bonjour ${clientName || ''},</h2>
        <p>Votre proposition <strong>${product}</strong> (réf. ${reference}) arrive à échéance.</p>
        <p>Si vous souhaitez en bénéficier, il est encore temps de signer en ligne.</p>
        ${pdfUrl ? `<p><a href="${pdfUrl}" style="background:#5B4DF5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Signer ma proposition</a></p>` : ''}
        <p>Sinon, je reste à votre écoute pour toute nouvelle demande.</p>
        <p style="color:#6B7280;font-size:12px">— ${cabinet}</p>
      </div>
    `,
  },
}

async function scheduleRelancesForDevis(devisId) {
  const now = new Date()
  const plus = (days) => new Date(now.getTime() + days * 24 * 3600 * 1000)
  const rows = [
    { devis_id: devisId, scheduled_at: plus(3),  channel: 'email', template_key: 'J3'  },
    { devis_id: devisId, scheduled_at: plus(7),  channel: 'email', template_key: 'J7'  },
    { devis_id: devisId, scheduled_at: plus(14), channel: 'email', template_key: 'J14' },
  ]
  for (const r of rows) {
    await pool.query(
      `INSERT INTO devis_relances (devis_id, scheduled_at, channel, template_key, status)
       VALUES ($1, $2, $3, $4, 'scheduled')`,
      [r.devis_id, r.scheduled_at, r.channel, r.template_key]
    )
  }
}

async function cancelPendingRelancesForDevis(devisId) {
  await pool.query(
    `UPDATE devis_relances SET status = 'cancelled'
     WHERE devis_id = $1 AND status = 'scheduled'`,
    [devisId]
  )
}

async function processDueRelances() {
  // Récupère les relances dues — devis encore "sent" (pas "signed/refused")
  const { rows } = await pool.query(`
    SELECT r.id AS relance_id, r.template_key,
           d.id AS devis_id, d.status, d.product, d.reference,
           d.client_email_cache, d.client_name_cache, d.cabinet_name_cache,
           d.pdf_path
    FROM devis_relances r
    JOIN devis_wizard d ON d.id = r.devis_id
    WHERE r.status = 'scheduled'
      AND r.scheduled_at <= NOW()
      AND d.status IN ('sent', 'opened')
    ORDER BY r.scheduled_at ASC
    LIMIT 50
  `)

  let sent = 0
  for (const r of rows) {
    const tpl = TEMPLATES[r.template_key]
    if (!tpl) continue
    if (!r.client_email_cache) {
      await pool.query(`UPDATE devis_relances SET status='cancelled' WHERE id=$1`, [r.relance_id])
      continue
    }
    const cabinet = r.cabinet_name_cache || 'COURTIA'
    const product = r.product || ''
    const ctx = {
      cabinet, product,
      clientName: r.client_name_cache || '',
      reference: r.reference || `DV-${r.devis_id}`,
      pdfUrl: `${process.env.FRONTEND_URL || 'https://app.courtiark.fr'}/devis/${r.devis_id}`,
    }
    try {
      await sendEmail({
        to: r.client_email_cache,
        subject: tpl.subject(ctx),
        html: tpl.html(ctx),
      })
      await pool.query(
        `UPDATE devis_relances SET status='sent', sent_at = NOW() WHERE id = $1`,
        [r.relance_id]
      )
      await pool.query(
        `INSERT INTO devis_activity (devis_id, event, payload) VALUES ($1, 'relance_sent', $2::jsonb)`,
        [r.devis_id, JSON.stringify({ template: r.template_key })]
      )
      sent++
    } catch (e) {
      logger.error({ err: e.message, devisId: r.devis_id, relance: r.relance_id }, 'devis relance failed')
      await pool.query(
        `UPDATE devis_relances SET status='cancelled' WHERE id = $1`,
        [r.relance_id]
      )
    }
  }
  if (sent > 0) logger.info({ sent }, 'devis relances flush')
  return { sent, scanned: rows.length }
}

let _intervalId = null
function startWorker(intervalMs = 60 * 60 * 1000) {
  if (_intervalId) return
  // Premier passage 60s après démarrage, puis toutes les heures.
  setTimeout(() => {
    processDueRelances().catch((e) => logger.error({ err: e.message }, 'devis relance bootstrap'))
    _intervalId = setInterval(() => {
      processDueRelances().catch((e) => logger.error({ err: e.message }, 'devis relance tick'))
    }, intervalMs)
  }, 60 * 1000)
  logger.info({ intervalMs }, 'devis relance worker started')
}

module.exports = {
  scheduleRelancesForDevis,
  cancelPendingRelancesForDevis,
  processDueRelances,
  startWorker,
  TEMPLATES,
}
