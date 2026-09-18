/* ============================================================================
   COURTIA — Démonstration : scénario de la visite guidée
   ----------------------------------------------------------------------------
   UNE JOURNÉE AVEC COURTIA. 8 chapitres cliquables, 16 étapes.

   Règle de conception : chaque étape doit apporter une information NOUVELLE,
   et jamais plus de ~5 s sans changement visuel. On augmente la densité, pas
   la durée.

   `route`   : la vraie route COURTIA à ouvrir
   `cible`   : élément RÉEL à désigner — par texte visible ou sélecteur CSS
   `clic`    : le curseur clique réellement (l'interface réagit)
   `saisie`  : texte frappé caractère par caractère dans la cible
   `tenue`   : temps de pose après l'action (ms)

   Seules les fonctions RÉELLEMENT branchées sur une couche de données sont
   utilisées ici. Les écrans sans source de données (Contrats, Devis, Tâches,
   Documents, Opportunités, Prospection, Rapports, Partenaires) sont exclus du
   parcours automatique et documentés comme tels.
   ========================================================================== */

export const CHAPITRES = [
  { id: 'cabinet',   titre: 'Mon cabinet',      sous: 'Le cockpit au réveil' },
  { id: 'ark',       titre: 'ARK',              sous: 'L’IA qui anticipe' },
  { id: 'clients',   titre: 'Mes clients',      sous: 'Tout le portefeuille' },
  { id: 'dossier',   titre: 'Un dossier',       sous: 'Le client en entier' },
  { id: 'relances',  titre: 'Les relances',     sous: 'Qui joindre, et pourquoi' },
  { id: 'pilotage',  titre: 'Pilotage',        sous: 'Objectifs et commissions' },
  { id: 'explorer',  titre: 'Explorer',         sous: 'Vous prenez la main' },
]

