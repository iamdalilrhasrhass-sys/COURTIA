import { create } from 'zustand'
import { useAuthStore } from './authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const useClientStore = create((set, get) => ({
  clients: [],
  selectedClient: null,
  loading: false,
  error: null,

  fetchClients: async (token) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set({ clients: data.clients || [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  fetchClientDetail: async (id) => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const headers = { Authorization: `Bearer ${token}` }

      const [clientRes, contractsRes] = await Promise.all([
        fetch(`${API_URL}/api/clients/${id}`, { headers }),
        fetch(`${API_URL}/api/clients/${id}/contracts`, { headers }),
      ])

      if (!clientRes.ok) throw new Error(`Client HTTP ${clientRes.status}`)

      const client = await clientRes.json()
      const contractsData = contractsRes.ok ? await contractsRes.json() : { contracts: [] }

      const enriched = { ...client, contracts: contractsData.contracts || [] }
      set({ selectedClient: enriched, loading: false })
      return enriched
    } catch (err) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  setSelectedClient: (client) => set({ selectedClient: client }),

  addClient: async (client, token) => {
    try {
      const res = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(client),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      set((state) => ({ clients: [data.client, ...state.clients] }))
      return data.client
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  updateClient: async (id, client, token) => {
    try {
      const res = await fetch(`${API_URL}/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(client),
      })
      const data = await res.json()
      set((state) => ({
        clients: state.clients.map(c => c.id === id ? data.client : c)
      }))
      return data.client
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  deleteClient: async (id) => {
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`${API_URL}/api/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return false
      set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }))
      return true
    } catch (err) {
      set({ error: err.message })
      return false
    }
  },

  refreshClientScore: async (id) => {
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`${API_URL}/api/clients/${id}/score/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const selected = get().selectedClient
      if (selected && selected.id === id) {
        set({
          selectedClient: {
            ...selected,
            risk_score: data.risk.score,
            risk_level: data.risk.level,
            risk_reasons: data.risk.reasons,
          }
        })
      }
      return data
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },
}))
