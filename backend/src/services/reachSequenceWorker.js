/**
 * REACH — worker séquences sortantes
 *
 * Cron-like : toutes les 15 min, on traite les runs dont next_run_at est passé.
 * Une séquence = liste d'étapes JSON :
 *   { day_offset: 0|3|7|14|21, channel: 'email'|'sms'|'task', template: '...', subject: '...' }
 *
 * Pour chaque run actif :
 *   - si jour cible atteint → exécute l'étape (email/SMS/tâche)
 *   - puis avance current_step / next_run_at vers la prochaine étape
 *   - si plus d'étape → status = 'done'
 *
 * RÈGLE DE VÉRITÉ (correction 20/09/2026) : un statut 'sent' n'est écrit QUE
 * quand le fournisseur a confirmé l'envoi. Avant, cette étape appelait
 * sendCommercialEmail sans jamais lire `success` puis écrivait
 * reach_messages.status='sent' et renvoyait {ok:true,action:'email_sent'} —
 * alors que sans fournisseur d'e-mail (ou sans EMAIL_REPLY_TO) l'envoi était
 * refusé (emailService renvoie {success:false,skipped:true}). Résultat : des
 * messages « envoyés » qui n'existaient pas alimentaient les KPI de /api/reach
 * (sent_messages, sent_count, total_messages) et la séquence avançait comme si
 * le prospect avait été contacté.
 */
const pool = require('../db')
const {
  sendCommercialEmail,
  getEmailStatus,
  isCommercialEmailReady,
} = require('./emailService')
const logger = require('../lib/logger')

/**
 * Trace un envoi qui N'A PAS eu lieu.
 *
 * On garde une ligne (statut 'failed', jamais 'sent', jamais de sent_at) pour
 * que l'échec soit visible dans l'historique du prospect. Les KPI d'envoi
 * comptent uniquement status='sent' : cette ligne ne les fausse donc pas.
 */
async function tracerEnvoiNonParti({ prospect, run, channel, subject, contenu, raison }) {
  try {
    await pool.query(
      `INSERT INTO reach_messages (prospect_id, channel, subject, content, status, user_id)
       VALUES ($1, $2, $3, $4, 'failed', $5)`,
      [prospect.id, channel, subject || null, contenu || '', run.user_id]
    )
    return true
  } catch (e) {
    logger.error(
      { err: e.message, prospect_id: prospect.id, raison },
      'reach : trace de l’échec d’envoi impossible'
    )
    return false
  }
}

