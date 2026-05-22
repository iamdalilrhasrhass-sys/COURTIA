import { HeartHandshake, Building, Euro, TrendingUp, Zap, ArrowUpRight, Globe } from 'lucide-react'
import PartnerSolarSystem from '../components/widgets/PartnerSolarSystem'

const DEMO_PARTENAIRES = [
  { id: 1, nom: 'Gan Assurances', type: 'Compagnie', contrats: 34, commission: 28600, tendance: '+12%', logo: 'G' },
  { id: 2, nom: 'Novalia Courtage', type: 'Compagnie', contrats: 28, commission: 22400, tendance: '+8%', logo: 'NC' },
  { id: 3, nom: 'Aurora Assurances', type: 'Compagnie', contrats: 22, commission: 18100, tendance: '+5%', logo: 'AU' },
  { id: 4, nom: 'Helios Protection', type: 'Compagnie', contrats: 19, commission: 15300, tendance: '+14%', logo: 'HP' },
  { id: 5, nom: 'MAIF', type: 'Compagnie', contrats: 15, commission: 12100, tendance: '+3%', logo: 'M' },
  { id: 6, nom: 'Serenis Risk', type: 'Compagnie', contrats: 12, commission: 9800, tendance: '-2%', logo: 'SR' },
]

const DEMO_APPORTEURS = [
  { id: 101, nom: 'Agence Immobilière Bonnefoy', type: 'Apporteur', clients: 8, commission: 4200, tendance: '+25%' },
  { id: 102, nom: 'Expert Comptable Moreau', type: 'Apporteur', clients: 5, commission: 3100, tendance: '+10%' },
  { id: 103, nom: 'Garage Auto Prestige', type: 'Apporteur', clients: 6, commission: 2800, tendance: '+18%' },
]

export default function Partenaires() {
  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Partenaires</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Compagnies d'assurance et apporteurs d'affaires</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Compagnies', value: 6, icon: Building, accent: '#5B4DF5' },
          { label: 'Apporteurs', value: 3, icon: HeartHandshake, accent: '#22C55E' },
          { label: 'Commissions', value: '106 300 €', icon: Euro, accent: '#F59E0B' },
          { label: 'Contrats générés', value: '149', icon: TrendingUp, accent: '#3B82F6' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: 16, flex: 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{kpi.label}</span>
              <kpi.icon size={16} color={kpi.accent} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Partner Solar System — Vue écosystème */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>Écosystème partenaires</h2>
        <PartnerSolarSystem
          partners={DEMO_PARTENAIRES.map(p => ({
            id: String(p.id), name: p.nom,
            status: 'connected', compatibility: Math.floor(50 + Math.random() * 45), volume: Math.floor(20 + (p.contrats / 34) * 60),
            branch: p.type
          }))}
          onPartnerClick={(p) => console.log('Partner:', p)}
        />
      </div>

      {/* Compagnies */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Compagnies</h2>
          <button style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: 'none', cursor: 'pointer' }}>
            + Ajouter
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {DEMO_PARTENAIRES.map(c => (
            <div key={c.id} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: 18, minWidth: 220, flex: '1 1 auto',
              cursor: 'pointer',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(91,77,245,0.10)', color: '#5B4DF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12,
                }}>{c.logo}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{c.nom}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{c.type}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 10, color: '#6B7280', display: 'block' }}>Contrats</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.contrats}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: '#6B7280', display: 'block' }}>Commission</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.commission.toLocaleString('fr-FR')} €</span>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: c.tendance.startsWith('+') ? '#22C55E' : '#EF4444',
                }}>
                  {c.tendance}
                </span>
                <ArrowUpRight size={12} color={c.tendance.startsWith('+') ? '#22C55E' : '#EF4444'} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Apporteurs */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Apporteurs d'affaires</h2>
          <button style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: 'none', cursor: 'pointer' }}>
            + Ajouter
          </button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Partenaire</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Clients</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Commission</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Tendance</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_APPORTEURS.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.nom}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{a.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{a.clients}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{a.commission.toLocaleString('fr-FR')} €</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <span style={{ color: a.tendance.startsWith('+') ? '#22C55E' : '#EF4444', fontWeight: 600 }}>{a.tendance}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ARK */}
      <div style={{
        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
        borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Zap size={16} color="#8B5CF6" />
        <p style={{ fontSize: 13, color: '#c4b5fd', margin: 0 }}>
          <strong style={{ color: '#a78bfa' }}>ARK</strong> — Helios Protection affiche la plus forte croissance (+14%). L'apporteur "Agence Bonnefoy" est en forte progression (+25%). Opportunité de renforcer le partenariat.
        </p>
      </div>
    </div>
  )
}
