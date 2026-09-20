/* ============================================================================
   defautsQa2Ecrans.test.js — garde-fou de VOCABULAIRE et d'HONNÊTETÉ des écrans.
   ----------------------------------------------------------------------------
   POURQUOI CE TEST : la deuxième QA adverse a relu la production le 20/09/2026
   et a relevé cinq défauts frontend. Les comportements correspondants sont
   verrouillés ici, sur le code réel des écrans, pour qu'une relecture ne les
   réintroduise pas :

     1. /clients/new affichait QUATRE scores (30/35/35/40) sur un formulaire
        VIDE, produits par `computeScores(form, [])` — aucune donnée du cabinet.
     2. /analytics annonçait « Taux de conversion 88.0 % » avec zéro devis, par
        une AUTRE définition que /rapports (clients actifs / (actifs+prospects)).
     3. Un rôle en lecture seule voyait les formulaires d'écriture, et son refus
        s'affichait en code machine (`lecture_seule`) au lieu du message de l'API.
     4. /clients/new en accès direct montrait le bloc d'adresse FRANÇAIS à un
        cabinet suisse (pays lu au premier rendu, sans re-rendu).
     5. Des boutons menaient à des routes 501 « non implémenté » (analyse
        documentaire ARK, relevé de commissions PDF).
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RACINE_SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lire = (chemin) => readFileSync(resolve(RACINE_SRC, chemin), 'utf8')

const CLIENT_NEW = 'pages/ClientNew.jsx'
const ANALYTICS = 'pages/AnalyticsExecutive.jsx'
const DOCUMENTS = 'pages/Documents.jsx'
const COMMISSIONS = 'pages/CommissionsCalculator.jsx'

describe('1. Aucun score inventé avant la création du client', () => {
  it('le formulaire de création n’appelle plus computeScores sur un client inexistant', () => {
    const source = lire(CLIENT_NEW)
    expect(source).not.toContain('computeScores')
    // L'encadré dit ce qu'il en est, sans cadran ni chiffre.
    expect(source).toContain('non mesuré')
    expect(source).toContain('Aperçu du profil ARK')
    expect(source).not.toContain('ScoreGauge')
  })
})

describe('2. Une mesure, un intitulé, et jamais de taux sans dénominateur', () => {
  it('/analytics nomme les deux mesures et n’affiche plus la conversion sur le compteur de clients', () => {
    const source = lire(ANALYTICS)
    // Le mot « taux de conversion » est réservé aux devis (comme /rapports).
    expect(source).toContain('Taux de conversion devis')
    expect(source).toContain('devis signés / devis')
    // La mesure clients porte SON nom.
    expect(source).toContain('Part des clients actifs')
    expect(source).toContain('clients actifs / (clients actifs + prospects)')
    // Plus aucune lecture du champ backend `tauxConversion` (autre définition).
    expect(source).not.toMatch(/stats\?\.tauxConversion\b/)
    expect(source).not.toContain('_conversionRate')
    // Un taux sans dénominateur n'est pas 0 % : il est non mesuré.
    expect(source).toMatch(/devisTotal !== null && devisTotal > 0/)
    expect(source).toContain('aucun devis enregistré')
    // Un statut ABSENT de `clientsParStatut` vaut 0 client, mais la part n'est
    // calculée que si un dénominateur existe (sinon « — »).
    expect(source).toContain('clientsParStatut.actif) ?? 0')
    expect(source).toMatch(/baseActifs > 0/)
  })

  it('/rapports garde le même vocabulaire (même mot, même calcul)', () => {
    const source = lire('pages/Rapports.jsx')
    expect(source).toContain('Taux de conversion devis')
    expect(source).toContain('devisSignes / devisTotal')
  })
})

describe('3. Rôle en lecture seule : aucune écriture, aucun code machine', () => {
  it('le formulaire de client est remplacé par la phrase de l’API', () => {
    const source = lire(CLIENT_NEW)
    expect(source).toContain('useSessionCabinet')
    expect(source).toContain('lectureSeule')
    expect(source).toContain('MentionLectureSeule')
    // L'erreur d'API passe par le traducteur : jamais `data.error` brut.
    expect(source).toContain('messageErreurApi(err')
    expect(source).not.toMatch(/toast\.error\(err\.response/)
  })

  it('le dépôt de document disparaît pour ce rôle', () => {
    const source = lire(DOCUMENTS)
    expect(source).toContain('useSessionCabinet')
    expect(source).toMatch(/\{!lectureSeule &&/)
  })
})

describe('4. Bloc d’adresse : marché résolu, jamais une source nationale supposée', () => {
  it('/clients/new ne fige plus la France par défaut et se re-rend au marché', () => {
    const source = lire(CLIENT_NEW)
    // Le pays n'est plus lu une seule fois au premier rendu.
    expect(source).not.toContain('contexteCourant()')
    expect(source).toContain('useSessionCabinet')
    expect(source).toContain('marcheConnu')
    // Les deux sources existent, chacune sous sa condition de marché.
    expect(source).toContain('adresses suisses (OpenStreetMap, NPA + canton)')
    expect(source).toContain('Base Adresse Nationale française')
    expect(source).toContain('aucune tant que le marché du cabinet n’est pas connu')
    // Aucune requête d'adresse sans marché connu.
    expect(source).toMatch(/if \(!sourceAdresse\) \{ setAddressSuggestions\(\[\]\); return \}/)
  })

  it('la BAN française n’est interrogeable que pour un cabinet français', () => {
    const source = lire(CLIENT_NEW)
    expect(source).toContain("paysFrance(paysEffectif) ? 'FR' : null")
  })
})

describe('5. Aucun bouton ne mène à une fonction annoncée mais non installée', () => {
  it('les actions par document (dont l’analyse ARK) sont déclarées indisponibles, sans compteur', () => {
    const source = lire(DOCUMENTS)
    expect(source).toContain('FonctionIndisponible')
    expect(source).not.toMatch(/documents-analysis/)
  })

  it('le relevé mensuel de commissions est annoncé comme non installé, sans bouton', () => {
    const source = lire(COMMISSIONS)
    expect(source).toContain('FonctionIndisponible')
    expect(source).toContain('Relevé mensuel de commissions (PDF)')
    expect(source).not.toMatch(/statement\/\$\{/)
  })
})
