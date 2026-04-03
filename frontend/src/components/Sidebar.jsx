import { Home, Users, Briefcase, Calendar, BarChart3, Settings, LogOut, Menu, X, Bell } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useClientStore } from '../stores/clientStore'
import { useResponsive } from '../hooks/useResponsive'
import SearchBar from './SearchBar'

export default function Sidebar({ activeTab, setActiveTab }) {
  const logout = useAuthStore((state) => state.logout)
  const clients = useClientStore((state) => state.clients)
  const { isMobile } = useResponsive()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const mockProspects = [
    { id: 1, name: 'ABC Corp', value: '5000€' },
    { id: 2, name: 'XYZ SARL', value: '3200€' },
    { id: 3, name: 'Tech Innov', value: '8500€' }
  ]

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'pipeline', label: 'Pipeline prospects', icon: Briefcase },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'reports', label: 'Rapports', icon: BarChart3 },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ]

  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 glass h-16 flex items-center justify-between px-4 z-40 border-b border-slate-700">
          <button 
            onClick={() => setActiveTab('profile')}
            className="text-gradient text-xl font-black"
          >
            COURTIA
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-cyan hover:opacity-80"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed top-16 left-0 right-0 bottom-0 glass z-30 overflow-y-auto pt-4">
            <div className="px-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-cyan/20 text-cyan border border-cyan'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                )
              })}

              <div className="border-t border-slate-700 mt-4 pt-4">
                <button
                  onClick={() => {
                    logout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition"
                >
                  <LogOut size={20} />
                  <span className="text-sm">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop sidebar
  return (
    <div className="w-64 glass h-screen fixed left-0 top-0 p-6 flex flex-col justify-between">
      <div>
        <button 
          onClick={() => setActiveTab('profile')}
          className="text-gradient text-2xl font-black mb-8 hover:opacity-80 transition-all"
        >
          COURTIA
        </button>
        <SearchBar clients={clients} prospects={mockProspects} onNavigate={setActiveTab} />
        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-cyan/20 text-cyan border border-cyan'
                    : 'hover:bg-slate-700/50'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition w-full"
      >
        <LogOut size={20} />
        <span className="text-sm">Déconnexion</span>
      </button>
    </div>
  )
}
