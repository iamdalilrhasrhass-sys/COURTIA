/* ============================================================================
   deviseEcrans.test.js — garde-fou : plus de devise ÉCRITE À LA MAIN dans les
   écrans à montants du pipeline et du cockpit.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : les défauts suisses du 20/09/2026 sont tous venus d'un
   formateur local réécrit dans la page :
     - `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`
       dans le pipeline (« Potentiel total 0 € », « POTENTIEL 0 € ») et dans
       l'écran ARK (« LTV : 0 € », matrice « 800 € », « TOTAL €/AN 600 € ») ;
     - un « € » collé à la main dans le journal d'activité (« Coût session ») ;
     - `icon={Euro}` sur des cartes dont la valeur est en francs suisses
       (« PRIMES ANNUELLES € » au-dessus de « 1 450 CHF »).

   Le module `lib/monnaie.js` existe pour ça. Ce test lit la SOURCE des écrans
   concernés et refuse la réapparition d'une devise en dur. Il ne remplace pas
   la recette navigateur : il empêche la régression au moment où elle serait
   commise.

   Les écrans d'un autre domaine (devis, contrats, commissions, rapports) ne
   sont PAS listés ici volontairement : ils restent à traiter par leurs
   propriétaires, avec le même module.
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Écrans corrigés le 20/09/2026 : pipeline, cockpit, écran ARK, journal ARK. */
const ECRANS = [
  'pages/Opportunites.jsx',                        // pipeline : Potentiel total / POTENTIEL
  'pages/ArkIntelligence.jsx',                     // LTV, matrice cross-sell, TOTAL €/AN
  'pages/Dashboard.jsx',                           // cockpit : Primes annuelles
  'pages/Relances.jsx',                            // KPI Potentiel + montant par relance
  'components/widgets/ArkActivityFeed.jsx',        // Coût session
  'components/DeviseIcone.jsx',                    // icône de montant
]

/** Écrans qui doivent se re-rendre quand la devise du cabinet est connue. */
const ECRANS_REACTIFS = [
  'pages/Opportunites.jsx',
  'pages/ArkIntelligence.jsx',
  'pages/Dashboard.jsx',
  'pages/Relances.jsx',
  'components/widgets/ArkActivityFeed.jsx',
]

const lire = (chemin) => readFileSync(resolve(RACINE_SRC, chemin), 'utf8')

describe('écrans à montants — aucune devise écrite à la main', () => {
  it.each(ECRANS)('%s passe par le module de devise', (ecran) => {
    const source = lire(ecran)
    expect(source).toMatch(/from '\.\.?\/(\.\.\/)?(lib\/monnaie|components\/DeviseIcone)'/)
    expect(source).not.toContain("currency: 'EUR'")
    expect(source).not.toContain('Intl.NumberFormat')
    expect(source).not.toMatch(/\$\{?[^}]*\}?\s?€/) // « ... € » fabriqué à la main
    expect(source).not.toMatch(/\}\s?€/)
  })

  it("le pipeline n'utilise plus son formateur euro local", () => {
    const source = lire('pages/Opportunites.jsx')
    expect(source).not.toMatch(/const fmtEur = \(/)
    expect(source).toContain('fmtMontantPipeline')
  })

  it("l'écran ARK formate ses montants avec la devise du cabinet", () => {
    const source = lire('pages/ArkIntelligence.jsx')
    expect(source).not.toMatch(/const fmtEur = \(/)
    expect(source).toContain("const fmtMontantArk = (v) => fmtMontant(v, { maximumFractionDigits: 0 })")
    expect(source).toContain('Total {deviseCourante()}/an')
  })

  it("la carte « Primes annuelles » du cockpit n'impose plus l'icône euro", () => {
    const source = lire('pages/Dashboard.jsx')
    const ligne = source.split('\n').find((l) => l.includes('label="Primes annuelles"') && l.includes('CockpitMetricCard'))
    expect(ligne).toBeTruthy()
    expect(ligne).not.toContain('icon={Euro}')
    expect(ligne).toContain('icon={DeviseIcone}')
  })

  it("le journal ARK n'écrit plus « € » en dur pour les coûts", () => {
    const source = lire('components/widgets/ArkActivityFeed.jsx')
    expect(source).not.toMatch(/toFixed\(3\)\}€/)
    expect(source).not.toMatch(/toFixed\(3\) €/)
    expect(source).toContain('symboleCourant()')
  })

  /* Un écran DÉJÀ rendu ne se re-rend pas quand le profil arrive : sans cette
     souscription, le pipeline affichait « 0 € » pour un cabinet suisse jusqu'au
     prochain changement d'état de la page (constaté en navigateur). */
  it.each(ECRANS_REACTIFS)('%s se re-rend quand la devise du cabinet est connue', (ecran) => {
    const source = lire(ecran)
    expect(source).toContain("import useDevise from '")
    expect(source).toMatch(/useDevise\(\)/)
  })

  it('le hook de devise s’abonne à la mise à jour du profil', () => {
    const source = lire('components/useDevise.js')
    expect(source).toContain("'profileUpdated'")
    expect(source).toContain('deviseCourante()')
  })
})
