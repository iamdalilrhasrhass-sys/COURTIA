const visionService = require('./visionService')
const pool = require('../db')

const whatsappService = {
  templates: {
    renewal: `Bonjour {{firstName}}, votre assurance {{type}} expire le {{expiryDate}}. Je vous propose de faire un point ensemble pour voir comment optimiser votre couverture. Quand êtes-vous disponible cette semaine?`,
    crossSell: `Bonjour {{firstName}}, vous êtes assuré chez moi pour votre {{current}}. J'ai une excellente opportunité pour vous sur une {{suggested}} avec une réduction de {{discount}}%. Pouvons-nous en discuter?`,
    followUp: `Bonjour {{firstName}}, suite à notre conversation du {{date}}, voici les documents pour {{action}}. N'hésitez pas si vous avez des questions!`,
    document_received: `Document reçu ✅ ARK a détecté : {{type}}. Indexé dans votre dossier COURTIA.`,
    document_error: `Désolé, je n'ai pas pu analyser ce document. Pouvez-vous réessayer avec une meilleure photo ?`
  },

  personalize(template, clientData) {
    let result = template;
    result = result.replace('{{firstName}}', clientData.first_name || clientData.prenom || '');
    result = result.replace('{{type}}', clientData.contracts?.[0]?.type || 'assurance');
    result = result.replace('{{expiryDate}}', clientData.contracts?.[0]?.end_date || '');
    return result;
  },

  generateWhatsAppLink(phone, message) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  },

  /**
   * Handler pour les messages WhatsApp entrants contenant des médias.
   * À appeler depuis le client WhatsApp Web (Baileys/whatsapp-web.js)
   * lors de l'événement 'messages.upsert' ou 'message'.
   *
   * @param {Object} sock — Le socket WhatsApp connecté (Baileys)
   * @param {Object} msg — Le message reçu
   * @param {number} userId — ID du courtier (pour retrouver le client)
   */
  async handleIncomingMedia(sock, msg, userId) {
    try {
      // Vérifier que le message contient un média
      const hasMedia = msg.message?.imageMessage ||
                       msg.message?.documentMessage ||
                       msg.message?.videoMessage ||
                       msg.message?.stickerMessage

      if (!hasMedia) return false // Pas un média, laisser passer vers inboundProcessor

      const from = msg.key.remoteJid // Numéro WhatsApp de l'expéditeur
      const phone = from.replace('@s.whatsapp.net', '').replace('@c.us', '')

      // Trouver le client par numéro de téléphone
      const clientResult = await pool.query(
        'SELECT id, prenom, nom, email FROM clients WHERE phone = $1 AND courtier_id = $2 LIMIT 1',
        [phone, userId]
      )

      if (clientResult.rows.length === 0) {
        console.log(`[WhatsApp] Message média de ${phone} — aucun client trouvé`)
        return false
      }

      const client = clientResult.rows[0]

      // Télécharger le média
      let mediaBuffer
      try {
        mediaBuffer = await sock.downloadMediaMessage(msg)
      } catch (dlErr) {
        console.error('[WhatsApp] Erreur téléchargement média:', dlErr.message)
        await sock.sendMessage(from, { text: whatsappService.templates.document_error })
        return true
      }

      // Convertir en base64
      const base64Data = mediaBuffer.toString('base64')
      const mimeType = msg.message?.imageMessage?.mimetype ||
                       msg.message?.documentMessage?.mimetype ||
                       'image/jpeg'

      // Analyser avec Gemini Vision
      const result = await visionService.analyzeDocument(base64Data, mimeType)

      // Insérer dans documents_indexes
      const docResult = await pool.query(
        `INSERT INTO documents_indexes (client_id, user_id, categorie, donnees_extraites, confiance, source, fichier_nom)
         VALUES ($1, $2, $3, $4, $5, 'whatsapp', $6)
         RETURNING *`,
        [client.id, userId, result.type, JSON.stringify(result.donnees_extraites || {}), result.confiance || 0.5, `whatsapp_${Date.now()}`]
      )

      // Mettre à jour clients.documents JSONB
      await pool.query(
        `UPDATE clients SET documents = COALESCE(documents, '[]'::jsonb) || $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify([{ id: docResult.rows[0].id, categorie: result.type, date: new Date().toISOString(), source: 'whatsapp' }]), client.id]
      )

      // Répondre au client
      const reply = whatsappService.templates.document_received
        .replace('{{type}}', result.type || 'document')
      await sock.sendMessage(from, { text: reply })

      // Notifier le courtier (log)
      console.log(`[WhatsApp] Document analysé pour ${client.prenom} ${client.nom} — type: ${result.type}, confiance: ${(result.confiance * 100).toFixed(0)}%`)

      return { type: result.type, confiance: result.confiance, client: `${client.prenom} ${client.nom}` }
    } catch (err) {
      console.error('[WhatsApp] Erreur handleIncomingMedia:', err.message)
      return false
    }
  }
}

module.exports = whatsappService
