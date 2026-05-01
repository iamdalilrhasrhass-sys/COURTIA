import { useState, useEffect } from 'react'
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, FileText, CheckSquare, BarChart2,
  Settings, CreditCard, LogOut, Shield, Menu, X, Zap, Target,
  Search, Inbox, Send, MapPin, GraduationCap, FolderOpen, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from './Logo'

const theme = {
  accent: '#5B4DF5',
  accentLight: '#EEECFE',
  activeBg: 'rgba(91, 77, 245, 0.10)',
  text: '#ffffff',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',
  hoverBg: 'rgba(255,255,255,0.05)',
}

const getInitials = (firstName, lastName) => {
  const f = (firstName || '').charAt(0)
  const l = (lastName || '').charAt(0)
  return (f + l).toUpperCase() || '?'
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/contrats', label: 'Contrats', icon: FileText },
  { path: '/taches', label: 'Tâches', icon: CheckSquare },
  { separator: true, label: 'ACQUISITION' },
  { path: '/reach', label: 'REACH', icon: Target, badge: 'Nouveau', hasSub: true },
  { separator: true, label: 'MODULES' },
  { path: '/academy', label: 'Academy', icon: GraduationCap, badge: 'Nouveau' },
  { path: '/documents', label: 'Documents', icon: FolderOpen },
  { path: '/browser-pilot', label: 'Browser Pilot', icon: Globe, badge: 'Bêta' },
  { path: '/analytics', label: 'Analyses', icon: BarChart2 },
  { path: '/parametres', label: 'Paramètres', icon: Settings },
  { path: '/abonnement', label: 'Abonnement', icon: CreditCard },
]

