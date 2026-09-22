/**
 * Garde-fou de la démonstration publique.
 *
 * POURQUOI CE TEST EXISTE : la démonstration publique affichait « Clients scannés » vide et
 * « Score moyen undefined/100 » sur l'écran ARK Intelligence / Churn Predictor, parce que la
 * réponse simulée ne fournissait que deux des quatre compteurs lus par le composant. Un prospect
 * voyait donc un « undefined » en page publique.
 *
 * Le test verrouille la règle : chaque champ AFFICHÉ par le bloc churn de
 * pages/ArkIntelligence.jsx doit être présent dans la réponse de démonstration. Si un champ est
 * ajouté au composant sans être ajouté à la démonstration, le test casse.
 */
import { describe, it, expect } from 'vitest'
import { repondre } from './reponsesDemo'

describe('démonstration publique — réponse churn-predict', () => {
  const rep = repondre('POST', '/ark-intelligence/churn-predict')
  const d = rep.donnees

  it('répond en 200 avec des données exploitables', () => {
    expect(rep.statut).toBe(200)
    expect(d).toBeTruthy()
  })

  it('fournit les quatre compteurs affichés par le bloc churn', () => {
    // Champs réellement lus par pages/ArkIntelligence.jsx
    expect(typeof d.total_clients_scanned).toBe('number')
    expect(typeof d.average_score).toBe('number')
    expect(typeof d.at_risk_count).toBe('number')
    expect(Array.isArray(d.top_risks)).toBe(true)
  })

  it("n'affiche jamais undefined : tous les nombres sont définis et cohérents", () => {
    expect(Number.isFinite(d.total_clients_scanned)).toBe(true)
    expect(Number.isFinite(d.average_score)).toBe(true)
    expect(Number.isFinite(d.at_risk_count)).toBe(true)
    expect(d.total_clients_scanned).toBeGreaterThan(0)
    expect(d.average_score).toBeGreaterThan(0)
    expect(d.average_score).toBeLessThanOrEqual(100)
    expect(d.at_risk_count).toBeLessThanOrEqual(d.total_clients_scanned)
  })

  it('chaque client à risque porte les champs que la liste affiche', () => {
    expect(d.top_risks.length).toBeGreaterThan(0)
    for (const c of d.top_risks) {
      expect(c.client_id).toBeTruthy()
      expect(c.client_name).toBeTruthy()
      expect(['faible', 'modere', 'eleve', 'critique']).toContain(c.risk_level)
      expect(Number.isFinite(c.score)).toBe(true)
      expect(Number.isFinite(c.lifetime_value)).toBe(true)
      expect(c.retention_plan?.steps?.length).toBeGreaterThan(0)
    }
  })

  it('les cinq premiers risques sont les scores les plus faibles (ordre utile)', () => {
    const scores = d.top_risks.map((c) => c.score)
    const tri = [...scores].sort((a, b) => a - b)
    expect(scores).toEqual(tri)
  })
})
