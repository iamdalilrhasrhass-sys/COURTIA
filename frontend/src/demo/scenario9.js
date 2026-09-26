/* ============================================================================
   COURTIARK — Démonstration : scénario de la visite guidée (9 chapitres)
   ----------------------------------------------------------------------------
   UNE JOURNÉE AVEC COURTIARK. 9 chapitres cliquables, 25 étapes.
   Durée théorique : dureeTheorique() (somme des `tenue` + 1 900 ms de
   déplacement par étape) — mesurée à 136 s, en dessous de la cible de
   2 min 30 : l'ancien en-tête annonçait « 23 étapes, cible 2 min 30 », deux
   chiffres qui n'étaient plus vrais.

   ARK est le FIL ROUGE : présent dans le cockpit, l'acquisition, la conversion,
   le suivi et le pilotage — pas seulement sur une page.

   Règle : jamais plus de ~5 s sans changement visuel ou information nouvelle.
   On augmente la densité, jamais la durée par ralentissement artificiel.

   `route`   : la vraie route COURTIARK
   `cible`   : élément réel — { texte } (résolu dans le DOM) ou { sel } (CSS)
   `clic`    : le curseur clique réellement, l'écran réagit
   `compact` : overlay réduit (fin de parcours — COURTIARK reste visible)
   `tenue`   : temps de pose après l'action (ms)
   ========================================================================== */
/* ─── Devise de la démonstration (P1 CH-020) ────────────────────────────
   Les montants de la narration ne sont plus écrits en euros : ils suivent le
   MARCHÉ DU VISITEUR (deviseDemo.js). Un visiteur français lit « 39 810 € »
   exactement comme avant ; un visiteur suisse lit « 39 810 CHF ». Aucun montant
   n'est converti : seule la devise affichée change.
   ────────────────────────────────────────────────────────────────────── */
import { montantDemo } from './deviseDemo'

/** Montant de la narration, dans la devise du marché du visiteur. */
const m = (valeur) => montantDemo(valeur, undefined, { maximumFractionDigits: 0 })

export const CHAPITRES = [
  { id: 'journee',     titre: 'Ma journée',  sous: 'Cockpit et Morning Brief' },
  { id: 'ark',         titre: 'ARK',         sous: 'L’IA qui anticipe' },
  { id: 'acquerir',    titre: 'Acquérir',    sous: 'Prospection et opportunités' },
  { id: 'convertir',   titre: 'Convertir',   sous: 'Prospect, devis, rendez-vous' },
  { id: 'gerer',       titre: 'Gérer',       sous: 'Client, dossier, documents' },
  { id: 'suivre',      titre: 'Suivre',      sous: 'Contrats, tâches, relances' },
  { id: 'automatiser', titre: 'Automatiser', sous: 'Ce qui se fait sans vous' },
  { id: 'piloter',     titre: 'Piloter',     sous: 'Objectifs et commissions' },
  { id: 'explorer',    titre: 'Explorer',    sous: 'Vous prenez la main' },
]

