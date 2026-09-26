/* ============================================================================
   COURTIARK — Mesure du clic sur le CTA « Demander une démo ».

   POURQUOI CE MODULE
   ------------------
   Mesure en base du 18/09/2026 : `demo_cta_click` n'était émis par AUCUN code.
   Le funnel était donc coupé dès son premier maillon commercial — impossible de
   savoir combien de visiteurs cliquent le CTA, ni sur quelle page ils le font,
   ni quel CTA convertit.

   POURQUOI UN SEUL ÉCOUTEUR GLOBAL PLUTÔT QUE 6 MODIFICATIONS DISPERSÉES
   ---------------------------------------------------------------------
   Le CTA existe dans MarketingShell (navigation), LandingPage, Pricing,
   Tarifs, TarifsPublic, FonctionnalitesPublic et DemoPublic. Instrumenter
   chaque bouton séparément revient à oublier le prochain. Un seul écouteur en
   phase de capture, au niveau du document, couvre TOUS les liens vers
   /demo-public, présents et futurs, sans toucher au rendu.

   GARANTIES
   ---------
   - Aucune donnée personnelle : on n'envoie que le chemin d'origine, le libellé
     du lien (tronqué à 60 caractères) et la provenance du CTA (nav, corps, pied).
   - Aucun blocage de la navigation : l'envoi est mis en file par `lib/analytics`
     et n'attend aucune réponse.
   - Anti-double comptage : un même clic (origine + libellé + cible) n'est compté
     qu'une fois par seconde, pour neutraliser le double rendu de React StrictMode.
   ========================================================================== */

import { evenement } from './analytics'

const CIBLE = '/demo-public'

/** Chemin du lien, résolu en absolu, ou `null` si non lisible. */
function cheminDuLien(ancre) {
  const href = ancre.getAttribute('href')
  if (!href) return null
  try {
    return new URL(href, window.location.origin).pathname
  } catch {
    return null
  }
}

/** Provenance grossière du CTA, déduite de l'emplacement réel dans la page. */
function provenance(ancre) {
  if (ancre.closest('header, nav, .mk-nav, .mk-header')) return 'navigation'
  if (ancre.closest('footer, .mk-footer')) return 'pied-de-page'
  return 'corps-de-page'
}

export function installerMesureCta(cible = CIBLE) {
  if (typeof document === 'undefined') return () => {}
  if (document.__courtiaMesureCtaInstallee) return document.__courtiaMesureCtaInstallee

  const dejaComptes = new Map()

  const auClic = (evt) => {
    /* Bouton du milieu ou clic modifié : nouvelle fenêtre, ce n'est pas la
       navigation mesurée — on ne compte pas. */
    if (evt.defaultPrevented === false && (evt.button || 0) !== 0) return
    if (evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey) return

    const ancre = evt.target && evt.target.closest ? evt.target.closest('a[href]') : null
    if (!ancre) return
    if (cheminDuLien(ancre) !== cible) return

    const origine = window.location.pathname || '/'
    const libelle = String(ancre.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)
    const cle = `${origine}|${libelle}|${provenance(ancre)}`
    const maintenant = Date.now()
    const dernier = dejaComptes.get(cle)
    if (dernier && maintenant - dernier < 1000) return
    dejaComptes.set(cle, maintenant)

    /* `event` est le vocabulaire du service ; `cta` porte le libellé réel du
       bouton cliqué, pour savoir QUEL CTA convertit. */
    evenement('demo_cta_click', {
      cta: libelle || 'sans-libelle',
      depuis: origine,
      zone: provenance(ancre),
    })
  }

  document.addEventListener('click', auClic, true)

  const retirer = () => {
    document.removeEventListener('click', auClic, true)
    delete document.__courtiaMesureCtaInstallee
  }
  document.__courtiaMesureCtaInstallee = retirer
  return retirer
}

export default installerMesureCta
