/* ============================================================================
   libelles.test.js — garde-fou des défauts d'INTERFACE de la matrice d'audit.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : six constats de la matrice d'audit COURTIA (UX-023,
   UX-024/025/037, UX-026, UX-031/044, UX-032, UX-038) étaient en échec parce
   que l'écran et le code divergeaient :
     - le même écran portait plusieurs noms (menu / palette / titre) ;
     - /reach/search était pré-rempli sur une ville française, quel que soit le
       marché du cabinet ;
     - ReachMap et Academy n'avaient AUCUN état vide ;
     - les écrans REACH empruntaient la palette CLAIRE de Tailwind dans une
       application sombre ;
     - le sélecteur de langue existait sans être monté et proposait des langues
       qui n'existent pas.
   Ce fichier verrouille les règles sur la SOURCE réelle. Il ne remplace pas la
   recette navigateur : il empêche la régression au moment où elle serait commise.
   ========================================================================== */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LIBELLES, TITRES_PAR_ROUTE, TITRE_TACHES_DU_JOUR } from './libelles'
import { LIBELLES_MARCHE, libellesMarche } from './marche'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (chemin) => readFileSync(resolve(RACINE_SRC, chemin), 'utf8')
const existe = (chemin) => existsSync(resolve(RACINE_SRC, chemin))

const SIDEBAR = 'components/Sidebar.jsx'
const PALETTE = 'components/ui/CommandPalette.jsx'
const APP = 'App.jsx'
const ANALYTICS = 'pages/AnalyticsExecutive.jsx'
const REACH_SEARCH = 'pages/ReachSearch.jsx'
const REACH_MAP = 'pages/ReachMap.jsx'
const ACADEMY = 'pages/Academy.jsx'

const ECRANS_REACH = [
  'pages/ReachSearch.jsx',
  'pages/ReachMap.jsx',
  'pages/ReachProspects.jsx',
  'pages/ReachProspectDetail.jsx',
  'pages/ReachInbox.jsx',
  'pages/ReachCampaigns.jsx',
  'pages/ReachDashboard.jsx',
  'pages/ReachSettings.jsx',
]

