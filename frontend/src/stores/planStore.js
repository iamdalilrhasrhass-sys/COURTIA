/**
 * planStore.js — Store unifié des plans COURTIARK
 *
 * Les MONTANTS et les CODES des offres viennent de market/plansReference.js
 * (référentiel unique des offres publiques, aux codes du BACKEND) — jamais d'un
 * prix recopié ici. En application, la source de vérité reste l'API
 * (`/billing/me`, `/billing/plans`) : ces définitions ne servent qu'à l'affichage
 * et au repli quand l'API ne fournit ni libellé ni droits.
 *
 * CODES BACKEND : FR starter · pro · cabinet (alias historique « premium »)
 *                 CH independant · cabinet_ch · cabinet_ch_sur_devis
 */

import { create } from 'zustand'
import api from '../api'
import { findPublicPlanByCode, SUR_DEVIS_LABEL } from '../market/plansReference'

/* ---------------------------------------------------------------------------
   Paliers internes de capacités (features + limites), inchangés : ce sont eux
   qui portent les droits, pas les montants.
   ------------------------------------------------------------------------- */
const PALIERS = {
  starter: {
    feature_map: {
      ark_basic: true,
      ark_full: false,
      reach: false,
      automations: false,
      advanced_reports: false,
      premium_support: false,
      multi_user: false,
      csv_import: true,
      crm_full: false,
      scoring: false,
    },
    limits: {
      max_clients: 3,
      max_contrats: 50,
      max_ark_messages: 200,
      max_pdf_generations: 20,
      max_users: 1,
    },
  },
  pro: {
    feature_map: {
      ark_basic: true,
      ark_full: true,
      reach: true,
      automations: true,
      advanced_reports: true,
      premium_support: false,
      multi_user: false,
      csv_import: true,
      crm_full: true,
      scoring: true,
    },
    limits: {
      max_clients: Infinity,
      max_contrats: Infinity,
      max_ark_messages: 2000,
      max_pdf_generations: 200,
      max_users: 1,
    },
  },
  cabinet: {
    feature_map: {
      ark_basic: true,
      ark_full: true,
      reach: true,
      automations: true,
      advanced_reports: true,
      premium_support: true,
      multi_user: true,
      csv_import: true,
      crm_full: true,
      scoring: true,
    },
    limits: {
      max_clients: Infinity,
      max_contrats: Infinity,
      max_ark_messages: Infinity,
      max_pdf_generations: Infinity,
      max_users: Infinity,
    },
  },
}

/* Code backend → palier de capacités. Un code CH est un code de PREMIER ordre :
   il a son propre palier, il ne retombe pas sur « starter ». */
const PALIER_PAR_CODE = {
  starter: 'starter',
  pro: 'pro',
  cabinet: 'cabinet',
  // Alias historiques français : mêmes droits que « cabinet ».
  premium: 'cabinet',
  cabinet_sur_devis: 'cabinet',
  // Marché suisse (codes servis par le backend). LE PALIER SUIT LE CATALOGUE DU
  // SERVEUR, pas une intuition commerciale : dans `planService`, l'offre suisse
  // « independant » est construite sur `PLANS.pro` (`features: {...PLANS.pro.features}`,
  // `limits: {...PLANS.pro.limits}`) et « cabinet_ch » sur `PLANS.cabinet`.
  // La mapper sur « starter » afficherait à un abonné suisse à 199 CHF les
  // capacités du plan d'entrée français (3 clients, 1 utilisateur, pas de
  // multi-utilisateur) — exactement le défaut P1 corrigé côté serveur.
  independant: 'pro',
  cabinet_ch: 'cabinet',
  cabinet_ch_sur_devis: 'cabinet',
}

/* Alias historiques : leur définition EST celle de leur code canonique. */
const CODE_CANONIQUE = { premium: 'cabinet', cabinet_sur_devis: 'cabinet' }

const COULEUR_PAR_CODE = {
  starter: 'slate',
  pro: 'purple',
  cabinet: 'amber',
  premium: 'amber',
  cabinet_sur_devis: 'amber',
  independant: 'slate',
  cabinet_ch: 'amber',
  cabinet_ch_sur_devis: 'amber',
}

function definitionDepuisReference(code, reference, palier) {
  return {
    id: CODE_CANONIQUE[code] || code,
    code,
    name: reference.name,
    // `null` = offre sur devis. Aucun montant n'est inventé ici : le montant
    // publié vient du référentiel, et le montant facturé vient de l'API.
    price: reference.monthly,
    currency: reference.currencySymbol,
    interval: reference.interval,
    description: reference.description,
    highlighted: !!reference.highlighted,
    badge: reference.surDevis ? SUR_DEVIS_LABEL : reference.badge,
    surDevis: !!reference.surDevis,
    // Frais d'installation suisses : information d'AFFICHAGE (absents de l'API).
    setupLabel: reference.setupLabel,
    color: COULEUR_PAR_CODE[code] || 'slate',
    features_list: reference.features,
    feature_map: PALIERS[palier].feature_map,
    limits: PALIERS[palier].limits,
  }
}

