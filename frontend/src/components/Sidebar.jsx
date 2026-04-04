import { Home, Users, Briefcase, Calendar, BarChart3, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useClientStore } from '../stores/clientStore'
import { useResponsive } from '../hooks/useResponsive'
import ArkDrawer from './ArkDrawer'

export default function Sidebar({ activeTab, setActiveTab }) {
  const logout = useAuthStore((state) => state.logout)
  const token = useAuthStore((state) => state.token)
  const { isMobile } = useResponsive()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [arkDrawerOpen, setArkDrawerOpen] = useState(false)
  
  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Home },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'contrats', label: 'Contrats', icon: Briefcase },
    { id: 'taches', label: 'Tâches', icon: Calendar },
    { id: 'reports', label: 'Rapports', icon: BarChart3 },
    { id: 'parametres', label: 'Paramètres', icon: Settings }
  ]

  if (isMobile) {
    return (
      <>
        {/* Mobile Header - White */}
        <div style={{position:'fixed',top:0,left:0,right:0,height:'64px',background:'#fff',borderBottom:'0.5px solid #f0f0f0',display:'flex',alignItems:'center',justifyContent:'space-between',paddingLeft:'16px',paddingRight:'16px',zIndex:40}}>
          <div style={{fontSize:'18px',fontWeight:900,letterSpacing:'4px',color:'#0a0a0a',cursor:'pointer'}} onClick={() => setActiveTab('dashboard')}>COURTIA</div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{background:'none',border:'none',cursor:'pointer',color:'#0a0a0a'}}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div style={{position:'fixed',top:'64px',left:0,right:0,bottom:0,background:'#fff',zIndex:30,overflowY:'auto',paddingTop:'16px'}}>
            <div style={{paddingLeft:'16px',paddingRight:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button key={tab.id} onClick={() => {setActiveTab(tab.id); setIsMobileMenuOpen(false)}} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderRadius:'8px',border:'none',cursor:'pointer',background:isActive?'#f5f5f5':'transparent',color:isActive?'#0a0a0a':'#999',fontFamily:'Arial',fontSize:'13px',transition:'all 0.2s'}}>
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
              <div style={{borderTop:'0.5px solid #f0f0f0',marginTop:'16px',paddingTop:'16px'}}>
                <button onClick={() => {logout(); setIsMobileMenuOpen(false)}} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderRadius:'8px',border:'none',cursor:'pointer',background:'transparent',color:'#999',fontFamily:'Arial',fontSize:'13px',width:'100%',transition:'all 0.2s'}}>
                  <LogOut size={20} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop sidebar - Dark #080808
  return (
    <div style={{width:'280px',height:'100vh',position:'fixed',left:0,top:0,background:'#080808',padding:'24px',display:'flex',flexDirection:'column',justifyContent:'space-between',fontFamily:'Arial,sans-serif'}}>
      <div>
        <div style={{fontSize:'18px',fontWeight:900,letterSpacing:'4px',color:'#fff',marginBottom:'32px',cursor:'pointer',transition:'opacity 0.2s'}} onClick={() => setActiveTab('dashboard')}>COURTIA</div>
        <nav style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',borderRadius:'8px',border:'none',cursor:'pointer',background:'transparent',color:isActive?'#fff':'rgba(255,255,255,0.35)',fontFamily:'Arial',fontSize:'13px',fontWeight:isActive?600:400,transition:'all 0.2s',borderLeft:isActive?'3px solid #2563eb':'none',paddingLeft:isActive?'11px':'14px',position:'relative'}}>
                <Icon size={18} />
                <span>{tab.label}</span>
                {isActive && <div style={{position:'absolute',right:'12px',width:'6px',height:'6px',borderRadius:'50%',background:'#2563eb'}}></div>}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ARK Button at bottom with pulsing green dot */}
      <div style={{paddingTop:'24px',borderTop:'0.5px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',gap:'12px'}}>
        <button onClick={() => setArkDrawerOpen(true)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',borderRadius:'8px',border:'0.5px solid rgba(37,99,235,0.2)',background:'rgba(37,99,235,0.08)',color:'#60a5fa',fontFamily:'Arial',fontSize:'12px',fontWeight:700,cursor:'pointer',letterSpacing:'1px',transition:'all 0.2s'}}>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e',animation:'pulse 2s ease infinite'}}></div>
          ARK
        </button>
        <ArkDrawer isOpen={arkDrawerOpen} onClose={() => setArkDrawerOpen(false)} token={token} />
        <button onClick={logout} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',borderRadius:'8px',border:'none',cursor:'pointer',background:'transparent',color:'rgba(255,255,255,0.35)',fontFamily:'Arial',fontSize:'13px',transition:'all 0.2s'}}>
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
