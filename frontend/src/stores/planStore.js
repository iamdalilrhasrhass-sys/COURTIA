import { create } from 'zustand'
import api from '../api'

export const usePlanStore = create((set, get) => ({
  currentPlan: null, // 'start' | 'pro' | 'elite'
  limits: {}, // { max_clients, max_contracts, max_ark_messages_monthly, max_pdf_generations_monthly }
  usage: {}, // { clients, contracts, ark_messages, generated_docs }
  features: {}, // { morning_brief: true, kanban: false, ... }
  impersonation: null, // { admin_id, target_user_id, started_at, log_id, target: { id, first_name, last_name } }
  loading: false,
  error: null,

  fetchPlanInfo: async () => {
    set({ loading: true, error: null })
    try {
      const res = await api.get('/plans/info')
      set({
        currentPlan: res.data.plan,
        limits: res.data.limits || {},
        usage: res.data.usage || {},
        features: res.data.features || {},
        impersonation: res.data.impersonation || null,
        loading: false
      })
    } catch (err) {
      set({ loading: false, error: err.message })
    }
  },

  refreshUsage: async () => {
    try {
      const res = await api.get('/plans/usage')
      set({ usage: res.data.usage || {} })
    } catch {}
  },

  hasFeature: (key) => {
    const f = get().features
    return f[key] === true
  },

  isUnderLimit: (limitKey) => {
    const limits = get().limits
    const usage = get().usage
    const max = limits[limitKey]
    if (max === null || max === undefined) return true // illimité
    const current = usage[limitKey] || 0
    return current < max
  }
}))

// Hook utilitaire exporté
export const useCanAccess = (feature) => {
  const features = usePlanStore(s => s.features)
  const currentPlan = usePlanStore(s => s.currentPlan)
  const allowed = features[feature] === true
  return {
    allowed,
    reason: allowed ? null : 'feature_locked',
    upgradeRequired: !allowed,
    currentPlan
  }
}
