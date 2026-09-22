/* ============================================================================
   planStore.test.js — un abonné suisse garde SON offre.

   POURQUOI : le store portait un catalogue en dur limité aux codes français et
   faisait `PLANS_DEFINITION[data.plan] || PLANS_DEFINITION.starter`. Un cabinet
   suisse abonné ('independant' ou 'cabinet_ch', codes servis par le backend)
   retombait donc sur la définition « Starter » : mauvais nom, mauvais prix,
   mauvaise devise. Ces tests verrouillent la résolution PAR CODE BACKEND.
   ========================================================================== */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('../api', () => ({ default: { get: getMock, post: vi.fn() } }))

import {
  DEFAULT_PLAN_CODE,
  PLANS_DEFINITION,
  resolvePlanDefinition,
  resolvePlanDefinitionOrDefault,
  usePlanStore,
} from './planStore'

/** État de départ du store (entre deux tests). */
const ETAT_INITIAL = {
  currentPlan: null,
  planName: null,
  planPrice: null,
  subscriptionStatus: null,
  onTrial: false,
  trialEndsAt: null,
  limits: {},
  usage: {},
  features: {},
  loading: false,
  error: null,
}

/** L'ancienne route /plans/info répond avec le seul code backend fourni. */
function repondAncienneRoute(planCode) {
  getMock.mockImplementation((url) => {
    if (url === '/billing/me') return Promise.reject(Object.assign(new Error('404'), { response: { status: 404 } }))
    if (url === '/plans/info') {
      return Promise.resolve({ data: { plan: planCode, subscription_status: 'active', usage: {} } })
    }
    return Promise.reject(new Error(`route inattendue : ${url}`))
  })
}

beforeEach(() => {
  getMock.mockReset()
  usePlanStore.setState({ ...ETAT_INITIAL })
})

