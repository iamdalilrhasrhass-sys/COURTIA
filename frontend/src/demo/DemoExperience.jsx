/* ============================================================================
   COURTIA — /demo : visite guidée automatisée
   ----------------------------------------------------------------------------
   Une vraie interface, pilotée sous les yeux du prospect : le curseur se
   déplace, clique, tape, et le cockpit réagit. Aucune vidéo, aucune capture.

   Deux modes, permutables à tout moment :
     — Guidé   : le scénario déroule le parcours, chapitre par chapitre.
     — Libre    : le prospect prend la main et navigue lui-même.

   Conversion : réutilise le formulaire RÉEL du produit (DemoRequestForm), donc
   le vrai point d'entrée /leads/demo-request et le vrai suivi d'événements.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Play, Pause, RotateCcw, SkipForward, MousePointerClick, X, ChevronRight, Hand,
} from 'lucide-react'
import DemoCockpit from './DemoCockpit'
import { useAutomation } from './useAutomation'
import { SCENARIO } from './scenario'
import { CABINET, PROSPECTS, CLIENTS, totaux, contratsTous } from './demoData'
import DemoRequestForm from '../components/marketing/DemoRequestForm'
import { applySeo } from '../lib/seo'
import { trackMarketingEvent } from '../lib/marketingEvents'
import '../pages/marketing.css'   // styles du formulaire de démo RÉEL (mêmes règles que la landing)
import './demo.css'

const T = totaux()

const ETAPES_ANNONCEES = [
  { t: 'Découvrez votre journée', s: 'Ce qu’ARK a préparé pendant la nuit — prospects, dossiers, relances.' },
  { t: 'Analysez un prospect', s: 'ARK lit le dossier et dit quoi faire maintenant.' },
  { t: 'Préparez une relance', s: 'Le message est écrit depuis le contexte réel, pas d’un modèle.' },
  { t: 'Voyez un dossier bloqué', s: 'Ce qui manque, depuis quand, et à qui le demander.' },
  { t: 'Essayez COURTIA', s: 'Le même cockpit, avec vos données.' },
]

export default function DemoExperience() {
  const auto = useAutomation()
  const [mode, setMode] = useState('intro')       // intro | guide
  const [ctaOuvert, setCtaOuvert] = useState(false)

  useEffect(() => {
    applySeo({
      title: 'Démo COURTIA — le cockpit courtier en action',
      description:
        'Visite guidée automatisée du cockpit COURTIA : brief du matin, analyse de prospect, relances et suivi des pièces. Environnement de démonstration, données fictives.',
      canonicalPath: '/demo',
    })
  }, [])

  const etape = auto.etapeCourante
  const vue = etape?.vue || 'dashboard'

  const lancerGuide = useCallback(() => {
    setMode('guide')
    auto.demarrer(0)
    trackMarketingEvent('click_demo_cta', { emplacement: 'intro_guide' })
  }, [auto])

  const explorerLibrement = useCallback(() => {
    setMode('guide')
    auto.prendreLaMain(0)
    trackMarketingEvent('click_demo_cta', { emplacement: 'intro_libre' })
  }, [auto])

  const prendreLaMain = useCallback(() => {
    auto.prendreLaMain(auto.index)
  }, [auto])

  const ouvrirCta = useCallback(() => {
    setCtaOuvert(true)
    auto.pause()
    trackMarketingEvent('click_demo_cta', { emplacement: 'demo_fin' })
  }, [auto])

  const chapitreCourant = etape?.chapitre
  const chapitreIndex = useMemo(
    () => SCENARIO.chapters.findIndex((c) => c.id === chapitreCourant),
    [chapitreCourant],
  )

  /* ------------------------------------------------------------- ACCUEIL */
  if (mode === 'intro') {
    return (
      <div className="dm-root">
        <BandeauDemo />
        <div className="dm-accueil">
          <span className="dm-eyebrow">Démonstration</span>
          <h1>Regardez COURTIA travailler,<br />sur un cabinet complet</h1>
          <p>
            Pas une vidéo, pas une maquette : un vrai cockpit, avec un cabinet
            fictif de {CLIENTS.length} clients, {contratsTous().length} contrats
            et {PROSPECTS.length} affaires en cours. Le curseur se déplace seul —
            vous pouvez reprendre la main à tout moment.
          </p>

          <div className="dm-etapes">
            {ETAPES_ANNONCEES.map((e, i) => (
              <div className="dm-etape" key={e.t}>
                <div className="dm-etape-num">{i + 1}</div>
                <div>
                  <div className="dm-etape-t">{e.t}</div>
                  <div className="dm-etape-s">{e.s}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="dm-accueil-cta">
            <button className="dm-bouton" type="button" onClick={lancerGuide} data-demo="demarrer-guide">
              <Play size={15} /> Lancer la visite guidée
            </button>
            <button className="dm-bouton" type="button" data-variante="fantome"
              onClick={explorerLibrement} data-demo="explorer-libre">
              <Hand size={15} /> Explorer librement
            </button>
          </div>

          <p className="dm-mention">
            {CABINET.nom} · {CABINET.ville} — {CABINET.mention}. Aucune donnée réelle,
            aucun accès au système de production. Adresses e-mail en domaine réservé
            (non routable), téléphones factices.
          </p>
        </div>
      </div>
    )
  }

  /* -------------------------------------------------------------- LECTEUR */
  return (
    <div className="dm-root">
      <BandeauDemo />
      <div className="dm-temps"><div style={{ width: `${auto.progression * 100}%` }} /></div>

      <DemoCockpit
        vue={vue}
        revealed={auto.revealed}
        typing={auto.typing}
        thinking={auto.thinking}
        onCta={ouvrirCta}
        enPause={!auto.playing || auto.prisEnMain}
      />

      {/* Curseur automatisé */}
      {auto.cursor.visible && (
        <div className="dm-curseur" style={{ left: auto.cursor.x, top: auto.cursor.y, opacity: 1 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 2 L4 19 L9 14.5 L12 21 L15 19.5 L12 13 L18 13 Z"
              fill="#fff" stroke="#0b1020" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      {auto.cursor.clicking && (
        <span className="dm-clic" style={{ left: auto.cursor.x, top: auto.cursor.y }} />
      )}

      {/* Projecteur sur la cible */}
      {auto.spot && !auto.prisEnMain && (
        <div className="dm-spot" data-pulse={auto.spot.pulse ? 'true' : 'false'}
          data-bloquant={auto.spot.bloquant ? 'true' : 'false'}
          style={{ left: auto.spot.x - 6, top: auto.spot.y - 6, width: auto.spot.w + 12, height: auto.spot.h + 12 }} />
      )}

      {/* Légende + contrôles */}
      {auto.caption && !auto.prisEnMain && (
        <div className="dm-legende" data-demo="legende">
          <div className="dm-legende-haut">
            {chapitreIndex >= 0 && (
              <span className="dm-pastille dm-p-encours">
                Chapitre {chapitreIndex + 1}/{SCENARIO.chapters.length} · {SCENARIO.chapters[chapitreIndex].titre}
              </span>
            )}
            {auto.thinking && (
              <span className="dm-reflechit">
                <span className="dm-point" /><span className="dm-point" /><span className="dm-point" />
                ARK analyse
              </span>
            )}
          </div>
          <div className="dm-legende-titre">{auto.caption.titre}</div>
          <div className="dm-legende-txt">{auto.caption.texte}</div>

          <div className="dm-legende-pied">
            {auto.playing
              ? <button className="dm-bouton" data-variante="fantome" type="button" onClick={auto.pause} data-demo="btn-pause"><Pause size={14} /> Pause</button>
              : <button className="dm-bouton" type="button" onClick={auto.reprendre} data-demo="btn-reprendre"><Play size={14} /> Reprendre</button>}
            <button className="dm-bouton" data-variante="fantome" type="button" onClick={auto.redemarrer} data-demo="btn-rejouer"><RotateCcw size={14} /> Rejouer</button>
            <button className="dm-bouton" data-variante="fantome" type="button" data-demo="btn-passer"
              onClick={() => auto.allerA(Math.min(auto.index + 1, auto.steps.length - 1))}>
              <SkipForward size={14} /> Étape suivante
            </button>
            <button className="dm-bouton" data-variante="fantome" type="button" onClick={prendreLaMain} data-demo="btn-main">
              <MousePointerClick size={14} /> Prendre la main
            </button>
            <span className="dm-compteur">{auto.caption.indice} / {auto.caption.total}</span>
          </div>
        </div>
      )}

      {/* Barre de reprise quand le prospect pilote lui-même */}
      {auto.prisEnMain && (
        <div className="dm-legende" data-demo="barre-libre">
          <div className="dm-legende-haut">
            <span className="dm-pastille dm-p-gagne">Mode libre</span>
            <span className="dm-legende-txt" style={{ margin: 0 }}>
              Vous pilotez la démo. Le cabinet est fictif.
            </span>
            <span className="dm-compteur" style={{ marginLeft: 'auto' }}>
              <button className="dm-bouton" data-variante="fantome" type="button"
                onClick={() => auto.demarrer(0)} data-demo="btn-reprendre-guide">
                <RotateCcw size={14} /> Revoir la visite
              </button>
            </span>
          </div>
          <div className="dm-legende-pied">
            <button className="dm-bouton" type="button" onClick={ouvrirCta} data-demo="btn-cta-libre">
              Essayer COURTIA <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Chapitres — accès direct */}
      <div className="dm-chapitres" style={{
        position: 'fixed', top: 46, right: 12, zIndex: 56,
        background: 'rgba(10,8,26,.86)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 8, maxWidth: 200,
      }}>
        <div className="dm-eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>Chapitres</div>
        {SCENARIO.chapters.map((c, i) => {
          const debut = SCENARIO.steps.findIndex((s) => s.chapitre === c.id)
          return (
            <button key={c.id} type="button" className="dm-nav-item" data-actif={i === chapitreIndex}
              data-demo={`chapitre-${c.id}`}
              style={{ width: '100%', fontSize: 11.5, padding: '6px 8px' }}
              onClick={() => auto.allerA(Math.max(0, debut))}>
              {i + 1}. {c.titre}
            </button>
          )
        })}
      </div>

      {/* Conversion */}
      {ctaOuvert && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(2,1,8,.82)',
          backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', padding: 18, overflowY: 'auto',
        }} role="dialog" aria-modal="true">
          <div style={{
            width: 'min(660px, 100%)', background: 'rgba(14,11,32,.97)',
            border: '1px solid rgba(169,241,255,.22)', borderRadius: 18, padding: 22, position: 'relative',
          }}>
            <button type="button" onClick={() => setCtaOuvert(false)} aria-label="Fermer"
              style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 0, color: 'rgba(255,255,255,.6)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <div className="dm-eyebrow">Essayer COURTIA</div>
            <h2 className="dm-h1" style={{ fontSize: '1.3rem', marginTop: 8 }}>Continuer avec vos propres données</h2>
            <p className="dm-sous">
              Vous venez de voir le cockpit avec {CLIENTS.length} clients, {contratsTous().length} contrats
              et {PROSPECTS.length} affaires. La suite : le même outil, alimenté avec votre portefeuille.
            </p>
            <div style={{ marginTop: 4 }}>
              <DemoRequestForm compact />
            </div>
            <p className="dm-mention" style={{ marginTop: 14 }}>
              {T.relances} relances · {T.dossiersIncomplets} dossiers incomplets · {T.echeances30j} échéances
              surveillées dans la démonstration. Environnement fictif — aucune donnée réelle n’est utilisée.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function BandeauDemo() {
  return (
    <div className="dm-banner">
      <strong>Démonstration</strong>
      <span className="dm-sep" />
      <span className="dm-quiet">{CABINET.nom} — {CABINET.mention}</span>
      <span className="dm-sep" />
      <span className="dm-quiet">Données fictives, aucun accès au système de production</span>
    </div>
  )
}
