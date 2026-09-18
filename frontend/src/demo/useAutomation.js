/* ============================================================================
   COURTIA — Moteur de démonstration automatisée
   ----------------------------------------------------------------------------
   Pilote une vraie interface : le curseur se déplace, clique, défile, met en
   évidence, et l'interface réagit. Aucun enregistrement vidéo : tout est réel.

   Le moteur est DÉTERMINISTE : chaque étape déclare une cible identifiée par
   `data-demo="<clé>"`. La position vient du DOM réel (getBoundingClientRect),
   donc rien n'est codé en dur et le scénario résiste au responsive.

   Contrôles : lecture / pause / reprise / redémarrage / chapitre / prise en
   main (le visiteur coupe l'automate et utilise librement la démo).
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SCENARIO } from './scenario'

/* Tempo global du parcours.
   1 = rythme brut des étapes (parcours ~48 s).
   4 = rythme de lecture confortable pour un courtier (~2 min 30).
   Ne s'applique PAS à la frappe (déjà bornée) ni aux animations de révélation :
   seuls les temps de pose et les déplacements du curseur sont étirés. */
export const TEMPO = 5

/* ------------------------------------------------------------- utilitaires */
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/* ------------------------------------------------------------------- hook */
export function useAutomation({ dureeVitesse = 1 } = {}) {
  const steps = SCENARIO.steps
  const chapters = SCENARIO.chapters

  const [index, setIndex] = useState(-1)          // -1 = écran d'accueil du player
  const [playing, setPlaying] = useState(false)
  const [execution, setExecution] = useState(0)   // incrémenté pour forcer un redémarrage
  const [prisEnMain, setPrisEnMain] = useState(false)
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5, visible: false, clicking: false })
  const [spot, setSpot] = useState(null)          // { x, y, w, h, r }
  const [caption, setCaption] = useState(null)    // { titre, texte, chapitre }
  const [revealed, setRevealed] = useState(() => new Set(SCENARIO.revealInitial || []))
  const [typing, setTyping] = useState(null)      // { champ, texte }
  const [thinking, setThinking] = useState(false)

  const depart = useRef(0)          // index de reprise du scénario
  const timers = useRef([])
  const raf = useRef(0)
  const cancelRef = useRef(false)

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (raf.current) { clearInterval(raf.current); cancelAnimationFrame(raf.current) }
  }, [])

  useEffect(() => clear, [clear])

  const attendre = (ms) =>
    new Promise((res) => { const t = setTimeout(res, ms); timers.current.push(t) })

  /** Anime le curseur vers une position exprimée en pixels du viewport.
   *
   *  Volontairement piloté par setInterval et non par requestAnimationFrame :
   *  rAF ne se déclenche pas quand l'onglet n'est pas composité (onglet en
   *  arrière-plan, navigateur minimisé, capture automatisée). Le scénario
   *  resterait alors bloqué sur une promesse jamais résolue. setInterval
   *  n'a pas cette dépendance : la visite continue, même sans rendu visible. */
  const deplacerCurseur = useCallback((tx, ty, duree = 620) => new Promise((res) => {
    const debut = performance.now()
    const origine = { ...cibleCurseur.current }
    const avancer = () => {
      if (cancelRef.current) { clearInterval(iv); raf.current = 0; return res() }
      const p = Math.min(1, (performance.now() - debut) / duree)
      const e = easeInOut(p)
      const x = origine.x + (tx - origine.x) * e
      const y = origine.y + (ty - origine.y) * e
      cibleCurseur.current = { x, y }
      setCursor((c) => ({ ...c, x, y, visible: true }))
      if (p >= 1) { clearInterval(iv); raf.current = 0; res() }
    }
    const iv = setInterval(avancer, 16)
    raf.current = iv
  }), [])

  const cibleCurseur = useRef({ x: 0, y: 0 })

  /** Résout un élément de la scène depuis sa clé data-demo. */
  const resoudre = useCallback((cle) => {
    if (!cle) return null
    return document.querySelector(`[data-demo="${cle}"]`)
  }, [])

  const rectDe = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height, r: Math.min(r.width, r.height) / 2 }
  }

  /** Exécute une étape : défilement, visée, clic, effets, révélation. */
  const executer = useCallback(async (etape, i) => {
    if (cancelRef.current) return

    setCaption({
      titre: etape.titre,
      texte: etape.texte,
      chapitre: etape.chapitre,
      indice: i + 1,
      total: steps.length,
    })

    const el = resoudre(etape.cible)
    if (!el) {
      // Cible absente (écran non monté) : on avance sans bloquer le scénario.
      await attendre(200)
      return
    }

    if (etape.defiler !== false) {
      el.scrollIntoView({ behavior: 'smooth', block: etape.bloc || 'center' })
      await attendre(520 * Math.min(TEMPO, 2.5))
    }

    const r = rectDe(el)
    setSpot({ ...r, pulse: !!etape.clic })

    const cx = r.x + r.w / 2
    const cy = r.y + r.h / 2
    await deplacerCurseur(cx, cy, (etape.approche || 620) * Math.min(TEMPO, 2.2))
    if (cancelRef.current) return

    if (etape.clic) {
      setCursor((c) => ({ ...c, clicking: true }))
      await attendre(150)
      setCursor((c) => ({ ...c, clicking: false }))
      el.classList.add('demo-clic-reel')
      timers.current.push(setTimeout(() => el.classList.remove('demo-clic-reel'), 700))
      // Clic RÉEL : l'interface réagit vraiment (React reçoit l'événement).
      try { el.click() } catch { /* élément non cliquable : on n'interrompt pas le scénario */ }
    }

    if (etape.reflechit) {
      setThinking(true)
      await attendre(etape.reflechit * Math.min(TEMPO, 2.5))
      setThinking(false)
    }

    if (etape.saisie) {
      const texte = etape.saisie
      // Frappe adaptative : une question courte reste lisible, un message long
      // ne monopolise pas la visite. La durée totale est bornée.
      const pas = Math.max(7, Math.min(38, Math.round(3200 / texte.length)))
      for (let i = 1; i <= texte.length; i++) {
        if (cancelRef.current) return
        setTyping({ champ: etape.cible, texte: texte.slice(0, i) })
        await attendre(pas)
      }
      await attendre(220 * Math.min(TEMPO, 2))
    }

    if (etape.revele?.length) {
      for (const cle of etape.revele) {
        if (cancelRef.current) return
        setRevealed((s) => new Set([...s, cle]))
        await attendre(etape.cascade || 170)
      }
    }

    if (etape.blocage) {
      setSpot((s) => (s ? { ...s, pulse: true, bloquant: true } : s))
      await attendre(etape.blocage)
    }

    await attendre(((etape.tenue || 900) * TEMPO) / dureeVitesse)
  }, [dureeVitesse, resoudre, steps.length])

  /* --------------------------------------------------------- boucle de jeu
     Dépendance UNIQUE à `playing` : la boucle modifie `index` à chaque étape,
     donc dépendre de `index` la ferait redémarrer — et son nettoyage
     l'annulerait aussitôt. Le point de départ vit dans une référence. */
  useEffect(() => {
    if (!playing) return
    let annule = false
    cancelRef.current = false

    ;(async () => {
      for (let i = depart.current; i < steps.length; i++) {
        if (annule || cancelRef.current) return
        setIndex(i)
        const etape = steps[i]
        if (etape.reveleAvant?.length) {
          setRevealed((s) => new Set([...s, ...etape.reveleAvant]))
        }
        try {
          await executer(etape, i)
        } catch (e) {
          // On n'échoue jamais en silence : l'erreur est visible et exposée.
          window.__demoError = String((e && e.stack) || e)
          console.error('[demo] étape', i, etape.id, e)
          break
        }
        depart.current = i + 1
      }
      if (!annule) setPlaying(false)
    })()

    return () => { annule = true; cancelRef.current = true; clear() }
  }, [playing, execution, executer, clear, steps])

  /* ------------------------------------------------------------- contrôles */
  const demarrer = useCallback((depuis = 0) => {
    clear()
    cancelRef.current = false
    setPrisEnMain(false)
    setRevealed(new Set(SCENARIO.revealInitial || []))
    setTyping(null)
    setThinking(false)
    depart.current = depuis
    setIndex(depuis)
    setPlaying(true)
    // Forcer la relance : sans cet incrément, cliquer un chapitre pendant la
    // lecture ne ferait rien (l'effet ne se réexécute pas si `playing` est déjà vrai).
    setExecution((n) => n + 1)
  }, [clear])

  const pause = useCallback(() => { cancelRef.current = true; setPlaying(false) }, [])
  const reprendre = useCallback(() => {
    cancelRef.current = false
    depart.current = Math.max(0, depart.current - 1)   // rejoue l'étape interrompue
    setPlaying(true)
  }, [])
  const redemarrer = useCallback(() => demarrer(0), [demarrer])

  /** Le visiteur prend la main : l'automate s'arrête, l'interface reste libre. */
  const prendreLaMain = useCallback((etapeLibre = 0) => {
    clear()
    cancelRef.current = true
    setPlaying(false)
    setPrisEnMain(true)
    setSpot(null)
    setCursor((c) => ({ ...c, visible: false, clicking: false }))
    setCaption(null)
    setThinking(false)
    setTyping(null)
    depart.current = etapeLibre
    setIndex(etapeLibre)
    // Joker : en mode libre, TOUT est visible. Énumérer les clés une à une
    // laissait des blocs invisibles dès qu'une clé était oubliée.
    setRevealed(new Set(['*']))
  }, [clear])

  const allerA = useCallback((i) => demarrer(i), [demarrer])

  const etapeCourante = index >= 0 && index < steps.length ? steps[index] : null

  const progression = useMemo(() => {
    if (index < 0) return 0
    return Math.min(1, (index + 1) / steps.length)
  }, [index, steps.length])

  return {
    steps, chapters, index, playing, prisEnMain, cursor, spot, caption,
    revealed, typing, thinking, progression, etapeCourante,
    demarrer, pause, reprendre, redemarrer, prendreLaMain, allerA,
  }
}

/** Vrai tant que l'étape courante n'a pas révélé la clé donnée. */
export const estRevele = (revealed, cle) => !cle || revealed.has(cle)
