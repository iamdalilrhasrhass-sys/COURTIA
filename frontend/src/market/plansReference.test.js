/* ============================================================================
   plansReference.test.js — la grille PUBLIQUE doit correspondre EXACTEMENT à
   celle servie par le backend (/api/billing/plans, planService.js).

   POURQUOI : les prix étaient recopiés à la main en trois endroits et la grille
   suisse utilisait des codes inventés côté frontend ('starter'/'pro'/'premium')
   au lieu des codes backend ('independant'/'cabinet_ch'/'cabinet_ch_sur_devis') :
   un cabinet suisse abonné était donc affiché sous une offre qui n'existe pas
   pour lui. Ces tests verrouillent la correspondance.
   ========================================================================== */

import { describe, expect, it } from 'vitest'
import {
  PLANS_CH,
  PLANS_FR,
  PUBLIC_PLAN_CODES,
  QUOTE_ONLY_PLAN_CODES,
  QUOTE_CONTACT_PATH,
  SUR_DEVIS_LABEL,
  findPublicPlanByCode,
  formatAmountHt,
  formatPlanPrice,
  formatTtcFrance,
  getMarketPlans,
  getMarketReference,
  getPublicPlan,
  isQuoteOnlyPlan,
  planActionLabel,
  plansSeoDescription,
  plansSeoTitle,
  structuredDataOffers,
} from './plansReference'

describe('grille publique FR/CH — codes backend et montants exacts', () => {
  it('la France sert starter 89 € / pro 159 € / cabinet sur devis', () => {
    expect(PLANS_FR.map((plan) => plan.code)).toEqual(['starter', 'pro', 'cabinet'])

    const [starter, pro, cabinet] = PLANS_FR
    expect(starter.monthly).toBe(89)
    expect(pro.monthly).toBe(159)
    expect(cabinet.monthly).toBeNull()
    expect(cabinet.surDevis).toBe(true)

    for (const plan of PLANS_FR) {
      expect(plan.currencyCode).toBe('EUR')
      expect(plan.currencySymbol).toBe('€')
      expect(plan.interval).toBe('/mois')
    }
    expect(PLANS_FR.map((plan) => formatPlanPrice(plan))).toEqual(['89 €', '159 €', SUR_DEVIS_LABEL])
  })

  it('la Suisse sert independant 199 CHF / cabinet_ch 349 CHF / cabinet_ch_sur_devis sur devis', () => {
    expect(PLANS_CH.map((plan) => plan.code)).toEqual(['independant', 'cabinet_ch', 'cabinet_ch_sur_devis'])

    const [independant, cabinet, surMesure] = PLANS_CH
    expect(independant.monthly).toBe(199)
    expect(cabinet.monthly).toBe(349)
    expect(surMesure.monthly).toBeNull()
    expect(surMesure.surDevis).toBe(true)

    for (const plan of PLANS_CH) {
      expect(plan.currencyCode).toBe('CHF')
      expect(plan.currencySymbol).toBe('CHF')
    }
    expect(PLANS_CH.map((plan) => formatPlanPrice(plan))).toEqual(['199 CHF', '349 CHF', SUR_DEVIS_LABEL])
  })

  it('les frais d’installation suisses restent une information d’affichage, inchangée', () => {
    const [independant, cabinet, surMesure] = PLANS_CH
    expect([independant.setup, cabinet.setup, surMesure.setup]).toEqual([490, 990, 1500])
    expect(independant.setupLabel).toBe('490 CHF setup')
    expect(cabinet.setupLabel).toBe('990 CHF setup')
    expect(surMesure.setupLabel).toBe("dès 1'500 CHF setup")
    expect(cabinet.extraUserMonthly).toBe(49)
    // Le formatage des montants suisses garde l'apostrophe des milliers publiée.
    expect(formatAmountHt(1500, 'CHF')).toBe("1'500 CHF")
  })

  it('aucun code CH inventé côté frontend ne subsiste dans la grille publique', () => {
    // Les anciens alias frontend (starter/pro/premium pour la Suisse) ne doivent
    // plus exister pour le marché CH.
    expect(getPublicPlan('CH', 'starter')).toBeNull()
    expect(getPublicPlan('CH', 'pro')).toBeNull()
    expect(getPublicPlan('CH', 'premium')).toBeNull()
    expect(PUBLIC_PLAN_CODES).not.toContain('premium')
    // Et chaque code CH est bien un code reconnu du référentiel.
    for (const plan of PLANS_CH) {
      expect(findPublicPlanByCode(plan.code)).toBe(plan)
      expect(findPublicPlanByCode(plan.code.toUpperCase())).toBe(plan)
    }
  })

  it('les offres sur devis sont identifiées pour le parcours contact', () => {
    for (const code of QUOTE_ONLY_PLAN_CODES) {
      expect(isQuoteOnlyPlan(code)).toBe(true)
      expect(planActionLabel(code)).toBe('Demander une offre')
    }
    // Codes payants : Checkout self-serve, y compris les codes suisses.
    for (const code of ['starter', 'pro', 'independant', 'cabinet_ch']) {
      expect(isQuoteOnlyPlan(code)).toBe(false)
      expect(planActionLabel(code)).toBe('Choisir ce plan')
    }
    expect(QUOTE_CONTACT_PATH).toBe('/contact?type=premium')
  })

  it('les libellés SEO sont DÉRIVÉS de la grille (aucun montant recopié)', () => {
    expect(plansSeoTitle('FR')).toBe('Tarifs COURTIA — Starter 89 € / Pro 159 € / Cabinet sur devis')
    expect(plansSeoTitle('CH')).toBe('Tarifs COURTIA Suisse — CHF 199 Indépendant / 349 Cabinet (TVA 8,1 % en sus)')
    expect(plansSeoDescription('FR')).toBe(
      'Grille tarifaire COURTIA pour courtiers d’assurance : Starter 89 € HT/mois, Pro 159 € HT/mois, Cabinet sur devis. Sans frais cachés ni engagement.'
    )
    expect(plansSeoDescription('CH')).toBe(
      'Grille tarifaire COURTIA en francs suisses pour courtiers d’assurance en Suisse : Indépendant 199 CHF/mois, Cabinet 349 CHF/mois, Sur-Mesure sur devis. Setup et TVA 8,1 % indiqués.'
    )
  })

  it('le TTC français et le JSON-LD sont calculés depuis la grille', () => {
    expect(formatTtcFrance(89)).toBe('106,80 €')
    expect(formatTtcFrance(159)).toBe('190,80 €')
    expect(structuredDataOffers()).toEqual([
      { '@type': 'Offer', name: 'Starter', price: '89', priceCurrency: 'EUR' },
      { '@type': 'Offer', name: 'Pro', price: '159', priceCurrency: 'EUR' },
      { '@type': 'Offer', name: 'Indépendant (Suisse)', price: '199', priceCurrency: 'CHF' },
      { '@type': 'Offer', name: 'Cabinet (Suisse)', price: '349', priceCurrency: 'CHF' },
    ])
  })

  it('la référence de marché expose la grille et les mentions publiées', () => {
    expect(getMarketReference('CH').plans).toBe(getMarketPlans('CH'))
    expect(getMarketReference('CH').taxNote).toContain('TVA suisse 8,1')
    expect(getMarketReference('FR').taxNote).toContain('hors taxes')
    // Un marché inconnu retombe sur la France (et non sur une grille vide).
    expect(getMarketReference('XX').plans.map((plan) => plan.code)).toEqual(['starter', 'pro', 'cabinet'])
  })
})