const REACH_SUB_ITEMS = [
  { path: '/reach', label: 'Dashboard', icon: Target },
  { path: '/reach/search', label: 'Recherche', icon: Search },
  { path: '/reach/prospects', label: 'Prospects', icon: Users },
  { path: '/reach/campaigns', label: 'Campagnes', icon: Send },
  { path: '/reach/inbox', label: 'Inbox', icon: Inbox },
  { path: '/reach/map', label: 'Carte', icon: MapPin },
  { path: '/reach/settings', label: 'Réglages', icon: Settings },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Ferme le menu mobile quand on change de page
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const updateUserState = () => {
      try {
        const storedUser = localStorage.getItem('courtia_user')
        if (storedUser) setUser(JSON.parse(storedUser))
      } catch (e) { console.error("Failed to parse user from localStorage", e) }
    }

    updateUserState()

    window.addEventListener('profileUpdated', updateUserState)
    return () => window.removeEventListener('profileUpdated', updateUserState)
  }, [])

  function logout() {
    localStorage.removeItem('courtia_token');
    localStorage.removeItem('token');
    localStorage.removeItem('courtia_user');
    navigate('/login');
    toast.success('Déconnexion réussie');
  }

  // Normalise l'utilisateur (support camelCase du login + snake_case de /me)
  const userName = user
    ? ((user.first_name || user.firstName || '') + ' ' + (user.last_name || user.lastName || '')).trim()
    : 'Chargement...'
  const userFirstName = user ? (user.first_name || user.firstName || '') : ''
  const userLastName = user ? (user.last_name || user.lastName || '') : ''
  const userEmail = user?.email || ''

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const sidebarContent = (
    <aside style={{
      width: 240,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#080808',
      borderRight: `1px solid ${theme.border}`,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 20px',
        height: 65,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.borderLight}`,
      }}>
        <Logo size={32} dark={true} textSize={13} />
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            padding: 6, color: theme.textMuted, borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer',
          }}
          className="md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '24px 10px', overflowY: 'auto' }}>
        {NAV_ITEMS.map((item, idx) => {
          if (item.separator) {
            return (
              <div key={`sep-${idx}`} style={{ padding: '16px 12px 6px' }}>
                <p style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: theme.textMuted,
                  textTransform: 'uppercase',
                  margin: 0,
                }}>{item.label}</p>
              </div>
            )
          }

          const active = isActive(item.path)
          const Icon = item.icon
          const isOnReach = location.pathname.startsWith('/reach')

          return (
            <React.Fragment key={item.path}>
              <button
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  marginBottom: 2,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? theme.text : theme.textMuted,
                  background: active ? theme.activeBg : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                  textAlign: 'left',
                  borderLeft: active ? `2px solid ${theme.accent}` : '2px solid transparent',
                  paddingLeft: active ? 10 : 12,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = theme.hoverBg
                    e.currentTarget.style.color = theme.text
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = theme.textMuted
                  }
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                <span>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, marginLeft: 'auto',
                    padding: '1px 6px', borderRadius: 6,
                    background: theme.accent, color: '#fff',
                  }}>{item.badge}</span>
                )}
              </button>

              {/* REACH sub-navigation */}
              {item.hasSub && isOnReach && REACH_SUB_ITEMS.map(sub => {
                const subActive = location.pathname === sub.path
                const SubIcon = sub.icon
                return (
                  <button
                    key={sub.path}
                    onClick={() => navigate(sub.path)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px 6px 38px',
                      marginBottom: 0,
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: subActive ? 600 : 500,
                      color: subActive ? theme.accent : theme.textMuted,
                      background: subActive ? theme.activeBg : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      if (!subActive) {
                        e.currentTarget.style.background = theme.hoverBg
                        e.currentTarget.style.color = theme.text
                      }
                    }}
                    onMouseLeave={e => {
                      if (!subActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = theme.textMuted
                      }
                    }}
                  >
                    <SubIcon size={13} strokeWidth={subActive ? 1.8 : 1.5} />
                    <span>{sub.label}</span>
                  </button>
                )
              })}
            </React.Fragment>
          )
        })}
      </nav>

      {/* ARK Button */}
      <div style={{ padding: '4px 14px 12px' }}>
        <button
          onClick={() => navigate('/capitia')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: theme.accent,
            background: 'rgba(91, 77, 245, 0.08)',
            border: `1px solid ${theme.accent}25`,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91, 77, 245, 0.16)'; e.currentTarget.style.borderColor = `${theme.accent}40` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(91, 77, 245, 0.08)'; e.currentTarget.style.borderColor = `${theme.accent}25` }}
        >
          <Zap size={13} /> ARK Intelligence
        </button>
      </div>

      {/* Profil utilisateur */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${theme.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: theme.activeBg,
          color: theme.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 11,
          flexShrink: 0,
          letterSpacing: '-0.01em',
        }}>
          {user ? getInitials(userFirstName, userLastName) : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: theme.text, margin: 0, truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
          <p style={{ fontSize: 10, color: theme.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: 4,
            color: theme.textMuted,
            borderRadius: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.12s',
            lineHeight: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = theme.textMuted}
          title="Déconnexion"
        >
          <LogOut size={14} />
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.15)', margin: '6px 0 10px', letterSpacing: '0.08em' }}>
        Rhasrhass®
      </p>
    </aside>
  )

  return (
    <>
      {/* BOUTON HAMBURGER MOBILE */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 10,
          left: 10,
          zIndex: 60,
          padding: 8,
          background: '#080808',
          border: `1px solid ${theme.borderLight}`,
          borderRadius: 8,
          color: theme.text,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        className="md:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>

      {/* OVERLAY MOBILE */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMobileOpen(false)}
            style={{
              display: 'none',
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 55,
            }}
            className="md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR DESKTOP */}
      <div style={{ display: 'none' }} className="hidden md:block md:fixed md:top-0 md:left-0 md:h-screen md:z-50">
        {sidebarContent}
      </div>

      {/* SIDEBAR MOBILE */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              display: 'none',
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              zIndex: 60,
              boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
            }}
            className="md:hidden"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
