/* ============================================================================
   COURTIARK — Démonstration : enveloppe
   ----------------------------------------------------------------------------
   Monte LE VRAI shell privé COURTIARK (`AppPrivateLayout` : AuroraBackground,
   Sidebar, topbar mobile, bottom nav, palette de commandes) et laisse
   l'`Outlet` rendre LES VRAIES pages du cockpit.

   Aucun composant n'est réécrit ici : c'est le produit, alimenté par la couche
   de données synthétiques de `reponsesDemo.js`.
   ========================================================================== */

import { useEffect } from 'react'
import AppPrivateLayout from '../AppPrivateLayout'
import { BANDEAU_DEMO, installerDemo, desinstallerDemo } from './modeDemo'
import DemoTour from './DemoTour'
import './demoTour.css'

export default function DemoLayout() {
  useEffect(() => {
    installerDemo()
    document.title = 'COURTIARK — Démonstration'
    return () => desinstallerDemo()
  }, [])

  return (
    <>
      <div className="dt-bandeau" role="note">
        <span className="dt-bandeau-marque">{BANDEAU_DEMO.titre}</span>
        <span className="dt-bandeau-sep" />
        <span className="dt-bandeau-txt">{BANDEAU_DEMO.texte}</span>
      </div>
      {/* Le vrai cockpit : mêmes composants que la production */}
      <AppPrivateLayout />
      {/* Visite guidée posée par-dessus, pilotée sur les vrais écrans */}
      <DemoTour />
    </>
  )
}
