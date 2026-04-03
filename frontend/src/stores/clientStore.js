import { create } from 'zustand'
import { useAuthStore } from './authStore'

const API_URL = 'https://courtia.onrender.com'

export const useClientStore = create((set) => ({
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
      const data = await res.json()
      set({ clients: data.clients || [], loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  addClient: async (client, token) => {
    try {
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

  deleteClient: async (id, token) => {
    try {
      await fetch(`${API_URL}/api/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      set((state) => ({
        clients: state.clients.filter(c => c.id !== id)
      }))
      return true
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  setSelectedClient: (client) => set({ selectedClient: client }),
}))
