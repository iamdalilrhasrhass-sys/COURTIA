import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at 20% 10%, rgba(124,58,237,0.18), transparent 32%), #05060a', color: '#fff' }}>
      <div style={{ width: 'min(100%, 620px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: 30, backdropFilter: 'blur(16px)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.16)', color: '#93c5fd', marginBottom: 18 }}>
          <SearchX size={28} />
        </div>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c4b5fd', fontWeight: 700 }}>Erreur de navigation</p>
        <h1 style={{ margin: '10px 0 8px', fontSize: 34, lineHeight: 1.08, letterSpacing: '-0.03em' }}>Page introuvable</h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.74)', lineHeight: 1.7, fontSize: 14 }}>
          L’URL demandée n’existe pas ou n’est plus disponible. Revenez au cockpit pour continuer votre session COURTIA.
        </p>
        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, textDecoration: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
            <ArrowLeft size={14} /> Retour au dashboard
          </Link>
          <Link to="/clients" style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 14px', borderRadius: 12, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600, fontSize: 13 }}>
            Ouvrir les clients
          </Link>
        </div>
      </div>
    </div>
  )
}
