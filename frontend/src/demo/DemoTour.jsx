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
import { Play, Pause, RotateCcw, SkipForward, MousePointerClick } from 'lucide-react'

/* ------------------------------------------------------------------ étapes */
/* `cible` accepte :
     { texte: 'Batilog SA' }   → plus petit élément visible contenant ce texte
     { sel: 'main' }           → sélecteur CSS direct                          */
const ETAPES = [
  {
    route: '/demo/dashboard', chapitre: 0,
    cible: { texte: 'CLIENTS ACTIFS' },
    titre: 'Votre cabinet, d’un seul regard',
    texte: 'Huit clients suivis, quinze contrats, 39 810 € de primes annuelles. Le cockpit lit ce qui existe dans votre portefeuille — vous ne saisissez rien.',
    tenue: 3200,
  },
  {
    route: '/demo/dashboard', chapitre: 0,
    cible: { texte: 'Priorités ARK aujourd’hui' },
    titre: 'ARK a déjà trié votre journée',
    texte: 'Échéances, clients silencieux, devis sans réponse : ARK remonte ce qui compte, classé par urgence.',
    tenue: 2800,
  },
  {
    route: '/demo/clients', chapitre: 1,
    cible: { texte: 'PRIME ANNUELLE' },
    titre: 'Tout votre portefeuille sur une ligne',
    texte: 'Par client : nombre de contrats, prime annuelle, score de risque et date du dernier contact. La colonne ARK signale ce qui demande une action.',
    tenue: 3000,
  },
  {
    route: '/demo/clients/2003', chapitre: 2,
    cible: { texte: 'ARK INSIGHT' },
    titre: 'Un dossier client, en entier',
    texte: 'Batilog SA : deux contrats, 16 700 € de primes suivies, ses échéances et son historique. ARK résume le dossier et propose la prochaine action.',
    tenue: 3200,
  },
  {
    route: '/demo/relances', chapitre: 3,
    cible: { texte: 'URGENTES' },
    titre: 'Qui relancer, et maintenant',
    texte: 'Sept relances en attente, quatre urgentes, 8 400 € de potentiel. Le message est préparé depuis le dossier réel — pas depuis un modèle générique.',
    tenue: 3000,
  },
  {
    route: '/demo/ark-intelligence', chapitre: 4,
    cible: { texte: 'Churn Predictor' },
    titre: 'ARK anticipe les départs',
    texte: 'Quatre clients signalés à risque, avec le motif et le plan de rétention. Puis les ventes croisées possibles et les contrats à renouveler sous 90 jours.',
    tenue: 3400,
  },
  {
    route: '/demo/ark-intelligence', chapitre: 4,
    cible: { texte: 'Cross-Sell Engine' },
    titre: 'Les couvertures oubliées, chiffrées',
    texte: 'Pour chaque client, les produits absents de son dossier et le revenu correspondant. Vous savez où chercher avant d’appeler.',
    tenue: 3000,
  },
  {
    route: '/demo/dashboard', chapitre: 5,
    cible: { texte: 'Morning Brief' },
    titre: 'Voilà ce que COURTIA fait chez vous',
    texte: 'Le même cockpit, avec vos clients, vos contrats et vos échéances. La suite : un essai encadré, sur votre portefeuille.',
    tenue: 3800,
  },
]

const CHAPITRES = [
  { titre: 'Ma journée', sous: 'Le cockpit au réveil' },
  { titre: 'Mon portefeuille', sous: 'Tous mes clients' },
  { titre: 'Un dossier', sous: 'Le client en entier' },
  { titre: 'Les relances', sous: 'Qui rappeler, et pourquoi' },
  { titre: 'ARK anticipe', sous: 'Départs, ventes croisées' },
  { titre: 'Chez vous', sous: 'Essayer COURTIA' },
]

/* --------------------------------------------------------------- résolution */
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
  const [curseur, setCurseur] = useState({ x: 0, y: 0, visible: false })
  const [spot, setSpot] = useState(null)

  const minuteurs = useRef([])
  const position = useRef({ x: 0, y: 0 })
  const cancel = useRef(false)
  const running = useRef(false)
  const demarre = useRef(false)

  const etape = ETAPES[index]
  const chapitre = etape?.chapitre ?? 0

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
      } else {
        setSpot(null)
        await deplacer(window.innerWidth / 2, window.innerHeight / 2, 500)
      }

      await attendre(e.tenue || 2800)
    }

    running.current = false
    if (!cancel.current) setActif(false)   // fin naturelle : on libère l'écran
  }, [navigate, deplacer])

  /* Lancement automatique : le visiteur voit la démonstration démarrer seule. */
  useEffect(() => {
    if (demarre.current) return
    demarre.current = true
    const t = setTimeout(() => { if (!cancel.current) jouer(0) }, 1400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reprendreLaMain = useCallback(() => {
    cancel.current = true
    running.current = false
    nettoyer()
    setPrisMain(true)
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
      debut: ETAPES.findIndex((e) => e.chapitre === i),
      courant: i === chapitre,
    })).filter((c) => c.debut >= 0),
    [chapitre],
  )

  if (prisMain) {
    return (
      <div className="dt-barre">
        <span className="dt-barre-marque">Mode libre</span>
        <span className="dt-barre-txt">Vous pilotez la démo — cabinet fictif, données synthétiques.</span>
        <button type="button" className="dt-btn" onClick={relancer}>
          <RotateCcw size={13} /> Revoir la visite
        </button>
      </div>
    )
  }

  if (!actif || !etape) return null

  return (
    <>
      <div className="dt-progres">
        <div style={{ width: `${((index + 1) / ETAPES.length) * 100}%` }} />
      </div>

      {curseur.visible && (
        <div className="dt-curseur" style={{ left: curseur.x, top: curseur.y }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 2 L4 19 L9 14.5 L12 21 L15 19.5 L12 13 L18 13 Z"
              fill="#fff" stroke="#0b1020" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {spot && (
        <div className="dt-spot" style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }} />
      )}

      <div className="dt-legende">
        <div className="dt-legende-haut">
          <span className="dt-pastille">
            Chapitre {chapitre + 1}/{CHAPITRES.length} · {CHAPITRES[chapitre].titre}
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

      <div className="dt-chapitres">
        <div className="dt-chapitres-titre">Parcours</div>
        {chapitres.map((c) => (
          <button key={c.titre} type="button" className="dt-chapitre" data-actif={c.courant}
            onClick={() => { nettoyer(); cancel.current = false; running.current = false; jouer(c.debut) }}>
            {c.titre}
          </button>
        ))}
      </div>
    </>
  )
}
