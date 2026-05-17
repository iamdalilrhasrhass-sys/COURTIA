import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Sunrise, Users, FileText, FileSignature, FolderOpen, CalendarDays,
  Bot, Brain, Sparkles, Activity, Shield, Globe, TrendingUp,
  BarChart3, CreditCard, Calculator, Wallet, Building2,
  GraduationCap, BookOpen, UserCheck, Settings, Layers, LogOut,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import CourtiaMiniLogo from '../components/brand/CourtiaMiniLogo'
import { clearStoredSession } from '../api/sessionPolicy'
import { resetSessionUserCache } from '../api/sessionUser'

const T = {
  bg: '#080808',
  border: 'rgba(255,255,255,0.06)',
  text: '#ffffff',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#5B4DF5',
  ark: '#8B5CF6',
  hoverBg: 'rgba(255,255,255,0.04)',
  activeBg: 'rgba(91,77,245,0.10)',
}

// 5 Sections Aurora OS
const SECTIONS = [
  { id: 'home', path: '/dashboard', label: 'Home', icon: Sunrise },
  {
    id: 'clients', label: 'Clients', icon: Users,
    items: [
      { path: '/clients', label: 'Tous les clients', icon: Users },
      { path: '/contrats', label: 'Contrats', icon: FileText },
      { path: '/devis', label: 'Devis', icon: FileSignature },
      { path: '/documents', label: 'Documents', icon: FolderOpen },
      { path: '/taches', label: 'Agenda & RDV', icon: CalendarDays },
    ]
  },
  {
    id: 'ark', label: 'ARK', icon: Bot,
    items: [
      { path: '/ark-intelligence', label: 'ARK Intelligence', icon: Brain },
      { path: '/capitia', label: 'ARK Négociateur', icon: Sparkles },
      { path: '/health', label: 'Santé Portefeuille', icon: Activity },
      { path: '/comparateur', label: 'Comparateur', icon: TrendingUp },
      { path: '/bordereau', label: 'Bordereau', icon: Shield },
      { path: '/widget', label: 'Widget ARK', icon: Globe },
    ]
  },
  {
    id: 'business', label: 'Business', icon: BarChart3,
    items: [
      { path: '/commissions', label: 'Commissions', icon: Calculator },
      { path: '/billing', label: 'Facturation', icon: CreditCard },
      { path: '/rapports', label: 'Rapports', icon: TrendingUp },
      { path: '/tokens', label: 'Tokens', icon: Wallet },
    ]
  },
  {
    id: 'cabinet', label: 'Cabinet', icon: Building2,
    items: [
      { path: '/equipe', label: 'Équipe', icon: UserCheck },
      { path: '/academy', label: 'Formation DDA', icon: GraduationCap },
      { path: '/conformite', label: 'Conformité', icon: BookOpen },
      { path: '/parametres', label: 'Paramètres', icon: Settings },
      { path: '/abonnement', label: 'Abonnement', icon: CreditCard },
      { path: '/dashboard-legacy', label: 'Dashboard legacy', icon: Layers },
    ]
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const handleLogout = () => {
    clearStoredSession()
    resetSessionUserCache()
    navigate('/login')
  }

  const toggleSection = (id) => {
    setExpanded(expanded === id ? null : id)
  }

  return (
    <aside style={{
      width: collapsed ? 64 : 240, minHeight: '100vh',
      background: T.bg, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease',
      position: 'sticky', top: 0,
    }}>
      {/* Logo + collapse */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: `1px solid ${T.border}` }}>
        {!collapsed && <CourtiaMiniLogo />}
        <button onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          {collapsed ? <ChevronRight size={16} color={T.textMuted} /> : <ChevronLeft size={16} color={T.textMuted} />}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {SECTIONS.map((section) => (
          <div key={section.id}>
            {/* Section header or single home item */}
            {section.id === 'home' ? (
              <button onClick={() => navigate(section.path)} style={{
                ...navItemStyle, background: isActive(section.path) ? T.activeBg : 'transparent',
                color: isActive(section.path) ? T.accent : T.textSecondary,
              }}>
                <section.icon size={20} />
                {!collapsed && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 600 }}>{section.label}</span>}
              </button>
            ) : (
              <>
                <button onClick={() => toggleSection(section.id)} style={{
                  ...navItemStyle, marginTop: 4,
                  background: expanded === section.id ? T.hoverBg : 'transparent',
                  color: T.textMuted, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <section.icon size={16} />
                  {!collapsed && <span>{section.label}</span>}
                </button>
                {(expanded === section.id || !collapsed) && section.items?.map((item) => (
                  <button key={item.path} onClick={() => navigate(item.path)} style={{
                    ...navItemStyle, paddingLeft: collapsed ? 20 : 48,
                    background: isActive(item.path) ? T.activeBg : 'transparent',
                    color: isActive(item.path) ? T.accent : T.textSecondary,
                  }}>
                    <item.icon size={collapsed ? 18 : 16} />
                    {!collapsed && <span style={{ marginLeft: 10, fontSize: 13 }}>{item.label}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '8px', borderTop: `1px solid ${T.border}` }}>
        <button onClick={handleLogout} style={{
          ...navItemStyle, color: '#EF4444', width: '100%',
        }}>
          <LogOut size={18} />
          {!collapsed && <span style={{ marginLeft: 12, fontSize: 13 }}>Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}

const navItemStyle = {
  width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none', background: 'transparent',
  cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s',
  textAlign: 'left',
}
