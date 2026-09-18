/* ============================================================================
   COURTIA — Démo guidée : la coque et les écrans
   ----------------------------------------------------------------------------
   Réplique fidèle du cockpit COURTIA (mêmes tokens, mêmes libellés, même
   hiérarchie) alimentée EXCLUSIVEMENT par src/demo/demoData.js.

   Pourquoi une réplique et non les composants privés réels : l'instance axios
   du produit redirige vers /login sur toute réponse 401. Monter les écrans
   privés dans une page publique éjecterait le prospect hors de la démo dès le
   premier appel réseau. La démo est donc volontairement découplée : zéro appel
   API, zéro fuite de données, et une interface identique.
   ========================================================================== */

import { useMemo, useState } from 'react'
import {
  CABINET, PROSPECTS, CLIENTS, TACHES, DOCUMENTS, OPPORTUNITES, MESSAGES, ACTIVITE,
  STATUT, fr, frLong, contratsTous, dossiersIncomplets, relancesDues,
  prospectsPrioritaires, portefeuille, totaux, parId,
  RELANCE_MESSAGE, REPONSE_ARK_DOSSIERS,
} from './demoData'

/* ------------------------------------------------------------ RÉVÉLATION */
function Vu({ cle, revealed, children, cascade = 0, style }) {
  const actif = !cle || revealed.has('*') || revealed.has(cle)
  return (
    <div className="dm-apparait" data-vu={actif ? 'true' : 'false'}
      style={{ transitionDelay: actif ? `${cascade}ms` : '0ms', ...style }}>
      {children}
    </div>
  )
}

const pastille = (statut) => {
  const map = {
    NEW: ['Nouveau', 'dm-p-neuf'], TO_CONTACT: ['À contacter', 'dm-p-neuf'],
    CONTACTED: ['Contacté', 'dm-p-froid'], REPLIED: ['A répondu', 'dm-p-encours'],
    INTERESTED: ['Intéressé', 'dm-p-encours'], DEMO: ['Démo planifiée', 'dm-p-encours'],
    NEGOTIATION: ['Négociation', 'dm-p-chaud'], WON: ['Gagné', 'dm-p-gagne'],
    LOST: ['Perdu', 'dm-p-froid'], DO_NOT_CONTACT: ['Ne pas contacter', 'dm-p-froid'],
  }
  const [lib, cls] = map[statut] || [statut, 'dm-p-froid']
  return <span className={`dm-pastille ${cls}`}>{lib}</span>
}

