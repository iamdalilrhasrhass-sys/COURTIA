import { create } from 'zustand'
import axios from 'axios'

const API_URL = 'https://courtia.onrender.com'

export const useClientStore = create((set) => ({
  clients: [],
  selectedClient: null,
  loading: false,
  filter: { status: 'all', search: '' },

  fetchClients: async (token) => {
    set({ loading: true })
    try {
      const response = await axios.get(`${API_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      set({ clients: response.data.clients, loading: false })
    } catch (error) {
      set({ loading: false })
      console.error('Erreur fetch clients', error)
    }
  },

  addClient: async (clientData, token) => {
    try {
      const response = await axios.post(`${API_URL}/api/clients`, clientData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      set((state) => ({ clients: [...state.clients, response.data.client] }))
      return true
    } catch (error) {
      console.error('Erreur ajout client', error)
      return false
    }
  },

  updateClient: async (id, clientData, token) => {
    try {
      const response = await axios.put(`${API_URL}/api/clients/${id}`, clientData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      set((state) => ({
        clients: state.clients.map((c) => (c.id === id ? response.data.client : c))
      }))
      return true
    } catch (error) {
      console.error('Erreur update client', error)
      return false
    }
  },

  deleteClient: async (id, token) => {
    try {
      await axios.delete(`${API_URL}/api/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }))
      return true
    } catch (error) {
      console.error('Erreur delete client', error)
      return false
    }
  },

  setSelectedClient: (client) => set({ selectedClient: client }),
  setFilter: (filter) => set({ filter })
}))
