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
 */
const pool = require('../db')
const { sendEmail, sendCommercialEmail } = require('./emailService')
const logger = require('../lib/logger')

async function executeStep({ run, prospect, step }) {
  const channel = (step.channel || 'email').toLowerCase()
  const subject = step.subject || step.template_subject || 'Petite question'
  const bodyTpl = step.template || step.body || ''
  const bodyRendered = bodyTpl
    .replace(/{{\s*firstName\s*}}/gi, prospect.contact_first_name || '')
    .replace(/{{\s*lastName\s*}}/gi, prospect.contact_last_name || '')
    .replace(/{{\s*company\s*}}/gi, prospect.company_name || '')
    .replace(/{{\s*city\s*}}/gi, prospect.city || '')

  if (channel === 'email' && prospect.email) {
    try {
      await sendCommercialEmail({ to: prospect.email, subject, html: `<div style="font-family:Inter,Arial;color:#1F2937;max-width:600px;margin:0 auto">${bodyRendered.replace(/\n/g, '<br>')}</div>` })
      await pool.query(`
        INSERT INTO reach_messages (prospect_id, channel, subject, content, status, sent_at, user_id, campaign_id)
        VALUES ($1, 'email', $2, $3, 'sent', NOW(), $4, NULL)
        ON CONFLICT DO NOTHING
      `, [prospect.id, subject, bodyRendered, run.user_id]).catch(() => {})
      return { ok: true, action: 'email_sent' }
    } catch (e) {
      return { ok: false, error: e.message }
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
  // 1. Récupère runs actifs dus
  const { rows: runs } = await pool.query(`
    SELECT r.id, r.sequence_id, r.prospect_id, r.current_step, r.status, r.next_run_at,
           s.user_id, s.steps_json
    FROM reach_sequence_runs r
    JOIN reach_sequences s ON s.id = r.sequence_id
    WHERE r.status = 'active'
      AND r.next_run_at <= NOW()
    ORDER BY r.next_run_at ASC
    LIMIT 100
  `).catch(() => ({ rows: [] }))

  let executed = 0
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
    if (!result.ok) {
      await pool.query(
        `UPDATE reach_sequence_runs SET last_action_at=NOW(), next_run_at = NOW() + ($1 || ' days')::interval WHERE id=$2`,
        ['1', r.id]
      )
      logger.warn({ run_id: r.id, action: step.action, error: result.error }, 'reach step failed - run not advanced')
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

  if (executed > 0) logger.info({ executed, scanned: runs.length }, 'reach worker tick')
  return { executed, scanned: runs.length }
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

module.exports = { tick, startWorker }
