import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, TrendingUp, Clock, CheckCircle2, XCircle, Send, Euro, Zap,
  ChevronRight, Sparkles, Plus, Search, AlertTriangle, Target
} from 'lucide-react'
import api from '../api'
import { fmtMontant } from '../lib/monnaie'

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

// Devise centrale du cabinet : CHF en Suisse, EUR sinon (lib/monnaie).
const fmtEur = (v) => fmtMontant(v, { maximumFractionDigits: 0 })

// Statuts renvoyés par l'API des devis (quote_requests « v1 » + devis guidés)
// → statuts de cet écran. Sans cette traduction, chaque carte affichait
// « Envoyé » et « — » à la place du client, du produit et du montant.
const STATUT_API_VERS_ECRAN = {
  draft: 'preparation',
  ready: 'preparation',
  submitted: 'envoye',
  sent: 'envoye',
  opened: 'envoye',
  completed: 'envoye',
  accepted: 'accepte',
  signed: 'accepte',
  refused: 'refuse',
  rejected: 'refuse',
  expired: 'expire',
}

/** Un devis de l'API → la forme lue par cet écran. Aucun champ n'est inventé :
 *  ce que l'API ne fournit pas reste `null` et s'affiche « — ». */
function devisDepuisApi(d) {
  const type = String(d?.product_type || '').trim().toLowerCase()
  return {
    id: d?.id,
    client: d?.client_name || d?.client_company || 'Client non renseigné',
    produit: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Produit non renseigné',
    montant: Number(d?.best_price ?? d?.total_premium_eur),
    statut: STATUT_API_VERS_ECRAN[String(d?.status || '').toLowerCase()] || 'preparation',
    dateEnvoi: d?.submitted_at || d?.created_at || null,
    derniereRelance: null,
    // Montant : `best_price` (meilleure offre reçue) ou le total du devis guidé.
    // Absent ⇒ `null` (non mesuré) et jamais 0, qui ferait croire à une offre nulle.
    montant: (() => {
      const brut = Number(d?.best_price ?? d?.total_premium_eur)
      return Number.isFinite(brut) ? brut : null
    })(),
    // La probabilité de conversion n'est pas calculée par l'API des devis :
    // elle reste non mesurée au lieu d'être repeinte à 45 % / 72 % au hasard.
    probabilite: Number.isFinite(d?.probabilite) ? d.probabilite : null,
    // Idem pour le commentaire ARK : aucun texte n'est renvoyé, on n'en écrit pas.
    ark: null,
  }
}

const STATUT_STYLE = {
  preparation: { bg: 'rgba(100,116,139,0.08)', text: '#9CA3AF', label: 'Préparation' },
  envoye: { bg: 'rgba(59,130,246,0.08)', text: '#3B82F6', label: 'Envoyé' },
  accepte: { bg: 'rgba(34,197,94,0.08)', text: '#22C55E', label: 'Accepté' },
  refuse: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', label: 'Refusé' },
  expire: { bg: 'rgba(100,116,139,0.06)', text: '#6B7280', label: 'Expiré' },
}

const FILTERS = ['Tous', 'Préparation', 'Envoyés', 'À relancer', 'Acceptés', 'Refusés', 'Expirés', 'Opportunité ARK']

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

function DevisCard({ d, navigate }) {
  const statut = STATUT_STYLE[d.statut] || STATUT_STYLE.envoye
  return (
    <motion.div
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.12)' }}
      style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
      onClick={() => navigate('/clients/' + d.id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{d.client}</div>
          <div style={{ fontSize: 11, color: T.textMuted }}>{d.produit}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: statut.bg, color: statut.text }}>{statut.label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{fmtEur(d.montant)}</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: T.textMuted }}>Probabilité</div>
          {/* L'API des devis ne calcule pas de probabilité de conversion : on
              affiche « — » (non mesuré) au lieu d'un pourcentage inventé. */}
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: d.probabilite === null ? T.textMuted
              : d.probabilite >= 70 ? T.success : d.probabilite >= 40 ? T.warning : T.danger,
          }}>{d.probabilite === null ? '—' : `${d.probabilite}%`}</div>
        </div>
      </div>
      {d.ark && (
        <div style={{ background: T.arkBg, border: '1px solid ' + T.arkBorder, borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={10} color={T.ark} /> <strong style={{ color: '#a78bfa' }}>ARK :</strong> {d.ark}
        </div>
      )}
    </motion.div>
  )
}

