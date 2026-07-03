import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Send, Phone, MessageSquare, Calendar, TrendingUp, Sparkles, Zap, Search,
  User, AlertTriangle, Clock, Euro, Target, FileText, Loader, CheckCircle
} from 'lucide-react'
import api from '../api'

const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)', cardHover: 'rgba(255,255,255,0.05)',
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  accent: '#5B4DF5', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)', arkBorder: 'rgba(139,92,246,0.15)',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

const PRIORITY_LABELS = { high: 'Haute', medium: 'Moyenne', low: 'Basse' }
const TYPE_LABELS = {
  devis: 'Devis sans réponse', quote_followup: 'Devis sans réponse',
  echeance: 'Échéance proche', renouvellement: 'Renouvellement', renewal: 'Renouvellement',
  silencieux: 'Client silencieux', silent: 'Client silencieux',
  document: 'Document manquant', opportunite: 'Opportunité', opportunity: 'Opportunité',
  prospect: 'Prospect à relancer',
}
const FILTER_TYPES = {
  'Devis': ['devis', 'quote_followup'],
  'Échéances': ['echeance', 'renouvellement', 'renewal'],
  'Silencieux': ['silencieux', 'silent'],
  'Documents': ['document'],
  'Opportunités': ['opportunite', 'opportunity'],
  'Prospects': ['prospect'],
}
const FILTERS = ['Toutes', ...Object.keys(FILTER_TYPES)]

const normalizeRelance = (r) => ({
  id: r.id,
  clientId: r.client_id,
  client: r.client_name || 'Client inconnu',
  phone: r.client_phone || null,
  raison: r.subject || TYPE_LABELS[r.type] || 'Relance',
  urgence: PRIORITY_LABELS[r.priority] || 'Moyenne',
  produit: r.quote_product || r.metadata?.product || null,
  potentiel: Number(r.metadata?.potentiel || r.metadata?.amount || 0),
  dernierContact: r.sent_at || r.scheduled_at || r.created_at,
  type: r.type,
  status: r.status,
  channel: r.channel,
  ark: r.ai_reasoning || null,
})

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
  const [relances, setRelances] = useState([])
  const [apiStats, setApiStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sendingId, setSendingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/relances', { params: { limit: 100 } }),
        api.get('/relances/stats').catch(() => null),
      ])
      setRelances((listRes.data?.relances || []).map(normalizeRelance))
      setApiStats(statsRes?.data || null)
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger les relances.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSend = async (r) => {
    if (!window.confirm(`Envoyer la relance à ${r.client} par ${r.channel || 'email'} ?`)) return
    setSendingId(r.id)
    try {
      await api.post(`/relances/${r.id}/send`)
      setRelances(prev => prev.map(x => x.id === r.id ? { ...x, status: 'sent' } : x))
    } catch (err) {
      window.alert(err.response?.data?.error || 'Échec de l\'envoi.')
    } finally {
      setSendingId(null)
    }
  }

  const filtered = useMemo(() => {
    let list = relances
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => r.client.toLowerCase().includes(q) || (r.raison || '').toLowerCase().includes(q))
    }
    if (FILTER_TYPES[filter]) list = list.filter(r => FILTER_TYPES[filter].includes(r.type))
    return list
  }, [relances, search, filter])

  const stats = useMemo(() => {
    const byType = (types) => relances.filter(r => types.includes(r.type)).length
    return {
      urgentes: apiStats?.totals?.urgent_pending ?? relances.filter(r => r.urgence === 'Haute' && r.status !== 'sent').length,
      enAttente: apiStats?.totals?.pending ?? relances.filter(r => r.status !== 'sent').length,
      devis: byType(FILTER_TYPES['Devis']),
      echeances: byType(FILTER_TYPES['Échéances']),
      tauxReponse: apiStats?.period?.taux_reponse ?? null,
      potentiel: relances.reduce((s, r) => s + r.potentiel, 0),
    }
  }, [relances, apiStats])

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
          <KpiCard icon={Target} title="Urgentes" value={stats.urgentes} accent={T.danger} />
          <KpiCard icon={Calendar} title="En attente" value={stats.enAttente} />
          <KpiCard icon={Send} title="Devis sans réponse" value={stats.devis} accent={T.warning} />
          <KpiCard icon={AlertTriangle} title="Échéances" value={stats.echeances} accent={T.warning} />
          {stats.tauxReponse !== null && <KpiCard icon={TrendingUp} title="Taux de réponse" value={stats.tauxReponse + ' %'} accent={T.success} />}
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

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <Loader size={28} style={{ marginBottom: 10, opacity: 0.5 }} className="animate-spin" />
            <p style={{ fontSize: 13 }}>Chargement des relances…</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: T.danger }}>
            <AlertTriangle size={32} style={{ marginBottom: 10, opacity: 0.6 }} />
            <p style={{ fontSize: 13 }}>{error}</p>
            <button onClick={load} style={btnStyle(T.accent)}>Réessayer</button>
          </div>
        )}

        {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => (
            <motion.div key={r.id}
              whileHover={{ borderColor: 'rgba(255,255,255,0.12)' }}
              style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 16px', transition: 'all 0.15s', opacity: r.status === 'sent' ? 0.6 : 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.client}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: r.urgence === 'Haute' ? 'rgba(239,68,68,0.08)' : r.urgence === 'Moyenne' ? 'rgba(245,158,11,0.08)' : 'rgba(100,116,139,0.08)', color: r.urgence === 'Haute' ? '#EF4444' : r.urgence === 'Moyenne' ? '#F59E0B' : '#9CA3AF' }}>{r.urgence}</span>
                    {r.status === 'sent' && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(34,197,94,0.08)', color: T.success }}><CheckCircle size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />Envoyée</span>}
                    <span style={{ fontSize: 11, color: T.textMuted }}>{r.raison}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, color: T.textSecondary, flexWrap: 'wrap' }}>
                    {r.produit && <span><FileText size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{r.produit}</span>}
                    {r.potentiel > 0 && <span style={{ color: T.success }}><Euro size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{fmtEur(r.potentiel)}</span>}
                    {r.dernierContact && <span><Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />{new Date(r.dernierContact).toLocaleDateString('fr-FR')}</span>}
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
                <button onClick={() => r.phone && (window.location.href = 'tel:' + r.phone)} disabled={!r.phone} title={r.phone || 'Pas de téléphone'} style={{ ...actionBtnStyle(T.success), opacity: r.phone ? 1 : 0.4, cursor: r.phone ? 'pointer' : 'not-allowed' }}><Phone size={11} /> Appeler</button>
                <button onClick={() => handleSend(r)} disabled={r.status === 'sent' || sendingId === r.id} style={{ ...actionBtnStyle(null), opacity: r.status === 'sent' ? 0.4 : 1 }}><MessageSquare size={11} /> {sendingId === r.id ? 'Envoi…' : r.status === 'sent' ? 'Envoyée' : 'Envoyer'}</button>
                <button onClick={() => r.clientId && navigate('/clients/' + r.clientId)} disabled={!r.clientId} style={{ ...actionBtnStyle(T.ark), opacity: r.clientId ? 1 : 0.4 }}><User size={11} /> Voir client</button>
              </div>
            </motion.div>
          ))}
        </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
            <Send size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>Aucune relance en attente. ARK en génère automatiquement dès qu'un devis reste sans réponse.</p>
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
