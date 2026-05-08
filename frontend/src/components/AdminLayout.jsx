import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import RhasrhassSignature from './brand/RhasrhassSignature'

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <AdminSidebar />
      <main style={{ flex: 1, marginLeft: 220, padding: '32px 36px', minHeight: '100vh', color: '#e5e5e5', display: 'flex', flexDirection: 'column' }}>
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