export default function Devis() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Tous')
  // Aucune donnée d'exemple : un cabinet neuf doit voir un écran vide honnête
  // (« Aucun devis trouvé. ») et non des devis fictifs (Karim B., BatiSens Pro…)
  // qui lui feraient croire à un portefeuille qu'il n'a pas.
  const [devis, setDevis] = useState([])
  // `null` = pas encore de mesure exploitable (chargement en cours ou API en
  // erreur) : les KPI affichent alors « — », jamais 0 (0 est une mesure).
  const [totalApi, setTotalApi] = useState(null)

  useEffect(() => {
    let actif = true
    const charger = async () => {
      try {
        const res = await api.get('/devis')
        const d = res?.data
        const liste = Array.isArray(d) ? d
          : Array.isArray(d?.data) ? d.data
          : Array.isArray(d?.devis) ? d.devis
          : null
        if (!actif) return
        if (liste) {
          setDevis(liste.map(devisDepuisApi))
          // Total réel du cabinet renvoyé par l'API (la liste peut être bornée à
          // 50 lignes) ; à défaut, ce qui est réellement affiché.
          const total = Number(d?.stats?.total)
          setTotalApi(Number.isFinite(total) ? total : liste.length)
        }
      } catch {
        // Erreur API : aucune donnée n'est fabriquée, les KPI restent « — ».
        if (actif) setTotalApi(prev => prev)
      }
    }
    charger()
    return () => { actif = false }
  }, [])

  const filtered = useMemo(() => {
    let list = devis
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => d.client.toLowerCase().includes(q) || d.produit.toLowerCase().includes(q))
    }
    if (filter === 'Préparation') list = list.filter(d => d.statut === 'preparation')
    else if (filter === 'Envoyés') list = list.filter(d => d.statut === 'envoye')
    else if (filter === 'À relancer') list = list.filter(d => d.statut === 'envoye' && !d.derniereRelance)
    else if (filter === 'Acceptés') list = list.filter(d => d.statut === 'accepte')
    else if (filter === 'Refusés') list = list.filter(d => d.statut === 'refuse')
    else if (filter === 'Expirés') list = list.filter(d => d.statut === 'expire')
    else if (filter === 'Opportunité ARK') list = list.filter(d => d.ark)
    return list
  }, [devis, search, filter])

  const stats = useMemo(() => {
    const montants = devis.map(d => d.montant).filter(v => Number.isFinite(v))
    return {
      total: devis.length,
      aRelancer: devis.filter(d => d.statut === 'envoye' && !d.derniereRelance).length,
      // Somme des montants RÉELLEMENT connus ; aucun montant connu ⇒ « — ».
      potentiel: montants.length ? montants.reduce((s, v) => s + v, 0) : null,
      // Un taux sans dénominateur n'a pas de valeur : « — », jamais 0 %.
      taux: devis.length ? Math.round(devis.filter(d => d.statut === 'accepte').length / devis.length * 100) : null,
      acceptes: devis.filter(d => d.statut === 'accepte').length,
      // L'API des devis ne fournit pas de score d'alerte ARK : « — » plutôt qu'un 0
      // qui se lirait comme « aucune alerte ».
      ark: null,
    }
  }, [devis])

  // « Devis en cours » = devis NON finalisés (en préparation ou envoyés), sur le
  // total réel du cabinet. POURQUOI : l'écran annonçait « 10 / 42 » EN DUR, pour
  // n'importe quel cabinet — y compris celui dont l'API ne renvoie aucun devis.
  const devisEnCours = devis.filter(d => d.statut === 'preparation' || d.statut === 'envoye').length
  const kpiDevisEnCours = totalApi === null ? '—' : `${devisEnCours} / ${totalApi}`

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: T.text }}>
      <div style={{ position: 'fixed', width: 500, height: 500, background: 'radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)', top: -100, right: -100, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileText size={16} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Actions</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Devis</h1>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Suivez vos propositions et transformez-les en contrats.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/devis/new')} style={btnStyle(T.accent)}><Plus size={13} /> Créer</button>
            <button onClick={() => navigate('/relances')} style={btnStyle(T.warning)}><Send size={13} /> Relancer</button>
            <button onClick={() => navigate('/morning-brief')} style={btnStyle(T.ark)}><Zap size={13} /> Analyse ARK</button>
          </div>
        </div>

        {/* KPIs — tous calculés depuis GET /api/devis */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard icon={FileText} title="Devis en cours" value={kpiDevisEnCours} />
          <KpiCard icon={Send} title="À relancer" value={stats.aRelancer} accent={T.warning} />
          <KpiCard icon={Euro} title="Potentiel" value={stats.potentiel === null ? '—' : fmtEur(stats.potentiel)} />
          <KpiCard icon={TrendingUp} title="Transformation" value={stats.taux === null ? '—' : stats.taux + '%'} accent={T.success} />
          <KpiCard icon={CheckCircle2} title="Acceptés" value={stats.acceptes} accent={T.success} />
          <KpiCard icon={Sparkles} title="Alertes ARK" value={stats.ark === null ? '—' : stats.ark} accent={T.ark} />
        </div>

        {/* TOOLBAR */}
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color={T.textMuted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{
                padding: '8px 12px 8px 32px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                background: T.cardBg, color: T.text, border: '1px solid ' + T.cardBorder,
                width: 200, outline: 'none',
              }} />
            </div>
          </div>
        </div>

        {/* CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(d => <DevisCard key={d.id} d={d} navigate={navigate} />)}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucun devis trouvé.</p>
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