/* ============================================================== TABLEAU DE BORD */
function EcranDashboard({ revealed }) {
  const p = portefeuille()
  const T = totaux()
  const proches = contratsTous().filter((c) => c.echeance <= 30)
  return (
    <>
      <p className="dm-eyebrow">Tableau de bord</p>
      <h1 className="dm-h1">Bonjour {CABINET.courtier}</h1>
      <p className="dm-sous">{frLong(0)} · {CABINET.ville} · {CABINET.mention}</p>

      <div className="dm-grille dm-g4" data-demo="kpi-clients">
        <Vu cle="kpi:clients" revealed={revealed} cascade={0}>
          <div className="dm-carte">
            <div className="dm-kpi-val">{p.clients}</div>
            <div className="dm-kpi-lab">Clients suivis</div>
            <div className="dm-kpi-note">{p.aDevelopper} à fort potentiel</div>
          </div>
        </Vu>
        <Vu cle="kpi:contrats" revealed={revealed} cascade={80}>
          <div className="dm-carte">
            <div className="dm-kpi-val">{p.contrats}</div>
            <div className="dm-kpi-lab">Contrats au portefeuille</div>
            <div className="dm-kpi-note">Prime moyenne {p.moyenne.toLocaleString('fr-CH')} CHF</div>
          </div>
        </Vu>
        <Vu cle="kpi:primes" revealed={revealed} cascade={160}>
          <div className="dm-carte">
            <div className="dm-kpi-val">{p.primes.toLocaleString('fr-CH')} CHF</div>
            <div className="dm-kpi-lab">Primes annuelles gérées</div>
            <div className="dm-kpi-note">{p.aProteger} clients à protéger</div>
          </div>
        </Vu>
        <Vu cle="kpi:score" revealed={revealed} cascade={240}>
          <div className="dm-carte">
            <div className="dm-kpi-val">{p.scoreMoyen}</div>
            <div className="dm-kpi-lab">Santé moyenne du portefeuille</div>
            <div className="dm-kpi-note">Calculée sur {p.clients} dossiers</div>
          </div>
        </Vu>
      </div>

      <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="dm-bouton" data-demo="bouton-ark" type="button">
          Lancer ma journée avec ARK
        </button>
        <span className="dm-kpi-lab" style={{ margin: 0 }}>
          {T.echeances30j} échéances dans les 30 jours · {T.messages} messages non lus
        </span>
      </div>

      <h2 className="dm-h1" style={{ fontSize: '1.05rem', marginTop: 28 }}>Activité récente</h2>
      <div>
        {ACTIVITE.map((a, i) => (
          <Vu key={a.id} revealed={revealed} cascade={i * 60}>
            <div className="dm-ligne">
              <span className="dm-pastille dm-p-froid">{a.type}</span>
              <div>
                <div className="dm-ligne-titre">{a.texte}</div>
                <div className="dm-ligne-sous">{a.quand === 0 ? "aujourd'hui" : `il y a ${Math.abs(a.quand) < 1 ? 'quelques heures' : `${Math.round(Math.abs(a.quand))} j`}`}</div>
              </div>
            </div>
          </Vu>
        ))}
      </div>

      <h2 className="dm-h1" style={{ fontSize: '1.05rem', marginTop: 28 }}>Échéances proches</h2>
      <div>
        {proches.slice(0, 4).map((c, i) => (
          <Vu key={c.id} revealed={revealed} cascade={i * 60}>
            <div className="dm-ligne">
              <div>
                <div className="dm-ligne-titre">{c.produit} — {c.client.nom}</div>
                <div className="dm-ligne-sous">{c.compagnie} · {c.prime.toLocaleString('fr-CH')} CHF</div>
              </div>
              <div className="dm-pousse">
                <span className={`dm-pastille ${c.echeance <= 10 ? 'dm-p-alerte' : 'dm-p-encours'}`}>
                  dans {c.echeance} j
                </span>
              </div>
            </div>
          </Vu>
        ))}
      </div>
    </>
  )
}

