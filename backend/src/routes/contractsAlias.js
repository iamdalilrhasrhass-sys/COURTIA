const express = require('express')
const { requireCabinetFeature } = require('../middleware/cabinetAccess')
const { saveCommissionForContract } = require('./commissions')

const router = express.Router()

router.post('/:id/commissions', requireCabinetFeature('v1_commissions'), saveCommissionForContract)

module.exports = router
