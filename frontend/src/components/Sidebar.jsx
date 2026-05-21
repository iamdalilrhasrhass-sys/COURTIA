import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, FileText, CheckSquare, TrendingUp,
  Settings, LogOut, Shield, Menu, X, Calculator, GitCompareArrows,
  Activity, ChevronRight, Sparkles, HelpCircle, GraduationCap,
  Sunrise, BarChart3, BarChart2, FileSignature, FolderOpen, Phone,
  Briefcase, CalendarDays, Target, Search, Globe, Users2, Wallet,
  Bot, Building2, CreditCard, Database, BookOpen, Brain,
} from 'lucide-react'
import toast from 'react-hot-toast'
import CourtiaMiniLogo from './brand/CourtiaMiniLogo'
import { clearStoredSession } from '../api/sessionPolicy'
import { resetSessionUserCache } from '../api/sessionUser'
import { isAdminRole } from '../lib/roles'

// ─── Aurora tokens ─────────────────────────────────────────────
const T = {
  bg: 'rgba(5,5,16,0.82)',
  border: 'rgba(245,243,255,0.10)',
  borderLight: 'rgba(245,243,255,0.16)',
  text: '#ffffff',
  textSecondary: '#B8B7CF',
  textMuted: 'rgba(245,243,255,0.48)',
  textDim: 'rgba(245,243,255,0.32)',
  accent: '#22D3EE',
  ark: '#8B5CF6',
  hoverBg: 'rgba(255,255,255,0.055)',
  activeBg: 'rgba(139,92,246,0.14)',
}

