import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const pageTitles = {
  '/dashboard': 'Morning Brief',
  '/clients': 'Clients',
  '/contrats': 'Contrats',
  '/devis': 'Devis',
  '/documents': 'Documents',
  '/taches': 'Agenda & RDV',
  '/ark-intelligence': 'ARK Intelligence',
  '/capitia': 'ARK Négociateur',
  '/health': 'Santé Portefeuille',
  '/comparateur': 'Comparateur',
  '/bordereau': 'Bordereau',
  '/widget': 'Widget ARK',
  '/commissions': 'Commissions',
  '/billing': 'Facturation',
  '/rapports': 'Rapports',
  '/tokens': 'Tokens',
  '/equipe': 'Équipe',
  '/academy': 'Formation DDA',
  '/conformite': 'Conformité',
  '/parametres': 'Paramètres',
  '/abonnement': 'Abonnement',
  '/dashboard-legacy': 'Dashboard Legacy',
}

export default function AppShell() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'COURTIA'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar title={title} />
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
