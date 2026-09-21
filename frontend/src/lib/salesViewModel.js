/* ============================================================================
   COURTIA — Mise en forme de la lecture commerciale (fonctions PURES)
   ----------------------------------------------------------------------------
   Tout ce qui décide de ce qui est AFFICHÉ vit ici, et seulement ici :
     * « non mesuré » ne devient jamais 0 ;
     * une date absente reste absente ;
     * un statut brut du pipeline devient un libellé lisible ;
     * un score explique TOUJOURS d'où viennent ses points.

   Aucune donnée n'est inventée : si le service ne fournit pas la donnée,
   la fonction renvoie l'état « non mesuré » — jamais une valeur plausible.
   ========================================================================== */

import { localeCourante } from './monnaie'

export const NON_MESURE = 'non mesuré'

/** Statuts du pipeline (service_capture.py) → libellés d'écran. */
export const STATUTS = Object.freeze({
  NEW: { libelle: 'Nouveau', ton: 'neutre', ordre: 1 },
  DEMO_STARTED: { libelle: 'Démo commencée', ton: 'info', ordre: 2 },
  DEMO_COMPLETED: { libelle: 'Démo terminée', ton: 'info', ordre: 3 },
  ENGAGED: { libelle: 'Engagé', ton: 'info', ordre: 4 },
  CONTACT_REQUESTED: { libelle: 'Contact demandé', ton: 'actif', ordre: 5 },
  MEETING_BOOKED: { libelle: 'RDV pris', ton: 'actif', ordre: 6 },
  TRIAL: { libelle: 'Essai', ton: 'actif', ordre: 7 },
  NEGOTIATION: { libelle: 'Négociation', ton: 'actif', ordre: 8 },
  WON: { libelle: 'Gagné', ton: 'succes', ordre: 9 },
  LOST: { libelle: 'Perdu', ton: 'echec', ordre: 10 },
  DO_NOT_CONTACT: { libelle: 'Ne pas contacter', ton: 'echec', ordre: 11 },
  INVALID: { libelle: 'Invalide', ton: 'echec', ordre: 12 },
})

export const LIBELLES_FUNNEL = Object.freeze({
  trafic_organique: 'Trafic organique',
  visiteurs_mesurables: 'Visiteurs mesurables',
  cta: 'CTA',
  demandes: 'Demandes',
  demos_commencees: 'Démos commencées',
  demos_terminees: 'Démos terminées',
  essais: 'Essais',
  rdv: 'RDV',
  negociations: 'Négociations',
  gagnes: 'Gagnés',
})

export const LIBELLES_BLOCS_RESUME = Object.freeze({
  nouveaux_leads: 'Nouveaux leads',
  leads_chauds: 'Leads chauds',
  demos_terminees: 'Démos terminées',
  essais: 'Essais',
  rdv: 'RDV',
  relances_a_faire: 'Relances à faire',
})

export const ORDRE_BLOCS_RESUME = Object.freeze([
  'nouveaux_leads', 'leads_chauds', 'demos_terminees', 'essais', 'rdv', 'relances_a_faire',
])

/* ------------------------------------------------------------------ mesure */

/**
 * Un compteur du service → ce qu'il faut AFFICHER.
 * valeur null + mesure « non mesuré » → jamais 0.
 */
export function lireMesure(bloc) {
  if (!bloc || typeof bloc !== 'object') {
    return { estMesure: false, texte: NON_MESURE, valeur: null, detail: '', sources: [], ecart: false }
  }
  const estMesure = bloc.mesure === 'mesuré' && bloc.valeur !== null && bloc.valeur !== undefined
  return {
    estMesure,
    texte: estMesure ? String(bloc.valeur) : NON_MESURE,
    valeur: estMesure ? bloc.valeur : null,
    detail: bloc.detail || '',
    sources: Array.isArray(bloc.sources) ? bloc.sources : [],
    ecart: Boolean(bloc.ecart),
  }
}

/** Étape de funnel ordonnée, prête à afficher. */
export function lignesFunnel(funnel) {
  const etapes = Array.isArray(funnel?.etapes) ? [...funnel.etapes] : []
  etapes.sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
  return etapes.map((e) => ({
    cle: e.cle,
    libelle: e.libelle || LIBELLES_FUNNEL[e.cle] || e.cle,
    ...lireMesure(e),
  }))
}

