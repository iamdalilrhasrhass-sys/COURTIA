/* ============================================================================
   COURTIARK — Démonstration : conversion de fin de parcours (plomberie)
   ----------------------------------------------------------------------------
   TROIS actions, UN seul service : POST /api/leads/events
   (service de capture COURTIARK — il répond 202). Aucun autre service n'est
   appelé, aucun autre endpoint n'est inventé.

   AUCUNE condition commerciale n'est écrite ici : pas de durée d'essai, pas de
   prix, pas d'engagement. Les libellés ne promettent rien d'autre que la
   transmission d'une demande.

   RÉUTILISATION : ce que le visiteur a déjà saisi pendant la visite est
   conservé pour la session et jamais redemandé. S'il n'y a rien, une seule
   information est demandée : l'adresse e-mail (pas un formulaire de 8 champs).
   ========================================================================== */

/** Chemin réel du service de capture, tel que réécrit par le site public. */
const CHEMIN_EVENTS = '/api/leads/events'

const CLE_SESSION = 'courtia_demo_session'
const CLE_IDENTITE = 'courtia_demo_identite'
const CLE_JOURNAL = 'courtia_demo_evenements'
const MAX_JOURNAL = 40

/* Événements existants du service de capture (service_capture.py, ensemble
   EVENEMENTS). On n'en envoie AUCUN autre : un nom inconnu serait rejeté. */
export const EVENEMENTS = {
  essai: 'trial_requested',
  presentation: 'meeting_requested',
  question: 'contact_requested',
}

import { lireLeadId } from '../lib/leadCapture'

/* ------------------------------------------------------------- persistance
   Stockage de SESSION : la visite dure le temps d'un onglet. Un rechargement
   dans le même onglet garde la même session et la même adresse. Toute erreur
   de stockage (navigation privée, quota) est neutralisée : la conversion
   fonctionne même sans stockage. */
const memoire = () => {
  try { return window.sessionStorage } catch { return null }
}

const lireBrut = (cle) => {
  const s = memoire()
  if (!s) return null
  try { return s.getItem(cle) } catch { return null }
}

const ecrireBrut = (cle, valeur) => {
  const s = memoire()
  if (!s) return false
  try { s.setItem(cle, valeur); return true } catch { return false }
}

/** Identifiant de session de la visite (créé une fois, réutilisé ensuite). */
export function sessionId() {
  const connu = lireBrut(CLE_SESSION)
  if (connu) return connu
  const neuf = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  ecrireBrut(CLE_SESSION, neuf)
  return neuf
}

/** Adresse e-mail déjà saisie pendant cette visite, ou `null`. */
export function lireIdentite() {
  const brut = lireBrut(CLE_IDENTITE)
  if (!brut) return null
  try {
    const id = JSON.parse(brut)
    return id && typeof id.email === 'string' && id.email ? { email: id.email } : null
  } catch { return null }
}

/** Mémorise l'adresse pour les actions suivantes : on ne la redemande jamais. */
export function memoriserIdentite({ email }) {
  const propre = String(email || '').trim()
  if (!propre) return false
  return ecrireBrut(CLE_IDENTITE, JSON.stringify({ email: propre, at: new Date().toISOString() }))
}

/** Contrôle de forme local, avant tout envoi. */
export function emailValide(valeur) {
  return /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(String(valeur || '').trim())
}

/* ------------------------------------------------------------------ journal
   Aucun échec n'est avalé en silence : chaque envoi (réussi ou non) est tracé,
   en mémoire d'onglet, lisible par `window.__courtiaEvenements`. */
export function lireJournal() {
  const brut = lireBrut(CLE_JOURNAL)
  if (!brut) return []
  try { return JSON.parse(brut) || [] } catch { return [] }
}

function journaliser(entree) {
  const journal = [entree, ...lireJournal()].slice(0, MAX_JOURNAL)
  ecrireBrut(CLE_JOURNAL, JSON.stringify(journal))
  if (typeof window !== 'undefined') window.__courtiaEvenements = journal
  return journal
}

/** Catégorie d'appareil, déduite du user-agent (aucune donnée personnelle). */
export function classerAppareil(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const t = String(ua || '').toLowerCase()
  if (t.includes('ipad') || t.includes('tablet')) return 'tablet'
  if (t.includes('mobi') || t.includes('android') || t.includes('iphone')) return 'mobile'
  return 'desktop'
}

/**
 * Envoie UN événement de conversion au service de capture.
 *
 * Le corps porte les DEUX vocabulaires du même endpoint, car le même chemin est
 * servi par le service de capture (`{ event, session_id, source, device… }`)
 * et par le backend historique (`{ event_name, source, page_path, payload }`) :
 * les deux ignorent les champs qu'ils ne connaissent pas.
 *
 * Ne lève jamais : renvoie `{ ok, statut }` pour que l'écran dise la vérité.
 */
export async function envoyerEvenement(evenement, meta = {}) {
  const identite = lireIdentite()
  const route = typeof window !== 'undefined' ? window.location.pathname : ''
  const commun = {
    ...meta,
    ...(identite?.email ? { email: identite.email } : {}),
    ts: new Date().toISOString(),
  }

  // Le lead_id de la visite est joint à l'événement : c'est LUI qui permet au
  // service de capture de faire avancer le pipeline (NEW -> DEMO_STARTED ->
  // DEMO_COMPLETED). Sans lui, un visiteur qui parcourt toute la démonstration
  // restait au statut NEW et n'apparaissait jamais comme prospect engagé.
  const leadId = lireLeadId()

  const corps = {
    /* Vocabulaire du service de capture (202) */
    event: evenement,
    session_id: sessionId(),
    ...(leadId ? { lead_id: leadId } : {}),
    source: 'demo',
    device: classerAppareil(),
    route,
    chapter: 'explorer',
    landing_page: route,
    meta: commun,
    /* Même endpoint, vocabulaire du backend historique */
    event_name: evenement,
    page_path: route,
    payload: commun,
  }

  const trace = { evenement, at: new Date().toISOString(), corps }

  try {
    const res = await fetch(CHEMIN_EVENTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
      keepalive: true,
    })
    journaliser({ ...trace, ok: res.ok, statut: res.status })
    return { ok: res.ok, statut: res.status }
  } catch (erreur) {
    journaliser({ ...trace, ok: false, statut: 0, erreur: String((erreur && erreur.message) || erreur) })
    return { ok: false, statut: 0 }
  }
}
