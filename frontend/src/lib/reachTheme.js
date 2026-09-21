/* ============================================================================
   REACH — jetons de thème des écrans REACH (UX-038)
   ----------------------------------------------------------------------------
   POURQUOI ce module : les écrans REACH (pages/Reach*.jsx) avaient été écrits
   avec la palette CLAIRE de Tailwind (`bg-white`, `text-gray-900`) dans une
   application sombre. Ils ne tenaient leur lisibilité que d'un correctif CSS
   global (index.css, sélecteur `.flex-1.ml-0.md\:ml-\[240px\]`) : tout ce qui
   échappait à ce sélecteur restait clair ou devenait illisible — pastilles de
   statut (bg-*-50/text-*-700), survols (hover:bg-gray-50), et l'encre des
   libellés du plan (fill="#374151" sur fond sombre).

   RÈGLE : les écrans REACH déclarent maintenant explicitement les jetons du
   design system COURTIA (styles/design-system.css : --bg-card, --bg-elevated,
   --text-primary/secondary/tertiary, --r-*) au lieu d'emprunter la palette
   claire. Aucune palette nouvelle : ce sont les jetons déjà chargés dans
   l'application (main.jsx → styles/design-system.css).

   Les teintes sémantiques ci-dessous reprennent les valeurs EXACTES des jetons
   --accent-* du même fichier ; elles sont recopiées ici uniquement parce que
   composer un fond translucide (teinte + opacité) est impossible avec
   `var(--accent-x)` suivi d'un canal alpha.
   ========================================================================== */

/** Teintes sémantiques = valeurs des jetons --accent-* de design-system.css. */
export const TEINTE = {
  violet: '#8B5CF6',
  cyan: '#22D3EE',
  vert: '#10b981',
  ambre: '#f59e0b',
  rouge: '#ef4444',
  rose: '#ec4899',
  neutre: '#94a3b8',
}

/** Pastille (statut, score, sentiment) : fond teinté + texte lisible. */
export const pastille = (teinte = TEINTE.neutre) => ({
  background: `${teinte}1f`,
  color: teinte,
  border: `1px solid ${teinte}33`,
})

/** Jetons neutres réutilisés par tous les écrans REACH. */
export const REACH = {
  /** Surface de carte : même valeur que `--bg-card`. */
  carte: {
    background: 'var(--bg-card)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
  },
  /** Surface plus claire (fond de champ, survol actif). */
  carteElevee: {
    background: 'var(--bg-elevated)',
  },
  titre: { color: 'var(--text-primary)' },
  libelle: { color: 'var(--text-secondary)' },
  discret: { color: 'var(--text-tertiary)' },
  champ: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
  },
  boutonPrincipal: { background: 'var(--accent-violet)', color: '#FFFFFF' },
  boutonSecondaire: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
  },
  /** Encart ARK (recommandation) : violet du design system, version translucide. */
  encartARK: {
    background: 'rgba(139, 92, 246, 0.10)',
    border: '1px solid rgba(139, 92, 246, 0.22)',
  },
  separateur: '1px solid rgba(255, 255, 255, 0.08)',
  /** Encre des tracés SVG (les attributs de présentation SVG n'acceptent pas var()). */
  svgPrincipal: '#F8FAFC',
  svgSecondaire: 'rgba(248, 250, 252, 0.62)',
  svgGrille: 'rgba(255, 255, 255, 0.08)',
}

/** Rayons du design system (--r-*), avec repli sur les valeurs d'origine. */
export const RAYON = {
  md: 'var(--r-md, 12px)',
  lg: 'var(--r-lg, 16px)',
  full: 'var(--r-full, 9999px)',
}