/**
 * Définition interne des plans, par code BACKEND (FR et CH).
 * Construite depuis market/plansReference.js : un code suisse garde son nom, sa
 * devise et son montant publiés au lieu de retomber sur une offre française.
 */
export const PLANS_DEFINITION = Object.entries(PALIER_PAR_CODE).reduce((acc, [code, palier]) => {
  const reference = findPublicPlanByCode(CODE_CANONIQUE[code] || code)
  if (reference) acc[code] = definitionDepuisReference(code, reference, palier)
  return acc
}, {})

/** Code de repli : utilisé UNIQUEMENT quand le code reçu est réellement inconnu. */
export const DEFAULT_PLAN_CODE = 'starter'

/**
 * Définition interne d'un plan par code backend. `null` si le code est inconnu
 * — l'appelant décide alors du repli (jamais un code CH valide).
 */
export function resolvePlanDefinition(code) {
  const key = String(code ?? '').trim().toLowerCase()
  return PLANS_DEFINITION[key] || null
}

/**
 * Définition pour l'affichage : un code backend valide (CH compris) garde SA
 * définition ; le plan par défaut ne sert que pour un code inconnu ou absent.
 */
export function resolvePlanDefinitionOrDefault(code) {
  return resolvePlanDefinition(code) || PLANS_DEFINITION[DEFAULT_PLAN_CODE]
}

// Mapping feature → plan minimum
export const FEATURE_GATES = {
  ark_basic: 'starter',
  ark_full: 'pro',
  reach: 'pro',
  automations: 'pro',
  advanced_reports: 'pro',
  premium_support: 'cabinet',
  multi_user: 'cabinet',
  csv_import: 'starter',
  crm_full: 'pro',
  scoring: 'pro',
}

export const usePlanStore = create((set, get) => ({
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

  fetchPlanInfo: async () => {
    set({ loading: true, error: null })
    try {
      const res = await api.get('/billing/me')
      const { subscription } = res.data
      set({
        currentPlan: subscription.plan,
        planName: subscription.plan_name,
        planPrice: subscription.price,
        subscriptionStatus: subscription.status,
        onTrial: subscription.on_trial,
        trialEndsAt: subscription.trial_ends_at,
        limits: subscription.limits || {},
        usage: subscription.usage || {},
        features: subscription.features || {},
        loading: false,
      })
    } catch (_err) {
      // Fallback: essayer l'ancienne route /plans/info
      try {
        const res = await api.get('/plans/info')
        const data = res.data
        // Résolution par CODE BACKEND (FR et CH). Un cabinet suisse abonné
        // ('independant', 'cabinet_ch') garde son offre ; « starter » n'est plus
        // servi qu'à un code réellement inconnu.
        const planDef = resolvePlanDefinitionOrDefault(data.plan)
        set({
          currentPlan: data.plan || null,
          planName: planDef.name,
          planPrice: planDef.price,
          subscriptionStatus: data.subscription_status || 'active',
          onTrial: data.on_trial || false,
          trialEndsAt: data.trial_ends_at || null,
          limits: data.limits || planDef.limits,
          usage: data.usage || {},
          features: data.features || planDef.feature_map,
          loading: false,
        })
      } catch (_fallbackErr) {
        set({ loading: false, error: "Impossible de charger votre offre pour le moment." })
      }
    }
  },

  refreshUsage: async () => {
    try {
      const res = await api.get('/billing/usage')
      set({ usage: res.data.usage || {} })
    } catch {
      // Silencieux en cas d'erreur
    }
  },

  hasFeature: (key) => {
    const features = get().features
    return features[key] === true
  },

  isUnderLimit: (limitKey) => {
    const limits = get().limits
    const usage = get().usage
    const key = limitKey.replace('max_', '')
    const max = limits[limitKey]
    if (max === null || max === undefined || max === Infinity) return true
    const current = usage[key]?.current || 0
    return current < max
  },

  getUsagePercent: (limitKey) => {
    const limits = get().limits
    const usage = get().usage
    const key = limitKey.replace('max_', '')
    const max = limits[limitKey]
    if (max === null || max === undefined || max === Infinity) return 0
    const current = usage[key]?.current || 0
    return Math.round((current / max) * 100)
  },

  getMinPlanForFeature: (feature) => {
    return FEATURE_GATES[feature] || null
  },

  isAllowed: (feature) => {
    const features = get().features
    return features[feature] === true
  },

  isLoading: () => get().loading,
}))

/**
 * Hook utilitaire pour vérifier l'accès à une fonctionnalité
 */
export const useCanAccess = (feature) => {
  const features = usePlanStore(s => s.features)
  const currentPlan = usePlanStore(s => s.currentPlan)
  const onTrial = usePlanStore(s => s.onTrial)
  const allowed = features[feature] === true

  const minPlan = FEATURE_GATES[feature] || null
  const planDef = minPlan ? PLANS_DEFINITION[minPlan] : null

  return {
    allowed,
    reason: allowed ? null : 'feature_locked',
    upgradeRequired: !allowed,
    currentPlan,
    requiredPlan: minPlan,
    requiredPlanName: planDef?.name || minPlan,
    onTrial,
  }
}
