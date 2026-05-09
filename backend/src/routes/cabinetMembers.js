const express = require('express')
const pool = require('../db')
const { attachCabinet, requireCabinetFeature, requireRole } = require('../middleware/cabinetAccess')
const cabinetService = require('../services/cabinetMembershipService')
const { sendEmail } = require('../services/emailService')
const { logAudit } = require('../lib/audit')

const router = express.Router()

function safeMember(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role,
    created_at: row.created_at,
  }
}

router.use(attachCabinet)
router.use(requireCabinetFeature('v1_members_onboarding'))

router.get('/', async (req, res) => {
  try {
    const members = await pool.query(
      `SELECT cm.id, cm.user_id, cm.role, cm.created_at, u.email, u.first_name, u.last_name
       FROM cabinet_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.cabinet_id = $1 AND cm.removed_at IS NULL
       ORDER BY cm.created_at ASC`,
      [req.cabinetId]
    )
    const invitations = await pool.query(
      `SELECT id, email, role, token_preview, invited_by, expires_at, accepted_at, created_at
       FROM cabinet_invitations
       WHERE cabinet_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.cabinetId]
    )
    res.json({
      cabinet: {
        id: req.cabinetId,
        name: req.cabinetMembership.cabinet_name || 'Cabinet COURTIA',
        role: req.cabinetMembership.role,
      },
      members: members.rows.map(safeMember),
      invitations: invitations.rows,
    })
  } catch (err) {
    res.status(500).json({ error: 'members_unavailable', message: 'Liste équipe indisponible.' })
  }
})

router.post('/invite', requireRole('owner'), async (req, res) => {
  try {
    const { email, role } = req.body || {}
    const invite = await cabinetService.createInvitation(pool, {
      actorUserId: cabinetService.getSafeUserId(req.user),
      email,
      role,
      frontendUrl: process.env.FRONTEND_URL || 'https://courtia.vercel.app',
    })

    const emailResult = await sendEmail({
      to: invite.invitation.email,
      subject: 'Invitation COURTIA — rejoignez votre cabinet',
      html: `<p>Vous êtes invité à rejoindre un cabinet COURTIA.</p><p><a href="${invite.inviteLink}">Accepter l’invitation</a></p>`,
      text: `Vous êtes invité à rejoindre un cabinet COURTIA : ${invite.inviteLink}`,
    })

    await logAudit({
      cabinetId: req.cabinetId,
      userId: cabinetService.getSafeUserId(req.user),
      entityType: 'cabinet_invitation',
      entityId: invite.invitation.id,
      action: 'created',
      metadata: { email: invite.invitation.email, role: invite.invitation.role, email_skipped: !!emailResult?.skipped },
      req,
    }).catch(() => {})

    res.status(201).json({
      invitation: cabinetService.sanitizeInvitation(invite.invitation),
      invite_link: invite.inviteLink,
      email_delivery: emailResult,
      message: emailResult?.skipped ? 'Invitation créée. Email désactivé : lien à transmettre manuellement.' : 'Invitation envoyée.',
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'invite_failed', message: err.message || 'Invitation impossible.' })
  }
})

router.patch('/:id', requireRole('owner'), async (req, res) => {
  try {
    const role = cabinetService.normalizeCabinetRole(req.body?.role)
    if (role === 'super_admin') return res.status(400).json({ error: 'invalid_role', message: 'Le rôle super_admin est plateforme uniquement.' })
    const result = await pool.query(
      `UPDATE cabinet_members SET role = $1
       WHERE id = $2 AND cabinet_id = $3 AND removed_at IS NULL
       RETURNING id, cabinet_id, user_id, role, created_at`,
      [role, req.params.id, req.cabinetId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'member_not_found', message: 'Membre introuvable.' })
    await logAudit({ cabinetId: req.cabinetId, userId: cabinetService.getSafeUserId(req.user), entityType: 'cabinet_member', entityId: req.params.id, action: 'role_updated', metadata: { role }, req }).catch(() => {})
    res.json({ member: result.rows[0] })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'member_update_failed', message: err.message || 'Mise à jour membre impossible.' })
  }
})

router.delete('/:id', requireRole('owner'), async (req, res) => {
  try {
    const currentUserId = cabinetService.getSafeUserId(req.user)
    const result = await pool.query(
      `UPDATE cabinet_members SET removed_at = NOW()
       WHERE id = $1 AND cabinet_id = $2 AND removed_at IS NULL AND user_id <> $3
       RETURNING id, user_id, role`,
      [req.params.id, req.cabinetId, currentUserId]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'member_not_removed', message: 'Membre introuvable ou suppression de soi-même refusée.' })
    await logAudit({ cabinetId: req.cabinetId, userId: currentUserId, entityType: 'cabinet_member', entityId: req.params.id, action: 'removed', metadata: { removed_user_id: result.rows[0].user_id }, req }).catch(() => {})
    res.json({ success: true, removed: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'member_remove_failed', message: 'Suppression membre impossible.' })
  }
})

module.exports = router
