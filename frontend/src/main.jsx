import './styles/hyper-premium-injection.js';
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App'
import { estModeDemo, installerDemo } from './demo/modeDemo'
import { evenement } from './lib/analytics'
import { origineTrafic } from './lib/analytics'
import { installerMesureCta } from './lib/mesureCta'
import { demarrerSuiviDemo } from './lib/suiviDemo'
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

// La couche de démonstration doit être en place AVANT le premier rendu :
// les effets des pages enfants s'exécutent avant ceux de leur parent, donc une
// installation dans un useEffect laisserait passer les premières requêtes.
try {
  if (estModeDemo()) installerDemo()
} catch (e) {
  window.__demoBootError = String((e && e.stack) || e)
  console.error('[demo] installation impossible', e)
}

const container = document.getElementById('root')

if (!container) {
  renderBootFallback('Conteneur #root introuvable.')
} else {
  try {
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <App />
        {/* Mesure de trafic et de performance (anonyme). Montées hors des
            écrans : elles ne dépendent d'aucune route et n'affichent rien. */}
        <Analytics />
        <SpeedInsights />
      </React.StrictMode>
    )
  } catch (error) {
    renderBootFallback('Crash synchronisé au démarrage.', error)
  }
}

/* Première visite : un seul appel, hors du cycle de rendu (donc insensible au
   double rendu de StrictMode). Les vues de page suivantes sont mesurées par la
   mesure installée elle-même. */
try {
  evenement('site_visit')
  /* Premier maillon du tunnel d'acquisition : d'où vient la visite.
     `organic_visit` n'est émis QUE si l'origine est réellement organique
     (référent = moteur de recherche). Direct, payant et référent externe ne
     sont pas maquillés en organique : ils ne sont simplement pas comptés ici. */
  const origine = origineTrafic()
  if (origine.origine === 'organique') {
    evenement('organic_visit', { moteur: origine.moteur || 'inconnu' })
  }
} catch {
  /* la mesure ne doit jamais empêcher l'application de démarrer */
}

/* Visite guidée /demo : lecture des étapes pour demo_started / chapitre /
   completion / prise en main. Inerte hors /demo. */
try {
  if (estModeDemo()) demarrerSuiviDemo()
} catch {
  /* idem */
}

/* Clic sur un CTA « Demander une démo » : écouté au niveau du document, donc
   valable pour tous les CTA du site (navigation, pages marketing, tarifs), y
   compris ceux ajoutés plus tard. Inerte si la mesure est indisponible. */
try {
  installerMesureCta()
} catch {
  /* la mesure ne doit jamais empêcher l'application de démarrer */
}
