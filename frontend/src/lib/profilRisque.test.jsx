/* ============================================================================
   profilRisque.test.js — garde-fou du DÉFAUT 1 : plus aucune valeur de risque
   inventée sur une fiche client.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : le 21/09/2026, une fiche client créée à l'instant et sans
   aucun contrat affichait un « profil de risque » fabriqué — « Malus 1.35 »,
   « Non-paiement », « 2 sinistres », « 8 ans », « 7 CV » et « 33 sur 100 ».
   Deux causes, toutes deux verrouillées ici :
     1. l'écran passait la prop `factors` alors que le composant attendait
        `riskFactors` et retombait sur `DEFAULT_FACTORS` (jeu d'exemple codé en
        dur) ;
     2. le score « / 100 » était recalculé dans le navigateur (part de facteurs
        « propres »), donc un chiffre sans source serveur.
   Règle produit : une valeur non mesurée s'affiche « non mesuré » (ou
   disparaît) ; un score ne s'affiche que s'il vient du serveur ET qu'au moins
   une donnée du dossier le soutient.
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  facteursRisqueClient,
  scoreRisqueClient,
  champsManquants,
} from './risqueClient'
import RiskDnaHelix from '../components/widgets/RiskDnaHelix'
import DossierOrbitalRings from '../components/widgets/DossierOrbitalRings'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (chemin) => readFileSync(resolve(RACINE_SRC, chemin), 'utf8')

const FICHE_CLIENT = 'pages/ClientDetail.jsx'
const HELIX = 'components/widgets/RiskDnaHelix.jsx'
const ANNEAUX = 'components/widgets/DossierOrbitalRings.jsx'

// Valeurs fabriquées relevées en production : elles ne doivent plus pouvoir être
// produites par le code, ni affichées sur une fiche sans données de risque.
const VALEURS_FABRIQUEES = ['Malus 1.35', 'Non-paiement', '2 sinistres', '7 CV', 'Domicile-travail']

describe('1. Aucun jeu de données d’exemple dans le profil de risque', () => {
  it('le composant d’hélice n’a plus de facteurs par défaut', () => {
    const source = lire(HELIX)
    expect(source).not.toContain('DEFAULT_FACTORS')
    for (const valeur of VALEURS_FABRIQUEES) {
      expect(source).not.toContain(valeur)
    }
  })

  it('la fiche client ne passe plus la prop `factors` (celle qui était ignorée) ni de facteurs en dur', () => {
    const source = lire(FICHE_CLIENT)
    expect(source).not.toContain('factors={[')
    expect(source).toContain('riskFactors={profilRisque}')
    expect(source).toContain("from '../lib/risqueClient'")
    for (const valeur of VALEURS_FABRIQUEES) {
      expect(source).not.toContain(valeur)
    }
  })

  it('les anneaux de complétude n’ont plus de scores ni de pièces d’exemple', () => {
    const source = lire(ANNEAUX)
    expect(source).not.toContain('DEFAULT_MISSING_DOCS')
    expect(source).not.toContain('DEFAULT_MISSING_FIELDS')
    expect(source).not.toMatch(/docsScore\s*=\s*\d/)
    expect(source).not.toMatch(/fieldsScore\s*=\s*\d/)
  })

  it('rendu sans aucune donnée, l’écran dit « non mesuré » et n’affiche aucun chiffre', () => {
    const htmlHelix = renderToStaticMarkup(<RiskDnaHelix clientName="Client neuf" />)
    expect(htmlHelix).toContain('non mesuré')
    expect(htmlHelix).not.toContain('/ 100')
    for (const valeur of VALEURS_FABRIQUEES) {
      expect(htmlHelix).not.toContain(valeur)
    }

    const htmlAnneaux = renderToStaticMarkup(<DossierOrbitalRings clientName="Client neuf" />)
    expect(htmlAnneaux).toContain('non mesuré')
    expect(htmlAnneaux).not.toContain('60%')
    expect(htmlAnneaux).not.toContain('80%')
    expect(htmlAnneaux).not.toContain('Prêt à tarifer')
  })
})

describe('2. Facteurs de risque : uniquement des champs transmis par le serveur', () => {
  it('un client sans donnée de risque ne produit AUCUN facteur', () => {
    expect(facteursRisqueClient({})).toEqual([])
    expect(facteursRisqueClient(null)).toEqual([])
    expect(facteursRisqueClient(undefined)).toEqual([])
  })

  it('un champ vide ou nul n’invente pas de valeur', () => {
    const client = {
      bonus_malus: null,
      nb_sinistres_3ans: '',
      annees_permis: null,
      zone_geographique: '   ',
    }
    expect(facteursRisqueClient(client)).toEqual([])
  })

  it('les valeurs transmises sont rendues telles quelles', () => {
    const facteurs = facteursRisqueClient({
      bonus_malus: 1.35,
      nb_sinistres_3ans: 2,
      annees_permis: 8,
      zone_geographique: 'urbain',
    })
    expect(facteurs.map(f => f.id)).toEqual(['bonus_malus', 'sinistres', 'anciennete_permis', 'zone_geographique'])
    expect(facteurs[0].value).toBe('Malus 1,35')
    expect(facteurs[0].level).toBe('risk')
    expect(facteurs[1].value).toBe('2 sinistres')
    expect(facteurs[2].value).toBe('8 ans')
    expect(facteurs[3].level).toBe('risk')
  })
})

describe('3. Le score de risque ne s’affiche que s’il vient du serveur', () => {
  it('sans score serveur : non mesuré', () => {
    expect(scoreRisqueClient({ bonus_malus: 1, nb_sinistres_3ans: 0 })).toBeNull()
  })

  it('score serveur sans aucune donnée de risque pour le soutenir : non affiché', () => {
    expect(scoreRisqueClient({ risk_score: 45 })).toBeNull()
    expect(scoreRisqueClient({ score_risque: 72 })).toBeNull()
  })

  it('score serveur soutenu par un fait du dossier : affiché', () => {
    expect(scoreRisqueClient({ risk_score: 45, bonus_malus: 1.0 })).toBe(45)
    expect(scoreRisqueClient({ score_risque: '62', nb_sinistres_3ans: 1 })).toBe(62)
  })

  it('le score reste borné 0-100', () => {
    expect(scoreRisqueClient({ risk_score: 180, bonus_malus: 2 })).toBe(100)
    expect(scoreRisqueClient({ risk_score: -12, bonus_malus: 2 })).toBe(0)
  })

  it('un client créé à l’instant affiche ses vraies valeurs serveur, jamais le profil d’exemple', () => {
    // Réponse réelle de POST/GET /api/clients/:id pour un client sans contrat.
    const clientNeuf = {
      prenom: 'Nouveau',
      nom: 'Client',
      bonus_malus: 1.0,
      nb_sinistres_3ans: 0,
      annees_permis: 0,
      zone_geographique: '',
      risk_score: 45,
    }
    const facteurs = facteursRisqueClient(clientNeuf)
    const html = renderToStaticMarkup(
      <RiskDnaHelix riskFactors={facteurs} score={scoreRisqueClient(clientNeuf)} clientName="Nouveau Client" />
    )
    expect(html).toContain('Neutre 1,00')
    expect(html).toContain('Aucun sinistre')
    expect(html).toContain('45')
    for (const valeur of VALEURS_FABRIQUEES) {
      expect(html).not.toContain(valeur)
    }
  })
})

describe('4. Les champs à compléter sont ceux réellement vides', () => {
  it('liste les champs clés absents, avec leur libellé', () => {
    const manquants = champsManquants({ prenom: 'A', nom: 'B', email: 'a@b.fr' })
    expect(manquants.length).toBe(9)
    expect(manquants.map(m => m.id)).toContain('zone_geographique')
    expect(manquants.find(m => m.id === 'zone_geographique').label).toBe('Zone géographique')
    expect(manquants.map(m => m.id)).not.toContain('email')
  })

  it('ne signale rien quand tous les champs clés sont renseignés', () => {
    const complet = {
      nom: 'B', prenom: 'A', email: 'a@b.fr', telephone: '0600000000', adresse: '1 rue',
      profession: 'Courtier', situation_familiale: 'Célibataire', bonus_malus: 1,
      annees_permis: 8, nb_sinistres_3ans: 0, zone_geographique: 'rural', segment: 'particulier',
    }
    expect(champsManquants(complet)).toEqual([])
  })
})
