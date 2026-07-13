import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Activity, FileText, LifeBuoy, Shield, BrainCircuit, MessageCircle, PhoneCall, X } from 'lucide-react'
import CourtiaMiniLogo from './brand/CourtiaMiniLogo'

const links = [
    { to: '/admin', icon: LayoutDashboard, label: "Vue d'ensemble" },
  { to: '/prospection', icon: PhoneCall, label: 'Activité commerciale' },
  { to: '/admin/users', icon: Users, label: 'Courtiers' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Abonnements' },
  { to: '/admin/growth-leads', icon: Users, label: 'Growth Leads' },
  { to: '/admin/costs', icon: BrainCircuit, label: 'Coûts ARK' },
  { to: '/admin/system', icon: Activity, label: 'Système' },
  { to: '/admin/logs', icon: FileText, label: 'Journaux' },
  { to: '/admin/feedback', icon: MessageCircle, label: 'Feedback' },
  { to: '/admin/support', icon: LifeBuoy, label: 'Support' },
]

export default function AdminSidebar({ mobileOpen = false, onClose }) {
  const location = useLocation()
  const growthLeadsEnabled = String(import.meta.env.VITE_ENABLE_GROWTH_LEADS || '').toLowerCase() === 'true'
  const visibleLinks = growthLeadsEnabled
    ? links
    : links.filter((link) => link.to !== '/admin/growth-leads')

  return (
    <>
    {mobileOpen && <button type="button" className="courtia-admin-sidebar-backdrop" aria-label="Fermer le menu administrateur" onClick={onClose} />}
    <aside className={`courtia-admin-sidebar ${mobileOpen ? 'is-mobile-open' : ''}`} style={{
      width: 220, minHeight: '100vh',
      background: 'linear-gradient(180deg, rgba(6,10,24,0.92), rgba(2,6,18,0.94))',
      borderRight: '1px solid rgba(255,255,255,0.10)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      backdropFilter: 'blur(14px)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.38)',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <CourtiaMiniLogo size={24} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Admin</span>
          <button type="button" className="courtia-admin-sidebar-close" onClick={onClose} aria-label="Fermer le menu administrateur"><X size={19} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Shield size={10} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 500 }}>Super Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {visibleLinks.map(link => {
          const active = location.pathname === link.to || (link.to !== '/admin' && location.pathname.startsWith(link.to))
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                fontSize: 12.5, fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
                transform: active ? 'translateX(1px)' : 'translateX(0)',
              }}
            >
              <link.icon size={15} />
              {link.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
        COURTIA Admin · v1.0
      </div>
    </aside>
    </>
  )
}