// ─── 7 UNIVERS COURTIA ─────────────────────────────────────────
const UNIVERSES = [
  {
    id: 'pilotage',
    label: 'PILOTAGE',
    glyph: '01',
    items: [
      { path: '/dashboard',     label: 'Cockpit',       icon: LayoutDashboard },
      { path: '/morning-brief', label: 'Morning Brief', icon: Sunrise },
      { path: '/objectifs',     label: 'Objectifs',     icon: Target },
      { path: '/rapports',      label: 'Rapports',      icon: BarChart3 },
      { path: '/analytics',     label: 'Analytics',     icon: BarChart2 },
    ],
  },
  {
    id: 'portefeuille',
    label: 'PORTEFEUILLE',
    glyph: '02',
    items: [
      { path: '/clients',   label: 'Clients',   icon: Users },
      { path: '/contrats',  label: 'Contrats',  icon: FileText },
      { path: '/devis',     label: 'Devis',     icon: FileSignature },
      { path: '/documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    id: 'actions',
    label: 'ACTIONS',
    glyph: '03',
    items: [
      { path: '/taches',        label: 'Tâches',         icon: CheckSquare },
      { path: '/relances',      label: 'Relances',       icon: Phone },
      { path: '/opportunites',  label: 'Opportunités',   icon: Target },
      { path: '/rendez-vous',   label: 'Rendez-vous',    icon: CalendarDays },
    ],
  },
  {
    id: 'acquisition',
    label: 'ACQUISITION',
    glyph: '04',
    items: [
      { path: '/prospection',  label: 'Prospection', icon: Search },
      { path: '/reach',        label: 'REACH',       icon: Globe },
      { path: '/partenaires',  label: 'Partenaires', icon: Users2 },
      { path: '/commissions',  label: 'Commissions', icon: Wallet },
    ],
  },
  {
    id: 'ark',
    label: 'ARK IA',
    glyph: 'AI',
    items: [
      { path: '/assistant-ark',         label: 'Assistant ARK',     icon: Bot },
      { path: '/ark-intelligence',      label: 'Intelligence préd.',icon: Brain },
      { path: '/comparateur',           label: 'Comparateur',       icon: GitCompareArrows },
      { path: '/sante-portefeuille',    label: 'Santé portefeuille',icon: Activity },
      { path: '/commissions/calculator',label: 'Calc. commissions', icon: Calculator },
    ],
  },
  {
    id: 'cabinet',
    label: 'CABINET',
    glyph: '05',
    items: [
      { path: '/equipe',     label: 'Équipe',      icon: Building2 },
      { path: '/conformite', label: 'Conformité',  icon: Shield },
      { path: '/parametres', label: 'Paramètres',  icon: Settings },
      { path: '/abonnement', label: 'Abonnement',  icon: CreditCard },
      { path: '/import',     label: 'Import',      icon: Database },
    ],
  },
  {
    id: 'ressources',
    label: 'RESSOURCES',
    glyph: '06',
    items: [
      { path: '/academy', label: 'Academy', icon: GraduationCap },
      { path: '/aide',    label: 'Aide',    icon: HelpCircle },
    ],
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // ─── Univers : ouverts par défaut, repli au clic ────────────
  const initialOpen = useMemo(() => {
    const map = {}
    UNIVERSES.forEach(u => {
      map[u.id] = u.items.some(it => location.pathname.startsWith(it.path))
        || ['pilotage', 'portefeuille', 'actions'].includes(u.id) // ces 3 ouverts par défaut
    })
    return map
  }, []) // eslint-disable-line
  const [openMap, setOpenMap] = useState(initialOpen)

  function toggleUniverse(id) {
    setOpenMap(m => ({ ...m, [id]: !m[id] }))
  }

  useEffect(() => {
    const update = () => {
      try {
        const stored = localStorage.getItem('courtia_user')
        if (stored) setUser(JSON.parse(stored))
      } catch (_) { console.warn('Erreur lecture profile:', _) }
    }
    update()
    window.addEventListener('profileUpdated', update)
    return () => window.removeEventListener('profileUpdated', update)
  }, [])

  // Sync mobile drawer with external topbar (AuroraMobileTopbar)
  useEffect(() => {
    const open = () => setMobileOpen(true)
    const close = () => setMobileOpen(false)
    window.addEventListener('courtia:open-sidebar', open)
    window.addEventListener('courtia:close-sidebar', close)
    return () => {
      window.removeEventListener('courtia:open-sidebar', open)
      window.removeEventListener('courtia:close-sidebar', close)
    }
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

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
    toast.success('Déconnexion ✓')
  }

  function isActive(path) {
    if (path === '/dashboard') return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const userFirst = user?.first_name || user?.firstName || ''
  const userLast  = user?.last_name  || user?.lastName  || ''
  const userName  = (userFirst + ' ' + userLast).trim() || 'Utilisateur'
  const userEmail = user?.email || ''
  const userCabinet = user?.cabinet_name || user?.cabinetName || ''
  const isAdmin = isAdminRole((user?.role || '').toLowerCase())
  const initials = ((userFirst[0] || '') + (userLast[0] || '')).toUpperCase() || '?'

  // ─── Item ─────────────────────────────────────────────────
  const renderItem = (item) => {
    const active = isActive(item.path)
    const Icon = item.icon
    return (
      <button
        key={item.path}
        className={`courtia-sidebar-item ${active ? 'is-active' : ''}`}
        onClick={() => { setMobileOpen(false); navigate(item.path) }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 12px 7px 26px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: active ? T.text : T.textSecondary,
          background: active ? T.activeBg : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s, color 0.15s, transform 0.15s',
          borderLeft: active ? `2px solid ${T.accent}` : '2px solid transparent',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!active) { e.currentTarget.style.background = T.hoverBg; e.currentTarget.style.color = T.text }
          e.currentTarget.style.transform = 'translateX(1px)'
        }}
        onMouseLeave={(e) => {
          if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary }
          e.currentTarget.style.transform = 'translateX(0)'
        }}
      >
        <Icon size={14} strokeWidth={active ? 2 : 1.7} style={{ opacity: active ? 1 : 0.75, flexShrink: 0 }} />
        <span>{item.label}</span>
      </button>
    )
  }

  // ─── Univers (accordéon) ──────────────────────────────────
  const renderUniverse = (u) => {
    const open = !!openMap[u.id]
    const hasActive = u.items.some(it => isActive(it.path))
    return (
      <div key={u.id} style={{ marginBottom: 2 }}>
        <button
          className={`courtia-sidebar-universe ${hasActive ? 'is-active' : ''}`}
          onClick={() => toggleUniverse(u.id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: hasActive ? T.text : T.textMuted,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = T.text}
          onMouseLeave={e => e.currentTarget.style.color = hasActive ? T.text : T.textMuted}
        >
          <span style={{ fontSize: 9, opacity: 0.9, letterSpacing: '0.06em' }}>{u.glyph}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{u.label}</span>
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
            <ChevronRight size={11} />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingBottom: 4 }}>
                {u.items.map(item => renderItem(item))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ─── Contenu ──────────────────────────────────────────────
  const sidebarContent = (
    <div className={`md:block ${mobileOpen ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-[1050] md:relative md:z-0`} style={{
      height: '100%',
      display: mobileOpen ? 'flex' : undefined,
    }}>
      {/* Backdrop sur mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[-1] md:hidden" 
          onClick={() => setMobileOpen(false)}
        />
      )}
      
    <aside className="courtia-sidebar" style={{
      width: 240,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: T.bg,
      borderRight: `1px solid ${T.border}`,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Logo COURTIA */}
      <div className="courtia-sidebar-brand" style={{
        padding: '16px 18px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${T.borderLight}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CourtiaMiniLogo size={26} />
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          style={{ padding: 6, color: T.textMuted, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer' }}
          className="md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav : 7 univers */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {UNIVERSES.map(u => renderUniverse(u))}

        {isAdmin && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
            {renderItem({ path: '/admin', label: 'Admin', icon: Shield })}
          </div>
        )}
      </nav>

      {/* Bandeau ARK Intelligence */}
      <div className="courtia-sidebar-ark" style={{
        margin: '0 10px 8px',
        padding: '10px 12px',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(34,211,238,0.07))',
        border: `1px solid rgba(139,92,246,0.26)`,
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
      }}
      onClick={() => { setMobileOpen(false); navigate('/morning-brief') }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: 'rgba(139,92,246,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={13} color={T.ark} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, letterSpacing: '0.02em' }}>ARK Intelligence</div>
          <div style={{ fontSize: 10, color: T.textMuted }}>3 priorités aujourd'hui</div>
        </div>
      </div>

      {/* Profil */}
      <div className="courtia-sidebar-profile" style={{
        padding: '12px 14px',
        borderTop: `1px solid ${T.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.30), rgba(91,77,245,0.18))',
          color: T.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 11, flexShrink: 0,
          border: `1px solid rgba(139,92,246,0.25)`,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
          <p style={{ fontSize: 10, color: T.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userCabinet || userEmail}</p>
        </div>
        <button
          onClick={logout}
          title="Déconnexion"
          style={{ padding: 4, color: T.textMuted, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = T.textMuted}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
    </div>
  )

  return (
    <>
      {/* Container wrapper handles desktop/mobile states via Tailwind classes */}
      {/* On desktop: normal document flow. On mobile: hidden because AppPrivateLayout manages it */}
      <div className="hidden md:block md:fixed md:top-0 md:left-0 md:h-screen md:z-50">
        {sidebarContent}
      </div>
    </>
  )
}
