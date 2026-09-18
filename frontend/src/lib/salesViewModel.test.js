import { describe, it, expect } from 'vitest'
import {
  NON_MESURE, lireMesure, lignesFunnel, blocsResume, lireScore, progressionDemo,
  lireHotLead, etiquetteStatut, formatDate, ouVide, provenance, nomLead, couleurScore,
} from './salesViewModel'

describe('lireMesure — aucun zéro fictif', () => {
  it('affiche « non mesuré » quand le service renvoie valeur null', () => {
    const r = lireMesure({ valeur: null, mesure: 'non mesuré', detail: 'canal jamais observé' })
    expect(r.estMesure).toBe(false)
    expect(r.texte).toBe(NON_MESURE)
    expect(r.texte).not.toBe('0')
    expect(r.detail).toBe('canal jamais observé')
  })

  it('affiche le 0 quand il est réellement mesuré', () => {
    const r = lireMesure({ valeur: 0, mesure: 'mesuré' })
    expect(r.estMesure).toBe(true)
    expect(r.texte).toBe('0')
  })

  it('ne prend jamais une mesure « non mesuré » pour un 0, même si valeur=0 est présent', () => {
    const r = lireMesure({ valeur: 0, mesure: 'non mesuré' })
    expect(r.estMesure).toBe(false)
    expect(r.texte).toBe(NON_MESURE)
  })

  it('résiste à un bloc absent', () => {
    expect(lireMesure(undefined).texte).toBe(NON_MESURE)
    expect(lireMesure(null).estMesure).toBe(false)
  })

  it('remonte le drapeau d’écart entre deux canaux', () => {
    const r = lireMesure({ valeur: 0, mesure: 'mesuré', ecart: true })
    expect(r.ecart).toBe(true)
  })
})

describe('lignesFunnel', () => {
  it('ordonne les étapes et traduit les valeurs non mesurées', () => {
    const lignes = lignesFunnel({
      etapes: [
        { cle: 'rdv', libelle: 'RDV', ordre: 7, valeur: 0, mesure: 'mesuré', sources: [] },
        { cle: 'cta', libelle: 'CTA', ordre: 2, valeur: null, mesure: 'non mesuré', sources: [] },
        { cle: 'demandes', libelle: 'Demandes', ordre: 3, valeur: 10, mesure: 'mesuré', sources: [] },
      ],
    })
    expect(lignes.map((l) => l.cle)).toEqual(['cta', 'demandes', 'rdv'])
    expect(lignes[0].texte).toBe(NON_MESURE)
    expect(lignes[1].texte).toBe('10')
    expect(lignes[2].texte).toBe('0')
  })

  it('retombe sur les libellés de référence si le service n’en fournit pas', () => {
    const lignes = lignesFunnel({ etapes: [{ cle: 'gagnes', ordre: 9, valeur: 0, mesure: 'mesuré' }] })
    expect(lignes[0].libelle).toBe('Gagnés')
  })
})

describe('blocsResume — Morning Brief', () => {
  it('expose les six blocs dans l’ordre et conserve « non mesuré »', () => {
    const blocs = blocsResume({
      blocs: {
        nouveaux_leads: { valeur: 0, mesure: 'mesuré' },
        leads_chauds: { valeur: 2, mesure: 'mesuré', leads: [{ id: 1 }] },
        demos_terminees: { valeur: null, mesure: 'non mesuré', detail: 'aucun événement' },
        essais: { valeur: 0, mesure: 'mesuré' },
        rdv: { valeur: 0, mesure: 'mesuré' },
        relances_a_faire: { valeur: 3, mesure: 'mesuré', leads: [{ id: 4 }, { id: 5 }, { id: 6 }] },
      },
    })
    expect(blocs.map((b) => b.cle)).toEqual([
      'nouveaux_leads', 'leads_chauds', 'demos_terminees', 'essais', 'rdv', 'relances_a_faire',
    ])
    expect(blocs[2].texte).toBe(NON_MESURE)
    expect(blocs[2].estMesure).toBe(false)
    expect(blocs[0].texte).toBe('0')
    expect(blocs[1].leads).toHaveLength(1)
    expect(blocs[5].leads).toHaveLength(3)
  })

  it('ignore un bloc absent sans fabriquer de valeur', () => {
    const blocs = blocsResume({ blocs: { essais: { valeur: null, mesure: 'non mesuré' } } })
    expect(blocs).toHaveLength(1)
    expect(blocs[0].cle).toBe('essais')
  })
})

describe('lireScore — score explicable', () => {
  it('expose les raisons lisibles du service', () => {
    const s = lireScore({
      lead_score: 40,
      score_mesure: true,
      score_raisons: ['email professionnel (cabinet.ch) (+15)', 'démo terminée (+20)'],
    })
    expect(s.note).toBe(40)
    expect(s.explique).toBe(true)
    expect(s.raisons).toContain('démo terminée (+20)')
    expect(s.texte).toBe('40/100')
  })

  it('écrit « non mesuré » plutôt que 0 quand le score n’a jamais été calculé', () => {
    const s = lireScore({ lead_score: 0, score_mesure: false, score_raisons: [] })
    expect(s.texte).toBe(NON_MESURE)
    expect(s.texte).not.toBe('0/100')
  })
})

describe('progressionDemo', () => {
  it('dit « non mesuré » sans horodatage ni événement de démo', () => {
    expect(progressionDemo({}).texte).toBe(NON_MESURE)
    expect(progressionDemo({}).estMesure).toBe(false)
  })

  it('lit l’horodatage du service', () => {
    expect(progressionDemo({ demo_started_at: '2026-09-18T15:00:00+00:00' }).etape).toBe('commencee')
    expect(progressionDemo({ demo_completed_at: '2026-09-18T15:10:00+00:00' }).etape).toBe('terminee')
  })

  it('utilise les événements quand l’horodatage manque', () => {
    expect(progressionDemo({ evenements: ['demo_started'] }).etape).toBe('commencee')
  })
})

describe('marqueur HOT LEAD', () => {
  it('reprend la décision du service et ses signaux', () => {
    const h = lireHotLead({ hot_lead: true, signaux_forts: ['démo terminée', 'trial_requested (+30)'] })
    expect(h.chaud).toBe(true)
    expect(h.signaux).toHaveLength(2)
  })

  it('n’invente jamais un lead chaud', () => {
    expect(lireHotLead({}).chaud).toBe(false)
    expect(lireHotLead({ lead_score: 90 }).chaud).toBe(false)
  })
})

describe('champs manquants', () => {
  it('n’affiche jamais une valeur inventée', () => {
    expect(ouVide(null)).toBe(NON_MESURE)
    expect(ouVide('')).toBe(NON_MESURE)
    expect(ouVide('Cabinet X')).toBe('Cabinet X')
    expect(formatDate(null)).toBe(NON_MESURE)
    expect(formatDate('pas-une-date')).toBe(NON_MESURE)
    expect(provenance({})).toBe(NON_MESURE)
    expect(nomLead({}).cabinet).toBe(NON_MESURE)
    expect(nomLead({}).contact).toBe(NON_MESURE)
  })

  it('traduit les statuts bruts', () => {
    expect(etiquetteStatut('MEETING_BOOKED')).toBe('RDV pris')
    expect(etiquetteStatut('INCONNU')).toBe('INCONNU')
  })

  it('borne la couleur d’un score', () => {
    expect(couleurScore(null)).toBe('#94a3b8')
    expect(couleurScore(80)).toBe('#22c55e')
  })
})
