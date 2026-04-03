import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Auth from './components/AuthPremium'

export default function App() {
  const token = useAuthStore((state) => state.token)

  return (
    <Router>
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
          element={token ? <Dashboard /> : <Navigate to="/login" />} 
        />
        
        {/* Fallback - redirect unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}
