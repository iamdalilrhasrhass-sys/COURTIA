import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = 'http://localhost:3000'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Login failed')
          set({ user: data.user, token: data.token, isAuthenticated: true, loading: false })
          return data
        } catch (err) {
          set({ error: err.message, loading: false })
          throw err
        }
      },

      register: async (email, password, firstName, lastName) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, firstName, lastName }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Registration failed')
          set({ user: data.user, token: data.token, isAuthenticated: true, loading: false })
          return data
        } catch (err) {
          set({ error: err.message, loading: false })
          throw err
        }
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-store' }
  )
)
