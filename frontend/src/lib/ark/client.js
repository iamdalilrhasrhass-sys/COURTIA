import axios from 'axios'
import * as prompts from './prompts.js'
import { validateArkResponse } from './schema.js'
import { arkCache } from './cache.js'

const API_URL = import.meta.env.VITE_API_URL || 'https://courtia.onrender.com'
function getToken() { return localStorage.getItem('courtia_token') || localStorage.getItem('token') }

/**
 * Construit le contexte compact client (<500 tokens).
 * @param {Object} client
 * @param {Object} scores — résultat de computeScores()
 * @param {Array}  contrats
 * @returns {string}
 */
export function buildArkContext(client, scores, contrats) {
  const top3contrats = (contrats || [])
    .filter(c => (c.statut || c.status || '').toLowerCase() === 'actif')
    .slice(0, 3)
    .map(c => `${c.type_contrat || '?'} ${c.prime_annuelle ? c.prime_annuelle + '€' : ''} éch:${c.date_echeance ? new Date(c.date_echeance).toLocaleDateString('fr-FR') : 'NC'}`)
    .join(', ')

  const top3raisons = (scores?.raisons || []).slice(0, 3).join(' | ')

  return [
    `${client.prenom || ''} ${client.nom || ''}, ${client.profession || 'NC'}, ${client.segment || 'particulier'}`,
    `Scores: Risque ${scores?.risque ?? 'NC'}/100, Fidélité ${scores?.fidelite ?? 'NC'}/100, Opportunité ${scores?.opportunite ?? 'NC'}/100, Rétention ${scores?.retention ?? 'NC'}/100, Complétude ${scores?.completude ?? 'NC'}%`,
    `Contrats actifs: ${top3contrats || 'aucun'}`,
    `Signaux: ${(scores?.signaux || []).map(s => s.label).join(', ') || 'aucun'}`,
    `Raisons: ${top3raisons || 'NC'}`,
  ].join('\n')
}

/**
 * Appelle ARK et retourne une réponse validée.
 * Cache 4h par (type, clientId).
 * @param {'analyserClient'|'preparerAppel'|'ameliorerNotes'|'genererMessageRelance'} type
 * @param {Object} client
 * @param {Object} scores
 * @param {Array}  contrats
 * @returns {Promise<{resume, points, actions}>}
 */
export async function askArk(type, client, scores, contrats) {
  const cached = arkCache.get(type, client.id)
  if (cached) return cached

  const systemPrompt = prompts[type]
  if (!systemPrompt) throw new Error(`Type ARK inconnu: ${type}`)

  const context = buildArkContext(client, scores, contrats)
  const message = `${context}\n\nMission: ${type}`

  const res = await axios.post(
    `${API_URL}/api/ark/chat`,
    { message, clientData: client, conversationHistory: [] },
    { headers: { Authorization: `Bearer ${getToken()}` }, timeout: 90000 }
  )

  const raw = res.data?.reply || ''
  const result = validateArkResponse(raw)

  arkCache.set(type, client.id, result)
  return result
}
