/* ============================================================================
   COURTIA — Démonstration : bloc de conversion de fin de parcours
   ----------------------------------------------------------------------------
   Remplace le bandeau final « À vous de jouer ». Intégré au produit, PAS une
   popup : aucun voile, aucun fond plein écran — le cockpit COURTIA reste
   visible et utilisable derrière (le panneau est borné en hauteur et peut être
   réduit d'un clic).

   Trois actions, chacune envoie un événement au service de capture :
     « Essayer COURTIA avec mon cabinet »      → trial_requested
     « Réserver une présentation de 15 min »   → meeting_requested
     « J'ai une question »                     → contact_requested

   Texte strictement factuel : aucune durée d'essai, aucun prix, aucun
   engagement n'est annoncé — ce n'est pas notre décision commerciale.

   Une seule information est demandée, et une seule fois : l'adresse e-mail.
   Si elle a déjà été saisie pendant la visite, elle est réutilisée.
   ========================================================================== */

import { useState } from 'react'
import {
  Sparkles, CalendarClock, MessageCircle, MousePointerClick, RotateCcw,
  ChevronDown, ChevronUp, Check, AlertTriangle,
} from 'lucide-react'
import {
  EVENEMENTS, envoyerEvenement, lireIdentite, memoriserIdentite, emailValide,
} from './evenementsConversion'

const LIBELLES = {
  essai: 'Essayer COURTIA avec mon cabinet',
  presentation: 'Réserver une présentation de 15 min',
  question: 'J\'ai une question',
}

