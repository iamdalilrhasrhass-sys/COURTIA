/**
 * Garde-fous du scénario de démonstration.
 *
 * Ces tests empêchent les deux pannes les plus coûteuses observées :
 *   1. une étape qui cible une route qui n'existe pas dans le produit
 *      (l'utilisateur finit sur la page 404 en pleine visite) ;
 *   2. une narration qui annonce des chiffres que le jeu de données ne
 *      contient pas (le prospect vérifie, la démo perd sa crédibilité).
 *
 * Ils lisent la source, sans DOM ni navigateur : ils doivent rester rapides.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

import { CHAPITRES, ETAPES, dureeTheorique } from './scenario9'
import { CLIENTS, CONTRATS_DETAIL, TACHES, DOCUMENTS, OPPORTUNITES, PROSPECTS, primesTotales } from './donneesDemo'

const ICI = dirname(fileURLToPath(import.meta.url))
const APP = readFileSync(resolve(ICI, '../App.jsx'), 'utf8')

/** Routes réellement déclarées dans App.jsx (hors paramètres dynamiques). */
const ROUTES_DECLAREES = [...APP.matchAll(/path="([^"]+)"/g)].map((m) => m[1])

describe('scénario de visite guidée', () => {
  it('ne cible que des routes réellement déclarées dans App.jsx', () => {
    const routes = [...new Set(ETAPES.map((e) => e.route))]
    expect(routes.length).toBeGreaterThan(8)
    for (const route of routes) {
      // Les étapes visent /demo/... ; le produit déclare la même route sans préfixe.
      const sansDemo = route.replace(/^\/demo(?=\/|$)/, '') || '/'
      // Normalisation des deux côtés : tout segment numérique ou paramétré
      // devient ':id' (/demo/clients/2003 <-> path="/clients/:id").
      const normaliser = (chemin) => chemin
        .split('/')
        .map((seg) => (/^\d+$/.test(seg) || seg.startsWith(':') ? ':id' : seg))
        .join('/')
      const attendue = normaliser(sansDemo)
      const trouvee = ROUTES_DECLAREES.some((r) => normaliser(r) === attendue)
      expect(trouvee, `route absente de App.jsx : ${route}`).toBe(true)
    }
  })

  it('chaque étape appartient à un chapitre déclaré', () => {
    const ids = new Set(CHAPITRES.map((c) => c.id))
    expect(ids.size).toBe(9)
    for (const etape of ETAPES) {
      expect(ids.has(etape.chapitre), `chapitre inconnu : ${etape.chapitre}`).toBe(true)
    }
  })

  it('chaque étape porte une cible (texte ou sélecteur)', () => {
    for (const etape of ETAPES) {
      expect(etape.cible && (etape.cible.texte || etape.cible.sel), `cible absente : ${etape.titre}`).toBeTruthy()
    }
  })

  it('aucune étape ne dure plus de 10 s ni moins de 2 s', () => {
    for (const etape of ETAPES) {
      const tenue = etape.tenue || 3000
      expect(tenue, `tenue invraisemblable : ${etape.titre}`).toBeGreaterThanOrEqual(2000)
      expect(tenue, `tenue invraisemblable : ${etape.titre}`).toBeLessThanOrEqual(10000)
    }
  })

  it('la durée théorique reste dans une fourchette plausible', () => {
    const d = dureeTheorique()
    expect(d).toBeGreaterThan(100)
    expect(d).toBeLessThan(260)
  })

  it('la narration ne cite que des chiffres présents dans le jeu de données', () => {
    const primes = primesTotales()
    const texte = ETAPES.map((e) => `${e.titre} ${e.texte}`).join(' ')
    // Les montants rendus utilisent une espace insécable étroite (U+202F) :
    // on normalise avant de comparer, sinon le test échoue sur l'espace.
    const norm = (t) => String(t).replace(/[\u202f\u00a0\u2009]/g, ' ')
    const nombreFr = norm(new Intl.NumberFormat('fr-FR').format(primes)) // « 39 810 »
    expect(primes).toBe(39810)                                          // total réel du jeu de données
    expect(norm(texte)).toContain(nombreFr)
    // La narration écrit aussi les petits nombres en toutes lettres : le test
    // vérifie que les mots correspondent bien au jeu de données.
    const MOTS = {
      1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six',
      7: 'sept', 8: 'huit', 9: 'neuf', 10: 'dix', 12: 'douze', 15: 'quinze',
    }
    expect(texte.toLowerCase()).toContain(`${MOTS[CLIENTS.length]} clients`)
    expect(texte.toLowerCase()).toContain(`${MOTS[CONTRATS_DETAIL.length]} contrats`)
  })

  it('le jeu de données synthétiques reste cohérent et sans donnée réelle', () => {
    expect(CLIENTS.length).toBe(8)
    expect(CONTRATS_DETAIL.length).toBe(15)
    expect(primesTotales()).toBe(39810)
    expect(TACHES.length).toBe(12)
    expect(DOCUMENTS.length).toBe(7)
    expect(OPPORTUNITES.length).toBe(4)
    expect(PROSPECTS.length).toBe(7)
    // Aucun e-mail réel : tout doit être dans .invalid (RFC 2606)
    for (const c of CLIENTS) expect(c.email.endsWith('.invalid')).toBe(true)
    for (const p of PROSPECTS) expect(p.email.endsWith('.invalid')).toBe(true)
  })
})
