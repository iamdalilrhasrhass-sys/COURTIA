const DOSSIER_FLOW = {
  lead: { label: 'Lead', next: ['qualification', 'abandoned'] },
  qualification: { label: 'Qualification', next: ['collecte_pieces', 'abandoned'] },
  collecte_pieces: { label: 'Collecte des pieces', next: ['tarification', 'qualification'] },
  tarification: { label: 'Tarification', next: ['conseil', 'collecte_pieces'] },
  conseil: { label: 'Devoir de conseil', next: ['souscription', 'tarification'] },
  souscription: { label: 'Souscription', next: ['actif', 'tarification'] },
  actif: { label: 'Contrat actif', next: ['renouvellement', 'resilie'] },
  renouvellement: { label: 'Renouvellement', next: ['actif', 'resilie'] },
  abandoned: { label: 'Abandonne', next: [] },
  resilie: { label: 'Resilie', next: [] },
}

const ENTRY_GUARDS = {
  conseil: (ctx) => {
    if ((ctx.blockingPoints || ctx.blocking_points || []).length > 0) {
      return { ok: false, reason: 'Dossier encore bloque par une piece ou une information indispensable.' }
    }
    if ((ctx.completionScore ?? ctx.completion_score ?? 0) < 80) {
      return { ok: false, reason: 'Dossier incomplet (< 80 %). Les pieces obligatoires doivent etre reunies avant le devoir de conseil.' }
    }
    return { ok: true }
  },
  souscription: (ctx) => {
    if (!ctx.adviceNoteValidated) {
      return { ok: false, reason: 'Note de conseil non validee : obligation DDA avant toute souscription.' }
    }
    if (ctx.actorType !== 'human') {
      return { ok: false, reason: "La souscription exige une validation humaine explicite. L'IA ne peut pas souscrire seule." }
    }
    return { ok: true }
  },
}

function canTransition(from, to) {
  const node = DOSSIER_FLOW[from]
  if (!node) return { ok: false, reason: `Etat inconnu : "${from}".` }
  if (!DOSSIER_FLOW[to]) return { ok: false, reason: `Etat cible inconnu : "${to}".` }
  if (!node.next.includes(to)) {
    return { ok: false, reason: `Transition interdite : ${node.label} -> ${DOSSIER_FLOW[to].label}.` }
  }
  return { ok: true }
}

function checkEntryGuard(to, ctx = {}) {
  const guard = ENTRY_GUARDS[to]
  return guard ? guard(ctx) : { ok: true }
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

async function advanceDossier(dossierId, toState, { actorType, actorId = null, context = {} } = {}) {
  const pool = require('../../db')
  const { emitEvent } = require('./events')
  const db = await pool.connect()

  try {
    await db.query('BEGIN')

    const { rows } = await db.query('SELECT * FROM dossiers WHERE id = $1 FOR UPDATE', [dossierId])
    const dossier = rows[0]
    if (!dossier) throw httpError(404, 'Dossier introuvable.')

    const transition = canTransition(dossier.status, toState)
    if (!transition.ok) throw httpError(409, transition.reason)

    const ctx = {
      ...context,
      completionScore: context.completionScore ?? context.completion_score ?? dossier.completion_score,
      actorType,
    }
    const guard = checkEntryGuard(toState, ctx)
    if (!guard.ok) throw httpError(403, guard.reason)

    const updated = await db.query(
      'UPDATE dossiers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [toState, dossierId],
    )

    await emitEvent({
      tenantId: dossier.tenant_id,
      aggregateType: 'dossier',
      aggregateId: dossierId,
      eventType: `dossier.${toState}`,
      actorType,
      actorId,
      payload: { from: dossier.status, to: toState, ...context },
    }, db)

    await db.query('COMMIT')

    const updatedDossier = updated.rows[0]
    if (!context.skipHandoff) {
      const { runHandoff } = require('./handoffService')
      await runHandoff(updatedDossier.id, {
        tenantId: updatedDossier.tenant_id,
        actorId,
      }).catch((err) => {
        console.error('[ark/handoff]', err.message)
      })
    }

    return updatedDossier
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    db.release()
  }
}

module.exports = {
  DOSSIER_FLOW,
  canTransition,
  checkEntryGuard,
  advanceDossier,
}
