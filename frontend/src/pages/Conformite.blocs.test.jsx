/* ============================================================================
   Conformite.blocs.test.jsx — CE QUI EST RÉELLEMENT RENDU À L'ÉCRAN.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : les fonctions pures (`affichageConformite.test.js`) disent
   ce que l'écran CALCULE ; celui-ci rend les composants de la page
   (`renderToStaticMarkup`, sans navigateur) et vérifie ce qu'un cabinet LIT.

   Constats d'audit couverts :
     • CH-026 — un cabinet suisse doit voir la nLPD (et son autorité, le PFPDT),
       et AUCUN mot du RGPD ni de la CNIL ;
     • CH-039 — ses familles de produits doivent être suisses (LAMal, LAA, LPP),
       jamais françaises (IARD, emprunteur) ; et l'inverse pour la France.

   Les charges utiles sont les mêmes que celles servies par
   `GET /api/conformite/dashboard` (`lib/conformiteMarche.fixture.js`).
   ========================================================================== */

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BlocProduits, BlocProtectionDonnees } from './Conformite'
import { protectionDonneesAffichee, produitsAffiches, referentielConformite } from '../lib/affichageConformite'
import { DASHBOARD_CH, DASHBOARD_FR } from '../lib/conformiteMarche.fixture'

/** Rend les deux blocs comme la page les rend, pour un tableau de bord donné. */
function rendreEcran(dashboard) {
  const referentiel = referentielConformite(dashboard)
  return renderToStaticMarkup(
    <>
      <BlocProtectionDonnees protection={protectionDonneesAffichee(referentiel)} />
      <BlocProduits produits={produitsAffiches(referentiel)} />
    </>
  )
}

const ECRAN_CH = rendreEcran(DASHBOARD_CH)
const ECRAN_FR = rendreEcran(DASHBOARD_FR)

describe('Défaut 1 (CH-026) — mentions suisses à l’écran', () => {
  it('cabinet suisse : la nLPD et le PFPDT sont affichés', () => {
    expect(ECRAN_CH).toContain('nLPD')
    expect(ECRAN_CH).toContain('PFPDT')
    expect(ECRAN_CH).toContain('1er septembre 2023')
    // Les éléments qu'un cabinet doit pouvoir documenter.
    expect(ECRAN_CH).toContain('Finalités du traitement')
    expect(ECRAN_CH).toContain('Catégories de données personnelles traitées')
    expect(ECRAN_CH).toContain('Durée de conservation')
    expect(ECRAN_CH).toContain('Droits de la personne concernée')
    expect(ECRAN_CH).toContain('Sous-traitants et destinataires des données')
    expect(ECRAN_CH).toContain('Localisation des données')
    // Chaque élément est rattaché à un article de loi suisse.
    expect(ECRAN_CH).toContain('LPD, art.')
  })

  it('cabinet suisse : pas un mot du droit d’un autre marché', () => {
    expect(ECRAN_CH).not.toContain('RGPD')
    expect(ECRAN_CH).not.toContain('CNIL')
    expect(ECRAN_CH).not.toContain('ACPR')
    expect(ECRAN_CH).not.toContain('ORIAS')
    expect(ECRAN_CH).not.toContain('DDA')
    expect(ECRAN_CH).not.toContain('Règlement (UE)')
  })

  it('les données non renseignées sont affichées comme à renseigner, jamais remplies', () => {
    expect(ECRAN_CH).toContain('À renseigner par le cabinet')
    // Aucune valeur réglementaire plausible n'est inventée à la place.
    expect(ECRAN_CH).not.toMatch(/\d+\s*(ans|mois|jours)/)
  })

  it('cabinet français : le RGPD et la CNIL restent affichés', () => {
    expect(ECRAN_FR).toContain('RGPD')
    expect(ECRAN_FR).toContain('CNIL')
    expect(ECRAN_FR).toContain('Mentions légales')
    expect(ECRAN_FR).not.toContain('nLPD')
    expect(ECRAN_FR).not.toContain('PFPDT')
  })
})

describe('Défaut 2 (CH-039) — familles de produits à l’écran', () => {
  it('cabinet suisse : les familles suisses sont listées', () => {
    expect(ECRAN_CH).toContain('Produits du marché — Suisse')
    expect(ECRAN_CH).toContain('Assurance-maladie de base (LAMal)')
    expect(ECRAN_CH).toContain('Assurance-accidents (LAA)')
    expect(ECRAN_CH).toContain('Assurances complémentaires (LCA)')
    expect(ECRAN_CH).toContain('Prévoyance professionnelle (LPP)')
    expect(ECRAN_CH).toContain('Prévoyance individuelle liée (pilier 3a)')
  })

  it('cabinet suisse : aucune famille de produits française', () => {
    expect(ECRAN_CH).not.toMatch(/IARD|emprunteur|multirisque habitation/i)
  })

  it('cabinet français : les familles françaises sont listées', () => {
    expect(ECRAN_FR).toContain('Produits du marché — France')
    expect(ECRAN_FR).toContain('Assurance IARD (incendie, accidents, risques divers)')
    expect(ECRAN_FR).toContain('Assurance emprunteur')
    expect(ECRAN_FR).not.toMatch(/LAMal|LAA|LCA|LPP/)
  })
})

describe('Sans réponse de l’API — l’écran le dit, il ne montre rien d’un autre marché', () => {
  const ECRAN_VIDE = rendreEcran(null)

  it('aucune mention, aucune famille, et un message explicite', () => {
    expect(ECRAN_VIDE).not.toMatch(/RGPD|nLPD|CNIL|PFPDT|ACPR|IARD|LAMal/)
    expect(ECRAN_VIDE).toContain('Produits du marché')
    expect(ECRAN_VIDE).toContain('pas pu être chargé')
    expect(ECRAN_VIDE).not.toContain('À renseigner par le cabinet')
  })
})
