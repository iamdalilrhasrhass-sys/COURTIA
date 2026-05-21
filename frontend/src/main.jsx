import './styles/hyper-premium-injection.js';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/design-system.css'
import './styles/aurora-mobile.css'

function renderBootFallback(message, details) {
  const target = document.getElementById('root') || document.body
  target.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#02030b;color:#fff;font-family:Inter,system-ui,sans-serif">
      <section style="max-width:620px;text-align:center">
        <p style="margin:0 0 10px;color:#8fe7ff;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">COURTIA</p>
        <h1 style="margin:0 0 14px;font-size:clamp(2rem,6vw,4rem);line-height:.95">Le cockpit n'a pas pu se charger</h1>
        <p style="margin:0 auto 22px;color:rgba(255,255,255,.7);line-height:1.6">Une erreur technique empêche l'affichage de l'application. Rechargez la page ou réessayez dans quelques instants.</p>
        <button onclick="window.location.reload()" style="min-height:46px;padding:0 22px;border:0;border-radius:999px;background:linear-gradient(135deg,#a9f1ff,#ff71bd);color:#060717;font-weight:800;cursor:pointer">Recharger</button>
      </section>
    </main>
  `
  console.error('[COURTIA boot]', message, details)
}

window.addEventListener('error', (event) => {
  if (document.getElementById('root')?.childElementCount) return
  renderBootFallback('Erreur JavaScript au démarrage.', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  if (document.getElementById('root')?.childElementCount) return
  renderBootFallback('Promesse rejetée au démarrage.', event.reason)
})

const container = document.getElementById('root')

if (!container) {
  renderBootFallback('Conteneur #root introuvable.')
} else {
  try {
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (error) {
    renderBootFallback('Crash synchronisé au démarrage.', error)
  }
}
