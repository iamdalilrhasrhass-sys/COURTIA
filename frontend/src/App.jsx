import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ClientDetail from './pages/ClientDetail'
import Contrats from './pages/Contrats'
import Taches from './pages/Taches'
import Parametres from './pages/Parametres'
import Auth from './components/AuthPremium'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  // Vérifier expiration du token
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

export default function App() {
  const token = useAuthStore((state) => state.token)

  return (
    <Router>
      <ScrollToTop />
      <Toaster position="bottom-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        
        {/* Auth Routes - Login/Register */}
        <Route 
          path="/login" 
          element={!token ? <Auth onAuthSuccess={() => {}} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/register" 
          element={!token ? <Auth onAuthSuccess={() => {}} /> : <Navigate to="/dashboard" />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={<PrivateRoute><Dashboard /></PrivateRoute>} 
        />
        <Route 
          path="/client/:id" 
          element={<PrivateRoute><ClientDetail /></PrivateRoute>} 
        />
        <Route 
          path="/contrats" 
          element={<PrivateRoute><Contrats /></PrivateRoute>} 
        />
        <Route 
          path="/taches" 
          element={<PrivateRoute><Taches /></PrivateRoute>} 
        />
        <Route 
          path="/parametres" 
          element={<PrivateRoute><Parametres /></PrivateRoute>} 
        />
        
        {/* Fallback - redirect unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}
