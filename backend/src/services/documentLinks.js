/**
 * documentLinks.js — Service de gestion des liens de collecte
 *
 * Génère des tokens sécurisés pour permettre aux clients
 * d'uploader leurs documents via un lien unique.
 */

const crypto = require('crypto')
const pool = require('../db')

// Configuration
const TOKEN_LENGTH = 32 // 32 caractères URL-safe
const DEFAULT_EXPIRY_HOURS = 72 // 3 jours par défaut
const MAX_EXPIRY_DAYS = 30 // Maximum 30 jours

/**
 * Génère un token URL-safe de longueur spécifiée
 * @param {number} length
 * @returns {string}
 */
function generateToken(length = TOKEN_LENGTH) {
  // Génère un token avec caractères alphanumériques URL-safe
  return crypto.randomBytes(Math.ceil(length * 0.75))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .slice(0, length)
}

/**
 * Génère un lien de collecte complet
 * @returns {string}
 */
function generateRequestToken() {
  return generateToken(TOKEN_LENGTH)
}

/**
 * Crée une demande de collecte de documents
 * @param {Object} params - { clientId, brokerId, requestedTypes, expiresInHours, notes }
 * @returns {Object} - { id, token, url, expiresAt }
 */
async function createDocumentRequest({ clientId, brokerId, requestedTypes = [], expiresInHours = DEFAULT_EXPIRY_HOURS, notes = null }) {
  const token = generateRequestToken()

  // Calculer expiration (max 30 jours)
  const hours = Math.min(expiresInHours, MAX_EXPIRY_DAYS * 24)
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)

  // Créer la demande
  const result = await pool.query(
    `INSERT INTO document_requests (client_id, broker_id, token, requested_types, expires_at, notes)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING id, token, status, expires_at, created_at`,
    [clientId, brokerId, token, JSON.stringify(requestedTypes), expiresAt, notes]
  )

  const request = result.rows[0]

  // Créer les items pour chaque type demandé
  if (requestedTypes.length > 0) {
    const itemValues = requestedTypes.map((type, i) => `($1, $${i + 2})`).join(', ')
    const itemParams = [request.id, ...requestedTypes]
    await pool.query(
      `INSERT INTO document_request_items (request_id, document_type) VALUES ${itemValues}`,
      itemParams
    )
  }

  // Construire l'URL
  const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://app.courtiark.fr'
  const url = `${baseUrl}/collect/${token}`

  return {
    id: request.id,
    token: request.token,
    url,
    status: request.status,
    expiresAt: request.expires_at,
    createdAt: request.created_at,
    requestedTypes,
  }
}

/**
 * Valide un token de collecte
 * @param {string} token
 * @returns {Object|null} - Demande valide ou null si invalide/expiré
 */
async function validateToken(token) {
  if (!token || token.length !== TOKEN_LENGTH) {
    return { valid: false, error: 'Token invalide', code: 'INVALID_TOKEN' }
  }

  const result = await pool.query(
    `SELECT dr.*, c.first_name, c.last_name, c.email, c.phone,
            u.full_name as broker_name, u.email as broker_email
     FROM document_requests dr
     JOIN clients c ON c.id = dr.client_id
     LEFT JOIN users u ON u.id = dr.broker_id
     WHERE dr.token = $1`,
    [token]
  )

  if (result.rows.length === 0) {
    return { valid: false, error: 'Lien de collecte introuvable', code: 'NOT_FOUND' }
  }

  const request = result.rows[0]

  // Vérifier expiration
  if (new Date(request.expires_at) < new Date()) {
    return { valid: false, error: 'Ce lien de collecte a expiré', code: 'EXPIRED' }
  }

  // Vérifier statut
  if (request.status === 'completed') {
    return { valid: false, error: 'Cette demande de documents est déjà complétée', code: 'COMPLETED' }
  }

  // Récupérer les items demandés
  const itemsResult = await pool.query(
    `SELECT id, document_type, status, document_id, received_at
     FROM document_request_items
     WHERE request_id = $1
     ORDER BY id`,
    [request.id]
  )

  return {
    valid: true,
    request: {
      id: request.id,
      clientId: request.client_id,
      brokerId: request.broker_id,
      status: request.status,
      expiresAt: request.expires_at,
      notes: request.notes,
      client: {
        firstName: request.first_name,
        lastName: request.last_name,
        email: request.email,
        phone: request.phone,
      },
      broker: {
        name: request.broker_name,
        email: request.broker_email,
      },
      items: itemsResult.rows.map(item => ({
        id: item.id,
        type: item.document_type,
        status: item.status,
        documentId: item.document_id,
        receivedAt: item.received_at,
      })),
    },
  }
}