describe('planStore — résolution des plans par code backend (FR et CH)', () => {
  it('les capacités d’un code CH suivent le CATALOGUE DU SERVEUR, pas un palier deviné', () => {
    // Référence serveur (backend/src/services/planService.js) :
    //   PLANS_CH.independant  = features/limits de PLANS.pro
    //   PLANS_CH.cabinet_ch   = features/limits de PLANS.cabinet
    // Le store doit refléter cela : mapper l'offre suisse à 199 CHF sur le palier
    // « starter » afficherait 3 clients et 1 utilisateur à un cabinet qui paie
    // pour l'offre Pro (1 500 clients, 3 utilisateurs côté serveur).
    // NOTE : les `limits` internes du store sont un REPLI d'affichage (l'API reste
    // l'autorité) ; on verrouille donc ici l'IDENTITÉ de palier, qui est ce qui a
    // été cassé, et non les valeurs numériques du repli.
    expect(PLANS_DEFINITION.independant.limits).toEqual(PLANS_DEFINITION.pro.limits)
    expect(PLANS_DEFINITION.independant.feature_map).toEqual(PLANS_DEFINITION.pro.feature_map)
    expect(PLANS_DEFINITION.independant.limits).not.toEqual(PLANS_DEFINITION.starter.limits)

    expect(PLANS_DEFINITION.cabinet_ch.limits).toEqual(PLANS_DEFINITION.cabinet.limits)
    expect(PLANS_DEFINITION.cabinet_ch.feature_map).toEqual(PLANS_DEFINITION.cabinet.feature_map)
    expect(PLANS_DEFINITION.cabinet_ch_sur_devis.limits).toEqual(PLANS_DEFINITION.cabinet.limits)
  })

  it('connaît les codes des DEUX marchés', () => {
    for (const code of ['starter', 'pro', 'cabinet', 'premium', 'independant', 'cabinet_ch', 'cabinet_ch_sur_devis']) {
      expect(resolvePlanDefinition(code)).toBeTruthy()
    }
    expect(resolvePlanDefinition('code_inconnu')).toBeNull()
    expect(resolvePlanDefinition(null)).toBeNull()
    expect(DEFAULT_PLAN_CODE).toBe('starter')
  })

  it('un code suisse n’est JAMAIS servi par la définition « starter »', () => {
    const starter = PLANS_DEFINITION.starter

    const independant = resolvePlanDefinition('independant')
    expect(independant).not.toBe(starter)
    expect(independant.name).toBe('Indépendant')
    expect(independant.price).toBe(199)
    expect(independant.currency).toBe('CHF')
    expect(independant.id).toBe('independant')

    const cabinetCh = resolvePlanDefinition('cabinet_ch')
    expect(cabinetCh).not.toBe(starter)
    expect(cabinetCh.name).toBe('Cabinet')
    expect(cabinetCh.price).toBe(349)
    expect(cabinetCh.currency).toBe('CHF')
    expect(cabinetCh.id).toBe('cabinet_ch')

    const surDevis = resolvePlanDefinition('cabinet_ch_sur_devis')
    expect(surDevis.name).toBe('Sur-Mesure / Fiduciaire')
    expect(surDevis.price).toBeNull()
    expect(surDevis.currency).toBe('CHF')
    expect(surDevis.surDevis).toBe(true)
  })

  it('le repli sur le plan par défaut ne sert QU’À un code réellement inconnu', () => {
    expect(resolvePlanDefinitionOrDefault('independant')).toBe(PLANS_DEFINITION.independant)
    expect(resolvePlanDefinitionOrDefault('inconnu_complet')).toBe(PLANS_DEFINITION[DEFAULT_PLAN_CODE])
    expect(resolvePlanDefinitionOrDefault(undefined)).toBe(PLANS_DEFINITION[DEFAULT_PLAN_CODE])
  })

  it('abonné suisse « independant » via /plans/info : le store lit Indépendant à 199 CHF', async () => {
    repondAncienneRoute('independant')
    await usePlanStore.getState().fetchPlanInfo()

    const state = usePlanStore.getState()
    expect(state.currentPlan).toBe('independant')
    expect(state.planName).toBe('Indépendant')
    expect(state.planPrice).toBe(199)
    // La régression : l'écran annonçait « Starter » à 89 € à un cabinet suisse.
    expect(state.planName).not.toBe(PLANS_DEFINITION.starter.name)
    expect(state.planPrice).not.toBe(PLANS_DEFINITION.starter.price)
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('abonné suisse « cabinet_ch » via /plans/info : le store lit Cabinet à 349 CHF', async () => {
    repondAncienneRoute('cabinet_ch')
    await usePlanStore.getState().fetchPlanInfo()

    const state = usePlanStore.getState()
    expect(state.currentPlan).toBe('cabinet_ch')
    expect(state.planName).toBe('Cabinet')
    expect(state.planPrice).toBe(349)
    expect(state.planName).not.toBe(PLANS_DEFINITION.starter.name)
    expect(state.limits).toBe(PLANS_DEFINITION.cabinet_ch.limits)
    expect(state.features).toBe(PLANS_DEFINITION.cabinet_ch.feature_map)
  })

  it('un code réellement inconnu garde le repli documenté', async () => {
    repondAncienneRoute('offre_qui_nexiste_pas')
    await usePlanStore.getState().fetchPlanInfo()

    const state = usePlanStore.getState()
    expect(state.currentPlan).toBe('offre_qui_nexiste_pas')
    expect(state.planName).toBe(PLANS_DEFINITION[DEFAULT_PLAN_CODE].name)
  })

  it('route principale /billing/me : le code backend du cabinet est conservé tel quel', async () => {
    getMock.mockImplementation((url) => {
      if (url === '/billing/me') {
        return Promise.resolve({
          data: {
            subscription: {
              plan: 'cabinet_ch',
              plan_name: 'Cabinet',
              price: 349,
              status: 'active',
              on_trial: false,
              limits: { max_users: 5 },
              usage: {},
              features: { multi_user: true },
            },
          },
        })
      }
      return Promise.reject(new Error(`route inattendue : ${url}`))
    })

    await usePlanStore.getState().fetchPlanInfo()

    const state = usePlanStore.getState()
    expect(state.currentPlan).toBe('cabinet_ch')
    expect(state.planName).toBe('Cabinet')
    expect(state.planPrice).toBe(349)
    expect(state.hasFeature('multi_user')).toBe(true)
    expect(state.features).toEqual({ multi_user: true })
  })
})