export const ETAPES = [
  /* --- MON CABINET --- */
  {
    route: '/demo/dashboard', chapitre: 'cabinet',
    cible: { sel: 'main' },
    titre: 'Votre cabinet, ce matin',
    texte: 'Huit clients suivis, quinze contrats, 39 810 € de primes gérées. COURTIA lit ce qui existe déjà dans votre portefeuille — vous ne saisissez rien.',
    tenue: 4100,
  },
  {
    route: '/demo/dashboard', chapitre: 'cabinet',
    cible: { texte: 'CONTRATS ACTIFS' },
    titre: 'Les chiffres qui comptent',
    texte: 'Clients actifs, contrats, primes annuelles, score de santé du portefeuille. Le pouls du cabinet, en quatre chiffres.',
    tenue: 3500,
  },
  {
    route: '/demo/ark-intelligence', chapitre: 'ark',
    cible: { texte: 'Churn Predictor' },
    titre: 'ARK voit partir vos clients avant vous',
    texte: 'Quatre clients signalés à risque, avec le motif, le score et le plan de rétention. ARK ne constate pas, il anticipe.',
    tenue: 4300,
  },
  {
    route: '/demo/ark-intelligence', chapitre: 'ark',
    cible: { texte: 'Cross-Sell Engine' },
    titre: 'Et les couvertures oubliées, chiffrées',
    texte: 'Pour chaque client, les produits absents de son dossier et le revenu correspondant. Vous savez où chercher avant de décrocher le téléphone.',
    tenue: 4100,
  },
  {
    route: '/demo/ark-intelligence', chapitre: 'ark',
    cible: { texte: 'Renewal Optimizer' },
    titre: 'Les renouvellements, optimisés',
    texte: 'Contrats à échéance sous 90 jours, prime actuelle, économie possible. ARK prépare le rendez-vous à votre place.',
    tenue: 4100,
  },

  {
    route: '/demo/dashboard', chapitre: 'ark',
    cible: { texte: 'SCORE SANTÉ' },
    titre: 'ARK note la santé de votre portefeuille',
    texte: 'Un score unique, recalculé sur tous vos dossiers. S’il se dégrade, ARK vous le signale avant vos clients.',
    tenue: 3900,
  },
  /* --- CLIENTS --- */
  {
    route: '/demo/clients', chapitre: 'clients',
    cible: { texte: 'PRIME ANNUELLE' },
    titre: 'Tout votre portefeuille sur une ligne',
    texte: 'Par client : contrats, prime annuelle, score de risque, dernier contact. La colonne ARK signale ceux qui demandent une action.',
    tenue: 4100,
  },
  {
    route: '/demo/clients', chapitre: 'clients',
    cible: { texte: 'À risque' }, clic: true,
    titre: 'Vos clients fragiles, isolés en un clic',
    texte: 'Un filtre suffit : COURTIA vous sort les dossiers qui décrochent. C’est là que se joue la fidélisation.',
    tenue: 3500,
  },

  {
    route: '/demo/clients', chapitre: 'clients',
    cible: { texte: 'SCORE MOYEN' },
    titre: 'Votre portefeuille en moyenne',
    texte: 'Score moyen, clients actifs, inactifs : trois chiffres pour savoir où vous en êtes, sans ouvrir un tableur.',
    tenue: 3900,
  },
  /* --- DOSSIER --- */
  {
    route: '/demo/clients/2003', chapitre: 'dossier',
    cible: { texte: 'ARK INSIGHT' },
    titre: 'Un dossier client, en entier',
    texte: 'Batilog SA : deux contrats, 16 700 € de primes suivies, ses échéances, son historique. ARK résume le dossier et propose la prochaine action.',
    tenue: 4600,
  },
  {
    route: '/demo/clients/2003', chapitre: 'dossier',
    cible: { texte: 'Contrats' },
    titre: 'Ses contrats, sans changer d’outil',
    texte: 'Chaque contrat avec sa compagnie, sa prime et sa date d’échéance. Plus besoin d’ouvrir quatre logiciels pour répondre à une question simple.',
    tenue: 3800,
  },

  {
    route: '/demo/clients/2003', chapitre: 'dossier',
    cible: { texte: 'Vue 360°' },
    titre: 'Toute la relation, au même endroit',
    texte: 'Identité, contrats, documents, historique d’échanges : vous ne courez plus après l’information dans cinq logiciels.',
    tenue: 4100,
  },
  /* --- RELANCES --- */
  {
    route: '/demo/relances', chapitre: 'relances',
    cible: { texte: 'URGENTES' },
    titre: 'Qui relancer, aujourd’hui',
    texte: 'Sept relances en attente, quatre urgentes, 8 400 € de potentiel. COURTIA les classe à votre place, par ancienneté réelle.',
    tenue: 4100,
  },
  {
    route: '/demo/relances', chapitre: 'relances',
    cible: { texte: 'POTENTIEL' },
    titre: 'Chaque relance a une valeur',
    texte: 'Le message est préparé depuis le dossier du client, pas depuis un modèle générique. Vous relisez, vous ajustez, vous validez.',
    tenue: 4100,
  },

  {
    route: '/demo/relances', chapitre: 'relances',
    cible: { texte: 'EN ATTENTE' },
    titre: 'Sept relances vous attendent',
    texte: 'COURTIA suit chaque relance, son canal et son ancienneté. Aucune ne se perd dans un carnet.',
    tenue: 3900,
  },
  {
    route: '/demo/relances', chapitre: 'relances',
    cible: { texte: 'TAUX DE RÉPONSE' },
    titre: 'Et vous mesurez ce que ça donne',
    texte: 'Taux de réponse de vos relances, en direct. Vous ajustez sur des faits, pas au ressenti.',
    tenue: 4100,
  },
  {
    route: '/demo/objectifs', chapitre: 'pilotage',
    cible: { texte: 'CA Annuel' },
    titre: 'Vos objectifs, suivis en direct',
    texte: '88 % du CA annuel atteint, deux nouveaux clients sur quatre, sept contrats sur huit. COURTIA tient le compte à votre place.',
    tenue: 3400,
  },
  {
    route: '/demo/commissions', chapitre: 'pilotage',
    cible: { texte: 'ATTENDU' },
    titre: 'Et l’argent qui rentre vraiment',
    texte: '4 777 € de commissions attendues, 2 240 € encaissées, ce qui reste à suivre — par compagnie et par apporteur.',
    tenue: 3400,
  },
  /* --- EXPLORER --- */
  {
    route: '/demo/dashboard', chapitre: 'explorer',
    cible: { texte: 'COURTIA' },
    titre: 'À vous de jouer',
    texte: 'Vous prenez la main : naviguez librement dans tous les modules du cockpit. La suite, c’est un essai encadré sur votre portefeuille.',
    tenue: 4900,
  },
]

/** Durée théorique du parcours, en secondes (déplacements inclus). */
export const dureeTheorique = () =>
  (ETAPES.reduce((s, e) => s + (e.tenue || 2800) + 1900, 0) / 1000).toFixed(0)
