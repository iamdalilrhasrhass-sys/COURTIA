import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n' // LOT 23 — Initialisation i18n
import './index.css'
import './styles/tokens.css'
import './styles/design-system.css'
import './styles/mobile-responsive.css'
import './styles/aurora.css'
import './styles/aurora-mobile.css'
import './design/tokens.css' // LA BULLE — design system tokens
import './styles/courtia-global-design.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { initSentry } from './lib/sentry'
import { ArkContextProvider } from './components/ark/ArkContextProvider'
import { registerServiceWorker } from './lib/registerServiceWorker'

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
initSentry()
registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'configuration-required'}>
    <React.StrictMode>
      <ArkContextProvider>
        <App />
      </ArkContextProvider>
    </React.StrictMode>
  </GoogleOAuthProvider>
)
