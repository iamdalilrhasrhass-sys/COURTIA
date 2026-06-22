const express = require('express')
const router = express.Router()

const { parseInboundPayload, verifyWebhook } = require('../modules/ark/whatsapp/whatsappService')
const { handleInbound } = require('../modules/ark/whatsapp/intakeService')

router.get('/webhook', (req, res) => {
  const { ok, challenge } = verifyWebhook(req.query)
  if (ok) return res.status(200).send(challenge)
  return res.sendStatus(403)
})

router.post('/webhook', (req, res) => {
  res.sendStatus(200)

  let messages = []
  try {
    messages = parseInboundPayload(req.body)
  } catch (err) {
    console.error('[ark:whatsapp] parse failed:', err.message)
    return
  }

  for (const message of messages) {
    handleInbound(message).catch((err) => {
      console.error('[ark:whatsapp] intake failed:', err.message)
    })
  }
})

module.exports = router