/** Blocs du Morning Brief, dans l'ordre demandé, avec libellés lisibles. */
export function blocsResume(resume) {
  const blocs = resume?.blocs || {}
  return ORDRE_BLOCS_RESUME
    .filter((cle) => cle in blocs)
    .map((cle) => ({
      cle,
      libelle: LIBELLES_BLOCS_RESUME[cle] || cle,
      leads: Array.isArray(blocs[cle]?.leads) ? blocs[cle].leads : [],
      ...lireMesure(blocs[cle]),
    }))
}

/* ------------------------------------------------------------------ lead */

export function etiquetteStatut(statut) {
  return STATUTS[statut]?.libelle || statut || '—'
}

export function tonStatut(statut) {
  return STATUTS[statut]?.ton || 'neutre'
}

export function etiquetteQualification(qualification) {
  const table = {
    chaud: 'Chaud',
    tiede: 'Tiède',
    froid: 'Froid',
    'non qualifie': 'Non qualifié',
    client: 'Client',
    ecarte: 'Écarté',
  }
  return table[qualification] || qualification || '—'
}

/** Score ARK : la valeur ET son origine. `score_mesure` faux = pas encore noté. */
export function lireScore(lead) {
  const raisons = Array.isArray(lead?.score_raisons) ? lead.score_raisons : []
  const note = typeof lead?.lead_score === 'number' ? lead.lead_score : null
  return {
    note,
    raisons,
    explique: lead?.score_mesure === true || raisons.length > 0,
    texte: lead?.score_mesure === false || (!raisons.length && (note === null || note === 0))
      ? 'non mesuré'
      : `${note ?? 0}/100`,
  }
}

/** Couleur d'un score (jamais inventée : bornée à [0,100]). */
export function couleurScore(note) {
  if (typeof note !== 'number') return '#94a3b8'
  if (note >= 60) return '#22c55e'
  if (note >= 40) return '#f59e0b'
  if (note > 0) return '#38bdf8'
  return '#94a3b8'
}

/** Progression de démo, dite exactement par les horodatages du service. */
export function progressionDemo(lead) {
  if (lead?.demo_completed_at) {
    return { etape: 'terminee', texte: 'Démo terminée', horodatage: lead.demo_completed_at, estMesure: true }
  }
  if (lead?.demo_started_at) {
    return { etape: 'commencee', texte: 'Démo commencée', horodatage: lead.demo_started_at, estMesure: true }
  }
  const evenements = Array.isArray(lead?.evenements) ? lead.evenements : []
  if (evenements.includes('demo_completed')) {
    return { etape: 'terminee', texte: 'Démo terminée (événement)', horodatage: null, estMesure: true }
  }
  if (evenements.includes('demo_started')) {
    return { etape: 'commencee', texte: 'Démo commencée (événement)', horodatage: null, estMesure: true }
  }
  // Aucun horodatage de démo sur ce lead : ce n'est pas « 0 % », c'est inconnu à
  // l'échelle du lead. On l'écrit.
  return { etape: 'inconnue', texte: NON_MESURE, horodatage: null, estMesure: false }
}

/**
 * Marqueur HOT LEAD. Le service décide (`hot_lead`), l'écran se contente
 * d'afficher ET d'exposer les signaux qui le justifient.
 */
export function lireHotLead(lead) {
  const raisons = Array.isArray(lead?.signaux_forts) ? lead.signaux_forts : []
  return { chaud: lead?.hot_lead === true, signaux: raisons }
}

/* ------------------------------------------------------------------ dates */

/** Horodatage ISO → date lisible. Absent = « non mesuré », jamais une date inventée. */
export function formatDate(valeur) {
  if (!valeur) return NON_MESURE
  const d = new Date(valeur)
  if (Number.isNaN(d.getTime())) return NON_MESURE
  return d.toLocaleDateString(localeCourante(), { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateHeure(valeur) {
  if (!valeur) return NON_MESURE
  const d = new Date(valeur)
  if (Number.isNaN(d.getTime())) return NON_MESURE
  return d.toLocaleString(localeCourante(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Texte affiché pour un champ potentiellement vide. Jamais « N/A » inventé. */
export function ouVide(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return NON_MESURE
  return String(valeur)
}

/** Nom affichable d'un lead (cabinet + contact). */
export function nomLead(lead) {
  const contact = [lead?.contact?.prenom, lead?.contact?.nom].filter(Boolean).join(' ').trim()
  return {
    cabinet: lead?.cabinet || NON_MESURE,
    contact: contact || NON_MESURE,
  }
}

/** Provenance lisible : source / medium, sans fabriquer d'attribution. */
export function provenance(lead) {
  const bouts = [lead?.source, lead?.medium].filter(Boolean)
  return bouts.length ? bouts.join(' · ') : NON_MESURE
}
