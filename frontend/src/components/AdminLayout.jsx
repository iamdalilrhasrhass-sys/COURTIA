import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, LayoutDashboard, MoreHorizontal, PhoneCall, Users } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import RhasrhassSignature from './brand/RhasrhassSignature'
import AuroraMobileTopbar from './aurora/AuroraMobileTopbar'

const ADMIN_MOBILE_LINKS = [
  { to: '/admin', label: 'Pilotage', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'Courtiers', icon: Users },
  { to: '/prospection', label: 'Ventes', icon: PhoneCall },
  { to: '/admin/system', label: 'Système', icon: Activity },
]

const ADMIN_PAGE_TITLES = [
  ['/admin/subscriptions', 'Abonnements'], ['/admin/growth-leads', 'Growth Leads'],
  ['/admin/feedback', 'Feedback'], ['/admin/support', 'Support'],
  ['/admin/system', 'Système'], ['/admin/logs', 'Journaux'],
  ['/admin/costs', 'Coûts ARK'], ['/admin/users', 'Courtiers'], ['/admin', 'Pilotage'],
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pageTitle = ADMIN_PAGE_TITLES.find(([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`))?.[1] || 'Administration'

  return (
    <div
      className="courtia-admin-shell"
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background:
          'radial-gradient(circle at 12% 0%, rgba(255,128,224,0.12), transparent 28rem), radial-gradient(circle at 84% 8%, rgba(34,211,238,0.10), transparent 30rem), linear-gradient(180deg, #02040c 0%, #050716 46%, #02040c 100%)',
      }}
    >
      <AuroraMobileTopbar title={pageTitle} logoTo="/admin" onMenuClick={() => setMobileMenuOpen(true)} onBellClick={() => navigate('/admin/system')} />
      <AdminSidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="courtia-admin-main courtia-depth-stage" style={{ flex: 1, marginLeft: 220, padding: '32px 36px', minHeight: '100vh', color: '#e5e5e5', display: 'flex', flexDirection: 'column' }}>
        <div className="courtia-admin-route" style={{ flex: 1 }}>
          <Outlet />
        </div>
        <footer className="courtia-admin-footer" style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 10px' }}>
          <RhasrhassSignature compact />
        </footer>
      </main>
      <nav className="courtia-admin-mobile-nav" aria-label="Navigation administrateur mobile">
        {ADMIN_MOBILE_LINKS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? location.pathname === to : location.pathname.startsWith(to)
          return <NavLink key={to} to={to} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><Icon size={19} /><span>{label}</span></NavLink>
        })}
        <button type="button" onClick={() => setMobileMenuOpen(true)}><MoreHorizontal size={20} /><span>Plus</span></button>
      </nav>
    </div>
  )
}
