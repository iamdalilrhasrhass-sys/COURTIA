import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ClientDetail from './pages/ClientDetail'
import Contrats from './pages/Contrats'
import Taches from './pages/Taches'
import Parametres from './pages/Parametres'
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
        <Route 
          path="/client/:id" 
          element={token ? <ClientDetail /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/contrats" 
          element={token ? <Contrats /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/taches" 
          element={token ? <Taches /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/parametres" 
          element={token ? <Parametres /> : <Navigate to="/login" />} 
        />
        
        {/* Fallback - redirect unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}
