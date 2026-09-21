/* ============================================================================
   kpiContratsDevis.test.js — garde-fou de VOCABULAIRE des écrans d'indicateurs.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : le 20/09/2026, le mot « contrat » recouvrait trois mesures
   selon l'écran (« contrats actifs » 2, toutes les lignes 3, contrats + devis 4)
   et la clé `quotes` des réponses de reporting contenait des DEVIS alors que son
   nom dit « contrats ». L'écran Reporting Avancé en tirait un « taux de
   conversion devis » — et la recette de cohérence ne savait plus quoi comparer.

   L'arbitrage (voir backend/src/routes/dashboard.js) est verrouillé côté serveur
   par des tests jest. Ce fichier verrouille la CONTREPARTIE ÉCRAN, pour qu'une
   relecture ne réintroduise pas les deux confusions :
     • les deux notions de contrat sont NOMMÉES (actifs / toutes lignes) ;
     • les devis se lisent sous la clé `devis` — `quotes` n'est qu'un alias
       déprécié, toléré en repli le temps de la dépréciation annoncée par l'API ;
     • un taux affiché comme « conversion devis » est bien devis signés / devis,
       jamais un rapport calculé sur des contrats.
   ========================================================================== */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (chemin) => readFileSync(resolve(RACINE_SRC, chemin), 'utf8')

const RAPPORTS = 'pages/Rapports.jsx'

/**
 * GARDE-FOU ÉLARGI (21/09/2026). Deux cas de ce fichier lisaient
 * `pages/v2/ReportingV2.jsx` — un fichier jamais embarqué (absent de toutes les
 * cartes de source du build), donc jamais exécuté. La protection est reprise
 * MAIS portée sur l'ensemble des sources de `src/` : toute page ou tout composant
 * du dépôt reste soumis à la même interdiction. C'est une protection plus large
 * que celle qu'elle remplace : un nouvel écran ne peut pas non plus réintroduire
 * une valeur de repli fabriquée ni un montant en euros en dur.
 */
const INTERDITS_GLOBAUX = [
  { motif: /avgScore\s*(\|\||\?\?)\s*75/, pourquoi: 'score de repli fabriqué (75)' },
  { motif: /currency:\s*'EUR'/, pourquoi: 'montant en euros en dur', sauf: 'market/marketContext.js' },
  { motif: /overview\?\.quotes\?\.conversionRate/, pourquoi: 'taux de conversion lu sur l’alias déprécié `quotes`' },
  { motif: /devis:\s*\d+,\s*contrats:\s*\d+/, pourquoi: 'série de mesures en dur' },
]

function sourcesDeLEcran() {
  const fichiers = []
  const parcourir = (dossier) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = resolve(dossier, entree.name)
      if (entree.isDirectory()) parcourir(chemin)
      else if (/\.(jsx?|tsx?)$/.test(entree.name) && !/\.test\./.test(entree.name)) fichiers.push(chemin)
    }
  }
  parcourir(RACINE_SRC)
  return fichiers
}

describe('écrans d’indicateurs — contrats (actifs / toutes lignes) et devis', () => {
  it('aucune source de src/ ne réintroduit une mesure fabriquée ni un montant en euros', () => {
    const fautes = []
    for (const fichier of sourcesDeLEcran()) {
      const texte = readFileSync(fichier, 'utf8')
      for (const { motif, pourquoi, sauf } of INTERDITS_GLOBAUX) {
        if (sauf && fichier.endsWith(sauf)) continue
        if (motif.test(texte)) fautes.push(`${pourquoi} → ${fichier.replace(RACINE_SRC, 'src')}`)
      }
    }
    expect(fautes).toEqual([])
  })

  it('les écrans morts retirés le 21/09/2026 ne reviennent pas au dépôt', () => {
    // Ces fichiers étaient versionnés mais absents de TOUTES les cartes de source
    // du build : jamais embarqués, jamais exécutés. Les remettre sans les câbler
    // recréerait exactement le défaut CH-037 / UX-030 (code mort portant du
    // vocabulaire réglementaire français et des mesures de démonstration).
    const morts = [
      'pages/v2',
      'pages/Login.jsx', 'pages/Landing.jsx', 'pages/Beta.jsx',
      'components/Settings.jsx', 'components/Reports.jsx',
      'components/Parametres.jsx', 'components/Pricing.jsx',
    ]
    const revenus = morts.filter((chemin) => existsSync(resolve(RACINE_SRC, chemin)))
    expect(revenus).toEqual([])
  })

  it('Rapports (modèle) emploie les mêmes mots que l’API', () => {
    const source = lire(RAPPORTS)
    // Un seul mot pour un seul concept : « taux de conversion devis ».
    expect(source).not.toContain('tauxTransformation')
    expect(source).not.toContain('Taux transformation')
    expect(source).not.toContain('Taux de transf.')
    expect(source).toContain('Taux de conversion devis')
    // « Contrats actifs » reste le nom de la carte (même mot que le cockpit).
    expect(source).toContain('title="Contrats actifs"')
  })

  it('le taux de conversion du modèle Rapports est devis signés / devis, jamais un rapport sur les contrats', () => {
    // ARBITRAGE DE LA RÉGRESSION (20/09/2026) : ce test cherchait dans la page
    // une SÉRIE de chiffres littérale (`devis: N, contrats: N, taux: N`) — la
    // constante `PERF_MENSUELLE`, qui portait des mesures FABRIQUÉES. Elle a été
    // retirée : la page calcule désormais ses indicateurs à partir des valeurs
    // mesurées de l'API (`mesures`), et `null` affiche « — » au lieu d'un zéro.
    // Réintroduire une série en dur serait un faux succès ; le test verrouille
    // donc maintenant le vrai invariant, sur le vrai code :
    //   1. plus aucune série littérale de ce genre ne revient ;
    //   2. le taux est bien devis SIGNÉS / DEVIS (le dénominateur est un nombre
    //      de devis, jamais un compteur de contrats) ;
    //   3. l'écran NOMME la mesure : « devis signés / devis ».
    const source = lire(RAPPORTS)

    // 1. Aucune mesure en dur : ni la série d'origine, ni un montant en euros.
    expect(source).not.toMatch(/devis:\s*\d+,\s*contrats:\s*\d+/)
    expect(source).not.toContain('PERF_MENSUELLE')

    // 2. Le taux se calcule sur les devis, et le calcul ne lit jamais les contrats.
    expect(source).toContain('devisSignes / devisTotal')
    const calcul = source.match(/const tauxConversion\s*=[\s\S]{0,220}?:\s*null/)
    expect(calcul).toBeTruthy()
    expect(calcul[0]).not.toMatch(/contrats/i)
    // Un taux sans dénominateur n'est pas 0 % : il n'est PAS MESURÉ.
    expect(calcul[0]).toContain('devisTotal > 0')
    expect(source).not.toMatch(/tauxConversion[\s\S]{0,120}?contratsActifs/)

    // 3. La mesure est nommée à l'écran (« devis signés / devis »).
    expect(source).toContain('devis signés / devis')
  })
})
