import { describe, expect, it } from 'vitest'
import { normaliserTaches, normaliserTache, statistiquesTaches, finDeSemaine, actionConfirmee } from './tachesViewModel'

const AUJOURDHUI = '2026-09-20' // dimanche

describe('tachesViewModel — aucune donnée fabriquée', () => {
  it('une liste vide reste vide (plus de jeu de démonstration)', () => {
    expect(normaliserTaches([])).toEqual([])
    expect(normaliserTaches({ data: [] })).toEqual([])
    expect(normaliserTaches(null)).toEqual([])
  })

  it('assemble le nom du client depuis l’API, jamais un nom inventé', () => {
    const t = normaliserTache({ id: 7, titre: 'Rappeler', client_prenom: 'Camille', client_nom: 'Durand' })
    expect(t.client_nom).toBe('Camille Durand')
    expect(normaliserTache({ id: 8, titre: 'Sans client' }).client_nom).toBe('')
    expect(normaliserTache({ id: 9, titre: 'X', client_id: 42 }).client_nom).toBe('Client #42')
  })

  it('ne date pas une tâche sans échéance', () => {
    expect(normaliserTache({ id: 1, titre: 'A' }).echeance).toBeNull()
  })

  it('compte uniquement ce qui est mesurable, null si rien n’est chargé', () => {
    const taches = normaliserTaches([
      { id: 1, titre: 'Retard', echeance: '2026-09-18', statut: 'a_faire' },
      { id: 2, titre: 'Aujourd hui', echeance: '2026-09-20', statut: 'a_faire' },
      { id: 3, titre: 'Semaine', echeance: '2026-09-24', statut: 'a_faire' },
      { id: 4, titre: 'Terminée', echeance: '2026-09-19', statut: 'terminee' },
      { id: 5, titre: 'Sans échéance', statut: 'a_faire' },
    ])
    const s = statistiquesTaches(taches, AUJOURDHUI)
    expect(s.retard).toBe(1)      // la tâche terminée n'est pas « en retard »
    expect(s.aujourdhui).toBe(1)
    expect(s.semaine).toBe(2)     // aujourd'hui + cette semaine, hors terminées
    expect(s.terminees).toBe(1)
    expect(statistiquesTaches(null, AUJOURDHUI)).toEqual({ retard: null, aujourdhui: null, semaine: null, terminees: null })
  })

  it('la fin de semaine est calculée, jamais figée', () => {
    expect(finDeSemaine('2026-09-20')).toBe('2026-09-20') // dimanche : la semaine finit le jour même
    expect(finDeSemaine('2026-09-21')).toBe('2026-09-27')
  })

  it('une action n’est confirmée que si le backend l’a confirmée', () => {
    expect(actionConfirmee('suppression', { success: true })).toBe(true)
    expect(actionConfirmee('suppression', {})).toBe(false)
    expect(actionConfirmee('creation', { id: 12 })).toBe(true)
    expect(actionConfirmee('creation', null)).toBe(false)
  })
})
