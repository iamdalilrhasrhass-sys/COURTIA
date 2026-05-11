import { useState, useEffect } from 'react'
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, FileText, CheckSquare, BarChart2,
  Settings, CreditCard, LogOut, Shield, Menu, X, Zap, Target,
  Search, Inbox, Send, MapPin, GraduationCap, FolderOpen, Globe, 
  HeartHandshake, Euro, ChevronRight, Sun, Briefcase, CalendarDays,
  TrendingUp, Sparkles, Bell, Clock, UserPlus, HelpCircle, MessageSquare,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import CourtiaMiniLogo from './brand/CourtiaMiniLogo'
import { clearStoredSession } from '../api/sessionPolicy'
import { resetSessionUserCache } from '../api/sessionUser'
import { isAdminRole } from '../lib/roles'

// ─── Design tokens ─────────────────────────────────────────────────
const t = {
  bg: '#080808',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',
  text: '#ffffff',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
  accent: '#5B4DF5',
  accentBg: 'rgba(91, 77, 245, 0.08)',
  activeBg: 'rgba(91, 77, 245, 0.10)',
  activeBorder: 'rgba(91, 77, 245, 0.30)',
  hoverBg: 'rgba(255,255,255,0.04)',
  arkAccent: '#8B5CF6',
}

// ─── Accordéon des univers ─────────────────────────────────────────
const UNIVERSE_GROUPS = [
  {
    id: 'pilotage',
    label: 'Pilotage',
    icon: Sun,
    items: [
      { path: '/dashboard',     label: 'Tableau de bord', icon: LayoutDashboard },
      { path: '/morning-brief', label: 'Morning Brief',   icon: Sparkles },
      { path: '/rapports',      label: 'Rapports',        icon: BarChart2 },
      { path: '/analytics',     label: 'Analytics',       icon: TrendingUp },
    ]
  },
  {
    id: 'portefeuille',
    label: 'Portefeuille',
    icon: Briefcase,
    items: [
      { path: '/clients',   label: 'Clients',   icon: Users },
      { path: '/contrats',  label: 'Contrats',  icon: FileText },
      { path: '/devis',     label: 'Devis',     icon: Euro },
      { path: '/documents', label: 'Documents', icon: FolderOpen },
    ]
  },
  {
    id: 'actions',
    label: 'Actions',
    icon: Zap,
    items: [
      { path: '/taches',       label: 'Tâches',        icon: CheckSquare },
      { path: '/relances',     label: 'Relances',      icon: Bell },
      { path: '/opportunites', label: 'Opportunités',  icon: TrendingUp },
      { path: '/rendez-vous',  label: 'Rendez-vous',   icon: CalendarDays },
    ]
  },
  {
    id: 'acquisition',
    label: 'Acquisition',
    icon: Target,
    items: [
      { path: '/reach',          label: 'REACH',       icon: Target },
      { path: '/prospection',    label: 'Prospection', icon: UserPlus },
      { path: '/partenaires',    label: 'Partenaires', icon: HeartHandshake },
      { path: '/commissions',    label: 'Commissions', icon: Euro },
    ]
  },
  {
    id: 'ark-ia',
    label: 'ARK IA',
    icon: Sparkles,
    items: [
      { path: '/assistant-ark', label: 'Assistant ARK',       icon: MessageSquare },
      { path: '/capitia',       label: 'Recommandations',   icon: TrendingUp },
      { path: '/capitia',       label: 'Historique IA',     icon: Clock },
    ]
  },
  {
    id: 'cabinet',
    label: 'Cabinet',
    icon: Settings,
    items: [
      { path: '/equipe',        label: 'Équipe',        icon: Users },
      { path: '/parametres',    label: 'Paramètres',    icon: Settings },
      { path: '/abonnement',    label: 'Abonnement',    icon: CreditCard },
      { path: '/import',        label: 'Import',        icon: RefreshCw },
    ]
  },
  {
    id: 'ressources',
    label: 'Ressources',
    icon: HelpCircle,
    items: [
      { path: '/academy', label: 'Academy',  icon: GraduationCap },
      { path: '/aide',    label: 'Aide',     icon: HelpCircle },
      { path: '/status',  label: 'Statut',   icon: Shield },
    ]
  },
]