export default function ConversionFin({ titre, onExplorer, onRejouer }) {
  /* `choix` : on propose les trois actions. `email` : une seule information
     manque. `envoi` : requête en cours. `ok` / `echec` : résultat RÉEL. */
  const [etat, setEtat] = useState('choix')
  const [action, setAction] = useState(null)
  const [adresse, setAdresse] = useState(() => lireIdentite()?.email || '')
  const [reutilisee, setReutilisee] = useState(() => Boolean(lireIdentite()?.email))
  const [resultat, setResultat] = useState(null)
  const [reduit, setReduit] = useState(false)

  const expedier = async (cle, adresseAenvoyer, dejaConnue) => {
    setEtat('envoi')
    setResultat(null)
    if (!dejaConnue) memoriserIdentite({ email: adresseAenvoyer })
    setReutilisee(true)
    const r = await envoyerEvenement(EVENEMENTS[cle], { action: cle })
    setResultat(r)
    setEtat(r.ok ? 'ok' : 'echec')
  }

  const declencher = (cle) => {
    setAction(cle)
    const connue = lireIdentite()?.email
    if (connue) {
      /* Information déjà saisie : on ne redemande rien. */
      setAdresse(connue)
      expedier(cle, connue, true)
      return
    }
    setEtat('email')
  }

  const valider = (e) => {
    e.preventDefault()
    if (!action || !emailValide(adresse)) return
    expedier(action, adresse.trim(), false)
  }

  const actif = action ? LIBELLES[action] : null

  return (
    /* `dt-final` est conservé comme POINT D'ANCRAGE : src/lib/suiviDemo.js
       observe cette classe pour émettre demo_completed. Elle ne porte plus
       aucun style ici — tout le style du bloc est porté par `dt-conv`. */
    <section
      className="dt-conv dt-final"
      data-reduit={reduit ? 'true' : 'false'}
      aria-label="Passer à COURTIA avec votre cabinet"
      role="region"
    >
      <div className="dt-conv-tete">
        <span className="dt-conv-etiquette">Fin de la visite</span>
        <span className="dt-conv-titre">{titre || 'La suite, avec votre cabinet'}</span>
        <button
          type="button"
          className="dt-conv-reduire"
          onClick={() => setReduit((r) => !r)}
          aria-expanded={!reduit}
          aria-label={reduit ? 'Déplier le panneau de conversion' : 'Réduire le panneau de conversion'}
        >
          {reduit ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {reduit ? (
        <div className="dt-conv-actions">
          <button type="button" className="dt-conv-cta" onClick={() => { setReduit(false); declencher('essai') }}>
            <Sparkles size={15} /> {LIBELLES.essai}
          </button>
        </div>
      ) : (
        <>
          <p className="dt-conv-texte">
            Cabinet fictif, données synthétiques. Pour continuer avec votre portefeuille,
            choisissez une option — une seule information est demandée, et jamais deux fois.
          </p>

          <div className="dt-conv-actions">
            <button
              type="button"
              className="dt-conv-cta"
              onClick={() => declencher('essai')}
              disabled={etat === 'envoi'}
            >
              <Sparkles size={15} />
              <span className="dt-conv-libelle">{LIBELLES.essai}</span>
            </button>
            <button
              type="button"
              className="dt-conv-secondaire"
              onClick={() => declencher('presentation')}
              disabled={etat === 'envoi'}
            >
              <CalendarClock size={15} />
              <span className="dt-conv-libelle">{LIBELLES.presentation}</span>
            </button>
            <button
              type="button"
              className="dt-conv-discret"
              onClick={() => declencher('question')}
              disabled={etat === 'envoi'}
            >
              <MessageCircle size={14} />
              <span className="dt-conv-libelle">{LIBELLES.question}</span>
            </button>
          </div>

          {etat === 'email' && (
            <form className="dt-conv-mail" onSubmit={valider}>
              <label className="dt-conv-mail-lbl" htmlFor="dt-conv-email">
                {actif} — une seule information : votre adresse e-mail.
              </label>
              <div className="dt-conv-mail-ligne">
                <input
                  id="dt-conv-email"
                  className="dt-conv-mail-champ"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="prenom@cabinet.ch"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="dt-conv-cta dt-conv-mail-envoyer" disabled={!emailValide(adresse)}>
                  Envoyer
                </button>
                <button type="button" className="dt-conv-discret" onClick={() => setEtat('choix')}>
                  Annuler
                </button>
              </div>
              <span className="dt-conv-note">
                Aucun engagement : c'est une demande, rien d'autre.
              </span>
            </form>
          )}

          {etat === 'envoi' && (
            <p className="dt-conv-info">Envoi de la demande…</p>
          )}

          {etat === 'ok' && (
            <p className="dt-conv-info dt-conv-ok">
              <Check size={14} /> Demande transmise{adresse ? ` (${adresse})` : ''}. Aucun engagement : c'est une demande, rien d'autre.
            </p>
          )}

          {etat === 'echec' && (
            <p className="dt-conv-info dt-conv-echec">
              <AlertTriangle size={14} />
              L’envoi n’a pas abouti (HTTP {resultat ? resultat.statut : 0}) — la demande n’est PAS transmise.
              <button
                type="button"
                className="dt-conv-discret"
                onClick={() => (reutilisee || adresse ? expedier(action, adresse, true) : setEtat('email'))}
              >
                Réessayer
              </button>
            </p>
          )}

          {etat === 'ok' && reutilisee && (
            <span className="dt-conv-note">
              Adresse conservée pour cette visite : <strong>{adresse}</strong> — elle ne sera pas redemandée.
              {' '}
              <button type="button" className="dt-conv-lien" onClick={() => setEtat('email')}>
                Modifier
              </button>
            </span>
          )}

          <div className="dt-conv-pied">
            <button type="button" className="dt-btn dt-btn-fort" onClick={onExplorer}>
              <MousePointerClick size={13} /> Continuer à explorer COURTIA
            </button>
            <button type="button" className="dt-btn" onClick={onRejouer}>
              <RotateCcw size={13} /> Revoir la visite
            </button>
            <span className="dt-conv-note dt-conv-note--pied">
              Démonstration — aucun accès au système de production.
            </span>
          </div>
        </>
      )}
    </section>
  )
}
