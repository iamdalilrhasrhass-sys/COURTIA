import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, UserCheck, UserPlus, AlertTriangle, Users, MapPin } from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import SimpleCard from '../components/SimpleCard'

const T = {
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)',
  cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
}

// ─── Demo data (clients fictifs concis) ──────────────────────────
const DEMO_CLIENTS = [
  { id: 1, name: 'Sophie Moreau', type: 'Particulier', status: 'actif', city: 'Lyon', contracts: 3, prime: 2480 },
  { id: 2, name: 'Thomas Bernard', type: 'Pro', status: 'actif', city: 'Paris', contracts: 3, prime: 6150 },
  { id: 3, name: 'Amélie Dubois', type: 'Particulier', status: 'prospect', city: 'Bordeaux', contracts: 1, prime: 890 },
  { id: 4, name: 'Laurent Petit', type: 'Particulier', status: 'a_risque', city: 'Marseille', contracts: 1, prime: 1340 },
  { id: 5, name: 'Claire Martin', type: 'Pro', status: 'actif', city: 'Nantes', contracts: 4, prime: 12800 },
  { id: 6, name: 'Jean Dupont', type: 'Particulier', status: 'silencieux', city: 'Toulouse', contracts: 2, prime: 1760 },
  { id: 7, name: 'Marie Lefebvre', type: 'Particulier', status: 'actif', city: 'Lille', contracts: 3, prime: 3200 },
  { id: 8, name: 'Nicolas Roux', type: 'Pro', status: 'prospect', city: 'Strasbourg', contracts: 0, prime: 0 },
  { id: 9, name: 'Isabelle Garnier', type: 'Particulier', status: 'actif', city: 'Nice', contracts: 4, prime: 4100 },
  { id: 11, name: 'Céline Fournier', type: 'Pro', status: 'actif', city: 'Montpellier', contracts: 3, prime: 7850 },
  { id: 13, name: 'Anne Rousseau', type: 'Particulier', status: 'actif', city: 'Dijon', contracts: 2, prime: 1950 },
  { id: 16, name: 'Romain Gauthier', type: 'Particulier', status: 'actif', city: 'Reims', contracts: 3, prime: 2870 },
]

const FILTERS = [
  { key: 'tous',     label: 'Tous' },
  { key: 'actif',    label: 'Actifs' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'a_risque', label: 'À risque' },
]

const STATUS = {
  actif:      { label: 'Actif',     color: T.success, icon: UserCheck },
  prospect:   { label: 'Prospect',  color: T.info,    icon: UserPlus },
  a_risque:   { label: 'À risque',  color: T.danger,  icon: AlertTriangle },
  silencieux: { label: 'Silencieux',color: T.warning, icon: Users },
  perdu:      { label: 'Perdu',     color: T.textMuted, icon: Users },
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

// ─── Card client épurée ──────────────────────────────────────────
function ClientCard({ client, onClick }) {
  const st = STATUS[client.status] || STATUS.actif
  const initials = client.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <SimpleCard onClick={() => onClick(client.id)} padding={20}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Avatar initiales */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(91,77,245,0.15))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3 }}>
            {client.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '1px 7px', borderRadius: 6,
              fontSize: 10, fontWeight: 600,
              color: st.color, background: `${st.color}15`,
            }}>
              {st.label}
            </span>
            <span style={{ fontSize: 11, color: T.textMuted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={10} />
              {client.city}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
            {client.prime > 0 ? fmtEur(client.prime) : '—'}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
            {client.contracts} contrat{client.contracts !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </SimpleCard>
  )
}

export default function Clients() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')

  const filtered = useMemo(() => {
    let list = DEMO_CLIENTS
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.city.toLowerCase().includes(s)
      )
    }
    if (filter !== 'tous') list = list.filter(c => c.status === filter)
    return list
  }, [search, filter])

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 20px 48px' }}>
      <VibeBackdrop intensity={0.7} />
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>

        <PageHeader
          title="Clients"
          subtitle="Pilotez votre portefeuille."
          action={
            <button
              onClick={() => navigate('/clients/new')}
              style={{
                padding: '9px 16px',
                background: T.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
              }}
            >
              <Plus size={14} /> Nouveau client
            </button>
          }
        />

        {/* Barre de recherche + filtres */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: '1 1 260px',
            minWidth: 200,
            padding: '8px 14px',
            background: T.cardBg,
            border: `1px solid ${T.cardBorder}`,
            borderRadius: 10,
          }}>
            <Search size={15} color={T.textMuted} />
            <input
              type="text"
              placeholder="Rechercher un client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: T.text,
                fontSize: 13,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 2 }}
                aria-label="Effacer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '7px 13px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filter === f.key ? `1px solid ${T.accent}40` : `1px solid ${T.cardBorder}`,
                  background: filter === f.key ? `${T.accent}15` : 'transparent',
                  color: filter === f.key ? T.accent : T.textSecondary,
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          search ? (
            <EmptyState
              icon="search"
              title="Aucun résultat"
              message="Essayez un autre mot-clé ou changez les filtres."
            />
          ) : (
            <EmptyState
              icon="bubble"
              title="Pas encore de client"
              message="Commençons votre première bulle ✨"
              cta={{ label: 'Nouveau client', to: '/clients/new' }}
            />
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(c => (
              <ClientCard key={c.id} client={c} onClick={(id) => navigate(`/clients/${id}`)} />
            ))}
          </div>
        )}

        {/* Compteur discret */}
        {filtered.length > 0 && (
          <p style={{ marginTop: 16, fontSize: 11, color: T.textMuted, textAlign: 'center' }}>
            {filtered.length} client{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>
    </div>
  )
}
