import { create } from 'zustand'
import api from '../api'

const usePartnerStore = create((set, get) => ({
  partners: [],
  stats: null,
  loading: false,
  error: null,

  fetchPartners: async (filters = {}) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams(filters).toString()
      const { data } = await api.get(`/partners${params ? '?' + params : ''}`)
      set({ partners: data.partners || [], loading: false })
    } catch (err) {
      set({ error: err.response?.data?.error || 'Erreur chargement partenaires', loading: false })
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await api.get('/partners/stats')
      set({ stats: data })
    } catch (err) { /* silencieux */ }
  },

  createPartner: async (partner) => {
    const { data } = await api.post('/partners', partner)
    set(s => ({ partners: [...s.partners, data.partner] }))
    return data.partner
  },

  updatePartner: async (id, updates) => {
    const { data } = await api.put(`/partners/${id}`, updates)
    set(s => ({ partners: s.partners.map(p => p.id === id ? data.partner : p) }))
    return data.partner
  },

  updateStatus: async (id, statut) => {
    const { data } = await api.patch(`/partners/${id}/statut`, { statut })
    set(s => ({ partners: s.partners.map(p => p.id === id ? data.partner : p) }))
    return data.partner
  },

  deletePartner: async (id) => {
    await api.delete(`/partners/${id}`)
    set(s => ({ partners: s.partners.filter(p => p.id !== id) }))
  }
}))

export default usePartnerStore
