const express = require('express')
const verifyToken = require('../middleware/authMiddleware')
const pool = require('../db')
const cabinetService = require('../services/cabinetMembershipService')
const { logAudit } = require('../lib/audit')
const { isFeatureEnabled } = require('../lib/featureFlags')

const router = express.Router()

router.get('/:token', async (req, res) => {
  try {
    const invitation = await cabinetService.getInvitationByToken(pool, req.params.token)
    if (!invitation) return res.status(404).json({ error: 'invite_not_found', message: 'Invitation introuvable.' })
    if (invitation.accepted_at) return res.status(409).json({ error: 'invite_already_accepted', message: 'Invitation déjà acceptée.' })
    if (new Date(invitation.expires_at).getTime() < Date.now()) return res.status(410).json({ error: 'invite_expired', message: 'Invitation expirée.' })
    res.json({ invitation: cabinetService.sanitizeInvitation(invitation) })
  } catch (err) {
    res.status(500).json({ error: 'invite_unavailable', message: 'Invitation indisponible.' })
  }
})

router.post('/:token/accept', verifyToken, async (req, res) => {
  try {
    const userId = cabinetService.getSafeUserId(req.user)
    const invitation = await cabinetService.getInvitationByToken(pool, req.params.token)
    if (!invitation) return res.status(404).json({ error: 'invite_not_found', message: 'Invitation introuvable.' })
    const enabled = req.user?.role === 'super_admin' || await isFeatureEnabled({
      userId,
      cabinetId: String(invitation.cabinet_id || ''),
      key: 'v1_members_onboarding',
    })
    if (!enabled) {
      return res.status(403).json({
        error: 'feature_disabled',
        message: 'Les invitations cabinet V1 sont désactivées pour ce cabinet.',
        feature_flag: 'v1_members_onboarding',
      })
    }
    const accepted = await cabinetService.acceptInvitation(pool, { token: req.params.token, userId })
    await logAudit({ cabinetId: accepted.membership.cabinet_id, userId, entityType: 'cabinet_invitation', entityId: accepted.invitation.id, action: 'accepted', metadata: { role: accepted.membership.role }, req }).catch(() => {})
    res.json({ success: true, invitation: cabinetService.sanitizeInvitation(accepted.invitation), membership: accepted.membership })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'invite_accept_failed', message: err.message || 'Acceptation invitation impossible.' })
  }
})

module.exports = router
