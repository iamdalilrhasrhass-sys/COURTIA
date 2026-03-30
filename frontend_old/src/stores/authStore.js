import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Login
      login: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Login failed')
          }

          const data = await response.json()
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            loading: false,
          })
          return data
        } catch (error) {
          set({ error: error.message, loading: false })
          throw error
        }
      },

      // Register
      register: async (email, password, firstName, lastName) => {
        set({ loading: true, error: null })
        try {
          const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, firstName, lastName }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Registration failed')
          }

          const data = await response.json()
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            loading: false,
          })
          return data
        } catch (error) {
          set({ error: error.message, loading: false })
          throw error
        }
      },

      // Logout
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null })
      },

      // Get token
      getToken: () => get().token,

      // Set error
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