/* ================================================================ BRIEF ARK */
function EcranBrief({ revealed, typing, thinking, onQuestion }) {
  const T = totaux()
  const prioritaires = prospectsPrioritaires(3)
  const dossiers = dossiersIncomplets()
  const relances = relancesDues()
  const [reponse, setReponse] = useState(null)
  const champArk = typing?.champ === 'ark-question' ? typing.texte : null

  const cartes = [
    ['brief:prospects', T.prospectsPrioritaires, 'Prospects prioritaires', 'À traiter aujourd’hui', 'dm-p-chaud'],
    ['brief:dossiers', T.dossiersIncomplets, 'Dossiers incomplets', 'Pièces en attente', 'dm-p-alerte'],
    ['brief:relances', T.relances, 'Relances dues', 'Échéance atteinte ou dépassée', 'dm-p-encours'],
    ['brief:opportunites', T.opportunites, 'Opportunités détectées', 'Non exploitées à ce jour', 'dm-p-gagne'],
  ]

  const actions = [
    ...prioritaires.map((p) => ({
      cle: `prospect:${p.id}`,
      titre: `Rappeler ${p.contact} — ${p.societe}`,
      sous: `${STATUT[p.statut]} · score ${p.score} · potentiel ${p.potentiel.toLocaleString('fr-CH')} CHF`,
      tag: p.prochaine === 0 ? "aujourd'hui" : `dans ${p.prochaine} j`,
      ton: p.prochaine === 0 ? 'dm-p-chaud' : 'dm-p-encours',
    })),
    ...dossiers.slice(0, 2).map((c) => ({
      cle: `client:${c.id}`,
      titre: `Réclamer : ${c.manquants.join(', ')}`,
      sous: `${c.nom} · ${c.manquants.length} pièce(s) en attente`,
      tag: `il y a ${Math.abs(c.dernier)} j`,
      ton: 'dm-p-alerte',
    })),
    ...relances.slice(0, 3).map((t) => ({
      cle: `tache:${t.id}`,
      titre: t.titre,
      sous: `${t.type} · canal ${t.canal}`,
      tag: t.echeance === 0 ? 'aujourd’hui' : `${Math.abs(t.echeance)} j de retard`,
      ton: t.echeance < 0 ? 'dm-p-alerte' : 'dm-p-encours',
    })),
  ]

  return (
    <>
      <p className="dm-eyebrow">Brief du matin</p>
      <h1 className="dm-h1" data-demo="brief-titre">Votre journée, préparée par ARK</h1>
      <p className="dm-sous">
        Synthèse calculée à partir de {CLIENTS.length} dossiers, {contratsTous().length} contrats
        et {PROSPECTS.length} affaires en cours.
      </p>

      {thinking && (
        <div className="dm-reflechit" data-demo="ark-reflechit" style={{ marginBottom: 14 }}>
          <span className="dm-point" /><span className="dm-point" /><span className="dm-point" />
          ARK analyse le cabinet…
        </div>
      )}

      <div className="dm-grille dm-g4">
        {cartes.map(([cle, val, lab, note, ton], i) => (
          <Vu key={cle} cle={cle} revealed={revealed} cascade={i * 70}>
            <div className="dm-carte">
              <div className="dm-kpi-val">{val}</div>
              <div className="dm-kpi-lab">{lab}</div>
              <div style={{ marginTop: 8 }}><span className={`dm-pastille ${ton}`}>{note}</span></div>
            </div>
          </Vu>
        ))}
      </div>

      {/* ARK — question du courtier */}
      <div className="dm-carte" style={{ marginTop: 20 }} data-demo="ark-zone">
        <div className="dm-eyebrow" style={{ marginBottom: 8 }}>Demander à ARK</div>
        <div className="dm-champ" data-demo="ark-question" style={{ minHeight: 0, padding: '11px 12px' }}>
          {champArk != null
            ? <span className={typing?.champ === 'ark-question' && champArk.length < 42 ? 'dm-curseur-txt' : ''}>{champArk}</span>
            : <span style={{ color: 'rgba(255,255,255,.34)' }}>Ex. « Quels dossiers sont incomplets ? »</span>}
        </div>
        {reponse && (
          <div style={{ marginTop: 12 }} className="dm-apparait" data-vu="true">
            <div className="dm-reflechit" style={{ marginBottom: 8 }}>
              <span className="dm-pastille dm-p-gagne">ARK</span>
            </div>
            <div className="dm-message" data-demo="ark-reponse">{reponse}</div>
          </div>
        )}
      </div>

      <h2 className="dm-h1" style={{ fontSize: '1.05rem', marginTop: 26 }}>À faire aujourd’hui</h2>
      <div data-demo="brief-actions">
        {actions.map((a, i) => (
          <Vu key={a.cle} cle={a.cle} revealed={revealed} cascade={i * 55}>
            <div className="dm-ligne">
              <div>
                <div className="dm-ligne-titre">{a.titre}</div>
                <div className="dm-ligne-sous">{a.sous}</div>
              </div>
              <div className="dm-pousse"><span className={`dm-pastille ${a.ton}`}>{a.tag}</span></div>
            </div>
          </Vu>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="dm-bouton" type="button" data-demo="brief-ouvrir"
          onClick={() => setReponse(REPONSE_ARK_DOSSIERS())}>
          Poser la question à ARK
        </button>
      </div>
    </>
  )
}

/* ================================================================ PROSPECTION */
function EcranProspection({ revealed, thinking, prospectSel, setProspectSel }) {
  const p = prospectSel
  return (
    <>
      <p className="dm-eyebrow">Prospection</p>
      <h1 className="dm-h1">Pipeline commercial</h1>
      <p className="dm-sous">
        {PROSPECTS.length} cabinets · potentiel cumulé{' '}
        {PROSPECTS.reduce((s, x) => s + x.potentiel, 0).toLocaleString('fr-CH')} CHF
      </p>

      <div data-demo="liste-prospects">
        {PROSPECTS.map((x, i) => (
          <Vu key={x.id} cle={`prospect:${x.id}`} revealed={revealed} cascade={i * 45}>
            <div className="dm-ligne" data-demo={`p-${x.id}`}
              style={p?.id === x.id ? { borderColor: 'rgba(169,241,255,.45)', background: 'rgba(169,241,255,.06)' } : undefined}
              onClick={() => setProspectSel(x)} role="button" tabIndex={0}>
              <div style={{ minWidth: 0 }}>
                <div className="dm-ligne-titre">{x.societe}</div>
                <div className="dm-ligne-sous">{x.contact} · {x.ville} ({x.canton}) · {x.taille}</div>
              </div>
              <div className="dm-pousse" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dm-pastille dm-p-froid">{x.source}</span>
                {pastille(x.statut)}
              </div>
            </div>
          </Vu>
        ))}
      </div>

      {p && (
        <div className="dm-carte" style={{ marginTop: 20 }} data-demo="prospect-detail">
          <p className="dm-eyebrow">Fiche prospect</p>
          <h2 className="dm-h1" style={{ fontSize: '1.15rem', marginTop: 6 }}>{p.societe}</h2>
          <p className="dm-sous" style={{ marginBottom: 14 }}>
            {p.contact} · {p.ville} ({p.canton}) · {p.taille}
          </p>

          <div className="dm-grille dm-g2" data-demo="prospect-score">
            <Vu cle="prospect:score" revealed={revealed}>
              <div className="dm-carte">
                <div className="dm-kpi-val">{p.score}<span style={{ fontSize: '.5em', opacity: .5 }}>/100</span></div>
                <div className="dm-kpi-lab">Score de conversion</div>
                <div className="dm-barre-fond" style={{ marginTop: 10 }}>
                  <div className="dm-barre" style={{ width: `${p.score}%` }} />
                </div>
              </div>
            </Vu>
            <Vu cle="prospect:signaux" revealed={revealed} cascade={110}>
              <div className="dm-carte">
                <div className="dm-kpi-val">{p.potentiel.toLocaleString('fr-CH')}<span style={{ fontSize: '.45em', opacity: .5 }}> CHF</span></div>
                <div className="dm-kpi-lab">Potentiel annuel estimé</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {pastille(p.statut)}
                  <span className="dm-pastille dm-p-froid">Source : {p.source}</span>
                  <span className="dm-pastille dm-p-froid">
                    Dernier contact : {p.dernier == null ? 'jamais' : `il y a ${Math.abs(p.dernier)} j`}
                  </span>
                </div>
              </div>
            </Vu>
          </div>

          <div style={{ marginTop: 14 }} data-demo="prospect-ark">
            <Vu cle="prospect:ark" revealed={revealed}>
              <div className="dm-carte" style={{ borderColor: 'rgba(169,241,255,.28)' }}>
                <div className="dm-eyebrow" style={{ marginBottom: 8 }}>Lecture ARK</div>
                {thinking
                  ? <div className="dm-reflechit"><span className="dm-point" /><span className="dm-point" /><span className="dm-point" />ARK analyse le dossier…</div>
                  : (
                    <div className="dm-message">{`${p.note}\n\nRecommandation : ${
                      p.statut === 'NEGOTIATION' ? 'relancer cette semaine sur le devis — la décision est annoncée pour cette semaine.'
                      : p.statut === 'INTERESTED' ? 'proposer un essai encadré sur 3 utilisateurs.'
                      : p.dernier == null ? 'premier contact à faire, cabinet jamais approché.'
                      : `relance due depuis ${Math.abs(p.dernier) - 5} jours.`
                    }`}</div>
                  )}
              </div>
            </Vu>
          </div>
        </div>
      )}
    </>
  )
}

/* ================================================================== RELANCES */
function EcranRelances({ revealed, typing }) {
  const relances = relancesDues()
  const enRetard = TACHES.filter((t) => t.echeance < 0)
  const prospect = parId.prospect('P-1006')
  const champ = typing?.champ === 'relance-message' ? typing.texte : null

  const message = RELANCE_MESSAGE

  return (
    <>
      <p className="dm-eyebrow">Tâches &amp; relances</p>
      <h1 className="dm-h1">Ce qui est dû aujourd’hui</h1>
      <p className="dm-sous">
        {relances.length} relances dues · {enRetard.length} en retard · triées par ancienneté réelle
      </p>

      <div data-demo="liste-relances">
        {relances.map((t, i) => (
          <Vu key={t.id} cle={`tache:${t.id}`} revealed={revealed} cascade={i * 55}>
            <div className="dm-ligne">
              <span className={`dm-pastille ${t.echeance < 0 ? 'dm-p-alerte' : 'dm-p-encours'}`}>
                {t.echeance < 0 ? `${Math.abs(t.echeance)} j de retard` : 'aujourd’hui'}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="dm-ligne-titre">{t.titre}</div>
                <div className="dm-ligne-sous">{t.type} · {t.canal}</div>
              </div>
            </div>
          </Vu>
        ))}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="dm-bouton" type="button" data-demo="bouton-rediger">
          Préparer la relance avec ARK
        </button>
        <span className="dm-kpi-lab" style={{ margin: 0 }}>Rien ne part sans votre validation</span>
      </div>

      <Vu cle="relance:always" revealed={revealed}>
        <div className="dm-carte" style={{ marginTop: 18 }} data-demo="relance-message">
          <div className="dm-eyebrow" style={{ marginBottom: 9 }}>Message proposé — Groupe Vernex</div>
          <div className="dm-message">
            {champ != null ? <>{champ}<span className="dm-curseur-txt" /></> : message}
          </div>
          <div style={{ marginTop: 13, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="dm-pastille dm-p-encours">Objet : Re: devis Cabinet</span>
            <span className="dm-pastille dm-p-froid">Canal : courriel</span>
            <span className="dm-pastille dm-p-froid">Signé {CABINET.courtier}</span>
          </div>
        </div>
      </Vu>

      <div data-demo="relance-regles" style={{ marginTop: 14 }}>
        <Vu cle="relance:regles" revealed={revealed}>
          <div className="dm-carte">
            <div className="dm-eyebrow" style={{ marginBottom: 9 }}>Règles appliquées</div>
            <div className="dm-message">{[
              '• Reprise du contexte réel du dossier, pas d’un modèle générique.',
              '• Une seule demande par message.',
              '• Aucun envoi automatique : vous relisez et vous validez.',
            ].join('\n')}</div>
          </div>
        </Vu>
      </div>
    </>
  )
}

/* ============================================================= DOSSIER CLIENT */
function EcranDossier({ revealed, thinking }) {
  const c = parId.client('C-2003')
  const docs = DOCUMENTS.filter((d) => d.clientId === c.id)
  return (
    <>
      <p className="dm-eyebrow">Dossier client</p>
      <h1 className="dm-h1" data-demo="dossier-titre">{c.nom}</h1>
      <p className="dm-sous">{c.ville} · client depuis {Math.abs(Math.round(c.depuis / 365 * 10) / 10)} ans · score {c.score}</p>

      <div className="dm-grille dm-g2">
        <div className="dm-carte">
          <div className="dm-eyebrow" style={{ marginBottom: 8 }}>Contrats</div>
          {c.contrats.map((ct) => (
            <div key={ct.id} className="dm-ligne" style={{ background: 'transparent', border: 0, padding: '7px 0' }}>
              <div>
                <div className="dm-ligne-titre">{ct.produit}</div>
                <div className="dm-ligne-sous">{ct.compagnie} · {ct.prime.toLocaleString('fr-CH')} CHF</div>
              </div>
              <div className="dm-pousse">
                <span className={`dm-pastille ${ct.echeance <= 10 ? 'dm-p-alerte' : 'dm-p-encours'}`}>échéance {ct.echeance} j</span>
              </div>
            </div>
          ))}
        </div>

        <div className="dm-carte" data-demo="dossier-pieces">
          <div className="dm-eyebrow" style={{ marginBottom: 8 }}>Pièces du dossier</div>
          <Vu cle="dossier:pieces" revealed={revealed}>
            {docs.map((d, i) => (
              <div key={d.id} className="dm-ligne" style={{ background: 'transparent', border: 0, padding: '7px 0' }}>
                <div>
                  <div className="dm-ligne-titre">{d.nom}</div>
                  <div className="dm-ligne-sous">Demandé {d.canal === 'Courriel' ? 'par courriel' : d.canal} · il y a {Math.abs(d.depuis)} j</div>
                </div>
                <div className="dm-pousse">
                  <span className={`dm-pastille ${d.statut === 'reçu' ? 'dm-p-gagne' : d.statut === 'en retard' ? 'dm-p-alerte' : 'dm-p-encours'}`}>{d.statut}</span>
                </div>
              </div>
            ))}
          </Vu>
        </div>
      </div>

      <div style={{ marginTop: 14 }} data-demo="dossier-manquants">
        <Vu cle="dossier:manquants" revealed={revealed}>
          <div className="dm-carte" style={{ borderColor: 'rgba(255,176,92,.3)' }}>
            <div className="dm-eyebrow" style={{ marginBottom: 8, color: '#ffd3a1' }}>Action recommandée</div>
            {thinking
              ? <div className="dm-reflechit"><span className="dm-point" /><span className="dm-point" /><span className="dm-point" />ARK vérifie les pièces…</div>
              : (
                <div className="dm-message">{`${c.manquants.length} pièces manquent depuis ${
                  Math.max(...docs.filter((d) => d.statut !== 'reçu').map((d) => Math.abs(d.depuis)))
                } jours.\n\nRelancer par courriel avec la liste exacte des pièces à fournir :\n`
                  + c.manquants.map((m) => `• ${m}`).join('\n')
                  + `\n\nUn dossier bloqué se voit ici avant de bloquer le renouvellement.`}</div>
              )}
          </div>
        </Vu>
      </div>
    </>
  )
}

/* ============================================================= AUTOMATISATION */
function EcranAuto({ revealed }) {
  const T = totaux()
  const flux = [
    ['Collecte des pièces', 'Demande, relance, classement dans le dossier', `${DOCUMENTS.length} pièces suivies`],
    ['Contrôle des échéances', 'Alerte avant que le contrat ne se renouvelle sans vous', `${T.echeances30j} contrats sous 30 jours`],
    ['Relances', 'Rédaction à partir du contexte réel, envoi après votre validation', `${T.relances} dues aujourd’hui`],
    ['Consignation', 'Chaque échange est historisé sur le dossier', `${ACTIVITE.length} événements récents`],
  ]
  const surveillance = [
    [`${T.dossiersIncomplets} dossiers bloqués`, 'Pièces en attente depuis plus de deux semaines'],
    [`${T.opportunites} opportunités non exploitées`, 'Couvertures absentes détectées sur le portefeuille'],
    [`${MESSAGES.filter((m) => m.nonLu).length} messages en attente`, 'Réponses clients non traitées'],
  ]
  return (
    <>
      <p className="dm-eyebrow">Automatisation</p>
      <h1 className="dm-h1">Ce que COURTIA fait sans vous</h1>
      <p className="dm-sous">Ce ne sont pas des promesses : ce sont les gestes que le cockpit exécute à votre place.</p>

      <div className="dm-grille dm-g2" data-demo="auto-flux">
        {flux.map(([t, s, n], i) => (
          <Vu key={t} cle="auto:flux" revealed={revealed} cascade={i * 220}>
            <div className="dm-carte" style={{ height: '100%' }}>
              <div className="dm-ligne-titre">{t}</div>
              <div className="dm-ligne-sous" style={{ marginTop: 5 }}>{s}</div>
              <div style={{ marginTop: 10 }}><span className="dm-pastille dm-p-encours">{n}</span></div>
            </div>
          </Vu>
        ))}
      </div>

      <div style={{ marginTop: 16 }} data-demo="auto-ark">
        <Vu cle="auto:ark" revealed={revealed}>
          <div className="dm-carte">
            <div className="dm-eyebrow" style={{ marginBottom: 9 }}>Surveillance continue</div>
            {surveillance.map(([t, s]) => (
              <div key={t} className="dm-ligne" style={{ background: 'transparent', border: 0, padding: '7px 0' }}>
                <div>
                  <div className="dm-ligne-titre">{t}</div>
                  <div className="dm-ligne-sous">{s}</div>
                </div>
              </div>
            ))}
          </div>
        </Vu>
      </div>
    </>
  )
}

/* =================================================================== ESSAI */
function EcranEssai({ revealed, onCta }) {
  const T = totaux()
  return (
    <>
      <p className="dm-eyebrow">Passer à votre cabinet</p>
      <h1 className="dm-h1">Voilà ce que COURTIA ferait chez vous</h1>
      <p className="dm-sous">
        Exactement ce cockpit, avec vos clients, vos contrats et vos échéances —
        {PROSPECTS.length} affaires et {contratsTous().length} contrats dans cet exemple.
      </p>

      <div className="dm-grille dm-g2">
        <div className="dm-carte">
          <div className="dm-eyebrow" style={{ marginBottom: 8 }}>Ce que vous venez de voir</div>
          <div className="dm-message">{[
            `• ${T.prospectsPrioritaires} prospects prioritaires identifiés automatiquement`,
            `• ${T.dossiersIncomplets} dossiers incomplets suivis avec l’ancienneté réelle`,
            `• ${T.relances} relances prêtes, rédigées depuis le dossier`,
            `• ${T.echeances30j} échéances surveillées`,
            `• ${T.opportunites} opportunités non exploitées détectées`,
          ].join('\n')}</div>
        </div>
        <div className="dm-carte">
          <div className="dm-eyebrow" style={{ marginBottom: 8 }}>Et ensuite</div>
          <div className="dm-message">{[
            '• Import de votre portefeuille existant',
            '• Activation des relances selon vos règles',
            '• Accompagnement sur les 30 premiers jours',
          ].join('\n')}</div>
        </div>
      </div>

      {/* Le CTA n'est jamais masqué par l'automate : c'est le point de conversion. */}
      <div style={{ marginTop: 20 }} data-demo="cta-final">
        <div className="dm-apparait" data-vu="true">
          <div className="dm-carte" style={{ borderColor: 'rgba(169,241,255,.34)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220, flex: 1 }}>
              <div className="dm-ligne-titre">Essayer COURTIA</div>
              <div className="dm-ligne-sous">Démonstration personnalisée avec vos propres données, sans engagement.</div>
            </div>
            <button className="dm-bouton" type="button" data-demo="cta-essayer" onClick={() => onCta()}>
              Continuer avec COURTIA
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ==================================================================== COQUE */
const NAV = [
  { id: 'dashboard', lib: 'Tableau de bord' },
  { id: 'brief', lib: 'Brief du matin' },
  { id: 'prospection', lib: 'Prospection' },
  { id: 'relances', lib: 'Tâches & relances' },
  { id: 'dossier', lib: 'Dossier client' },
  { id: 'auto', lib: 'Automatisation' },
]

export default function DemoCockpit({ vue, revealed, typing, thinking, onCta, enPause }) {
  const [prospectSel, setProspectSel] = useState(null)
  const [vueLibre, setVueLibre] = useState(null)

  // En mode guidé c'est le scénario qui commande ; en mode libre, le visiteur.
  const courante = enPause ? (vueLibre || vue) : vue

  // Quand le scénario entre dans le chapitre prospect, on sélectionne Vernex.
  const selection = useMemo(() => prospectSel || parId.prospect('P-1006'), [prospectSel])

  return (
    <div className="dm-shell">
      <aside className="dm-side">
        <div className="dm-logo">
          <div className="dm-logo-marque">C</div>
          <div>
            <div className="dm-logo-texte">COURTIA</div>
            <div className="dm-logo-sous">{CABINET.ville} · {CABINET.canton}</div>
          </div>
        </div>
        <div className="dm-nav">
          {NAV.map((n) => (
            <button key={n.id} type="button" className="dm-nav-item" data-actif={courante === n.id}
              data-demo={`nav-${n.id}`}
              onClick={() => { setVueLibre(n.id); if (n.id === 'prospection') setProspectSel(null) }}>
              {n.lib}
            </button>
          ))}
        </div>
        <div className="dm-side-groupe">Cabinet</div>
        <div className="dm-nav-item" style={{ cursor: 'default' }}>{CABINET.courtier}</div>
        <div className="dm-nav-item" style={{ cursor: 'default', fontSize: 11.5 }}>{CABINET.mention}</div>
      </aside>

      <main className="dm-main">
        {courante === 'dashboard' && <EcranDashboard revealed={revealed} />}
        {courante === 'brief' && <EcranBrief revealed={revealed} typing={typing} thinking={thinking} />}
        {courante === 'prospection' && (
          <EcranProspection revealed={revealed} thinking={thinking}
            prospectSel={selection} setProspectSel={setProspectSel} />
        )}
        {courante === 'relances' && <EcranRelances revealed={revealed} typing={typing} />}
        {courante === 'dossier' && <EcranDossier revealed={revealed} thinking={thinking} />}
        {courante === 'auto' && <EcranAuto revealed={revealed} />}
        {courante === 'essai' && <EcranEssai revealed={revealed} onCta={onCta} />}
      </main>
    </div>
  )
}
