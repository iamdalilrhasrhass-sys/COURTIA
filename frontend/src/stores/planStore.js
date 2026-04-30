/**
 * planStore.js — Store unifié des plans COURTIA
 * Plans : starter (89€), pro (159€), premium (sur devis)
 */

import { create } from 'zustand'
import api from '../api'

// Définition centralisée des plans (source de vérité côté frontend)
export const PLANS_DEFINITION = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 89,
    currency: '€',
    interval: '/mois',
    description: 'Pour les courtiers qui débutent',
    highlighted: false,
    badge: 'Débutant',
    color: 'slate',
    features_list: [
      'CRM basique',
      'ARK Assistant (limité)',
      'Gestion des clients (3 max)',
      'Import CSV',
      'Tableau de bord simple',
    ],
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
    id: 'pro',
    name: 'Pro',
    price: 159,
    currency: '€',
    interval: '/mois',
    description: 'La solution complète pour les professionnels — OFFRE RECOMMANDÉE',
    highlighted: true,
    badge: 'Recommandé',
    color: 'purple',
    features_list: [
      'CRM complet',
      'ARK complet (analyse, scoring)',
      'REACH (prospection multicanal)',
      'Automations & relances',
      'Rapports avancés',
      'Scoring client',
      'Clients & contrats illimités',
    ],
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
  premium: {
    id: 'premium',
    name: 'Premium',
    price: null,
    currency: '€',
    interval: '/mois',
    description: 'Solution sur-mesure pour les cabinets',
    highlighted: false,
    badge: 'Sur devis',
    color: 'amber',
    features_list: [
      'Tout Pro +',
      'Multi-utilisateurs',
      'Support prioritaire',
      'Accompagnement dédié',
      'Fonctionnalités sur mesure',
    ],
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

// Mapping feature → plan minimum
export const FEATURE_GATES = {
  ark_basic: 'starter',
  ark_full: 'pro',
  reach: 'pro',
  automations: 'pro',
  advanced_reports: 'pro',
  premium_support: 'premium',
  multi_user: 'premium',
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
    } catch (err) {
      // Fallback: essayer l'ancienne route /plans/info
      try {
        const res = await api.get('/plans/info')
        const data = res.data
        const planDef = PLANS_DEFINITION[data.plan] || PLANS_DEFINITION.starter
        set({
          currentPlan: data.plan,
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
      } catch (fallbackErr) {
        set({ loading: false, error: err.message || fallbackErr.message })
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
