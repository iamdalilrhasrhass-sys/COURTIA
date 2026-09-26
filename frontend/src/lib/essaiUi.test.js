import { describe, expect, it } from 'vitest'
import { decisionEssai, lignesTarifs, paiementDisponible } from './essaiUi'

const ACTIF = { trial_state: 'TRIAL_ACTIVE', status: 'trialing', jours_restants: 7, trial_end_at: '2026-09-27T10:00:00.000Z' }
const EXPIRE = { trial_state: 'TRIAL_EXPIRED', status: 'trial_expired', jours_restants: 0, trial_end_at: '2026-09-20T10:00:00.000Z' }
const ABONNE = { trial_state: 'SUBSCRIPTION_ACTIVE', status: 'active' }

const PLANS = {
  stripe_configuration: { checkout_ready: false, missing: ['STRIPE_SECRET_KEY'] },
  plans: [
    { code: 'starter', name: 'Starter', display_price_ht: '89 € HT / mois', display_price_ttc: '106,80 € TTC / mois', price: 89 },
    { code: 'pro', name: 'Pro', display_price_ht: '159 € HT / mois', display_price_ttc: '190,80 € TTC / mois', price: 159 },
    { code: 'cabinet', name: 'Cabinet', display_price_ht: 'Sur devis', price: null },
  ],
}

describe('decisionEssai — une seule vérité, celle du serveur', () => {
  it('essai actif : bandeau avec les jours RÉELS, aucun paywall', () => {
    const d = decisionEssai(ACTIF)
    expect(d.etat).toBe('TRIAL_ACTIVE')
    expect(d.bandeau.texte).toBe('7 jours restants')
    expect(d.bandeau.urgence).toBe(false)
    expect(d.paywall).toBeNull()
  })

  it('essai qui se termine (<= 2 jours) : signalé comme urgent', () => {
    expect(decisionEssai({ ...ACTIF, jours_restants: 1 }).bandeau.urgence).toBe(true)
    expect(decisionEssai({ ...ACTIF, jours_restants: 2 }).bandeau.urgence).toBe(true)
  })

  it('essai expiré : paywall avec conservation des données annoncée', () => {
    const d = decisionEssai(EXPIRE)
    expect(d.etat).toBe('TRIAL_EXPIRED')
    expect(d.bandeau).toBeNull()
    expect(d.paywall.titre).toMatch(/essai COURTIARK de 7 jours est terminé/)
    expect(d.paywall.message).toMatch(/conservés/)
    expect(d.paywall.ctaPrincipal).toBe('Choisir mon abonnement')
  })

  it('abonnement actif : ni bandeau ni paywall', () => {
    expect(decisionEssai(ABONNE).paywall).toBeNull()
    expect(decisionEssai(ABONNE).bandeau).toBeNull()
  })

  it('statut absent ou incomplet : aucune invention', () => {
    expect(decisionEssai(null).etat).toBe('inconnu')
    expect(decisionEssai({ status: 'trialing' }).etat).toBe('TRIAL_ACTIVE')
    expect(decisionEssai({ status: 'trial_expired' }).etat).toBe('TRIAL_EXPIRED')
  })

  it('les tarifs affichés viennent du serveur, jamais d’une constante', () => {
    const lignes = lignesTarifs(PLANS)
    expect(lignes.map((l) => l.prix)).toEqual(['89 € HT / mois', '159 € HT / mois', 'Sur devis'])
    expect(lignesTarifs(null)).toEqual([])
    expect(lignesTarifs({ plans: [] })).toEqual([])
  })

  it('le paiement n’est annoncé disponible que si le serveur le dit', () => {
    expect(paiementDisponible(PLANS)).toBe(false)
    expect(paiementDisponible({ stripe_configuration: { checkout_ready: true } })).toBe(true)
    expect(paiementDisponible(null)).toBe(false)
  })
})
