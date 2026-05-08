/**
 * @file whatsapp.js — WhatsApp helpers for COURTIA.
 * No SMS, no APIs. Just wa.me links with pre-filled messages.
 */

/**
 * Normalize a French phone number to international format.
 * Accepts: 06..., +336..., 33 6..., 00336...
 * Returns: +33XXXXXXXXX or null if invalid.
 */
export function normalizeFrenchPhoneNumber(phone) {
  if (!phone) return null
  let cleaned = String(phone).replace(/[\s.\-\(\)\/]/g, '')

  // Remove leading zeros for international prefix
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.substring(2)
  if (cleaned.startsWith('+330')) cleaned = '+33' + cleaned.substring(4)
  if (cleaned.startsWith('330')) cleaned = '+33' + cleaned.substring(3)

  // French mobile: 06 / 07 -> +336 / +337
  if (/^0[67]\d{8}$/.test(cleaned)) {
    cleaned = '+33' + cleaned.substring(1)
  }

  // Landline: 01-05 -> +331-+335
  if (/^0[1-5]\d{8}$/.test(cleaned)) {
    cleaned = '+33' + cleaned.substring(1)
  }

  // Already international
  if (/^\+33[1-7]\d{8}$/.test(cleaned)) return cleaned

  return null
}

/**
 * Build a wa.me URL with pre-filled message.
 */
export function buildWhatsappUrl(phone, message) {
  if (!phone) return null
  const cleaned = phone.replace(/^\+/, '')
  const encoded = encodeURIComponent(message || '')
  return `https://wa.me/${cleaned}?text=${encoded}`
}

/**
 * Open WhatsApp in a new tab for a client.
 */
export function openWhatsappForClient(client, message) {
  const phone = normalizeFrenchPhoneNumber(client?.mobile || client?.telephone)
  if (!phone) {
    return { success: false, url: null, error: 'Aucun numéro de téléphone valide. Veuillez compléter la fiche client.' }
  }
  const url = buildWhatsappUrl(phone, message)
  if (!url) {
    return { success: false, url: null, error: 'Numéro invalide' }
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  return { success: true, url, error: null }
}

/**
 * Get WhatsApp template message from intelligence profile.
 */
export function getWhatsappTemplate(intelligence) {
  return intelligence?.whatsappMessage || null
}
