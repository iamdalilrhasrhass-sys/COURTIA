import { UserPlus, Target, MapPin, TrendingUp, Zap, Search, CalendarDays } from 'lucide-react'

const DEMO_PROSPECTS = [
  { id: 1, nom: 'Entreprise Lambert', secteur: 'BTP', ville: 'Lyon', potentiel: 18000, statut: 'contacte', date: '03/05/2026' },
  { id: 2, nom: 'Clinique Vétérinaire du Parc', secteur: 'Santé', ville: 'Paris', potentiel: 12400, statut: 'qualifie', date: '01/05/2026' },
  { id: 3, nom: 'SARL Dupuis Transport', secteur: 'Transport', ville: 'Marseille', potentiel: 28500, statut: 'rdv', date: '28/04/2026' },
  { id: 4, nom: 'Restaurant Le Gourmet', secteur: 'Restauration', ville: 'Bordeaux', potentiel: 4200, statut: 'contacte', date: '25/04/2026' },
  { id: 5, nom: 'Agence Web DigitalPro', secteur: 'Tech', ville: 'Nantes', potentiel: 3800, statut: 'nouveau', date: '05/05/2026' },
  { id: 6, nom: 'Cabinet Dentaire Sourire', secteur: 'Santé', ville: 'Lille', potentiel: 6400, statut: 'qualifie', date: '22/04/2026' },
]

const STATUT_STYLE = {
  nouveau:  { bg: 'rgba(59,130,246,0.10)', text: '#3B82F6' },
  contacte: { bg: 'rgba(245,158,11,0.10)', text: '#F59E0B' },
  qualifie: { bg: 'rgba(139,92,246,0.10)', text: '#8B5CF6' },
  rdv:      { bg: 'rgba(34,197,94,0.10)', text: '#22C55E' },
}

const STATUT_LABEL = {
  nouveau: 'Nouveau', contacte: 'Contacté', qualifie: 'Qualifié', rdv: 'RDV planifié',
}

export default function Prospection() {
  const totalPotentiel = DEMO_PROSPECTS.reduce((s, p) => s + p.potentiel, 0)

  return (
    <div style={{ padding: 32, minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Prospection</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Pipeline de nouveaux clients potentiels</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Prospects', value: DEMO_PROSPECTS.length, icon: UserPlus, accent: '#5B4DF5' },
          { label: 'Potentiel', value: `${(totalPotentiel / 1000).toFixed(0)}k €`, icon: TrendingUp, accent: '#22C55E' },
          { label: 'RDV planifiés', value: 1, icon: CalendarDays, accent: '#F59E0B' },
          { label: 'Taux de conversion', value: '22%', icon: Target, accent: '#3B82F6' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{kpi.label}</span>
              <kpi.icon size={16} color={kpi.accent} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Barre de recherche + filtres */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '8px 14px',
        }}>
          <Search size={14} color="#6B7280" />
          <input placeholder="Rechercher un prospect..." style={{
            background: 'none', border: 'none', color: '#fff', fontSize: 13, outline: 'none', flex: 1,
          }} />
        </div>
        <button style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
          + Nouveau prospect
        </button>
      </div>

      {/* ARK */}
      <div style={{
        background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Zap size={16} color="#8B5CF6" />
        <p style={{ fontSize: 13, color: '#c4b5fd', margin: 0 }}>
          <strong style={{ color: '#a78bfa' }}>ARK</strong> — 6 prospects en pipeline. Le secteur Transport affiche le plus fort potentiel (28 500 €). SARL Dupuis Transport a un RDV planifié.
        </p>
      </div>

      {/* Tableau */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Prospect</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Secteur</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Ville</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Potentiel</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Statut</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_PROSPECTS.map(p => {
              const s = STATUT_STYLE[p.statut]
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.nom}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{p.secteur}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {p.ville}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#22C55E' }}>{p.potentiel.toLocaleString('fr-FR')} €</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}>
                      {STATUT_LABEL[p.statut]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#9CA3AF' }}>{p.date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
