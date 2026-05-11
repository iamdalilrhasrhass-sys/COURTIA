import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  TrendingUp, Target, Euro, Shield, Zap, Sparkles, Search, Plus,
  ChevronRight, User, FileText, BarChart3, Star
} from 'lucide-react'

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

const DEMO_OPPORTUNITES = [
  { id: 1, client: 'Martin Conseil', produitActuel: 'RC Pro + Flotte Auto', produitReco: 'Prévoyance TNS', potentiel: 1200, confiance: 78, type: 'prevoyance', ark: 'Client professionnel avec RC Pro et Flotte Auto. Aucune couverture Prévoyance dirigeant. Potentiel estimé : 1 200 €/an.' },
  { id: 2, client: 'Karim B.', produitActuel: 'Habitation', produitReco: 'Auto', potentiel: 840, confiance: 72, type: 'multi', ark: 'Client actif sur Habitation. Devis Auto en cours. Forte probabilité de conversion.' },
  { id: 3, client: 'Sophie L.', produitActuel: 'Santé', produitReco: 'Prévoyance', potentiel: 520, confiance: 85, type: 'prevoyance', ark: 'Cliente Santé active. Nouveau devis Prévoyance envoyé. Probabilité 85% de transformation.' },
  { id: 4, client: 'BatiSens Pro', produitActuel: 'MRH + RC Pro', produitReco: 'Flotte Auto', potentiel: 4200, confiance: 55, type: 'multi', ark: 'Entreprise avec MRH et RC Pro. Aucune couverture flotte. Potentiel multi-équipement élevé.' },
  { id: 5, client: 'Cabinet Moreau', produitActuel: 'RC Pro + PJ', produitReco: 'Cyber', potentiel: 1800, confiance: 68, type: 'cyber', ark: 'Cabinet avec RC Pro et PJ. Exposition numérique sans couverture Cyber. Risque croissant.' },
  { id: 6, client: 'Auto Évolution 89', produitActuel: 'Flotte Auto', produitReco: 'RC Pro', potentiel: 2700, confiance: 62, type: 'multi', ark: 'Client mono-produit Flotte Auto. Aucune RC Pro. Obligation réglementaire pour garage.' },
  { id: 7, client: 'Groupe Ardent', produitActuel: 'RC Pro', produitReco: 'Cyber + Décennale', potentiel: 5200, confiance: 41, type: 'multi', ark: 'Groupe avec RC Pro uniquement. Recommandation Cyber + Décennale. Potentiel combiné 5 200 €/an.' },
  { id: 8, client: 'Nadia R.', produitActuel: 'Santé', produitReco: 'Prévoyance + PJ', potentiel: 1200, confiance: 72, type: 'multi', ark: 'Cliente Santé active et fidèle. Aucune couverture Prévoyance ni PJ. Score fidélité 81%.' },
  { id: 9, client: 'Leroy Marie', produitActuel: 'Habitation', produitReco: 'MRH + Auto', potentiel: 1800, confiance: 50, type: 'multi', ark: 'Cliente mono-produit Habitation. Silencieuse depuis 52 jours. Opportunité de réengagement avec MRH.' },
  { id: 10, client: 'Dupont SAS', produitActuel: 'RC Pro', produitReco: 'Flotte Auto + PJ', potentiel: 5600, confiance: 45, type: 'multi', ark: 'Client RC Pro actif. Devis PJ envoyé sans réponse. Proposition combinée PJ + Flotte Auto.' },
]

const FILTERS = ['Toutes', 'Confiance élevée', 'Mono-produit', 'Multi-équipement', 'Prévoyance', 'Auto', 'Cyber', 'Renouvellement']

function KpiCard({ icon: Icon, title, value, accent }) {
  return (
    <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 10, padding: '12px 16px', flex: '1 1 auto', minWidth: 130 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase' }}>{title}</span>
        <Icon size={14} color={accent || T.accent} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{value}</div>
    </div>
  )
}

