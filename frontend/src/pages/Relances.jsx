import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Send, Phone, MessageSquare, Calendar, TrendingUp, Sparkles, Zap, Search,
  User, AlertTriangle, Clock, Euro, Target, FileText
} from 'lucide-react'

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

const DEMO_RELANCES = [
  { id: 1, client: 'Karim B.', raison: 'Devis Auto #247 sans réponse', urgence: 'Haute', produit: 'Auto', potentiel: 840, dernierContact: '2026-05-04', type: 'devis', ark: 'Devis envoyé il y a 7 jours sans réponse. Client déjà actif Habitation. Probabilité élevée de conversion.' },
  { id: 2, client: 'Martin Conseil', raison: 'Échéance RC Pro dans 21 jours', urgence: 'Haute', produit: 'RC Pro', potentiel: 2800, dernierContact: '2026-04-20', type: 'echeance', ark: 'Échéance RC Pro imminente. Préparer une proposition de renouvellement avec option Prévoyance TNS.' },
  { id: 3, client: 'Leroy Marie', raison: 'Cliente silencieuse depuis 52 jours', urgence: 'Moyenne', produit: 'Habitation', potentiel: 380, dernierContact: '2026-03-18', type: 'silencieux', ark: 'Cliente silencieuse avec score risque 80%. Contacter pour vérifier satisfaction et proposer MRH.' },
  { id: 4, client: 'Dupont SAS', raison: 'Devis PJ envoyé sans réponse', urgence: 'Moyenne', produit: 'PJ', potentiel: 2100, dernierContact: '2026-05-02', type: 'devis', ark: 'Devis PJ envoyé il y a 9 jours. Client RC Pro actif. Multi-équipement favorable.' },
  { id: 5, client: 'Auto Évolution 89', raison: 'Flotte Auto : échéance dépassée', urgence: 'Haute', produit: 'Flotte Auto', potentiel: 4200, dernierContact: '2026-04-15', type: 'renouvellement', ark: 'Échéance dépassée de 26 jours. Renouvellement urgent. Risque de mise en concurrence.' },
  { id: 6, client: 'Petit Philippe', raison: 'Devis Auto sans réponse depuis 18 jours', urgence: 'Haute', produit: 'Auto', potentiel: 1100, dernierContact: '2026-04-22', type: 'devis', ark: 'Devis envoyé il y a 19 jours. Relancer par téléphone avant expiration.' },
  { id: 7, client: 'BatiSens Pro', raison: 'Devis Prévoyance accepté à transformer', urgence: 'Moyenne', produit: 'Prévoyance', potentiel: 950, dernierContact: '2026-04-25', type: 'opportunite', ark: 'Devis accepté il y a 16 jours. Transformer en contrat avant perte d\'intérêt.' },
  { id: 8, client: 'Groupe Ardent', raison: 'Document FIC manquant', urgence: 'Basse', produit: 'Cyber', potentiel: 0, dernierContact: '2026-04-15', type: 'document', ark: 'Dossier incomplet : FIC manquante. Conformité réglementaire.' },
  { id: 9, client: 'Sophie L.', raison: 'Opportunité Prévoyance non couverte', urgence: 'Moyenne', produit: 'Prévoyance', potentiel: 520, dernierContact: '2026-05-06', type: 'opportunite', ark: 'Cliente Santé active sans Prévoyance. Nouveau devis envoyé. Probabilité 70%.' },
  { id: 10, client: 'Cabinet Moreau', raison: 'Document Attestation PJ à vérifier', urgence: 'Basse', produit: 'PJ', potentiel: 0, dernierContact: '2026-04-05', type: 'document', ark: 'Attestation PJ marquée À vérifier. Action conformité.' },
]

const FILTERS = ['Toutes', 'Devis', 'Échéances', 'Silencieux', 'Documents', 'Opportunités', 'Prospects']

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

export default function Relances() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Toutes')

  const filtered = useMemo(() => {
    let list = DEMO_RELANCES
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.client.toLowerCase().includes(q) || r.raison.toLowerCase().includes(q))
    }
    if (filter === 'Devis') list = list.filter(r => r.type === 'devis')
    else if (filter === 'Échéances') list = list.filter(r => r.type === 'echeance' || r.type === 'renouvellement')
    else if (filter === 'Silencieux') list = list.filter(r => r.type === 'silencieux')
    else if (filter === 'Documents') list = list.filter(r => r.type === 'document')
    else if (filter === 'Opportunités') list = list.filter(r => r.type === 'opportunite')
    return list
  }, [search, filter])

  const stats = useMemo(() => ({
    aujourdhui: DEMO_RELANCES.filter(r => r.urgence === 'Haute').length,
    semaine: DEMO_RELANCES.length,
    devis: DEMO_RELANCES.filter(r => r.type === 'devis').length,
    echeances: DEMO_RELANCES.filter(r => r.type === 'echeance' || r.type === 'renouvellement').length,
    silencieux: DEMO_RELANCES.filter(r => r.type === 'silencieux').length,
    potentiel: DEMO_RELANCES.reduce((s, r) => s + r.potentiel, 0),
  }), [])

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(239,68,68,0.02) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Send size={16} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Relances</h1>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Qui devez-vous relancer maintenant ? Les recommandations ARK vous guident.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Prioriser avec ARK</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={Target} title="Aujourd'hui" value={stats.aujourdhui} accent={T.danger} />
          <KpiCard icon={Calendar} title="Cette semaine" value={stats.semaine} />
          <KpiCard icon={Send} title="Devis sans réponse" value={stats.devis} accent={T.warning} />
          <KpiCard icon={AlertTriangle} title="Échéances" value={stats.echeances} accent={T.warning} />
          <KpiCard icon={Clock} title="Silencieux" value={stats.silencieux} accent={T.danger} />
          <KpiCard icon={Euro} title="Potentiel" value={fmtEur(stats.potentiel)} accent={T.success} />
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
          {filtered.map(r => (
            <motion.div key={r.id}
              whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
              style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 16px', transition: 'all 0.15s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.client}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: r.urgence === 'Haute' ? 'rgba(239,68,68,0.08)' : r.urgence === 'Moyenne' ? 'rgba(245,158,11,0.08)' : 'rgba(100,116,139,0.08)', color: r.urgence === 'Haute' ? '#EF4444' : r.urgence === 'Moyenne' ? '#F59E0B' : '#9CA3AF' }}>{r.urgence}</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{r.raison}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, color: T.textSecondary }}>
                    <span><FileText size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{r.produit}</span>
                    {r.potentiel > 0 && <span style={{ color: T.success }}><Euro size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{fmtEur(r.potentiel)}</span>}
                    <span><Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{new Date(r.dernierContact).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
              {r.ark && (
                <div style={{ background: T.arkBg, border: '1px solid ' + T.arkBorder, borderRadius: 6, padding: '6px 10px', marginTop: 8, fontSize: 10, color: '#c4b5fd' }}>
                  <Sparkles size={10} color={T.ark} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  <strong style={{ color: '#a78bfa' }}>ARK :</strong> {r.ark}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button style={actionBtnStyle(T.success)}><Phone size={11} /> Appeler</button>
                <button style={actionBtnStyle(null)}><MessageSquare size={11} /> Message</button>
                <button onClick={() => navigate('/clients/' + r.id)} style={actionBtnStyle(T.ark)}><User size={11} /> Voir client</button>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <Send size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucune relance trouvée.</p>
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
