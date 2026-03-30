import { create } from 'zustand'
import { useAuthStore } from './authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function apiCall(endpoint, method = 'GET', body = null) {
  const token = useAuthStore.getState().getToken()
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (token) {
    options.headers.Authorization = `Bearer ${token}`
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${endpoint}`, options)
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'API error')
  }

  return response.json()
}

export const useClientStore = create((set) => ({
  clients: [],
  currentClient: null,
  loading: false,
  error: null,
  pagination: { limit: 50, offset: 0, total: 0 },

  // Fetch all clients
  fetchClients: async (limit = 50, offset = 0, filters = {}) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams({
        limit,
        offset,
        ...filters,
      })
      const data = await apiCall(`/api/clients?${query}`)
      set({
        clients: data.clients,
        pagination: data.pagination,
        loading: false,
      })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Fetch single client
  fetchClient: async (id) => {
    set({ loading: true, error: null })
    try {
      const data = await apiCall(`/api/clients/${id}`)
      set({ currentClient: data, loading: false })
      return data
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Create client
  createClient: async (clientData) => {
    set({ loading: true, error: null })
    try {
      const data = await apiCall('/api/clients', 'POST', clientData)
      set((state) => ({
        clients: [data.client, ...state.clients],
        loading: false,
      }))
      return data.client
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Update client
  updateClient: async (id, clientData) => {
    set({ loading: true, error: null })
    try {
      const data = await apiCall(`/api/clients/${id}`, 'PUT', clientData)
      set((state) => ({
        clients: state.clients.map((c) => (c.id === id ? data.client : c)),
        currentClient: data.client,
        loading: false,
      }))
      return data.client
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Delete client
  deleteClient: async (id) => {
    set({ loading: true, error: null })
    try {
      await apiCall(`/api/clients/${id}`, 'DELETE')
      set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
        currentClient: null,
        loading: false,
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Search clients
  searchClients: async (query, limit = 10) => {
    set({ loading: true, error: null })
    try {
      const data = await apiCall(`/api/clients/search?q=${query}&limit=${limit}`)
      return data.results
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Clear current client
  clearCurrentClient: () => set({ currentClient: null }),
}))
