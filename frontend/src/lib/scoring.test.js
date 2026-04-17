import { describe, it, expect } from 'vitest'
import { computeScores, getScoreColor, getScoreReasons } from './scoring.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const clientVide = { nom: 'Test', prenom: 'X' }

const clientRiche = {
  nom: 'Dupont', prenom: 'Marie',
  email: 'marie@test.fr', telephone: '0601020304',
  adresse: '1 rue de la Paix', profession: 'médecin',
  situation_familiale: 'marié', bonus_malus: 1,
  annees_permis: 12, nb_sinistres_3ans: 0,
  zone_geographique: 'rural', segment: 'professionnel',
  statut: 'actif',
  created_at: new Date(Date.now() - 7 * 365.25 * 24 * 3600 * 1000).toISOString(),
}

const clientRisque = {
  nom: 'Risky', prenom: 'Paul',
  email: 'paul@test.fr', telephone: '0601020305',
  nb_sinistres_3ans: 3, bonus_malus: 2.8,
  annees_permis: 1, zone_geographique: 'urbain',
  statut: 'actif', segment: 'particulier',
  created_at: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString(),
}

const contratsActifs = [
  { statut: 'actif', prime_annuelle: 800, type_contrat: 'Auto',
    date_echeance: new Date(Date.now() + 45 * 86400000).toISOString() },
  { statut: 'actif', prime_annuelle: 600, type_contrat: 'Habitation',
    date_echeance: new Date(Date.now() + 200 * 86400000).toISOString() },
]

const contratUrgent = [
  { statut: 'actif', prime_annuelle: 500,
    date_echeance: new Date(Date.now() + 10 * 86400000).toISOString() },
]

// ─── getScoreColor ────────────────────────────────────────────────────────────

describe('getScoreColor', () => {
  it('null → neutral', () => expect(getScoreColor(null, 'risque')).toBe('neutral'))
  it('undefined → neutral', () => expect(getScoreColor(undefined, 'fidelite')).toBe('neutral'))

  // Risque (inversé : élevé = rouge)
  it('risque 0 → green',   () => expect(getScoreColor(0,   'risque')).toBe('green'))
  it('risque 39 → green',  () => expect(getScoreColor(39,  'risque')).toBe('green'))
  it('risque 40 → orange', () => expect(getScoreColor(40,  'risque')).toBe('orange'))
  it('risque 69 → orange', () => expect(getScoreColor(69,  'risque')).toBe('orange'))
  it('risque 70 → red',    () => expect(getScoreColor(70,  'risque')).toBe('red'))
  it('risque 100 → red',   () => expect(getScoreColor(100, 'risque')).toBe('red'))

  // Fidélité (normal : élevé = vert)
  it('fidelite 0 → red',    () => expect(getScoreColor(0,   'fidelite')).toBe('red'))
  it('fidelite 39 → red',   () => expect(getScoreColor(39,  'fidelite')).toBe('red'))
  it('fidelite 40 → orange',() => expect(getScoreColor(40,  'fidelite')).toBe('orange'))
  it('fidelite 69 → orange',() => expect(getScoreColor(69,  'fidelite')).toBe('orange'))
  it('fidelite 70 → green', () => expect(getScoreColor(70,  'fidelite')).toBe('green'))
  it('fidelite 100 → green',() => expect(getScoreColor(100, 'fidelite')).toBe('green'))
})

// ─── computeScores — client vide ─────────────────────────────────────────────

describe('computeScores — client vide', () => {
  const s = computeScores(clientVide, [])
  it('retourne un objet', () => expect(s).not.toBeNull())
  it('risque ≥ 20', () => expect(s.risque).toBeGreaterThanOrEqual(20))
  it('completude < 50 (peu de champs)', () => expect(s.completude).toBeLessThan(50))
  it('nbActifs = 0', () => expect(s.nbActifs).toBe(0))
})

// ─── computeScores — client riche ────────────────────────────────────────────

describe('computeScores — client riche', () => {
  const s = computeScores(clientRiche, contratsActifs)
  it('risque faible (< 40)', () => expect(s.risque).toBeLessThan(40))
  it('fidelite élevée (> 70)', () => expect(s.fidelite).toBeGreaterThan(70))
  it('opportunite elevee (> 60)', () => expect(s.opportunite).toBeGreaterThan(60))
  it('nbActifs = 2', () => expect(s.nbActifs).toBe(2))
  it('valeur_eur = 1400', () => expect(s.valeur_eur).toBe(1400))
  it('raisons non vides', () => expect(s.raisons.length).toBeGreaterThan(0))
})

// ─── computeScores — client à risque ─────────────────────────────────────────

describe('computeScores — client à risque', () => {
  const s = computeScores(clientRisque, contratUrgent)
  it('risque élevé (≥ 70)', () => expect(s.risque).toBeGreaterThanOrEqual(70))
  it('rétention dégradée (< 50)', () => expect(s.retention).toBeLessThan(50))
  it('priorité haute', () => expect(s.priorite).toBe('haute'))
  it('signal échéance présent', () => {
    const labels = s.signaux.map(x => x.label)
    expect(labels.some(l => l.includes('Échéance'))).toBe(true)
  })
})

// ─── computeScores — null guard ───────────────────────────────────────────────

describe('computeScores — null guard', () => {
  it('client null → null', () => expect(computeScores(null, [])).toBeNull())
})
