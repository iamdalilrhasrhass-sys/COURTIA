import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Pages
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Contrats from './pages/Contrats'
import Taches from './pages/Taches'
import Parametres from './pages/Parametres'

// Components
import Sidebar from './components/Sidebar'

// ScrollToTop
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// PrivateRoute
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token')
      return <Navigate to="/login" replace />
    }
  } catch {
    localStorage.removeItem('token')
    return <Navigate to="/login" replace />
  }
  return children
}

// Layout avec sidebar
function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 280, background: '#f9fafb', minHeight: '100vh', padding: '24px' }}>
        {children}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Routes privées avec sidebar */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <AppLayout><Dashboard /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/clients" element={
          <PrivateRoute>
            <AppLayout><Clients /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/client/:id" element={
          <PrivateRoute>
            <AppLayout><ClientDetail /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/contrats" element={
          <PrivateRoute>
            <AppLayout><Contrats /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/taches" element={
          <PrivateRoute>
            <AppLayout><Taches /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/rapports" element={
          <PrivateRoute>
            <AppLayout><Dashboard /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/parametres" element={
          <PrivateRoute>
            <AppLayout><Parametres /></AppLayout>
          </PrivateRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
