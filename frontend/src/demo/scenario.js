/* ============================================================================
   COURTIA — Scénario de la démo guidée
   ----------------------------------------------------------------------------
   Chaque étape désigne :
     vue      : l'écran qui doit être monté (le cockpit suit le scénario)
     cible    : la clé `data-demo` réellement présente dans le DOM
     titre    : le titre de la légende
     texte    : l'explication affichée au prospect
     clic     : le curseur clique réellement sur l'élément
     saisie   : du texte est réellement tapé dans le champ
     reflechit: durée de l'état « ARK analyse… »
     revele   : clés révélées une par une après l'action (cascade visuelle)
     tenue    : temps de pause avant l'étape suivante (ms)

   Les clés révélées correspondent à des éléments dont le contenu est CALCULÉ
   depuis src/demo/demoData.js : aucun chiffre n'est écrit ici.
   ========================================================================== */

import { totaux, prospectsPrioritaires, dossiersIncomplets, relancesDues, contratsTous } from './demoData'
import { PROSPECTS, CLIENTS, OPPORTUNITES, MESSAGES, QUESTION_ARK, RELANCE_MESSAGE } from './demoData'

const T = totaux()

const K = {
  briefCards: ['brief:prospects', 'brief:dossiers', 'brief:relances', 'brief:opportunites'],
  briefActions: ['brief:actions'],
  prospectScore: ['prospect:score', 'prospect:signaux'],
  prospectArk: ['prospect:ark'],
  relanceMessage: ['relance:message'],
  relanceRegles: ['relance:regles'],
  dossierPieces: ['dossier:pieces'],
  dossierManquants: ['dossier:manquants'],
  autoFlux: ['auto:flux', 'auto:ark', 'auto:relances'],
  cta: ['cta:final'],
}

/* Toutes les clés, pour l'affichage libre après « prendre la main ». */
export const TOUT_REVELE = [
  ...K.briefCards, ...K.briefActions, ...K.prospectScore, ...K.prospectArk,
  ...K.relanceMessage, ...K.relanceRegles, ...K.dossierPieces, ...K.dossierManquants,
  ...K.autoFlux, ...K.cta,
  ...PROSPECTS.map((p) => `prospect:${p.id}`),
  ...CLIENTS.map((c) => `client:${c.id}`),
  ...OPPORTUNITES.map((o) => `opp:${o.id}`),
  ...MESSAGES.map((m) => `msg:${m.id}`),
  ...contratsTous().map((c) => `contrat:${c.id}`),
]