export default function Opportunites() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')

  const filtered = useMemo(() => {
    let list = DEMO_OPPORTUNITES
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(o => o.client.toLowerCase().includes(q) || o.produitReco.toLowerCase().includes(q))
    }
    if (filter === 'Confiance élevée') list = list.filter(o => o.confiance >= 70)
    else if (filter === 'Mono-produit') list = list.filter(o => o.type === 'mono')
    else if (filter === 'Multi-équipement') list = list.filter(o => o.type === 'multi')
    else if (filter === 'Prévoyance') list = list.filter(o => o.type === 'prevoyance')
    else if (filter === 'Auto') list = list.filter(o => o.produitReco === 'Auto')
    else if (filter === 'Cyber') list = list.filter(o => o.type === 'cyber')
    return list
  }, [search, filter])

  const stats = useMemo(() => ({
    total: DEMO_OPPORTUNITES.length,
    potentiel: DEMO_OPPORTUNITES.reduce((s, o) => s + o.potentiel, 0),
    confianceHaute: DEMO_OPPORTUNITES.filter(o => o.confiance >= 70).length,
    aTraiter: DEMO_OPPORTUNITES.filter(o => o.confiance >= 50).length,
  }), [])

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(34,197,94,0.03) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <TrendingUp size={16} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Acquisition</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Opportunités</h1>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>ARK détecte le potentiel commercial de votre portefeuille.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Analyse ARK</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={TrendingUp} title="Détectées" value={stats.total} />
          <KpiCard icon={Euro} title="Potentiel estimé" value={fmtEur(stats.potentiel)} accent={T.success} />
          <KpiCard icon={Star} title="Confiance élevée" value={stats.confianceHaute} accent={T.success} />
          <KpiCard icon={Target} title="À traiter" value={stats.aTraiter} accent={T.warning} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: filter === f ? T.accent + '22' : T.cardBg,
                color: filter === f ? T.accent : T.textSecondary,
                border: filter === f ? '1px solid ' + T.accent + '40' : '1px solid ' + T.cardBorder,
                cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={14} color={T.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{
              padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: T.cardBg, color: T.text, border: '1px solid ' + T.cardBorder,
              width: 200, outline: 'none',
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(o => (
            <motion.div key={o.id}
              whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
              style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 16px', transition: 'all 0.15s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{o.client}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: T.cardBg, color: T.textMuted }}>{o.type === 'prevoyance' ? 'Prévoyance' : o.type === 'cyber' ? 'Cyber' : o.type === 'multi' ? 'Multi-équipement' : 'Mono-produit'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>{o.produitActuel} → <strong style={{ color: T.success }}>{o.produitReco}</strong></div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.textSecondary, marginTop: 6 }}>
                    <span style={{ color: T.success, fontWeight: 600 }}>{fmtEur(o.potentiel)}</span>
                    <span>Confiance : <strong style={{ color: o.confiance >= 70 ? T.success : o.confiance >= 50 ? T.warning : T.textMuted }}>{o.confiance}%</strong></span>
                  </div>
                </div>
                <div style={{ width: 60, height: 6, background: T.cardBg, borderRadius: 3, overflow: 'hidden', alignSelf: 'center' }}>
                  <div style={{ width: o.confiance + '%', height: '100%', background: o.confiance >= 70 ? T.success : o.confiance >= 50 ? T.warning : T.textMuted, borderRadius: 3 }} />
                </div>
              </div>
              {o.ark && (
                <div style={{ background: T.arkBg, border: '1px solid ' + T.arkBorder, borderRadius: 6, padding: '6px 10px', marginTop: 8, fontSize: 10, color: '#c4b5fd' }}>
                  <Sparkles size={10} color={T.ark} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  <strong style={{ color: '#a78bfa' }}>ARK :</strong> {o.ark}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button style={actionBtnStyle(T.accent)}><Plus size={11} /> Créer devis</button>
                <button style={actionBtnStyle(null)}><FileText size={11} /> Argumentaire</button>
                <button onClick={() => navigate('/clients/' + o.id)} style={actionBtnStyle(T.ark)}><User size={11} /> Voir client</button>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <TrendingUp size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucune opportunité trouvée.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function btnStyle(color) {
  return {
    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: color ? color + '15' : T.cardBg,
    color: color || T.text,
    border: color ? '1px solid ' + color + '30' : '1px solid ' + T.cardBorder,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  }
}

function actionBtnStyle(color) {
  return {
    padding: '5px 10px', borderRadius: 6, fontSize: 10, fontWeight: 500,
    background: color ? color + '12' : T.cardBg,
    color: color || T.textSecondary,
    border: color ? '1px solid ' + color + '25' : '1px solid ' + T.cardBorder,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  }
}
