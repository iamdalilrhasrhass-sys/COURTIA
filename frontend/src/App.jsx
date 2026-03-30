import { useEffect, useState } from 'react'
import { useAuthStore } from './store/authStore'
import { useClientStore } from './store/clientStore'
import { useResponsive } from './hooks/useResponsive'
import Auth from './components/AuthPremium'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ClientsList from './components/ClientsList'
import ClientDetail from './components/ClientDetail'
import Pipeline from './components/Pipeline'
import Calendar from './components/Calendar'
import Reports from './components/Reports'
import Settings from './components/Settings'
import Profile from './components/Profile'
import Pricing from './components/Pricing'

export default function App() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const fetchClients = useClientStore((state) => state.fetchClients)
  const { isMobile } = useResponsive()
  const [activeTab, setActiveTab] = useState('dashboard')
  const selectedClient = useClientStore((state) => state.selectedClient)

  useEffect(() => {
    if (token) {
      fetchClients(token)
    }
  }, [token, fetchClients])

  // Check if user is trying to access /pricing
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/pricing' && activeTab !== 'pricing') {
      setActiveTab('pricing')
    }
  }, [])

  // Show pricing page without auth
  if (activeTab === 'pricing') {
    return <Pricing />
  }

  if (!token) {
    return <Auth onAuthSuccess={() => {}} />
  }

  return (
    <div className={`flex ${isMobile ? 'flex-col' : ''}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className={`${isMobile ? 'w-full mt-16 pb-16' : 'ml-64'} overflow-auto flex-1`}>
        {selectedClient && activeTab === 'clients' ? (
          <ClientDetail />
        ) : activeTab === 'dashboard' ? (
          <Dashboard />
        ) : activeTab === 'clients' ? (
          <ClientsList />
        ) : activeTab === 'pipeline' ? (
          <Pipeline />
        ) : activeTab === 'calendar' ? (
          <Calendar />
        ) : activeTab === 'reports' ? (
          <Reports />
        ) : activeTab === 'settings' ? (
          <Settings />
        ) : activeTab === 'profile' ? (
          <Profile />
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  )
}
