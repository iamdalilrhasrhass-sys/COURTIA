import { create } from 'zustand'
import { useAuthStore } from './authStore'

const API_URL = 'https://courtia.onrender.com'

export const useClientStore = create((set) => ({
  clients: [],
  loading: false,
  error: null,

  fetchClients: async () => {
    set({ loading: true, error: null })
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`${API_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      set({ clients: data.clients || [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  createClient: async (client) => {
    try {
      const token = useAuthStore.getState().token
      const res = await fetch(`${API_URL}/api/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(client),
      })
      const data = await res.json()
      set((state) => ({ clients: [data.client, ...state.clients] }))
      return data.client
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },
}))
