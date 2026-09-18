/* ============================================================================
   COURTIA — Démonstration : visite guidée
   ----------------------------------------------------------------------------
   Pose un automate PAR-DESSUS le vrai cockpit : le curseur se déplace, clique
   et tape réellement dans les vrais écrans COURTIA, qui réagissent vraiment.

   Aucune imitation : les cibles sont les éléments réels de l'application,
   résolus dans le DOM au moment de l'étape (donc robuste au responsive et aux
   évolutions du produit).

   Contrôles : lecture, pause, reprise, étape suivante, rejouer, chapitres,
   prise en main (le visiteur pilote lui-même).
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, RotateCcw, SkipForward, MousePointerClick, Sparkles } from 'lucide-react'
import { ETAPES, CHAPITRES } from './scenario9'
import ConversionFin from './ConversionFin'

/* --------------------------------------------------------------- résolution
   Titre de l'étape FINALE : il appartient au bloc de conversion, quelle que
   soit la façon d'y arriver (fin de visite ou réouverture depuis le mode
   libre). Le lire sur `ETAPES[index]` afficherait le titre de l'étape où le
   visiteur se trouvait — donc un titre faux. */
const ETAPE_FINALE = ETAPES.find((e) => e.compact) || ETAPES[ETAPES.length - 1]

const estVisible = (el) => {
  const r = el.getBoundingClientRect()
  return r.width > 4 && r.height > 4
}

/** Plus petit élément VISIBLE dont le texte contient `texte`. */
function trouverParTexte(texte) {
  const cible = texte.toLowerCase()
  const tous = Array.from(document.querySelectorAll('main *'))
  const correspondants = tous.filter(
    (el) => estVisible(el) && (el.textContent || '').toLowerCase().includes(cible),
  )
  if (!correspondants.length) return null
  return correspondants.reduce((meilleur, el) =>
    el.querySelectorAll('*').length < meilleur.querySelectorAll('*').length ? el : meilleur,
  )
}

const centrer = (el) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }
}

