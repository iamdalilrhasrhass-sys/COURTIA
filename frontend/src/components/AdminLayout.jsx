import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import RhasrhassSignature from './brand/RhasrhassSignature'

export default function AdminLayout() {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background:
          'radial-gradient(circle at 12% 0%, rgba(255,128,224,0.12), transparent 28rem), radial-gradient(circle at 84% 8%, rgba(34,211,238,0.10), transparent 30rem), linear-gradient(180deg, #02040c 0%, #050716 46%, #02040c 100%)',
      }}
    >
      <AdminSidebar />
      <main className="courtia-depth-stage" style={{ flex: 1, marginLeft: 220, padding: '32px 36px', minHeight: '100vh', color: '#e5e5e5', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <Outlet />
        </div>
        <footer style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 10px' }}>
          <RhasrhassSignature compact />
        </footer>
      </main>
    </div>
  )
}
