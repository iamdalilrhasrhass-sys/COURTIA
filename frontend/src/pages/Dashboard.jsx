import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useClientStore } from '../stores/clientStore'
import { useResponsive } from '../hooks/useResponsive'
import Auth from '../components/AuthPremium'
import Sidebar from '../components/Sidebar'
import DashboardComponent from '../components/Dashboard'
import ClientsList from '../components/ClientsList'
import ClientDetail from '../pages/ClientDetail'
import Pipeline from '../components/Pipeline'
import Calendar from '../components/Calendar'
import Reports from '../components/Reports'
import Settings from '../components/Settings'

export default function DashboardPage() {
  const token = useAuthStore((state) => state.token)
  const { isMobile } = useResponsive()
  const [activeTab, setActiveTab] = useState('dashboard')

  if (!token) {
    return <Auth onAuthSuccess={() => {}} />
  }

  return (
    <div style={{display:'flex',fontFamily:'Arial,sans-serif',background:'#fff'}}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div style={{marginLeft:isMobile?0:'280px',width:isMobile?'100%':'calc(100% - 280px)',minHeight:'100vh',background:'#fff',paddingTop:isMobile?'64px':0}}>
        {activeTab === 'dashboard' && <DashboardComponent />}
        {activeTab === 'clients' && <ClientsList />}
        {activeTab === 'pipeline' && <Pipeline />}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'settings' && <Settings />}
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #fff; }
        input, textarea, select { font-family: Arial, sans-serif; }
      `}</style>
    </div>
  )
}