/* ============================================================== COMPOSANT == */
export default function DemoTour() {
  const navigate = useNavigate()
  const [actif, setActif] = useState(false)
  const [pause, setPause] = useState(false)
  const [index, setIndex] = useState(0)
  const [prisMain, setPrisMain] = useState(false)
  const [fin, setFin] = useState(false)
  const [curseur, setCurseur] = useState({ x: 0, y: 0, visible: false, clic: false })
  const [spot, setSpot] = useState(null)

  const minuteurs = useRef([])
  const position = useRef({ x: 0, y: 0 })
  const cancel = useRef(false)
  const running = useRef(false)
  const demarre = useRef(false)

  const etape = ETAPES[index]
  const chapitre = etape ? CHAPITRES.findIndex((c) => c.id === etape.chapitre) : 0

  const nettoyer = useCallback(() => {
    minuteurs.current.forEach(clearTimeout)
    minuteurs.current = []
  }, [])

  useEffect(() => nettoyer, [nettoyer])

  const attendre = (ms) =>
    new Promise((res) => {
      const t = setTimeout(res, ms)
      minuteurs.current.push(t)
    })

  /** Déplacement du curseur — setInterval et non rAF : rAF ne se déclenche pas
   *  dans un onglet non composité, ce qui bloquerait la visite sur une promesse
   *  jamais résolue. */
  const deplacer = useCallback((tx, ty, duree = 620) => new Promise((res) => {
    const debut = performance.now()
    const origine = { ...position.current }
    const iv = setInterval(() => {
      if (cancel.current) { clearInterval(iv); return res() }
      const p = Math.min(1, (performance.now() - debut) / duree)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      const x = origine.x + (tx - origine.x) * e
      const y = origine.y + (ty - origine.y) * e
      position.current = { x, y }
      setCurseur((c) => ({ ...c, x, y, visible: true }))
      if (p >= 1) { clearInterval(iv); res() }
    }, 16)
  }), [])

  const jouer = useCallback(async (depuis) => {
    if (running.current) return
    running.current = true
    cancel.current = false
    setPrisMain(false)
    setFin(false)
    setActif(true)
    setPause(false)

    for (let i = depuis; i < ETAPES.length; i++) {
      if (cancel.current) break
      setIndex(i)
      const e = ETAPES[i]

      if (window.location.pathname !== e.route) {
        navigate(e.route)
        await attendre(1300)          // laisser le vrai écran se monter et charger
      }
      if (cancel.current) break

      /* Étape finale (compacte) : AUCUN projecteur, aucun voile. Le bloc de
         conversion s'affiche et COURTIA doit rester net et lisible derrière. */
      if (e.compact) {
        setSpot(null)
        setCurseur((c) => ({ ...c, visible: false }))
        await attendre(e.tenue || 2800)
        continue
      }

      const el = e.cible.sel
        ? document.querySelector(e.cible.sel)
        : trouverParTexte(e.cible.texte)

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        await attendre(700)
        if (cancel.current) break
        const c = centrer(el)
        setSpot({ x: c.x - c.w / 2 - 8, y: c.y - c.h / 2 - 8, w: c.w + 16, h: c.h + 16 })
        await deplacer(c.x, c.y)
        if (e.clic && !cancel.current) {
          setCurseur((cur) => ({ ...cur, clic: true }))
          await attendre(160)
          setCurseur((cur) => ({ ...cur, clic: false }))
          // Clic réel : React reçoit l'événement, l'écran change pour de bon.
          try { el.click() } catch { /* cible non cliquable : le scénario continue */ }

          /* Question posée à ARK : on ouvre la VRAIE console (ArkBubbleV2) et on
             y saisit la question, comme le ferait un courtier. La réponse est
             une DEMO RESPONSE déterministe calculée sur le dataset central. */
          if (e.arkQuestion) {
            setTimeout(() => {
              const lanceur = document.querySelector('button[aria-label="Ouvrir ARK"]')
              if (lanceur) lanceur.click()
              setTimeout(() => {
                const inp = [...document.querySelectorAll('input')]
                  .find((i) => (i.placeholder || '').includes('message'))
                if (!inp) return
                const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
                set.call(inp, e.arkQuestion)
                inp.dispatchEvent(new Event('input', { bubbles: true }))
                inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
              }, 320)
            }, 110)
          }
          await attendre(420)
        }
      } else {
        setSpot(null)
        await deplacer(window.innerWidth / 2, window.innerHeight / 2, 500)
      }

      await attendre(e.tenue || 2800)
    }

    running.current = false
    if (!cancel.current) {
      /* Fin du parcours : le bloc de conversion prend la place du bandeau et
         RESTE affiché — le cockpit COURTIA reste entièrement visible derrière. */
      setFin(true)
      setActif(false)
      setSpot(null)
      setCurseur((c) => ({ ...c, visible: false }))
    }
  }, [navigate, deplacer])

  /* Deux façons d'entrer :
       — sans paramètre  : la visite guidée démarre seule (le prospect regarde) ;
       — avec `?libre`   : on ouvre directement en navigation libre (lien à
         partager, et permet d'inspecter un module précis sans être ramené par
         le scénario). */
  useEffect(() => {
    if (demarre.current) return
    demarre.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('libre')) {
      cancel.current = true
      setPrisMain(true)
      return
    }
    const t = setTimeout(() => { if (!cancel.current) jouer(0) }, 1400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reprendreLaMain = useCallback(() => {
    cancel.current = true
    running.current = false
    nettoyer()
    setPrisMain(true)
    setFin(false)
    setActif(false)
    setSpot(null)
    setCurseur((c) => ({ ...c, visible: false }))
    setPause(false)
  }, [nettoyer])

  const relancer = useCallback(() => {
    nettoyer()
    cancel.current = false
    running.current = false
    setPrisMain(false)
    setFin(false)
    setPause(false)
    jouer(0)
  }, [jouer, nettoyer])

  const basculerPause = useCallback(() => {
    const enPause = !pause
    setPause(enPause)
    cancel.current = enPause
    running.current = false
    if (!enPause) jouer(index)
  }, [pause, index, jouer])

  const chapitres = useMemo(
    () => CHAPITRES.map((c, i) => ({
      ...c,
      rang: i,
      debut: ETAPES.findIndex((e) => e.chapitre === c.id),
      courant: i === chapitre,
    })).filter((c) => c.debut >= 0),
    [chapitre],
  )

  /* Mode libre : barre réduite — le visiteur pilote. La conversion reste
     accessible d'un clic, sans jamais s'imposer. */
  if (prisMain) {
    return (
      <div className="dt-barre">
        <span className="dt-barre-marque">Mode libre</span>
        <span className="dt-barre-txt">
          Vous pilotez la démo — naviguez dans tous les modules. Cabinet fictif, données synthétiques.
        </span>
        <button type="button" className="dt-btn dt-btn-fort"
          onClick={() => { setPrisMain(false); setFin(true) }}>
          <Sparkles size={13} /> Essayer COURTIA avec mon cabinet
        </button>
        <button type="button" className="dt-btn" onClick={relancer}>
          <RotateCcw size={13} /> Revoir la visite
        </button>
      </div>
    )
  }

  const enVisite = Boolean(actif && etape && !fin)
  /* Bloc de conversion : montré à la dernière étape (compacte) PUIS à la fin
     du parcours — même position dans l'arbre, donc l'état saisi est conservé. */
  const blocFinal = Boolean(fin || (actif && etape && etape.compact))

  if (!enVisite && !blocFinal) return null

  return (
    <>
      {enVisite && (
        <div className="dt-progres">
          <div style={{ width: `${((index + 1) / ETAPES.length) * 100}%` }} />
        </div>
      )}

      {enVisite && curseur.visible && (
        <div className="dt-curseur" style={{ left: curseur.x, top: curseur.y }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 2 L4 19 L9 14.5 L12 21 L15 19.5 L12 13 L18 13 Z"
              fill="#fff" stroke="#0b1020" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {enVisite && curseur.clic && (
        <span className="dt-onde" style={{ left: curseur.x, top: curseur.y }} />
      )}

      {enVisite && spot && (
        <div className="dt-spot" style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }} />
      )}

      {enVisite && etape && !etape.compact && (
        <div className="dt-legende">
          <div className="dt-legende-haut">
            <span className="dt-pastille">
              Chapitre {chapitre + 1}/{CHAPITRES.length} · {CHAPITRES[chapitre]?.titre}
            </span>
            <span className="dt-compteur">{index + 1} / {ETAPES.length}</span>
          </div>
          <div className="dt-legende-titre">{etape.titre}</div>
          <div className="dt-legende-txt">{etape.texte}</div>
          <div className="dt-legende-pied">
            <button type="button" className="dt-btn" onClick={basculerPause}>
              {pause ? <><Play size={13} /> Reprendre</> : <><Pause size={13} /> Pause</>}
            </button>
            <button type="button" className="dt-btn" onClick={relancer}>
              <RotateCcw size={13} /> Rejouer
            </button>
            <button type="button" className="dt-btn"
              onClick={() => { nettoyer(); cancel.current = false; running.current = false; jouer(Math.min(index + 1, ETAPES.length - 1)) }}>
              <SkipForward size={13} /> Étape suivante
            </button>
            <button type="button" className="dt-btn dt-btn-fort" onClick={reprendreLaMain}>
              <MousePointerClick size={13} /> Prendre la main
            </button>
          </div>
        </div>
      )}

      {blocFinal && (
        <ConversionFin
          titre={ETAPE_FINALE ? ETAPE_FINALE.titre : undefined}
          onExplorer={reprendreLaMain}
          onRejouer={relancer}
        />
      )}

      {enVisite && (
        <div className="dt-chapitres">
          <div className="dt-chapitres-titre">Parcours</div>
          {chapitres.map((c) => (
            <button key={c.titre} type="button" className="dt-chapitre" data-actif={c.courant}
              onClick={() => { nettoyer(); cancel.current = false; running.current = false; jouer(c.debut) }}>
              {c.titre}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