export const ETAPES = [
  /* --- MA JOURNÉE --- */
  {
    route: '/demo/dashboard', chapitre: 'journee',
    cible: { texte: 'CLIENTS ACTIFS' },
    titre: 'Votre cabinet, ce matin',
    texte: `Huit clients, quinze contrats, ${m(39810)} de primes gérées. COURTIARK lit ce qui existe déjà — vous ne saisissez rien.`,
    tenue: 3200,
  },
  {
    route: '/demo/dashboard', chapitre: 'journee',
    cible: { texte: 'SCORE SANTÉ' },
    titre: 'La santé du portefeuille, en un score',
    texte: 'Recalculé sur tous vos dossiers. S’il se dégrade, ARK vous le signale avant vos clients.',
    tenue: 3000,
  },
  {
    route: '/demo/morning-brief', chapitre: 'journee',
    cible: { sel: 'main' },
    titre: 'ARK vous prépare la journée',
    texte: 'Le Morning Brief classe vos urgences : échéances, devis à relancer, clients silencieux. Vous commencez la journée en sachant où frapper.',
    tenue: 3400,
  },

  /* --- ARK --- */
  {
    route: '/demo/ark-intelligence', chapitre: 'ark',
    cible: { texte: 'Churn Predictor' },
    titre: 'ARK voit partir vos clients avant vous',
    texte: 'Quatre clients signalés à risque, avec le motif, le score et le plan de rétention. ARK ne constate pas, il anticipe.',
    tenue: 3200,
  },
  {
    route: '/demo/ark-intelligence', chapitre: 'ark',
    cible: { texte: 'Cross-Sell Engine' },
    titre: 'Les couvertures oubliées, chiffrées',
    texte: 'Pour chaque client, les produits absents de son dossier et le revenu correspondant. Vous savez où chercher avant d’appeler.',
    tenue: 3000,
  },
  {
    route: '/demo/ark-intelligence', chapitre: 'ark',
    cible: { texte: 'Renewal Optimizer' },
    titre: 'Les renouvellements préparés d’avance',
    texte: 'Contrats à échéance sous 90 jours, prime actuelle, économie possible. ARK prépare le rendez-vous à votre place.',
    tenue: 3000,
  },

  {
    route: '/demo/dashboard', chapitre: 'ark',
    cible: { sel: 'button[aria-label="Ouvrir ARK"]' }, clic: true,
    arkQuestion: 'Fais-moi le point sur ma journée et dis-moi ce qui nécessite mon attention.',
    titre: 'Posez la question à ARK',
    texte: 'ARK lit vos huit clients, vos quinze contrats et vos échéances — puis répond : urgences, pièces manquantes, prospects à relancer, devis sans réponse.',
    tenue: 9600,
  },

  /* --- ACQUÉRIR --- */
  {
    route: '/demo/prospection', chapitre: 'acquerir',
    cible: { sel: 'main' },
    titre: 'Votre pipeline d’acquisition',
    texte: 'Combien de prospects, quel potentiel, combien de rendez-vous planifiés, quel taux de conversion. La prospection n’est plus un carnet.',
    tenue: 3200,
  },
  {
    route: '/demo/prospection', chapitre: 'acquerir',
    cible: { texte: 'POTENTIEL' },
    titre: 'Qui contacter, et pourquoi',
    texte: 'Chaque prospect a son statut, sa source et sa prochaine action. COURTIARK vous dit qui relancer en premier.',
    tenue: 3000,
  },
  {
    route: '/demo/opportunites', chapitre: 'acquerir',
    cible: { sel: 'main' },
    titre: 'Les opportunités, suivies jusqu’au contrat',
    texte: 'Prospect, rendez-vous, devis, signé : chaque affaire avance dans une colonne. Rien ne reste en suspens.',
    tenue: 3200,
  },

  /* --- CONVERTIR --- */
  {
    route: '/demo/devis', chapitre: 'convertir',
    cible: { sel: 'main' },
    titre: 'Vos devis, leur statut, leur montant',
    texte: 'Envoyé, signé, en attente : COURTIARK suit chaque devis et son ancienneté. Un devis sans réponse remonte tout seul.',
    tenue: 3200,
  },
  {
    route: '/demo/opportunites', chapitre: 'convertir',
    cible: { texte: 'Signé' },
    titre: 'Du prospect au client signé',
    texte: 'C’est ce cycle complet que COURTIARK tient : un prospect entre, un contrat signé sort. Sans ressaisie entre les étapes.',
    tenue: 3200,
  },

  /* --- GÉRER --- */
  {
    route: '/demo/clients', chapitre: 'gerer',
    cible: { texte: 'PRIME ANNUELLE' },
    titre: 'Tout le portefeuille sur une ligne',
    texte: 'Par client : contrats, prime annuelle, score de risque, dernier contact. La colonne ARK signale ceux qui demandent une action.',
    tenue: 3000,
  },
  {
    route: '/demo/clients/2003', chapitre: 'gerer',
    cible: { texte: 'ARK INSIGHT' },
    titre: 'Un dossier client, en entier',
    texte: `Batilog SA : deux contrats, ${m(16700)} de primes suivies, ses échéances, son historique. Et la prochaine action proposée par ARK.`,
    tenue: 3400,
  },
  {
    route: '/demo/documents', chapitre: 'gerer',
    cible: { sel: 'main' },
    titre: 'Les pièces reçues, et celles qui manquent',
    texte: 'Chaque document a son statut : validé, à vérifier, manquant, expiré. Un dossier incomplet se voit immédiatement.',
    tenue: 3200,
  },

  /* --- SUIVRE --- */
  {
    route: '/demo/contrats', chapitre: 'suivre',
    cible: { sel: 'main' },
    titre: 'Vos contrats et leurs échéances',
    texte: 'Compagnie, prime, date d’échéance, statut. Les renouvellements à venir sont déjà dans votre écran.',
    tenue: 3200,
  },
  {
    route: '/demo/taches', chapitre: 'suivre',
    cible: { sel: 'main' },
    titre: 'Ce qu’il reste à faire',
    texte: 'En retard, aujourd’hui, cette semaine : COURTIARK trie vos tâches et signale celles qu’ARK a générées lui-même.',
    tenue: 3200,
  },
  {
    route: '/demo/relances', chapitre: 'suivre',
    cible: { texte: 'URGENTES' },
    titre: 'Qui relancer, maintenant',
    texte: `Sept relances en attente, quatre urgentes, ${m(8400)} de potentiel. Le message est préparé depuis le dossier réel.`,
    tenue: 3000,
  },
  {
    route: '/demo/relances', chapitre: 'suivre',
    cible: { texte: 'TAUX DE RÉPONSE' },
    titre: 'Et vous mesurez ce que ça donne',
    texte: 'Taux de réponse en direct. Vous ajustez sur des faits, pas au ressenti.',
    tenue: 3000,
  },

  /* --- AUTOMATISER --- */
  {
    route: '/demo/dashboard', chapitre: 'automatiser',
    cible: { texte: 'Échéances 30 jours' },
    titre: 'Pendant que vous travaillez, COURTIARK surveille',
    texte: 'Échéances, dossiers bloqués, clients silencieux : les règles tournent seules et remontent ce qui compte.',
    tenue: 3400,
  },
  {
    route: '/demo/clients/2003', chapitre: 'automatiser',
    cible: { texte: 'Documents' },
    titre: 'Une pièce manquante déclenche la relance',
    texte: 'COURTIARK sait depuis quand la pièce est attendue et prépare la demande. Du temps que vous ne passez plus à courir après l’information.',
    tenue: 3200,
  },

  /* --- PILOTER --- */
  {
    route: '/demo/objectifs', chapitre: 'piloter',
    cible: { texte: 'CA Annuel' },
    titre: 'Vos objectifs, suivis en direct',
    texte: '88 % du CA annuel atteint, deux nouveaux clients sur quatre, sept contrats sur huit. Le compte est tenu à votre place.',
    tenue: 3200,
  },
  {
    route: '/demo/commissions', chapitre: 'piloter',
    cible: { texte: 'ATTENDU' },
    titre: 'Et l’argent qui rentre vraiment',
    texte: `${m(4777)} de commissions attendues, ${m(2240)} encaissées, ce qui reste à suivre — par compagnie et par apporteur.`,
    tenue: 3200,
  },

  {
    route: '/demo/sante-portefeuille', chapitre: 'piloter',
    cible: { texte: 'SUR 100' },
    titre: 'Et la santé de tout le portefeuille',
    texte: 'Un score unique, alimenté par vos vrais dossiers : 78/100, rétention, churn, échéances à venir. Le même chiffre que sur le cockpit — une seule vérité.',
    tenue: 6000,
  },

  /* --- EXPLORER --- */
  {
    route: '/demo/dashboard', chapitre: 'explorer',
    cible: { sel: 'main' }, compact: true,
    titre: 'À vous de jouer',
    texte: 'Naviguez dans tous les modules. La suite : un essai sur votre portefeuille.',
    tenue: 3600,
  },
]

/** Durée théorique (secondes), déplacements inclus. */
export const dureeTheorique = () =>
  Math.round(ETAPES.reduce((s, e) => s + (e.tenue || 3000) + 1900, 0) / 1000)