// ─── Sidebar ───────────────────────────────────────────────────────
export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState(() => {
    // Auto-ouvrir le groupe actif au montage
    const initial = {}
    UNIVERSE_GROUPS.forEach(g => { initial[g.id] = false })
    return initial
  })

  // Auto-ouvrir le groupe contenant la route active
  useEffect(() => {
    const activeGroup = UNIVERSE_GROUPS.find(g =>
      g.items.some(item => 
        item.path === '/dashboard' 
          ? location.pathname === '/dashboard' 
          : location.pathname.startsWith(item.path)
      )
    )
    if (activeGroup && !openGroups[activeGroup.id]) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.id]: true }))
    }
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
    clearStoredSession()
    resetSessionUserCache()
    sessionStorage.removeItem('courtia_token')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('courtia_user')
    sessionStorage.removeItem('user')
    setUser(null)
    window.dispatchEvent(new Event('profileUpdated'))
    navigate('/login')
    toast.success('Déconnexion réussie')
  }

  function toggleGroup(id) {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function isItemActive(path) {
    if (path === '/dashboard') return location.pathname === path
    return location.pathname.startsWith(path)
  }

  function isGroupActive(group) {
    return group.items.some(item => isItemActive(item.path))
  }

  const userName = user
    ? ((user.first_name || user.firstName || '') + ' ' + (user.last_name || user.lastName || '')).trim()
    : 'Chargement...'
  const userFirstName = user ? (user.first_name || user.firstName || '') : ''
  const userLastName = user ? (user.last_name || user.lastName || '') : ''
  const userEmail = user?.email || ''
  const userRole = (user?.role || '').toLowerCase()
  const isAdmin = isAdminRole(userRole)

  const getInitials = (firstName, lastName) => {
    const f = (firstName || '').charAt(0)
    const l = (lastName || '').charAt(0)
    return (f + l).toUpperCase() || '?'
  }

  // ─── Rendu du contenu sidebar ──────────────────────────────────
  const sidebarContent = (
    <aside style={{
      width: 240,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: t.bg,
      borderRight: `1px solid ${t.border}`,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 20px',
        height: 65,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${t.borderLight}`,
      }}>
        <CourtiaMiniLogo size={28} />
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            display: 'none',
            padding: 6, color: t.textMuted, borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer',
          }}
          className="md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {UNIVERSE_GROUPS.map(group => {
          const active = isGroupActive(group)
          const open = openGroups[group.id]
          const GroupIcon = group.icon

          return (
            <div key={group.id} style={{ marginBottom: 4 }}>
              {/* Groupe header */}
              <button
                onClick={() => toggleGroup(group.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? t.text : t.textMuted,
                  background: active ? t.activeBg : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  borderLeft: active ? `2px solid ${t.accent}` : '2px solid transparent',
                  paddingLeft: active ? 10 : 12,
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = t.hoverBg
                    e.currentTarget.style.color = t.text
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = t.textMuted
                  }
                }}
              >
                <GroupIcon size={16} strokeWidth={active ? 2.2 : 1.8} />
                <span style={{ flex: 1 }}>{group.label}</span>
                <motion.div
                  animate={{ rotate: open ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'flex' }}
                >
                  <ChevronRight size={14} color={active ? t.accent : t.textDim} />
                </motion.div>
              </button>

              {/* Sous-items (accordéon) */}
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '2px 0 6px' }}>
                      {group.items.map(item => {
                        const itemActive = isItemActive(item.path)
                        const ItemIcon = item.icon
                        return (
                          <button
                            key={item.path}
                            onClick={() => {
                              setMobileOpen(false)
                              navigate(item.path)
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 12px 6px 40px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: itemActive ? 600 : 500,
                              color: itemActive ? t.accent : t.textMuted,
                              background: itemActive ? t.accentBg : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                              textAlign: 'left',
                            }}
                            onMouseEnter={e => {
                              if (!itemActive) {
                                e.currentTarget.style.background = t.hoverBg
                                e.currentTarget.style.color = t.text
                              }
                            }}
                            onMouseLeave={e => {
                              if (!itemActive) {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = t.textMuted
                              }
                            }}
                          >
                            <ItemIcon size={13} strokeWidth={itemActive ? 1.8 : 1.5} />
                            <span>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Admin */}
        {isAdmin && (
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <button
              onClick={() => { setMobileOpen(false); navigate('/admin') }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: location.pathname.startsWith('/admin') ? 600 : 500,
                color: location.pathname.startsWith('/admin') ? t.text : t.textMuted,
                background: location.pathname.startsWith('/admin') ? t.activeBg : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                borderLeft: location.pathname.startsWith('/admin') ? `2px solid ${t.accent}` : '2px solid transparent',
                paddingLeft: location.pathname.startsWith('/admin') ? 10 : 12,
              }}
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          </div>
        )}
      </nav>

      {/* ARK Button */}
      <div style={{ padding: '4px 14px 12px' }}>
        <button
          onClick={() => {
            setMobileOpen(false)
            navigate('/assistant-ark')
          }}
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
            color: t.arkAccent,
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.20)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.16)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.30)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.20)' }}
        >
          <Sparkles size={13} /> ARK Intelligence
        </button>
      </div>

      {/* Profil utilisateur */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${t.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: t.accentBg,
          color: t.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 11,
          flexShrink: 0,
        }}>
          {user ? getInitials(userFirstName, userLastName) : '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: t.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
          <p style={{ fontSize: 10, color: t.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
        </div>
        <button
          onClick={logout}
          style={{
            padding: 4,
            color: t.textMuted,
            borderRadius: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = t.textMuted}
          title="Déconnexion"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )

  // ─── Rendu ──────────────────────────────────────────────────────
  return (
    <>
      {/* BOUTON HAMBURGER MOBILE */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed',
          top: 10, left: 10,
          zIndex: 60,
          padding: 8,
          background: t.bg,
          border: `1px solid ${t.borderLight}`,
          borderRadius: 8,
          color: t.text,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        className="flex md:hidden"
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
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 55,
            }}
            className="md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR DESKTOP */}
      <div className="hidden md:block md:fixed md:top-0 md:left-0 md:h-screen md:z-50">
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
              position: 'fixed', top: 0, left: 0,
              height: '100vh', zIndex: 60,
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
