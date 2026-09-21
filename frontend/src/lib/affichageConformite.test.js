/* ============================================================================
   affichageConformite.test.js — UN CABINET SUISSE REÇOIT LES LIBELLÉS SUISSES,
   UN CABINET FRANÇAIS LES LIBELLÉS FRANÇAIS.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : deux constats d'audit portaient sur l'écran /conformite.
     • CH-026 — le bloc « 📋 RGPD & Mentions légales » était écrit en dur dans
       la page : la nLPD était ABSENTE, et un cabinet suisse lisait le RGPD, un
       règlement de l'Union européenne ;
     • CH-039 — les listes de produits restaient françaises (IARD, emprunteur)
       pour un cabinet suisse.

   Les charges utiles viennent de `conformiteMarche.fixture.js` (les mêmes que
   celles servies par `GET /api/conformite/dashboard`) ; le contrat SERVEUR est
   figé par `backend/src/routes/conformite.referentiel-marche.test.js` et le
   contrat de RENDU par `pages/Conformite.blocs.test.jsx`.

   Aucun navigateur n'est nécessaire : les fonctions testées sont pures.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import {
  A_RENSEIGNER,
  CONFORMITE_NEUTRE,
  protectionDonneesAffichee,
  produitsAffiches,
  referentielConformite,
  sigleChecklist,
} from './affichageConformite'
import { DASHBOARD_CH, DASHBOARD_FR } from './conformiteMarche.fixture'

describe('Défaut 1 (CH-026) — mentions de protection des données par marché', () => {
  it('cabinet suisse : nLPD et PFPDT, jamais le RGPD ni l’ACPR', () => {
    const protection = protectionDonneesAffichee(referentielConformite(DASHBOARD_CH))
    expect(protection.referentiel).toBe('nLPD')
    expect(protection.autorite).toBe('PFPDT')
    expect(protection.libelle_ecran).toContain('nLPD')
    expect(protection.resume).toMatch(/nLPD/)
    // Le RGPD est un règlement de l'Union européenne : il ne doit apparaître
    // nulle part sur l'écran d'un cabinet suisse.
    expect(JSON.stringify(protection)).not.toMatch(/RGPD/)
    expect(JSON.stringify(protection)).not.toMatch(/ACPR|CNIL|ORIAS/)
    // Les éléments qu'un cabinet doit retrouver sous la nLPD.
    expect(protection.elements.map((e) => e.cle)).toEqual([
      'finalites', 'categories_donnees', 'duree_conservation',
      'droits_personne', 'sous_traitants', 'localisation_donnees',
    ])
    expect(protection.sources.pfpdt).toBe('https://www.edoeb.admin.ch/fr')
    expect(protection.entree_en_vigueur).toBe('1er septembre 2023')
  })

  it('cabinet français : le RGPD et la CNIL restent, sans changement', () => {
    const protection = protectionDonneesAffichee(referentielConformite(DASHBOARD_FR))
    expect(protection.referentiel).toBe('RGPD')
    expect(protection.autorite).toBe('CNIL')
    expect(protection.libelle_ecran).toBe('📋 RGPD & Mentions légales')
    expect(protection.pages_legales).toContain('RGPD')
    expect(protection.pages_legales).toContain('CGV')
    expect(JSON.stringify(protection)).not.toMatch(/nLPD|PFPDT/)
  })

  it('une donnée que le cabinet n’a pas renseignée n’est jamais remplie', () => {
    const protection = protectionDonneesAffichee(referentielConformite(DASHBOARD_CH))
    const duree = protection.elements.find((e) => e.cle === 'duree_conservation')
    expect(duree.a_renseigner).toBe(true)
    expect(duree.texte).toBe(A_RENSEIGNER)
    expect(duree.valeur).toBeNull()
    expect(A_RENSEIGNER).toBe('À renseigner par le cabinet')
  })

  it('une valeur réellement renseignée par le cabinet est affichée telle quelle', () => {
    const dashboard = {
      ...DASHBOARD_CH,
      conformite: {
        ...DASHBOARD_CH.conformite,
        protection_donnees: {
          ...DASHBOARD_CH.conformite.protection_donnees,
          elements: [
            { cle: 'duree_conservation', libelle: 'Durée de conservation', reference: 'LPD, art. 12, al. 2', valeur: null, a_renseigner: true },
            { cle: 'sous_traitants', libelle: 'Sous-traitants et destinataires des données', reference: 'LPD, art. 12', valeur: 'Hébergeur unique, Suisse', a_renseigner: false },
          ],
        },
      },
    }
    const protection = protectionDonneesAffichee(referentielConformite(dashboard))
    const fournie = protection.elements.find((e) => e.cle === 'sous_traitants')
    const manquante = protection.elements.find((e) => e.cle === 'duree_conservation')
    expect(fournie.valeur).toBe('Hébergeur unique, Suisse')
    expect(fournie.texte).toBe('Hébergeur unique, Suisse')
    expect(fournie.a_renseigner).toBe(false)
    expect(manquante.texte).toBe(A_RENSEIGNER)
  })

  it('API muette : aucune mention d’un autre marché n’est affichée', () => {
    const sansMarché = protectionDonneesAffichee(referentielConformite({ conformite: { chapeau: 'x' } }))
    expect(sansMarché.elements).toEqual([])
    expect(JSON.stringify(sansMarché)).not.toMatch(/RGPD|nLPD|CNIL|PFPDT|ACPR/)
    const rienDuTout = protectionDonneesAffichee(referentielConformite(null))
    expect(JSON.stringify(rienDuTout)).not.toMatch(/RGPD|nLPD|CNIL|PFPDT/)
  })
})

describe('Défaut 2 (CH-039) — familles de produits par marché', () => {
  it('cabinet suisse : familles suisses, aucune famille française', () => {
    const produits = produitsAffiches(referentielConformite(DASHBOARD_CH))
    const libelles = produits.familles.map((f) => f.libelle).join(' | ')
    expect(libelles).toMatch(/LAMal/)
    expect(libelles).toMatch(/LAA/)
    expect(libelles).toMatch(/LCA/)
    expect(libelles).toMatch(/LPP/)
    expect(libelles).toMatch(/pilier 3a/)
    expect(libelles).toMatch(/voyage/i)
    expect(produits.pays).toBe('Suisse')
    expect(produits.disponible).toBe(true)
    // Aucun produit du marché français ne doit apparaître chez un cabinet suisse.
    expect(libelles).not.toMatch(/IARD|emprunteur|habitation|multirisque/i)
  })

  it('cabinet français : familles françaises', () => {
    const produits = produitsAffiches(referentielConformite(DASHBOARD_FR))
    const libelles = produits.familles.map((f) => f.libelle).join(' | ')
    expect(libelles).toMatch(/IARD/)
    expect(libelles).toMatch(/emprunteur/)
    expect(produits.pays).toBe('France')
    expect(libelles).not.toMatch(/LAMal|LAA|LCA|LPP/)
  })

  it('sans réponse de l’API : aucune famille, et l’écran le dit', () => {
    const produits = produitsAffiches(referentielConformite(null))
    expect(produits.familles).toEqual([])
    expect(produits.disponible).toBe(false)
    expect(produits.message_indisponible).toMatch(/n'a pas pu être chargé/)
    expect(JSON.stringify(produits)).not.toMatch(/IARD|LAMal/)
  })
})

describe('Sigle de la checklist et repli neutre', () => {
  it('« DDA » n’est affiché qu’au marché français', () => {
    expect(sigleChecklist(referentielConformite(DASHBOARD_FR))).toBe('DDA')
    expect(sigleChecklist(referentielConformite(DASHBOARD_CH))).toBeNull()
    expect(sigleChecklist(CONFORMITE_NEUTRE)).toBeNull()
  })

  it('le repli neutre ne nomme aucune autorité et ne liste aucun produit', () => {
    const neutre = referentielConformite(null)
    expect(neutre.autorite).toBeNull()
    expect(neutre.export.route).toBeNull()
    expect(JSON.stringify(neutre)).not.toMatch(/ACPR|FINMA|CNIL|PFPDT|IARD/)
  })
})
