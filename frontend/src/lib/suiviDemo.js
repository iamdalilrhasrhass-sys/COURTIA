/* ============================================================================
   COURTIARK — Mesure de la visite guidée /demo
   ----------------------------------------------------------------------------
   But : émettre demo_started, demo_chapter_view, demo_completed et
   demo_take_control SANS toucher à `src/demo/` (ces fichiers appartiennent à
   la session qui construit la démonstration).

   Principe : la visite guidée rend une barre d'interface stable et documentée
   (classes `dt-*` de demoTour.css) :
     • .dt-progres   → la visite guidée tourne            → demo_started
     • .dt-pastille  → « Chapitre N/M · Titre »           → demo_chapter_view
     • .dt-final     → dernière étape, bandeau compact    → demo_completed
     • .dt-barre     → « Mode libre », le visiteur pilote → demo_take_control
   Un MutationObserver lit ces marqueurs. Le pont est inerte hors /demo, ne
   modifie aucun élément, et échoue en silence.

   Pour la version définitive (plus fiable), les appels directs sont de simples
   lignes dans DemoTour.jsx :
     evenement('demo_started')            → début de `jouer()`
     evenement('demo_chapter_view', { chapitre, titre })
                                          → quand `chapitre` change
     evenement('demo_completed')          → fin de `jouer()` sans interruption
     evenement('demo_take_control', { apres_parcours }) → `reprendreLaMain()`
   ========================================================================== */

import { evenement } from './analytics'

const PREFIXE_DEMO = '/demo'

let observateur = null
let detruit = false
let prevu = null

const etat = {
  demarre: false,
  chapitre: -1,
  termine: false,
  main: false,
}

/** « Chapitre 3/6 · Relances » → { rang: 3, total: 6, titre: 'Relances' } */
function lireChapitre() {
  const pastille = document.querySelector('.dt-legende-haut .dt-pastille')
  if (!pastille) return null
  const texte = (pastille.textContent || '').trim()
  const trouve = /Chapitre\s+(\d+)\s*\/\s*(\d+)\s*(?:·\s*(.*))?/.exec(texte)
  if (!trouve) return null
  return {
    rang: Number.parseInt(trouve[1], 10),
    total: Number.parseInt(trouve[2], 10),
    titre: (trouve[3] || '').trim(),
  }
}

/** Numéro d'étape courant, d'après « 7 / 24 ». */
function lireEtape() {
  const compteur = document.querySelector('.dt-compteur')
  if (!compteur) return null
  const trouve = /(\d+)\s*\/\s*(\d+)/.exec((compteur.textContent || '').trim())
  if (!trouve) return null
  return { etape: Number.parseInt(trouve[1], 10), etapes: Number.parseInt(trouve[2], 10) }
}

function examiner() {
  if (detruit) return

  try {
    /* 1. La visite guidée a réellement démarré. */
    const tourne = Boolean(document.querySelector('.dt-progres'))
    if (tourne && !etat.demarre) {
      etat.demarre = true
      etat.termine = false
      etat.main = false
      evenement('demo_started', { etape: 1 })
    }

    /* 2. Changement de chapitre — seulement pendant la visite (la pastille
          n'existe pas en mode libre ni après la fin). */
    if (tourne) {
      const chapitre = lireChapitre()
      if (chapitre && chapitre.rang !== etat.chapitre) {
        etat.chapitre = chapitre.rang
        evenement('demo_chapter_view', {
          chapitre: chapitre.rang,
          chapitres: chapitre.total,
          titre: chapitre.titre,
        })
      }
    }

    /* 3. Dernière étape atteinte : le parcours a été vu en entier. */
    const final = Boolean(document.querySelector('.dt-final'))
    if (final && etat.demarre && !etat.termine) {
      etat.termine = true
      const avancement = lireEtape()
      evenement('demo_completed', {
        etapes: avancement?.etapes ?? null,
        etape: avancement?.etape ?? null,
      })
    }

    /* 4. Le visiteur prend la main (mode libre) — par le bouton ou par
          l'arrivée directe avec `?libre`. */
    const libre = Boolean(document.querySelector('.dt-barre'))
    if (libre && !etat.main) {
      etat.main = true
      evenement('demo_take_control', {
        apres_parcours: Boolean(etat.termine),
        parcours_vu: Boolean(etat.demarre),
      })
    }
  } catch {
    /* un pont de mesure ne doit jamais casser la démonstration */
  }
}

/**
 * Active la lecture de la démonstration. Inerte hors de /demo.
 * @returns {() => void} fonction d'arrêt (utilisée en sortie de démo).
 */
export function demarrerSuiviDemo() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return () => {}
  if (!(window.location.pathname || '').startsWith(PREFIXE_DEMO)) return () => {}
  if (observateur) return arreterSuiviDemo

  detruit = false
  /* La visite guidée anime son curseur à ~60 images/s : chaque image est une
     mutation. Les états lus (visite en cours, chapitre, fin, mode libre) sont
     tous DURABLES, donc un examen espacé de 200 ms suffit et évite de faire
     tourner le fil principal pour rien. */
  observateur = new MutationObserver(() => {
    if (prevu !== null) return
    prevu = window.setTimeout(() => {
      prevu = null
      examiner()
    }, 200)
  })
  observateur.observe(document.body, { childList: true, subtree: true })
  examiner()

  return arreterSuiviDemo
}

/** Arrête la lecture et oublie l'état. */
export function arreterSuiviDemo() {
  detruit = true
  if (prevu !== null) {
    window.clearTimeout(prevu)
    prevu = null
  }
  if (observateur) {
    observateur.disconnect()
    observateur = null
  }
  etat.demarre = false
  etat.chapitre = -1
  etat.termine = false
  etat.main = false
}
