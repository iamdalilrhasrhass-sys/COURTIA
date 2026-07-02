import { describe, expect, it } from 'vitest'
import {
  buildClientStats,
  filterClientViewModels,
  normalizeClient,
  normalizeClientDetail,
  normalizeContract,
  normalizeStatus,
} from './clientViewModel'

describe('clientViewModel', () => {
  it('normalizes API client rows without demo data assumptions', () => {
    const client = normalizeClient({
      id: 823,
      prenom: 'Dalil BG',
      nom: 'Rhasrhass',
      email: 'iamdalilrhasrhass@gmail.com',
      telephone: '+33619488459',
      statut: 'prospect',
      segment: 'particulier',
      city: 'Sens',
      score_risque: 42,
      created_at: '2026-07-01T12:00:00.000Z',
    })

    expect(client.id).toBe(823)
    expect(client.name).toBe('Dalil BG Rhasrhass')
    expect(client.status).toBe('prospect')
    expect(client.statusLabel).toBe('Prospect')
    expect(client.type).toBe('Particulier')
    expect(client.score).toBe(42)
    expect(client.email).toBe('iamdalilrhasrhass@gmail.com')
  })

  it('filters by search, segment and status', () => {
    const clients = [
      normalizeClient({ id: 1, prenom: 'Dalil BG', nom: 'Rhasrhass', statut: 'prospect', segment: 'particulier' }),
      normalizeClient({ id: 2, prenom: 'Martin', nom: 'Conseil', statut: 'actif', segment: 'pro' }),
    ]

    expect(filterClientViewModels(clients, { search: 'dalil', filter: 'tous' }).map(c => c.id)).toEqual([1])
    expect(filterClientViewModels(clients, { search: '', filter: 'pro' }).map(c => c.id)).toEqual([2])
    expect(filterClientViewModels(clients, { search: '', filter: 'prospect' }).map(c => c.id)).toEqual([1])
  })

  it('builds KPI stats from the actual loaded collection', () => {
    const stats = buildClientStats([
      normalizeClient({ score_risque: 80, statut: 'actif' }),
      normalizeClient({ score_risque: 40, statut: 'a_risque' }),
    ])

    expect(stats).toEqual({ total: 2, actifs: 1, inactifs: 1, avgScore: 60 })
  })

  it('normalizes accented cancellation statuses consistently', () => {
    expect(normalizeStatus('résilié')).toBe('resilié')
    expect(normalizeStatus('resilié')).toBe('resilié')
  })

  it('normalizes client details and contracts for the 360 page', () => {
    const client = normalizeClientDetail({
      first_name: 'Rassurez',
      last_name: 'Vous',
      phone: '0612345678',
      address: '1 rue de Paris',
      created_at: '2026-07-01T12:00:00.000Z',
    })
    const contract = normalizeContract({
      id: 12,
      type_contrat: 'Auto',
      compagnie: 'Test Assur',
      prime_annuelle: '1200',
      status: 'actif',
    })

    expect(client.name).toBe('Rassurez Vous')
    expect(client.telephone).toBe('0612345678')
    expect(client.adresse).toBe('1 rue de Paris')
    expect(contract.type).toBe('Auto')
    expect(contract.prime).toBe(1200)
  })
})