/**
 * Marque un item comme reçu et lie le document
 * @param {number} requestId
 * @param {string} documentType
 * @param {number} documentId
 */
async function markItemReceived(requestId, documentType, documentId) {
  // Mettre à jour l'item
  await pool.query(
    `UPDATE document_request_items
     SET status = 'received', document_id = $1, received_at = NOW()
     WHERE request_id = $2 AND document_type = $3 AND status = 'pending'`,
    [documentId, requestId, documentType]
  )

  // Vérifier si tous les items sont reçus
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
       COUNT(*) as total_count
     FROM document_request_items
     WHERE request_id = $1`,
    [requestId]
  )

  const { pending_count, total_count } = result.rows[0]

  // Mettre à jour le statut de la demande
  let newStatus = 'pending'
  if (parseInt(pending_count) === 0) {
    newStatus = 'completed'
    await pool.query(
      `UPDATE document_requests SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [requestId]
    )
  } else if (parseInt(pending_count) < parseInt(total_count)) {
    newStatus = 'partial'
    await pool.query(
      `UPDATE document_requests SET status = 'partial' WHERE id = $1`,
      [requestId]
    )
  }

  return {
    newStatus,
    pendingCount: parseInt(pending_count),
    totalCount: parseInt(total_count),
  }
}

/**
 * Récupère toutes les demandes pour un client
 * @param {number} clientId
 */
async function getRequestsForClient(clientId) {
  const result = await pool.query(
    `SELECT dr.*,
            (SELECT json_agg(json_build_object(
              'id', dri.id,
              'type', dri.document_type,
              'status', dri.status,
              'receivedAt', dri.received_at
            )) FROM document_request_items dri WHERE dri.request_id = dr.id) as items
     FROM document_requests dr
     WHERE dr.client_id = $1
     ORDER BY dr.created_at DESC`,
    [clientId]
  )
  return result.rows
}

/**
 * Récupère une demande par son token
 * @param {string} token
 */
async function getRequestByToken(token) {
  const validation = await validateToken(token)
  if (!validation.valid) {
    return null
  }
  return validation.request
}

/**
 * Annule une demande de collecte
 * @param {number} requestId
 */
async function cancelRequest(requestId) {
  await pool.query(
    `UPDATE document_requests SET status = 'cancelled' WHERE id = $1`,
    [requestId]
  )
}

/**
 * Prolonge l'expiration d'une demande
 * @param {number} requestId
 * @param {number} additionalHours
 */
async function extendExpiry(requestId, additionalHours = 72) {
  const hours = Math.min(additionalHours, MAX_EXPIRY_DAYS * 24)
  const result = await pool.query(
    `UPDATE document_requests
     SET expires_at = expires_at + INTERVAL '${hours} hours'
     WHERE id = $1 AND status != 'completed'
     RETURNING expires_at`,
    [requestId]
  )
  return result.rows[0]?.expires_at
}

/**
 * Met à jour le compteur de rappels
 * @param {number} requestId
 */
async function recordReminder(requestId) {
  await pool.query(
    `UPDATE document_requests
     SET reminder_sent_at = NOW(), reminder_count = reminder_count + 1
     WHERE id = $1`,
    [requestId]
  )
}

module.exports = {
  generateRequestToken,
  createDocumentRequest,
  validateToken,
  markItemReceived,
  getRequestsForClient,
  getRequestByToken,
  cancelRequest,
  extendExpiry,
  recordReminder,
  TOKEN_LENGTH,
  DEFAULT_EXPIRY_HOURS,
  MAX_EXPIRY_DAYS,
}