// Palette CLAIRE de Tailwind : interdite dans les écrans REACH (UX-038).
const PALETTE_CLAIRE = /\bbg-white\b|\btext-gray-\d|\bborder-gray-\d|\bbg-gray-\d|\btext-black\b|hover:bg-gray-\d|bg-\[#0a0a0a\]/

describe('1. Une notion = un seul mot, en français (UX-024 / UX-025 / UX-037)', () => {
  it('la source unique porte un mot français par notion', () => {
    expect(LIBELLES.tableauDeBord).toBe('Tableau de bord')
    expect(LIBELLES.briefDuMatin).toBe('Brief du matin')
    expect(LIBELLES.analyses).toBe('Analyses')
    expect(LIBELLES.taches).toBe('Tâches')
    // Aucun anglicisme de navigation ne subsiste dans la source unique.
    for (const valeur of Object.values(LIBELLES)) {
      expect(valeur).not.toMatch(/Cockpit|Morning Brief|Analytics/)
    }
    expect(TITRE_TACHES_DU_JOUR).toContain(LIBELLES.taches)
  })

  it('le titre d’onglet d’une route est le même mot que celui du menu', () => {
    expect(TITRES_PAR_ROUTE['/dashboard']).toBe(LIBELLES.tableauDeBord)
    expect(TITRES_PAR_ROUTE['/morning-brief']).toBe(LIBELLES.briefDuMatin)
    expect(TITRES_PAR_ROUTE['/analytics']).toBe(LIBELLES.analyses)
    expect(TITRES_PAR_ROUTE['/taches']).toBe(LIBELLES.taches)
  })

  it('la barre latérale et la palette consomment la même source', () => {
    const sidebar = lire(SIDEBAR)
    expect(sidebar).toContain("from '../lib/libelles'")
    expect(sidebar).toContain('LIBELLES.tableauDeBord')
    expect(sidebar).toContain('LIBELLES.briefDuMatin')
    expect(sidebar).toContain('LIBELLES.analyses')
    expect(sidebar).toContain('LIBELLES.taches')
    // Plus un seul nom d'écran réécrit en dur (ni anglicisme, ni doublon).
    expect(sidebar).not.toContain("'Cockpit'")
    expect(sidebar).not.toMatch(/label:\s*'Morning Brief'/)
    expect(sidebar).not.toMatch(/label:\s*'Analytics'/)

    const palette = lire(PALETTE)
    expect(palette).toContain("from '../../lib/libelles'")
    expect(palette).toContain('LIBELLES.tableauDeBord')
    expect(palette).not.toMatch(/label:\s*'Morning Brief'/)
    expect(palette).not.toMatch(/label:\s*'Cockpit'/)
  })

  it('le titre de l’écran et de l’onglet vient de la même source', () => {
    const app = lire(APP)
    expect(app).toContain("from './lib/libelles'")
    expect(app).toContain('LIBELLES.tableauDeBord')
    expect(app).toContain('LIBELLES.briefDuMatin')
    // Le repli du titre d'onglet n'est plus le mot « Cockpit » en dur.
    expect(app).not.toContain(": 'Cockpit'")
    // Le cockpit ne nomme plus son écran « Cockpit » dans son titre.
    expect(lire('pages/Dashboard.jsx')).toContain('LIBELLES.tableauDeBord')
    expect(lire('pages/Taches.jsx')).toContain('LIBELLES.taches')
    expect(lire('pages/MorningBrief.jsx')).toContain('LIBELLES.briefDuMatin')
    // La navigation mobile suit la même règle : /taches ne s'y nomme plus
    // « Actions » et /dashboard n'y est plus « Cockpit ».
    expect(lire('components/aurora/AuroraBottomNav.jsx')).toContain('LIBELLES.taches')
    expect(lire('components/aurora/AuroraBottomNav.jsx')).toContain('LIBELLES.tableauDeBord')
  })

  it('la notion « tâches » ne porte plus deux noms dans le cockpit', () => {
    const dashboard = lire('pages/Dashboard.jsx')
    expect(dashboard).toContain('TITRE_TACHES_DU_JOUR')
    expect(dashboard).not.toContain("Priorités ARK aujourd'hui")
  })
})

describe('2. REACH ne pré-remplit plus une ville française (UX-026)', () => {
  it('l’écran de recherche ne pose aucune ville par défaut', () => {
    const source = lire(REACH_SEARCH)
    expect(source).not.toContain("useState('Sens')")
    expect(source).not.toContain('Sens')
    expect(source).toContain("useState('')")
    // L'exemple et le libellé du champ viennent du marché du cabinet.
    expect(source).toContain('marcheCourante')
    expect(source).toContain('villesExemple')
  })

  it('l’exemple de villes dépend du marché, et il est le seul endroit où il est écrit', () => {
    expect(LIBELLES_MARCHE.CH.villesExemple).toContain('Genève')
    expect(LIBELLES_MARCHE.FR.villesExemple).toContain('Paris')
    expect(libellesMarche('CH').villesExemple).toBe(LIBELLES_MARCHE.CH.villesExemple)
    expect(libellesMarche('FR').villesExemple).toBe(LIBELLES_MARCHE.FR.villesExemple)
    // Un marché inconnu retombe sur la France : comportement historique.
    expect(libellesMarche(undefined).villesExemple).toBe(LIBELLES_MARCHE.FR.villesExemple)
    // Aucun écran REACH ne pré-remplit ni n'exemple une ville en dur : le seul
    // endroit où un nom de ville est écrit est la table du marché ci-dessus.
    // (ReachMap garde une table de COORDONNÉES réelles utilisée pour placer une
    // ville connue sur le plan ; une ville absente est placée en grille, sans
    // coordonnée inventée.)
    for (const ecran of ECRANS_REACH) {
      const source = lire(ecran)
      expect(source, `${ecran} ne doit pas pré-remplir une ville`)
        .not.toMatch(/useState\(\s*['"](Sens|Paris|Lyon|Marseille|Melun|Montereau|Boulogne)['"]/)
      expect(source, `${ecran} ne doit pas citer de ville en exemple`)
        .not.toMatch(/placeholder=\s*['"][^'"]*(Paris|Sens)/)
    }
  })
})

describe('3. Pages sans état vide (UX-032)', () => {
  it('ReachMap dit ce qui manque et propose l’action utile', () => {
    const source = lire(REACH_MAP)
    expect(source).toContain('prospects.length === 0')
    expect(source).toContain('/reach/search')
    expect(source).toContain('Aucun prospect à situer')
  })

  it('Academy dit ce qui manque sur ses trois onglets de données', () => {
    const source = lire(ACADEMY)
    expect(source).toContain('!progress')
    expect(source).toContain('sortedCards.length === 0')
    expect(source).toContain('courses.length === 0')
    expect(source).toContain('Aucune progression enregistrée')
  })
})

describe('4. Rupture de thème des écrans REACH (UX-038)', () => {
  it('aucun écran REACH n’emprunte la palette claire de Tailwind', () => {
    for (const ecran of ECRANS_REACH) {
      const source = lire(ecran)
      expect(PALETTE_CLAIRE.test(source), `${ecran} contient encore une classe claire`).toBe(false)
    }
  })

  it('les écrans REACH déclarent les jetons du design system', () => {
    expect(existe('lib/reachTheme.js')).toBe(true)
    const theme = lire('lib/reachTheme.js')
    expect(theme).toContain('--bg-card')
    expect(theme).toContain('--text-primary')
    for (const ecran of ECRANS_REACH) {
      expect(lire(ecran)).toContain('reachTheme')
    }
  })
})

describe('5. Aucun titre illisible par couleur quasi noire codée en dur (UX-023)', () => {
  it('/analytics n’écrit plus de couleur quasi noire', () => {
    const source = lire(ANALYTICS)
    expect(source).not.toContain('#0a0a0a')
    expect(source).not.toContain('rgba(0,0,0')
    // Les titres de cartes reprennent le jeton de texte du thème.
    expect(source).toContain('var(--text-primary')
  })
})

describe('6. Sélecteur de langue et clés i18n mortes (UX-031 / UX-044)', () => {
  it('le composant non monté et son amorçage sont retirés', () => {
    expect(existe('components/LanguageSwitcher.jsx')).toBe(false)
    expect(existe('i18n.js')).toBe(false)
    // Aucun écran ne référence plus le sélecteur mort.
    for (const fichier of [...ECRANS_REACH, SIDEBAR, PALETTE, APP, 'AppPrivateLayout.jsx']) {
      expect(lire(fichier)).not.toContain('LanguageSwitcher')
    }
  })

  it('la clé i18n `coming_soon`, consommée par aucun écran, est retirée', () => {
    for (const locale of ['fr', 'en', 'es']) {
      const contenu = lire(`locales/${locale}.json`)
      expect(contenu).not.toContain('coming_soon')
    }
  })
})
