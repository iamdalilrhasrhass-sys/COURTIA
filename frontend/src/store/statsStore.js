import { create } from 'zustand'
import axios from 'axios'

const API_URL = 'https://courtia.onrender.com'

export const useStatsStore = create((set) => ({
  stats: {
    totalClients: 0,
    activeContracts: 0,
    monthlyCommissions: 0,
    conversionRate: 0,
    recentClients: [],
    alerts: []
  },
  loading: false,

  fetchStats: async (token) => {
    set({ loading: true })
    try {
      const clientsRes = await axios.get(`${API_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const totalClients = clientsRes.data.pagination.total
      const recentClients = clientsRes.data.clients.slice(0, 3)

      const contractsRes = await axios.get(`${API_URL}/api/contracts`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const activeContracts = contractsRes.data.pagination.total
      
      // Calculer les commissions réelles (10% des primes annuelles)
      let monthlyCommissions = 0
      if (contractsRes.data.contracts && Array.isArray(contractsRes.data.contracts)) {
        contractsRes.data.contracts.forEach(contract => {
          if (contract.annual_premium) {
            monthlyCommissions += (contract.annual_premium / 12) * 0.1
          }
        })
      }

      set((state) => ({
        stats: {
          ...state.stats,
          totalClients: totalClients || 0,
          activeContracts: activeContracts || 0,
          monthlyCommissions: Math.round(monthlyCommissions),
          conversionRate: 38,
          recentClients: recentClients || [],
          alerts: state.stats.alerts
        },
        loading: false
      }))
    } catch (error) {
      console.error('Erreur fetch stats', error)
      set({ loading: false })
    }
  }
}))
