const express = require('express')
const router = express.Router()

const { markOptedOutByToken } = require('../modules/ark/prospectService')

router.get('/opt-out/:token', async (req, res) => {
  try {
    await markOptedOutByToken(req.params.token)
    res.status(200).send('Désinscription confirmée. Vous ne recevrez plus cette séquence.')
  } catch (err) {
    res.status(err.status || 500).send(err.message)
  }
})

module.exports = router
