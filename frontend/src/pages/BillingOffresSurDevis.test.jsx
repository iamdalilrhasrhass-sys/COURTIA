/* ============================================================================
   BillingOffresSurDevis.test.jsx — une offre SUR DEVIS ne lance JAMAIS Checkout.

   POURQUOI : le bouton d'une offre sur devis affichait « Choisir ce plan » et
   lançait un Checkout que le serveur refuse par 409 `cabinet_contact_required` ;
   seul le code français 'premium' déclenchait le parcours contact. Les offres
   suisses (cabinet_ch_sur_devis) et 'cabinet' n'avaient donc aucun chemin.

   MÉTHODE : l'environnement de test de ce dépôt est Node (pas de jsdom, pas de
   @testing-library), donc :
     • la décision d'envoi est une fonction PURE (`resoudreEnvoiOffre`) testée
       directement — c'est elle qui décide « contact » ou « checkout » ;
     • la carte d'offre est RENDUE (react-dom/server) pour vérifier le libellé
       réellement affiché, et que le prix vient bien de l'API ;
     • le code de l'écran est relu pour prouver que l'appel Checkout est en aval
       de la décision (aucun appel possible pour une offre sur devis).
   ========================================================================== */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanCard, resoudreEnvoiOffre } from './Billing'
import { QUOTE_ONLY_PLAN_CODES, SUR_DEVIS_LABEL } from '../market/plansReference'

const ICI = dirname(fileURLToPath(import.meta.url))
const SOURCE_BILLING = readFileSync(resolve(ICI, 'Billing.jsx'), 'utf8')

const rendreCarte = (plan) =>
  renderToStaticMarkup(<PlanCard plan={plan} selected={false} loading={false} onSelect={() => {}} />)

describe('(b) offre sur devis — parcours contact, jamais Checkout', () => {
  it('la décision envoie CHAQUE offre sur devis vers le parcours contact existant', () => {
    for (const code of QUOTE_ONLY_PLAN_CODES) {
      const envoi = resoudreEnvoiOffre(code)
      expect(envoi.action).toBe('contact')
      expect(envoi.path).toBe('/contact?type=premium')
      // Aucun endpoint de Checkout n'est même retourné : l'appel est impossible.
      expect(envoi.endpoint).toBeNull()
    }
  })

  it('les offres payantes (FR et CH) gardent le Checkout self-serve', () => {
    for (const code of ['starter', 'pro', 'independant', 'cabinet_ch']) {
      const envoi = resoudreEnvoiOffre(code)
      expect(envoi.action).toBe('checkout')
      expect(envoi.endpoint).toBe('/billing/checkout-session')
      expect(envoi.path).toBeNull()
    }
  })

  it('le code suisse « cabinet_ch_sur_devis » est couvert (le défaut mesuré)', () => {
    expect(resoudreEnvoiOffre('cabinet_ch_sur_devis').action).toBe('contact')
    expect(resoudreEnvoiOffre('cabinet_sur_devis').action).toBe('contact')
    expect(resoudreEnvoiOffre('cabinet').action).toBe('contact')
  })

  it('la décision est prise AVANT l’appel Checkout, et il n’existe qu’un seul chemin', () => {
    // Plus aucune comparaison au seul alias français 'premium' : c'est la
    // décision centrale qui couvre FR + CH.
    expect(SOURCE_BILLING).not.toContain("planCode === 'premium'")
    expect(SOURCE_BILLING).not.toContain("plan.code === 'premium'")
    // L'URL de Checkout n'est plus écrite en dur dans l'écran.
    expect(SOURCE_BILLING).not.toContain("api.post('/billing/checkout-session'")

    const decision = SOURCE_BILLING.indexOf('resoudreEnvoiOffre(planCode)')
    const retourContact = SOURCE_BILLING.indexOf("if (envoi.action === 'contact')")
    const envoiCheckout = SOURCE_BILLING.indexOf('api.post(envoi.endpoint')
    expect(decision).toBeGreaterThan(-1)
    expect(retourContact).toBeGreaterThan(decision)
    // Le Checkout est APRÈS la décision et après le retour anticipé du contact.
    expect(envoiCheckout).toBeGreaterThan(retourContact)
    // Le parcours contact réutilise la route du produit (aucune page nouvelle).
    expect(SOURCE_BILLING).toContain('QUOTE_CONTACT_PATH')
  })

  it('le bouton d’une offre sur devis dit « Demander une offre »', () => {
    for (const code of QUOTE_ONLY_PLAN_CODES) {
      const html = rendreCarte({ code, name: 'Offre cabinet', price: null, highlighted: false })
      expect(html).toContain('Demander une offre')
      expect(html).not.toContain('Choisir ce plan')
    }
  })

  it('le bouton d’une offre payante dit « Choisir ce plan », y compris en Suisse', () => {
    for (const code of ['starter', 'pro', 'independant', 'cabinet_ch']) {
      const html = rendreCarte({ code, name: 'Offre', price: 199, highlighted: false })
      expect(html).toContain('Choisir ce plan')
      expect(html).not.toContain('Demander une offre')
    }
  })

  it('le prix affiché vient de l’API (display_price_ht), jamais du référentiel', () => {
    const payant = rendreCarte({
      code: 'cabinet_ch',
      name: 'Cabinet',
      price: 349,
      display_price_ht: '349 CHF HT / mois',
      highlighted: true,
    })
    expect(payant).toContain('349 CHF HT / mois')

    const surDevis = rendreCarte({
      code: 'cabinet_ch_sur_devis',
      name: 'Sur-Mesure / Fiduciaire',
      price: null,
      display_price_ht: SUR_DEVIS_LABEL,
      highlighted: false,
    })
    expect(surDevis).toContain(SUR_DEVIS_LABEL)
  })
})
