import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, FileText, CheckSquare, TrendingUp,
  Settings, LogOut, Shield, Menu, X, Calculator, GitCompareArrows,
  Activity, ChevronRight, Sparkles, HelpCircle, GraduationCap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import CourtiaMiniLogo from './brand/CourtiaMiniLogo'
import { clearStoredSession } from '../api/sessionPolicy'
import { resetSessionUserCache } from '../api/sessionUser'
import { isAdminRole } from '../lib/roles'

// ─── Design tokens ────────────────────────────────────────────────
const t = {
  bg: '#080808',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',
  text: '#ffffff',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
  accent: '#8B5CF6',
  accentBg: 'rgba(139, 92, 246, 0.10)',
  activeBorder: 'rgba(139, 92, 246, 0.30)',
  hoverBg: 'rgba(255,255,255,0.04)',
}

// ─── 8 items principaux (microcopy court) ─────────────────────────
const PRIMARY = [
  { path: '/dashboard',    label: 'Accueil',       icon: LayoutDashboard },
  { path: '/clients',      label: 'Clients',       icon: Users },
  { path: '/contrats',     label: 'Contrats',      icon: FileText },
  { path: '/opportunites', label: 'Opportunités',  icon: TrendingUp },
  { path: '/taches',       label: 'Tâches',        icon: CheckSquare },
]

// ─── Outils (collapsable) ─────────────────────────────────────────
const TOOLS = [
  { path: '/commissions/calculator', label: 'Commissions',  icon: Calculator },
  { path: '/comparateur',            label: 'Comparer',     icon: GitCompareArrows },
  { path: '/sante-portefeuille',     label: 'Santé',        icon: Activity },
]

const RESOURCES = [
  { path: '/assistant-ark', label: 'ARK',     icon: Sparkles },
  { path: '/academy',       label: 'Academy', icon: GraduationCap },
  { path: '/aide',          label: 'Aide',    icon: HelpCircle },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(() =>
    TOOLS.some(i => location.pathname.startsWith(i.path))
  )
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    const update = () => {
      try {
        const stored = localStorage.getItem('courtia_user')
        if (stored) setUser(JSON.parse(stored))
      } catch (_) {}
    }
    update()
    window.addEventListener('profileUpdated', update)
    return () => window.removeEventListener('profileUpdated', update)
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
  const isAdmin = isAdminRole((user?.role || '').toLowerCase())
  const initials = ((userFirst[0] || '') + (userLast[0] || '')).toUpperCase() || '?'

  // ── ITEM ROW ──────────────────────────────────────────────────
  function ItemRow({ item, depth = 0 }) {
    const active = isActive(item.path)
    const Icon = item.icon
    return (
      <button
        onClick={() => { setMobileOpen(false); navigate(item.path) }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: depth ? '7px 12px 7px 36px' : '8px 12px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: active ? t.text : t.textMuted,
          background: active ? t.accentBg : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s, color 0.15s',
          borderLeft: active ? `2px solid ${t.accent}` : '2px solid transparent',
          paddingLeft: active ? (depth ? 34 : 10) : (depth ? 36 : 12),
        }}
        onMouseEnter={(e) => {
          if (!active) { e.currentTarget.style.background = t.hoverBg; e.currentTarget.style.color = t.text }
        }}
        onMouseLeave={(e) => {
          if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.textMuted }
        }}
      >
        <Icon size={15} strokeWidth={active ? 2 : 1.7} />
        <span>{item.label}</span>
      </button>
    )
  }

  // ── SECTION TITLE ─────────────────────────────────────────────
  function SectionTitle({ label }) {
    return (
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: t.textDim,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        padding: '14px 12px 6px',
      }}>{label}</div>
    )
  }

  // ── CONTENT ───────────────────────────────────────────────────
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
          style={{ display: 'none', padding: 6, color: t.textMuted, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer' }}
          className="md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        <SectionTitle label="Principal" />
        {PRIMARY.map(item => <ItemRow key={item.path} item={item} />)}

        {/* Outils (collapsable) */}
        <div style={{ marginTop: 4 }}>
          <button
            onClick={() => setToolsOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              color: t.textDim,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>Outils</span>
            <motion.div animate={{ rotate: toolsOpen ? 90 : 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
              <ChevronRight size={12} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {toolsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden' }}
              >
                {TOOLS.map(item => <ItemRow key={item.path} item={item} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plus (collapsable) */}
        <div style={{ marginTop: 4 }}>
          <button
            onClick={() => setMoreOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              color: t.textDim,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>Plus</span>
            <motion.div animate={{ rotate: moreOpen ? 90 : 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
              <ChevronRight size={12} />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {moreOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: 'hidden' }}
              >
                {RESOURCES.map(item => <ItemRow key={item.path} item={item} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isAdmin && (
          <>
            <SectionTitle label="Admin" />
            <ItemRow item={{ path: '/admin', label: 'Admin', icon: Shield }} />
          </>
        )}
      </nav>

      {/* Paramètres */}
      <div style={{ padding: '8px', borderTop: `1px solid ${t.borderLight}` }}>
        <ItemRow item={{ path: '/parametres', label: 'Paramètres', icon: Settings }} />
      </div>

      {/* Profil */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${t.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: t.accentBg, color: t.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 11, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: t.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
          <p style={{ fontSize: 10, color: t.textMuted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
        </div>
        <button
          onClick={logout}
          title="Déconnexion"
          style={{ padding: 4, color: t.textMuted, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = t.textMuted}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed', top: 10, left: 10, zIndex: 60,
          padding: 8, background: t.bg, border: `1px solid ${t.borderLight}`,
          borderRadius: 8, color: t.text, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        className="flex md:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55 }}
            className="md:hidden"
          />
        )}
      </AnimatePresence>

      <div className="hidden md:block md:fixed md:top-0 md:left-0 md:h-screen md:z-50">
        {sidebarContent}
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 60, boxShadow: '4px 0 24px rgba(0,0,0,0.4)' }}
            className="md:hidden"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
