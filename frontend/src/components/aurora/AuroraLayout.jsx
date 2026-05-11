import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Eye,
  AlertTriangle,
  Receipt,
  BarChart3,
  FileText,
  MessageSquare,
  Mic,
  PenTool,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'
import { CosmosBackground, BubbleC, Wordmark, Kicker } from '../../design'

/**
 * AuroraLayout — La Bulle app shell.
 * - Sidebar gauche fond #020108, logo BubbleC mini, navigation en Fraunces italic
 * - Header barre fine fond #08051A, kicker droite + avatar
 * - Fond cosmos subtil (30% opacity)
 * - Transition de page Framer Motion (fade + translateY)
 *
 * Usage :
 *   <AuroraLayout>
 *     <DashboardV2 />
 *   </AuroraLayout>
 */

const NAV_GROUPS = [
  {
    label: 'Cockpit',
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Tableau de bord' },
      { to: '/clients',    icon: Users,           label: 'Clients' },
      { to: '/ark-watch',  icon: Eye,             label: 'ARK Watch' },
    ],
  },
  {
    label: 'Production',
    items: [
      { to: '/sinistres',    icon: AlertTriangle, label: 'Sinistres' },
      { to: '/commissions',  icon: Receipt,       label: 'Commissions' },
      { to: '/reporting',    icon: BarChart3,     label: 'Reporting' },
      { to: '/documents',    icon: FileText,      label: 'Documents' },
    ],
  },
  {
    label: 'ARK',
    items: [
      { to: '/ark-chat',     icon: MessageSquare, label: 'ARK Chat' },
      { to: '/ark-voice',    icon: Mic,           label: 'Voice Intake' },
      { to: '/ark-compose',  icon: PenTool,       label: 'ARK Compose' },
    ],
  },
]

const SIDEBAR_W = 240
const SIDEBAR_W_COLLAPSED = 76

export function AuroraLayout({ children, kicker, title, actions }) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020108',
        color: 'rgba(255,255,255,0.92)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: 'relative',
        display: 'flex',
      }}
    >
      {/* Subtle cosmos backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <CosmosBackground variant="subtle" particleCount={18} />
      </div>

      {/* ───────── Sidebar ───────── */}
      <aside
        className="la-bulle-sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W,
          background: 'rgba(2,1,8,0.92)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          zIndex: 30,
          transition: 'width 0.3s cubic-bezier(.2,.8,.2,1), transform 0.3s ease',
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 10 }}>
          <NavLink to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <BubbleC size={collapsed ? 42 : 48} animated={false} glow={false} />
            {!collapsed && <Wordmark size={20} />}
          </NavLink>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Réduire la sidebar"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                borderRadius: 8,
                width: 26,
                height: 26,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
              borderRadius: 8,
              padding: '6px 0',
              cursor: 'pointer',
              alignSelf: 'center',
            }}
            aria-label="Etendre la sidebar"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)',
                  padding: '0 10px 8px',
                }}>
                  {group.label}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {group.items.map((item) => (
                  <SidebarLink key={item.to} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer kicker */}
        {!collapsed && (
          <div style={{
            padding: '12px 10px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
          }}>
            v2 · la bulle
          </div>
        )}
      </aside>

      {/* Mobile burger */}
      <button
        className="la-bulle-burger"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Menu"
        style={{
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 40,
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'rgba(8,5,26,0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.8)',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ───────── Main ───────── */}
      <main
        className="la-bulle-main"
        style={{
          flex: 1,
          marginLeft: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W,
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
          transition: 'margin-left 0.3s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        {/* Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(8,5,26,0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            minHeight: 64,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            {kicker && <Kicker>{kicker}</Kicker>}
            {title && (
              <h1 style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 24,
                margin: 0,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}>
                {title}
              </h1>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {actions}
            <button
              aria-label="Recherche"
              style={{
                width: 36, height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Search size={16} />
            </button>
            <button
              aria-label="Notifications"
              style={{
                width: 36, height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Bell size={16} />
            </button>
            <div
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                fontSize: 14,
                color: 'white',
                boxShadow: '0 4px 16px rgba(161,66,244,0.4)',
              }}
            >
              C
            </div>
          </div>
        </header>

        {/* Page content with transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ padding: 28 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Responsive helpers */}
      <style>{`
        @media (max-width: 900px) {
          .la-bulle-sidebar {
            transform: translateX(-100%);
          }
          .la-bulle-burger {
            display: inline-flex !important;
          }
          .la-bulle-main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

function SidebarLink({ item, collapsed }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: collapsed ? '10px 0' : '10px 12px',
        borderRadius: 10,
        textDecoration: 'none',
        fontFamily: "'Fraunces', serif",
        fontStyle: 'italic',
        fontWeight: 300,
        fontSize: 15,
        color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
        background: isActive ? 'linear-gradient(90deg, rgba(255,77,157,0.12) 0%, rgba(161,66,244,0.12) 50%, rgba(66,133,244,0.12) 100%)' : 'transparent',
        border: isActive ? '1px solid rgba(161,66,244,0.25)' : '1px solid transparent',
        justifyContent: collapsed ? 'center' : 'flex-start',
        transition: 'all 0.2s ease',
        position: 'relative',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            style={{
              color: isActive ? '#ff80e0' : 'rgba(255,255,255,0.5)',
              flexShrink: 0,
            }}
          />
          {!collapsed && <span>{item.label}</span>}
          {isActive && !collapsed && (
            <span
              style={{
                position: 'absolute',
                right: 12,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'linear-gradient(90deg, #ff4d9d, #a142f4)',
                boxShadow: '0 0 8px rgba(255,77,157,0.8)',
              }}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

export default AuroraLayout
