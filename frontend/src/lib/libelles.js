/* ============================================================================
   COURTIARK — Source UNIQUE des libellés de navigation (UX-024 / UX-025 / UX-037)
   ----------------------------------------------------------------------------
   POURQUOI ce module : le même écran portait plusieurs noms en production, dans
   la même session, pour le même courtier :
     - /dashboard    : « Cockpit » (barre latérale, titre d'onglet, titre de
                        l'écran) ET « Tableau de bord » (palette Cmd+K) ;
     - /morning-brief: « Morning Brief » (barre latérale, palette) alors que le
                        produit écrit déjà « Brief du matin » ailleurs (page
                        publique, notifications, produits dérivés) ;
     - /analytics    : « Analytics » (barre latérale) ET « Analyses » (palette) ;
     - /taches       : « Tâches » (menu, écran) ET « Priorités ARK » (widget du
                        cockpit, raccourci mobile) pour la même liste de choses
                        à faire.
   RÈGLE : une notion = UN mot, en français, partout où le courtier la lit :
   barre latérale, palette de commandes, titre d'onglet, titre d'écran.
   Aucun écran ne réécrit ces libellés en dur : il importe LIBELLES.
   Ce module ne contient AUCUNE donnée métier, seulement des libellés.
   ========================================================================== */

/** Les libellés eux-mêmes. Un mot par notion, et rien d'autre. */
export const LIBELLES = {
  /** Écran /dashboard — ancien nom « Cockpit ». */
  tableauDeBord: 'Tableau de bord',
  /** Écran /morning-brief — ancien nom « Morning Brief ». */
  briefDuMatin: 'Brief du matin',
  /** Écran /analytics — ancien nom « Analytics ». */
  analyses: 'Analyses',
  /** Écran /taches — ancien nom « Priorités ARK » dans le cockpit. */
  taches: 'Tâches',
}

/** Libellé du widget du cockpit qui liste les tâches du jour. */
export const TITRE_TACHES_DU_JOUR = `${LIBELLES.taches} prioritaires aujourd'hui`

/**
 * Titre d'onglet/liaison par route. Toute route absente de cette table garde le
 * titre de l'écran par défaut (le tableau de bord).
 */
export const TITRES_PAR_ROUTE = {
  '/dashboard': LIBELLES.tableauDeBord,
  '/morning-brief': LIBELLES.briefDuMatin,
  '/analytics': LIBELLES.analyses,
  '/analyses': LIBELLES.analyses,
  '/taches': LIBELLES.taches,
}

/* ----------------------------------------------------------------------------
   LANGUE DE L'INTERFACE (UX-031 / UX-044) — pourquoi il n'y a plus de
   sélecteur de langue.
   L'application est servie en français : les locales livrées (fr/en/es) ne
   portent aucune traduction d'écran et l'interface proposait pourtant
   « Allemand » / « Italien » (aucune locale de/it n'existe, cf. CH-023).
   Le composant `components/LanguageSwitcher.jsx` n'était monté par AUCUN écran
   et son amorçage (`src/i18n.js`) importait `i18next` / `react-i18next`,
   absents de package.json : il ne pouvait donc pas fonctionner.
   Décision (la plus simple et la plus honnête) : retirer le composant mort et
   son amorçage plutôt que de monter un contrôle qui promet ce qu'il ne fait
   pas. Le jour où une traduction réelle existera, le sélecteur sera recréé sur
   les locales réellement chargées.
   ---------------------------------------------------------------------------- */
