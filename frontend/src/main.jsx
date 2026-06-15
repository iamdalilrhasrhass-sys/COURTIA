import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/design-system.css'
import './styles/mobile-responsive.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

const referralCode = new URLSearchParams(window.location.search).get('ref')
if (referralCode) {
  document.cookie = `courtia_ref=${encodeURIComponent(referralCode)};max-age=${30 * 24 * 3600};path=/;samesite=strict`
  fetch(`/api/global/referral/${encodeURIComponent(referralCode)}?event=visit&path=${encodeURIComponent(window.location.pathname)}`)
    .catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'placeholder'} onScriptLoadError={() => console.warn('Google OAuth: No client ID configured — login with Google disabled')}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </GoogleOAuthProvider>
)
