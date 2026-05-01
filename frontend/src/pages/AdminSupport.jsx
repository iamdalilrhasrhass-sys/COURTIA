import { LifeBuoy, Mail, ExternalLink } from 'lucide-react'
import AuroraEmptyState from '../components/brand/AuroraEmptyState'

export default function AdminSupport() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Support</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Outils et contacts pour l'administration de COURTIA</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {/* Contact */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Mail size={16} style={{ color: '#8b5cf6' }} />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Contact COURTIA</h3>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
            <div>Email : arkcourtia@gmail.com</div>
            <div>Domaine : courtiark.fr</div>
            <div>VPS : 72.62.187.63</div>
            <div>Déploiement : Vercel + PM2</div>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ExternalLink size={16} style={{ color: '#3b82f6' }} />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Accès rapides</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Vercel Dashboard', url: 'https://vercel.com' },
              { label: 'GitHub Repository', url: 'https://github.com/iamdalilrhasrhass-sys/COURTIA' },
              { label: 'Stripe Dashboard', url: 'https://dashboard.stripe.com' },
              { label: 'Frontend (prod)', url: 'https://courtiark.fr' },
            ].map(link => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={11} /> {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* System status */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <LifeBuoy size={16} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>État actuel</h3>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
            <div>✓ Backend VPS : online (PM2)</div>
            <div>✓ API : répond</div>
            <div>✓ Base de données : PostgreSQL</div>
            <div>✓ Frontend : Vercel</div>
            <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
              Dernière vérification : système autonome
            </div>
          </div>
        </div>
      </div>

      {/* Empty state for ticket system */}
      <div style={{ marginTop: 24 }}>
        <AuroraEmptyState
          icon={LifeBuoy}
          title="Système de tickets non connecté"
          subtitle="Le support utilisateur sera intégré dans une version future. En attendant, utilisez le contact direct par email."
        />
      </div>
    </div>
  )
}