async function executeStep({ run, prospect, step }) {
  const channel = (step.channel || 'email').toLowerCase()
  const subject = step.subject || step.template_subject || 'Petite question'
  const bodyTpl = step.template || step.body || ''
  const bodyRendered = bodyTpl
    .replace(/{{\s*firstName\s*}}/gi, prospect.contact_first_name || '')
    .replace(/{{\s*lastName\s*}}/gi, prospect.contact_last_name || '')
    .replace(/{{\s*company\s*}}/gi, prospect.company_name || '')
    .replace(/{{\s*city\s*}}/gi, prospect.city || '')

  if (channel === 'email') {
    if (!prospect.email) {
      // Aucune adresse : l'étape ne peut pas partir. On le déclare (l'ancien
      // code tombait dans « unknown_channel », ce qui masquait la vraie cause).
      await tracerEnvoiNonParti({ prospect, run, channel, subject, contenu: bodyRendered, raison: 'email_absent' })
      return { ok: false, error: 'email_absent' }
    }

    // FAIL-CLOSED : sans fournisseur d'e-mail configuré (ou sans adresse de
    // réponse), on n'appelle même pas le service d'envoi et AUCUN 'sent'
    // n'est écrit. La carte du code dit exactement ce qui manque.
    if (!isCommercialEmailReady()) {
      const statut = getEmailStatus()
      const manquants = statut.configured ? ['EMAIL_REPLY_TO'] : (statut.missing || [])
      const raison = statut.configured ? 'reply_to_required' : 'configuration_required'
      await tracerEnvoiNonParti({
        prospect, run, channel, subject, contenu: bodyRendered,
        raison: `${raison} (${manquants.join(', ') || 'fournisseur inconnu'})`,
      })
      logger.warn(
        { run_id: run.id, prospect_id: prospect.id, raison, manquants },
        'reach : étape e-mail non envoyée (configuration incomplète) — aucune ligne « sent » écrite'
      )
      return { ok: false, error: raison, channel, missing: manquants }
    }

    try {
      const envoi = await sendCommercialEmail({
        to: prospect.email,
        subject,
        html: `<div style="font-family:Inter,Arial;color:#1F2937;max-width:600px;margin:0 auto">${bodyRendered.replace(/\n/g, '<br>')}</div>`,
      })

      // Le cœur de la correction : on lit `success` AVANT d'écrire quoi que
      // ce soit. Pas de succès confirmé → pas de statut 'sent', pas d'avancée.
      if (!envoi || envoi.success !== true) {
        const raison = envoi?.error || 'send_failed'
        await tracerEnvoiNonParti({ prospect, run, channel, subject, contenu: bodyRendered, raison })
        logger.warn(
          { run_id: run.id, prospect_id: prospect.id, raison, missing: envoi?.missing || null },
          'reach : envoi e-mail non confirmé — aucune ligne « sent » écrite'
        )
        return { ok: false, error: raison, channel, missing: envoi?.missing || null }
      }

      // Envoi RÉELLEMENT confirmé par le fournisseur : c'est le seul endroit du
      // fichier où 'sent' et sent_at peuvent être écrits.
      let traceEnregistree = true
      await pool.query(
        `INSERT INTO reach_messages (prospect_id, channel, subject, content, status, sent_at, user_id, campaign_id)
         VALUES ($1, 'email', $2, $3, 'sent', NOW(), $4, NULL)`,
        [prospect.id, subject, bodyRendered, run.user_id]
      ).catch((e) => {
        // L'e-mail est parti mais sa trace a échoué : l'échec est journalisé et
        // remonté, jamais avalé en silence (l'ancien `.catch(() => {})` faisait
        // disparaître la ligne sans que personne ne le sache).
        traceEnregistree = false
        logger.error(
          { err: e.message, prospect_id: prospect.id, run_id: run.id },
          'reach : envoi confirmé mais trace reach_messages non écrite'
        )
      })

      return { ok: true, action: 'email_sent', provider: envoi.provider || null, trace_enregistree: traceEnregistree }
    } catch (e) {
      // Le détail technique reste côté serveur (jamais dans le rapport).
      logger.error({ err: e.message, run_id: run.id, prospect_id: prospect.id }, 'reach : envoi e-mail en exception')
      await tracerEnvoiNonParti({ prospect, run, channel, subject, contenu: bodyRendered, raison: 'send_exception' })
      return { ok: false, error: 'send_failed', channel }
    }
  }

  if (channel === 'sms') {
    // CORRECTION 2026-09-19 : l'étape SMS écrivait status='sent' alors qu'aucun
    // SMS n'est émis (pas de passerelle branchée) et comptait donc dans les KPI
    // d'envoi. On trace 'not_implemented' et on déclare l'échec, pour que la
    // séquence ne saute pas l'étape silencieusement.
    await pool.query(`
      INSERT INTO reach_messages (prospect_id, channel, content, status, user_id)
      VALUES ($1, 'sms', $2, 'not_implemented', $3)
      ON CONFLICT DO NOTHING
    `, [prospect.id, bodyRendered, run.user_id]).catch((e) => logger.warn({ err: e.message }, 'reach sms trace failed'))
    return { ok: false, error: 'sms_not_implemented' }
  }

  if (channel === 'task' || channel === 'tache') {
    // Crée une tâche dans la table taches du courtier
    try {
      await pool.query(`
        INSERT INTO taches (user_id, titre, description, statut, priorite, due_date)
        VALUES ($1, $2, $3, 'a_faire', 'normale', NOW() + INTERVAL '1 day')
      `, [
        run.user_id,
        step.title || `Relance manuelle ${prospect.company_name || ''}`,
        bodyRendered || `Relance manuelle prospect REACH (${prospect.email || prospect.phone || ''})`,
      ])
      return { ok: true, action: 'task_created' }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  return { ok: false, error: 'unknown_channel' }
}

async function tick() {
  // 1. Récupère runs actifs dus.
  //    CORRECTION 20/09/2026 : le `.catch(() => ({rows: []}))` d'origine
  //    transformait une base injoignable en « 0 run scanné = tout va bien ».
  //    Une panne remonte maintenant son erreur (le planificateur la journalise).
  const { rows: runs } = await pool.query(`
    SELECT r.id, r.sequence_id, r.prospect_id, r.current_step, r.status, r.next_run_at,
           s.user_id, s.steps_json
    FROM reach_sequence_runs r
    JOIN reach_sequences s ON s.id = r.sequence_id
    WHERE r.status = 'active'
      AND r.next_run_at <= NOW()
    ORDER BY r.next_run_at ASC
    LIMIT 100
  `)

  let executed = 0
  const echecs = []
  for (const r of runs) {
    const steps = Array.isArray(r.steps_json) ? r.steps_json : []
    const stepIdx = r.current_step || 0
    if (stepIdx >= steps.length) {
      await pool.query(`UPDATE reach_sequence_runs SET status='done' WHERE id=$1`, [r.id])
      continue
    }
    const step = steps[stepIdx]
    const { rows: p } = await pool.query(`SELECT * FROM reach_prospects WHERE id = $1`, [r.prospect_id])
    if (!p[0]) {
      await pool.query(`UPDATE reach_sequence_runs SET status='stopped' WHERE id=$1`, [r.id])
      continue
    }
    const result = await executeStep({ run: r, prospect: p[0], step })
    if (result.ok) executed++

    // CORRECTION 2026-09-19 : une étape en échec faisait quand même avancer le
    // run (voire le clôturer 'done') — le prospect ne recevait jamais l'étape et
    // rien ne le signalait. On repousse la prochaine tentative sans avancer.
    // CORRECTION 20/09/2026 : la raison exacte de l'échec est désormais renvoyée
    // par tick() (elle n'existait que dans les logs) : l'appelant sait combien
    // d'étapes ont échoué et pourquoi, sans jamais lire un faux « executed ».
    if (!result.ok) {
      await pool.query(
        `UPDATE reach_sequence_runs SET last_action_at=NOW(), next_run_at = NOW() + ($1 || ' days')::interval WHERE id=$2`,
        ['1', r.id]
      )
      echecs.push({ run_id: r.id, prospect_id: r.prospect_id, etape: stepIdx, channel: result.channel || (step.channel || 'email'), error: result.error, missing: result.missing || null })
      logger.warn({ run_id: r.id, error: result.error }, 'reach step failed - run not advanced')
      continue
    }

    // Avance
    const nextIdx = stepIdx + 1
    if (nextIdx >= steps.length) {
      await pool.query(
        `UPDATE reach_sequence_runs SET status='done', current_step=$1, last_action_at=NOW() WHERE id=$2`,
        [nextIdx, r.id]
      )
    } else {
      // Décale next_run_at au prochain day_offset relatif
      const cur = step.day_offset || 0
      const nxt = steps[nextIdx].day_offset || (cur + 3)
      const delta = Math.max(1, nxt - cur)
      await pool.query(
        `UPDATE reach_sequence_runs
            SET current_step=$1, last_action_at=NOW(), next_run_at = NOW() + ($2 || ' days')::interval
          WHERE id=$3`,
        [nextIdx, String(delta), r.id]
      )
    }
  }

  if (executed > 0 || echecs.length > 0) {
    logger.info({ executed, failed: echecs.length, scanned: runs.length }, 'reach worker tick')
  }
  return { executed, failed: echecs.length, scanned: runs.length, echecs }
}

let _intervalId = null
function startWorker(intervalMs = 15 * 60 * 1000) {
  if (_intervalId) return
  setTimeout(() => {
    tick().catch((e) => logger.error({ err: e.message }, 'reach worker bootstrap'))
    _intervalId = setInterval(() => {
      tick().catch((e) => logger.error({ err: e.message }, 'reach worker tick'))
    }, intervalMs)
  }, 90 * 1000)
  logger.info({ intervalMs }, 'reach sequence worker started')
}

module.exports = { tick, startWorker, executeStep }
