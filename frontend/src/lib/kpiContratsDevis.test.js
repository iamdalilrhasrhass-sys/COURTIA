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

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (chemin) => readFileSync(resolve(RACINE_SRC, chemin), 'utf8')

const REPORTING_V2 = 'pages/v2/ReportingV2.jsx'
const RAPPORTS = 'pages/Rapports.jsx'

describe('écrans d’indicateurs — contrats (actifs / toutes lignes) et devis', () => {
  it('Reporting Avancé lit la clé `devis` et nomme les deux notions de contrat', () => {
    const source = lire(REPORTING_V2)

    // Clé juste, avec repli explicite sur l'alias déprécié (jamais `quotes` seul).
    expect(source).toContain('overview?.devis')
    expect(source).toContain('overview?.quotes')
    expect(source).toMatch(/const devis = overview\?\.devis \?\? overview\?\.quotes/)

    // Les deux notions sont affichées, chacune nommée.
    expect(source).toContain('label="Contrats actifs"')
    expect(source).toContain('Contrats (toutes lignes, résiliés compris)')
    expect(source).toContain('Prime annuelle des contrats actifs')

    // Le taux de conversion porte sur les DEVIS (et le libellé le dit).
    expect(source).toContain('Taux de conversion devis (signés / devis)')
    expect(source).toContain('formatTaux(devis?.conversionRate)')
    // …et il n'est plus lu sur l'alias `quotes`, ni sur un compteur de contrats.
    expect(source).not.toContain('overview?.quotes?.conversionRate')
    expect(source).not.toMatch(/conversionRate[^\n]*contrats/)
  })

  it('Reporting Avancé n’invente plus de valeur de repli (75, 0 %)', () => {
    const source = lire(REPORTING_V2)
    // L'ancien « score ARK par défaut 75 » et le « 0 % » d'un taux sans
    // dénominateur étaient des mesures fabriquées.
    expect(source).not.toMatch(/avgScore \|\| 75/)
    expect(source).not.toMatch(/avgScore \?\? 75/)
    expect(source).toContain('VALEUR_ABSENTE')
    // Montants dans la devise du cabinet, pas en euros en dur.
    expect(source).toContain("from '../../lib/monnaie'")
    expect(source).not.toContain('Intl.NumberFormat')
    expect(source).not.toContain("currency: 'EUR'")
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