export const SCENARIO = {
  revealInitial: ['shell'],
  toutRevele: TOUT_REVELE,

  chapters: [
    { id: 'journee', titre: 'Votre journée', sous: 'Le cockpit au réveil' },
    { id: 'prospect', titre: 'Un prospect', sous: 'ARK lit le dossier' },
    { id: 'relance', titre: 'Une relance', sous: 'Le message est prêt' },
    { id: 'dossier', titre: 'Un dossier', sous: 'Ce qui manque, et depuis quand' },
    { id: 'auto', titre: 'Ce qui est automatisé', sous: 'Ce qui se fait sans vous' },
    { id: 'essai', titre: 'À vous', sous: 'Essayer COURTIA' },
  ],

  steps: [
    /* ------------------------------------------------ CHAPITRE 1 · JOURNÉE */
    {
      id: 'S1', vue: 'dashboard', chapitre: 'journee',
      cible: 'kpi-clients', clic: false,
      titre: 'Voilà votre cabinet, ce matin',
      texte: 'Huit clients actifs, seize contrats suivis, et le portefeuille sous contrôle. Le cockpit ne demande rien à saisir : il lit ce qui existe.',
      revele: ['kpi:clients', 'kpi:contrats', 'kpi:primes', 'kpi:score'], cascade: 200, tenue: 1400,
    },
    {
      id: 'S2', vue: 'dashboard', chapitre: 'journee',
      cible: 'bouton-ark', clic: true,
      titre: 'Un seul bouton pour commencer la journée',
      texte: '« Lancer ma journée avec ARK ». Pas de menu, pas de filtre à régler.',
      revele: [], tenue: 800,
    },
    {
      id: 'S3', vue: 'brief', chapitre: 'journee',
      cible: 'brief-titre', clic: false, reflechit: 1200,
      titre: 'ARK a lu tout le cabinet',
      texte: 'Il a croisé les contrats, les échéances, les dossiers et le pipeline, puis a classé le travail par urgence réelle.',
      revele: K.briefCards, cascade: 320, tenue: 1600,
    },
    {
      id: 'S3b', vue: 'brief', chapitre: 'journee',
      cible: 'ark-question', clic: true,
      saisie: QUESTION_ARK,
      titre: 'Le courtier pose SA question',
      texte: 'Pas de tableau de bord à interpréter : il demande simplement ce qu’il veut savoir, dans ses mots.',
      revele: [], tenue: 900,
    },
    {
      id: 'S3c', vue: 'brief', chapitre: 'journee',
      cible: 'brief-ouvrir', clic: true, reflechit: 1100,
      titre: 'ARK répond avec les chiffres du cabinet',
      texte: 'Chaque dossier incomplet, la pièce exacte qui manque, et depuis combien de jours. Le nombre affiché est compté, pas écrit à l’avance.',
      revele: [], tenue: 2000,
    },
    {
      id: 'S4', vue: 'brief', chapitre: 'journee',
      cible: 'brief-actions', clic: true,
      titre: `${T.relances} relances, ${T.dossiersIncomplets} dossiers à compléter`,
      texte: 'Chaque ligne est ouvrable et mène directement au dossier concerné. Rien n’est décoratif : tout est actionnable.',
      revele: K.briefActions, cascade: 260, tenue: 1500,
    },

    /* ------------------------------------------------ CHAPITRE 2 · PROSPECT */
    {
      id: 'S5', vue: 'prospection', chapitre: 'prospect',
      cible: 'liste-prospects', clic: false,
      titre: 'Le pipeline, tel qu’il est',
      texte: 'Dix cabinets en cours. Le statut de chacun est explicite — contacté, intéressé, en négociation. Pas de « peut-être ».',
      revele: PROSPECTS.map((p) => `prospect:${p.id}`), cascade: 130, tenue: 1200,
    },
    {
      id: 'S6', vue: 'prospection', chapitre: 'prospect',
      cible: 'p-P-1006', clic: true,
      titre: 'Groupe Vernex, en négociation',
      texte: 'ARK affiche le score, l’historique et le potentiel. Le courtier sait en trois secondes où il en est.',
      revele: K.prospectScore, cascade: 280, tenue: 1400,
    },
    {
      id: 'S7', vue: 'prospection', chapitre: 'prospect',
      cible: 'prospect-ark', clic: true, reflechit: 1400,
      titre: 'ARK résume le dossier et propose la suite',
      texte: '« Devis Cabinet en cours, décision cette semaine. » ARK ne se contente pas de décrire : il dit quoi faire maintenant.',
      revele: K.prospectArk, cascade: 400, tenue: 1700,
    },

    /* ------------------------------------------------ CHAPITRE 3 · RELANCE */
    {
      id: 'S8', vue: 'relances', chapitre: 'relance',
      cible: 'liste-relances', clic: false,
      titre: 'Ce qui est en retard, et depuis quand',
      texte: 'Les relances dues sont en tête, avec l’ancienneté réelle. On ne relance plus au hasard.',
      revele: relancesDues().map((t) => `tache:${t.id}`), cascade: 150, tenue: 1200,
    },
    {
      id: 'S9', vue: 'relances', chapitre: 'relance',
      cible: 'bouton-rediger', clic: true,
      titre: 'Préparer la relance',
      texte: 'Un clic. ARK part du contexte du dossier — dernier contact, statut, relance précédente — pas d’un modèle générique.',
      revele: [], tenue: 900,
    },
    {
      id: 'S10', vue: 'relances', chapitre: 'relance',
      cible: 'relance-message', clic: false, saisie: RELANCE_MESSAGE,
      titre: 'Le message s’écrit sous vos yeux',
      texte: 'Trois phrases, le bon ton, la bonne demande — construites depuis le contexte réel du dossier. Vous relisez, vous ajustez, vous validez. Vous ne partez plus d’une page blanche.',
      revele: [], tenue: 1800,
    },
    {
      id: 'S11', vue: 'relances', chapitre: 'relance',
      cible: 'relance-regles', clic: false,
      titre: 'Et ARK respecte vos règles',
      texte: 'L’envoi reste sous votre contrôle : rien ne part sans votre validation.',
      revele: K.relanceRegles, cascade: 260, tenue: 1500,
    },

    /* ------------------------------------------------- CHAPITRE 4 · DOSSIER */
    {
      id: 'S12', vue: 'dossier', chapitre: 'dossier',
      cible: 'dossier-titre', clic: false,
      titre: 'Le dossier Batilog SA',
      texte: 'Deux pièces manquent : la liste du personnel 2026 et le décompte de salaires T2. Demandées il y a deux semaines.',
      revele: [], tenue: 1100,
    },
    {
      id: 'S13', vue: 'dossier', chapitre: 'dossier',
      cible: 'dossier-pieces', clic: false,
      titre: 'Ce qui est arrivé, ce qui manque',
      texte: 'Chaque pièce a son statut et son ancienneté. ARK calcule le retard, il ne se contente pas d’une case vide.',
      revele: K.dossierPieces, cascade: 240, tenue: 1400,
    },
    {
      id: 'S14', vue: 'dossier', chapitre: 'dossier',
      cible: 'dossier-manquants', clic: true,
      titre: 'Et il propose l’action',
      texte: 'Relancer M. le responsable, par courriel, avec la liste exacte des pièces à fournir. Le retard cesse d’être invisible.',
      revele: K.dossierManquants, cascade: 300, tenue: 1600,
    },

    /* --------------------------------------------------- CHAPITRE 5 · AUTO */
    {
      id: 'S15', vue: 'auto', chapitre: 'auto',
      cible: 'auto-flux', clic: false,
      titre: 'Ce que COURTIA fait sans vous',
      texte: 'La collecte, le contrôle, la relance, la consignation. Ce sont ces gestes-là que vous ne refaites plus.',
      revele: K.autoFlux, cascade: 320, tenue: 1600,
    },
    {
      id: 'S16', vue: 'auto', chapitre: 'auto',
      cible: 'auto-ark', clic: false,
      titre: 'Et ce qu’ARK surveille en continu',
      texte: 'Échéances proches, dossiers bloqués, opportunités non exploitées : ARK le signale avant que ça devienne un problème.',
      revele: K.autoArk, cascade: 300, tenue: 1600,
    },

    /* -------------------------------------------------- CHAPITRE 6 · ESSAI */
    {
      id: 'S17', vue: 'essai', chapitre: 'essai',
      cible: 'cta-final', clic: false,
      titre: 'Voilà ce que COURTIA ferait dans votre cabinet',
      texte: 'Avec vos clients, vos contrats, vos échéances. Le même cockpit, avec vos données.',
      revele: K.cta, cascade: 300, tenue: 2600,
    },
  ],
}

export const dureeTotale = SCENARIO.steps.reduce((s, e) => s + (e.tenue || 1200) + 900, 0)
export default SCENARIO
