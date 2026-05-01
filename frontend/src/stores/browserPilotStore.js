import { create } from 'zustand'
import { apiGet, apiPost, apiDelete } from '../utils/api'

const useBrowserPilotStore = create((set, get) => ({
  tasks: [],
  currentTask: null,
  status: 'idle', // idle | running | completed | failed
  serviceStatus: null,
  loading: false,
  error: null,

  createTask: async (actions, dryRun = true, headless = true) => {
    set({ loading: true, error: null, status: 'running', currentTask: null })
    try {
      const res = await apiPost('/api/browser-pilot/task', { actions, dryRun, headless })
      set({
        currentTask: res.data,
        status: res.data.status,
        loading: false,
      })
      get().fetchTasks()
      return res.data
    } catch (err) {
      set({ error: err.message, loading: false, status: 'failed' })
      throw err
    }
  },

  fetchTasks: async (limit = 20) => {
    try {
      const res = await apiGet(`/api/browser-pilot/task?limit=${limit}`)
      set({ tasks: res.data || [] })
    } catch (err) {
      set({ error: err.message })
    }
  },

  fetchTask: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await apiGet(`/api/browser-pilot/task/${id}`)
      set({ currentTask: res.data, status: res.data.status, loading: false })
      return res.data
    } catch (err) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  approveTask: async (id, actions) => {
    set({ loading: true, status: 'running' })
    try {
      const res = await apiPost(`/api/browser-pilot/task/${id}/approve`, { actions })
      set({ currentTask: res.data, status: res.data.status, loading: false })
      get().fetchTasks()
      return res.data
    } catch (err) {
      set({ error: err.message, loading: false, status: 'failed' })
      throw err
    }
  },

  deleteTask: async (id) => {
    try {
      await apiDelete(`/api/browser-pilot/task/${id}`)
      if (get().currentTask?.taskId === id) set({ currentTask: null, status: 'idle' })
      get().fetchTasks()
    } catch (err) {
      set({ error: err.message })
    }
  },

  fetchStatus: async () => {
    try {
      const res = await apiGet('/api/browser-pilot/status')
      set({ serviceStatus: res.data })
    } catch (err) {
      set({ error: err.message })
    }
  },

  clearCurrentTask: () => set({ currentTask: null, status: 'idle' }),
  clearError: () => set({ error: null }),
}))

export default useBrowserPilotStore
