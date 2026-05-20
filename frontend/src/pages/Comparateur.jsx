import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles, FileText, Send, Loader2, Trophy, TrendingDown,
  Shield, Zap, Crown, Star, ArrowRight,
} from 'lucide-react'
import { VibeBackdrop, VibeScrollSection } from '../components/vibe'
import { Particles, ScrollGlow } from '../components/vibe/VibePage'
import PageHeader from '../components/PageHeader'
import SimpleCard from '../components/SimpleCard'
import api from '../api'
import toast from 'react-hot-toast'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#5B4DF5', ark: '#8B5CF6', cyan: '#22D3EE',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const PRODUITS = ['Auto', 'MRH', 'Santé', 'Prévoyance', 'RC Pro']
const NIVEAUX = [
  { key: 'essentiel', label: 'Essentiel', desc: 'Couverture de base — prix mini' },
  { key: 'confort',   label: 'Confort',   desc: 'Équilibre prix / couverture' },
  { key: 'premium',   label: 'Premium',   desc: 'Couverture maximale' },
]

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0)

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  background: 'rgba(255,255,255,0.05)', color: T.text,
  border: '1px solid rgba(255,255,255,0.10)', fontSize: 13, outline: 'none',
}
const labelStyle = { color: T.textSecondary, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }

export default function Comparateur() {
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('client_id')
  const quoteRequestId = searchParams.get('quote_request_id')

  const [profile, setProfile] = useState({
    age: 38, ville: 'Lyon', zone: 'urbain',
    situation: 'marie', annee_naissance: 1987,
    sinistres_3ans: 0, profession: '',
  })
  const [produit, setProduit] = useState('Auto')
  const [level, setLevel] = useState('confort')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Auto-remplir depuis un client (flux Dossier prêt à tarifer)
  useEffect(() => {
    if (!clientId) return
    const token = localStorage.getItem('courtia_token')
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/clients/${clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      if (data.client) {
        const c = data.client
        setProfile(p => ({
          ...p,
          ville: c.city || c.ville || p.ville,
          profession: c.profession || '',
          client_name: `${c.first_name || c.prenom || ''} ${c.last_name || c.nom || ''}`.trim(),
        }))
      }
    }).catch(() => {})
  }, [clientId])

  async function compute() {
    setLoading(true)
    try {
      const res = await api.post('/comparator-engine/compute', {
        profile, produit, level,
      })
      setResult(res.data)
      toast.success(`8 devis calculés — meilleur prix : ${res.data.summary.cheapest_provider}`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur calcul comparatif')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function exportPdf() {
    if (!result?.run_id) return
    setExporting(true)
    try {
      const res = await api.post('/comparator-engine/export-pdf', {
        run_id: result.run_id,
        client_name: profile.client_name || '',
      })
      toast.success('PDF généré ✓')
      // Auto-download
      window.open(`/api/comparator-engine/download/${result.run_id}`, '_blank')
    } catch (err) {
      toast.error('Erreur export PDF')
    } finally {
      setExporting(false)
    }
  }

  async function sendToClient() {
    if (!result?.run_id) return
    const email = prompt('Email du client ?')
    if (!email) return
    try {
      await api.post('/comparator-engine/send-email', { run_id: result.run_id, email })
      toast.success(`Comparatif envoyé à ${email}`)
    } catch (err) {
      toast.error('Erreur envoi')
    }
  }

  return (
    <>
      <VibeBackdrop intensity="medium" />
      <Particles count={35} />
      <ScrollGlow />
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <PageHeader
          breadcrumb={[{ label: 'ARK IA', to: '/assistant-ark' }, { label: 'Comparateur 8 compagnies' }]}
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} color={T.ark} /> Comparateur intelligent — 8 compagnies
          </span>}
          subtitle="Moteur ARK : score, badges, recommandation auto + PDF brandé en 1 clic"
        />

        {/* Formulaire profil */}
        <SimpleCard padding={24} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <div>
              <label style={labelStyle}>Produit</label>
              <select style={inputStyle} value={produit} onChange={e => setProduit(e.target.value)}>
                {PRODUITS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Niveau</label>
              <select style={inputStyle} value={level} onChange={e => setLevel(e.target.value)}>
                {NIVEAUX.map(n => <option key={n.key} value={n.key}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Âge</label>
              <input type="number" style={inputStyle} value={profile.age}
                onChange={e => setProfile({ ...profile, age: Number(e.target.value), annee_naissance: new Date().getFullYear() - Number(e.target.value) })} />
            </div>
            <div>
              <label style={labelStyle}>Zone</label>
              <select style={inputStyle} value={profile.zone} onChange={e => setProfile({ ...profile, zone: e.target.value })}>
                <option value="urbain">Urbain</option>
                <option value="rural">Rural</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Situation</label>
              <select style={inputStyle} value={profile.situation} onChange={e => setProfile({ ...profile, situation: e.target.value })}>
                <option value="celibataire">Célibataire</option>
                <option value="marie">Marié(e) / Pacs</option>
                <option value="famille">Famille avec enfants</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ville</label>
              <input type="text" style={inputStyle} value={profile.ville} onChange={e => setProfile({ ...profile, ville: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Sinistres 3 ans</label>
              <input type="number" style={inputStyle} value={profile.sinistres_3ans} min={0} max={5}
                onChange={e => setProfile({ ...profile, sinistres_3ans: Number(e.target.value) })} />
            </div>
            <div>
              <label style={labelStyle}>Profession</label>
              <input type="text" style={inputStyle} value={profile.profession} placeholder="Optionnel"
                onChange={e => setProfile({ ...profile, profession: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button
              onClick={compute}
              disabled={loading}
              style={{
                background: T.accent, color: 'white', border: 'none',
                padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 0 30px rgba(91,77,245,0.30)',
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Comparer 8 compagnies
            </button>
          </div>
        </SimpleCard>

        {/* Résumé recommandation ARK */}
        {result && (
          <SimpleCard padding={20} style={{
            marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(34,211,238,0.04))',
            border: '1px solid rgba(139,92,246,0.20)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(139,92,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Sparkles size={22} color={T.ark} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.ark, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  ARK recommande
                </div>
                <div style={{ color: T.text, fontSize: 14, lineHeight: 1.6 }}>
                  {result.summary.ark_explanation}
                </div>
                <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
                  <SummaryStat icon={Trophy} label="Meilleur prix" value={`${result.summary.cheapest_provider} · ${fmtEur(result.summary.cheapest_eur)}`} color={T.success} />
                  <SummaryStat icon={TrendingDown} label="Économie max" value={fmtEur(result.summary.economy_eur)} color={T.warning} />
                  <SummaryStat icon={Star} label="ARK pick" value={result.summary.ark_recommendation} color={T.ark} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={exportPdf}
                  disabled={exporting}
                  style={{
                    background: 'rgba(255,255,255,0.06)', color: T.text,
                    border: `1px solid ${T.cardBorder}`,
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                  Export PDF
                </button>
                <button
                  onClick={sendToClient}
                  style={{
                    background: T.ark, color: 'white', border: 'none',
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Send size={12} /> Envoyer client
                </button>
              </div>
            </div>
          </SimpleCard>
        )}

        {/* Grille des 8 cartes */}
        {result?.quotes && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {result.quotes.map((q, idx) => (
              <QuoteCard key={q.provider} quote={q} rank={idx + 1} onClick={() => setSelected(q)} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <SimpleCard padding={48} style={{ textAlign: 'center' }}>
            <Sparkles size={36} color={T.ark} style={{ marginBottom: 12 }} />
            <h3 style={{ color: T.text, fontSize: 16, margin: '0 0 8px' }}>Lancez votre comparatif</h3>
            <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>
              Remplissez le profil et cliquez sur "Comparer 8 compagnies" pour obtenir un classement intelligent.
            </p>
          </SimpleCard>
        )}

        {selected && <QuoteDetailModal quote={selected} onClose={() => setSelected(null)} />}
      </div>
    </>
  )
}

function SummaryStat({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon size={14} color={color} />
      <div>
        <div style={{ color: T.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ color, fontSize: 13, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  )
}

function badgeStyle(tone) {
  const tones = {
    success: { bg: 'rgba(34,197,94,0.15)', color: T.success },
    ark:     { bg: 'rgba(139,92,246,0.15)', color: T.ark },
    cyan:    { bg: 'rgba(34,211,238,0.15)', color: T.cyan },
    warning: { bg: 'rgba(245,158,11,0.15)', color: T.warning },
    violet:  { bg: 'rgba(124,58,237,0.15)', color: '#A78BFA' },
  }
  const t = tones[tone] || tones.ark
  return {
    background: t.bg, color: t.color,
    padding: '3px 8px', borderRadius: 6,
    fontSize: 10, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 4,
  }
}

function QuoteCard({ quote, rank, onClick }) {
  const isArkPick = quote.badges?.some(b => b.key === 'ark_pick')
  return (
    <div
      onClick={onClick}
      style={{
        background: T.cardBg,
        border: `1px solid ${isArkPick ? 'rgba(139,92,246,0.30)' : T.cardBorder}`,
        borderRadius: 14, padding: 18, cursor: 'pointer',
        position: 'relative',
        boxShadow: isArkPick ? '0 0 40px rgba(139,92,246,0.20)' : 'none',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ color: T.text, fontSize: 17, fontWeight: 700 }}>{quote.provider}</div>
          <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{quote.brand_tagline}</div>
        </div>
        <div style={{
          color: T.textMuted, fontSize: 10, fontWeight: 600,
          background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: 5,
        }}>
          #{rank}
        </div>
      </div>

      {/* Prix */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: T.text, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
          {fmtEur(quote.prime_annuelle_eur)}
        </div>
        <div style={{ color: T.textSecondary, fontSize: 11, marginTop: 4 }}>
          /an · soit {fmtEur(quote.prime_mensuelle_eur)}/mois
        </div>
      </div>

      {/* Score ARK + notation */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: 'rgba(139,92,246,0.08)', padding: '6px 8px', borderRadius: 6 }}>
          <div style={{ color: T.textMuted, fontSize: 9, textTransform: 'uppercase' }}>Score ARK</div>
          <div style={{ color: T.ark, fontSize: 14, fontWeight: 700 }}>{quote.ark_score}/100</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(34,211,238,0.06)', padding: '6px 8px', borderRadius: 6 }}>
          <div style={{ color: T.textMuted, fontSize: 9, textTransform: 'uppercase' }}>Notation</div>
          <div style={{ color: T.cyan, fontSize: 14, fontWeight: 700 }}>★ {quote.notation.toFixed(1)}</div>
        </div>
      </div>

      {/* Franchise */}
      <div style={{ color: T.textSecondary, fontSize: 11, marginBottom: 10 }}>
        Franchise : <span style={{ color: T.text, fontWeight: 600 }}>{fmtEur(quote.franchise_eur)}</span>
      </div>

      {/* Garanties */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: T.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Garanties incluses
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {(quote.garanties || []).slice(0, 4).map((g, i) => (
            <div key={i} style={{ color: T.textSecondary, fontSize: 11 }}>
              <Shield size={9} style={{ display: 'inline', marginRight: 4 }} color={T.success} /> {g}
            </div>
          ))}
          {quote.garanties?.length > 4 && (
            <div style={{ color: T.textMuted, fontSize: 10, fontStyle: 'italic' }}>
              +{quote.garanties.length - 4} autres garanties…
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
        {(quote.badges || []).map((b, i) => (
          <span key={i} style={badgeStyle(b.tone)}>{b.label}</span>
        ))}
      </div>
    </div>
  )
}

function QuoteDetailModal({ quote, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0A0A18',
          border: '1px solid rgba(139,92,246,0.30)',
          borderRadius: 16, padding: 28, maxWidth: 560, width: '90%',
        }}
      >
        <h3 style={{ color: T.text, fontSize: 22, margin: '0 0 4px' }}>{quote.provider}</h3>
        <p style={{ color: T.textSecondary, fontSize: 12, margin: '0 0 18px' }}>{quote.brand_tagline}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          <DetailStat label="Prime annuelle" value={fmtEur(quote.prime_annuelle_eur)} />
          <DetailStat label="Prime mensuelle" value={fmtEur(quote.prime_mensuelle_eur)} />
          <DetailStat label="Franchise" value={fmtEur(quote.franchise_eur)} />
          <DetailStat label="Score ARK" value={`${quote.ark_score}/100`} highlight />
          <DetailStat label="Notation" value={`★ ${quote.notation.toFixed(1)}`} />
          <DetailStat label="Traitement" value={`${quote.delai_traitement_jours}j`} />
        </div>

        <div style={{ color: T.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
          Garanties détaillées
        </div>
        <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
          {(quote.garanties || []).map((g, i) => (
            <div key={i} style={{
              background: T.cardBg, border: `1px solid ${T.cardBorder}`,
              padding: '8px 12px', borderRadius: 6,
              color: T.text, fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Shield size={12} color={T.success} /> {g}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            background: T.accent, color: 'white', border: 'none',
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', float: 'right',
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  )
}

function DetailStat({ label, value, highlight }) {
  return (
    <div style={{
      background: highlight ? 'rgba(139,92,246,0.10)' : T.cardBg,
      border: `1px solid ${highlight ? 'rgba(139,92,246,0.25)' : T.cardBorder}`,
      borderRadius: 8, padding: 10,
    }}>
      <div style={{ color: T.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: highlight ? T.ark : T.text, fontSize: 15, fontWeight: 700, marginTop: 3 }}>{value}</div>
    </div>
  )
}
