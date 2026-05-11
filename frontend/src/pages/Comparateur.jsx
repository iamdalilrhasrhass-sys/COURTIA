import { useState, useMemo } from 'react'
import { Plus, X, FileText, Sparkles, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { VibeBackdrop } from '../components/vibe'
import PageHeader from '../components/PageHeader'
import SimpleCard from '../components/SimpleCard'
import api from '../api'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6',
  success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const COMPAGNIES = ['Aurora', 'Novalia', 'Helios', 'Serenis', 'Atlas', 'Oria', 'Nivalis', 'Solenys']
const PRODUITS   = ['Auto', 'Habitation', 'Santé', 'Prévoyance', 'RC Pro', 'Flotte Auto', 'MRH', 'Cyber', 'Décennale', 'PJ']

const CATALOG = {
  Auto: {
    Aurora:  { prime: 580, formules: 'Tiers / TR', franchise: 250, plus: ['Assistance 0 km'], moins: ['Conducteur novice non couvert'] },
    Novalia: { prime: 620, formules: 'Tiers / TR', franchise: 200, plus: ['Bris de glace illimité'], moins: ['Pas d\'effets perso'] },
    Helios:  { prime: 540, formules: 'Tiers / TR', franchise: 300, plus: ['Tarif jeune'], moins: ['Franchise élevée'] },
    Solenys: { prime: 660, formules: 'TR', franchise: 150, plus: ['TR inclus'], moins: ['Prime plus élevée'] },
  },
  Habitation: {
    Aurora: { prime: 240, formules: 'Confort', franchise: 150, plus: ['Vol & vandalisme'], moins: ['Pas de piscine'] },
    Helios: { prime: 210, formules: 'Confort', franchise: 200, plus: ['Bris de glace'], moins: ['Limites objets'] },
    Atlas:  { prime: 280, formules: 'Premium', franchise: 100, plus: ['Multi-résidence'], moins: ['Prime supérieure'] },
  },
  Santé: {
    Novalia: { prime: 720, formules: 'Equilibre / Premium', franchise: 0, plus: ['Hospi 200%'], moins: ['Carence dentaire'] },
    Helios:  { prime: 650, formules: 'Standard', franchise: 0, plus: ['Réseau partenaires'], moins: ['Optique limité'] },
    Oria:    { prime: 880, formules: 'Premium', franchise: 0, plus: ['Médecine douce'], moins: ['Tarif élevé'] },
  },
  'RC Pro': {
    Aurora:  { prime: 1200, formules: 'Pro / Pro+', franchise: 500, plus: ['Cyber 50k€'], moins: ['Décennale en option'] },
    Atlas:   { prime: 1400, formules: 'Pro+', franchise: 800, plus: ['Défense pénale'], moins: ['Franchise élevée'] },
    Serenis: { prime: 1100, formules: 'Pro', franchise: 1000, plus: ['Tarif compétitif'], moins: ['Pas de cyber'] },
  },
  Prévoyance: {
    Aurora:  { prime: 480, formules: 'TNS', franchise: 'J0', plus: ['IJ 100€/j'], moins: ['Carence 30j accident'] },
    Novalia: { prime: 520, formules: 'TNS Premium', franchise: 'J0', plus: ['Capital 300k€'], moins: ['Tarif plus haut'] },
    Solenys: { prime: 440, formules: 'TNS Standard', franchise: 'J7', plus: ['Tarif d\'appel'], moins: ['Carence plus longue'] },
  },
}

function getOffer(produit, compagnie) { return CATALOG[produit]?.[compagnie] || null }
const fmtEur = (v) => typeof v === 'number' ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : (v || '—')

function buildSyntheseFallback(selections) {
  const offers = selections.map(s => ({ ...s, ...getOffer(s.produit, s.compagnie) || {} }))
  const valid = offers.filter(o => o.prime)
  if (!valid.length) return ''
  const cheapest = valid.reduce((a, b) => (a.prime < b.prime ? a : b))
  const mostCover = valid.reduce((a, b) => ((a.plus?.length || 0) > (b.plus?.length || 0) ? a : b))
  return `${cheapest.compagnie} est la plus avantageuse côté tarif (${fmtEur(cheapest.prime)}). ${mostCover.compagnie} offre la couverture la plus complète. Pour un équilibre prix/couverture, privilégiez ${valid[0].compagnie}.`
}

const selectStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.10)',
  fontSize: 12,
  outline: 'none',
}

export default function Comparateur() {
  const [selections, setSelections] = useState([
    { produit: 'Auto', compagnie: 'Aurora' },
    { produit: 'Auto', compagnie: 'Helios' },
  ])
  const [synthese, setSynthese] = useState('')
  const [loading, setLoading] = useState(false)

  const offers = useMemo(() => selections.map(s => ({ ...s, ...getOffer(s.produit, s.compagnie) || {} })), [selections])
  const validCount = offers.filter(o => o.prime).length

  function updateSel(i, field, val) {
    setSelections(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }
  function addColumn() {
    if (selections.length >= 4) return
    setSelections(prev => [...prev, { produit: prev[0]?.produit || 'Auto', compagnie: 'Atlas' }])
  }
  function removeColumn(i) {
    if (selections.length <= 2) return
    setSelections(prev => prev.filter((_, idx) => idx !== i))
  }

  async function analyse() {
    setLoading(true)
    try {
      const prompt = `Compare ces offres factuellement :\n${offers.filter(o => o.prime).map(o => `${o.compagnie} ${o.produit}: ${o.prime}€, ${o.formules}`).join('\n')}`
      const res = await api.post('/ark/ask', { question: prompt }).catch(() => null)
      const text = res?.data?.answer || res?.data?.response || res?.data?.text
      setSynthese(text || buildSyntheseFallback(selections))
    } catch {
      setSynthese(buildSyntheseFallback(selections))
    } finally {
      setLoading(false)
    }
  }

  function exportPdf() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comparatif COURTIA</title>
<style>body{font-family:system-ui;margin:32px;color:#0F172A}h1{font-size:28px;margin:0 0 4px}.grid{display:grid;grid-template-columns:repeat(${offers.length},1fr);gap:14px;margin-top:20px}.card{border:1px solid #E2E8F0;border-radius:12px;padding:14px;font-size:12px}.card h3{margin:0 0 6px}.price{font-size:22px;color:#7C3AED;margin:6px 0}.synthese{margin-top:24px;padding:16px;border-left:3px solid #8B5CF6;background:#F8FAFC;font-size:13px}</style></head><body>
<h1>Comparatif d'offres</h1>
<div class="grid">
${offers.map(o => `<div class="card"><h3>${o.compagnie} · ${o.produit}</h3><div class="price">${fmtEur(o.prime)}/an</div><div>Formules : ${o.formules || '—'}</div><div>Franchise : ${o.franchise || '—'}</div></div>`).join('')}
</div>
<div class="synthese"><strong>Synthèse ARK</strong><br>${(synthese || buildSyntheseFallback(selections))}</div>
<p style="margin-top:24px;font-size:11px;color:#94A3B8">COURTIA — ${new Date().toLocaleString('fr-FR')}</p>
<script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close() }
  }

  return (
    <div style={{ minHeight: '100vh', color: T.text, padding: '24px 20px 48px' }}>
      <VibeBackdrop intensity={0.7} />
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>

        <PageHeader
          title="Comparer"
          subtitle="2 à 4 offres, synthèse IA."
          action={
            <>
              <button
                onClick={addColumn}
                disabled={selections.length >= 4}
                style={{ ...btnGhost, opacity: selections.length >= 4 ? 0.4 : 1 }}
              >
                <Plus size={13} /> Offre
              </button>
              <button
                onClick={analyse}
                disabled={loading || validCount < 2}
                style={{ ...btnPrimary, opacity: validCount < 2 ? 0.4 : 1 }}
              >
                <Sparkles size={13} /> {loading ? 'Analyse…' : 'Analyser'}
              </button>
            </>
          }
        />

        {/* Sélection en haut */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${selections.length}, minmax(220px, 1fr))`,
          gap: 12,
          marginBottom: 20,
        }}>
          {selections.map((sel, i) => (
            <SimpleCard key={i} padding={16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Offre {i + 1}
                </span>
                {selections.length > 2 && (
                  <button
                    onClick={() => removeColumn(i)}
                    style={{ background: 'transparent', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 2 }}
                    aria-label="Retirer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select value={sel.produit} onChange={e => updateSel(i, 'produit', e.target.value)} style={selectStyle}>
                  {PRODUITS.map(p => <option key={p} value={p} style={{ background: '#0a0a18' }}>{p}</option>)}
                </select>
                <select value={sel.compagnie} onChange={e => updateSel(i, 'compagnie', e.target.value)} style={selectStyle}>
                  {COMPAGNIES.map(c => <option key={c} value={c} style={{ background: '#0a0a18' }}>{c}</option>)}
                </select>
              </div>
            </SimpleCard>
          ))}
        </div>

        {/* Tableau ultra-simple */}
        <SimpleCard padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th style={thStyle}>Critère</th>
                  {offers.map((o, i) => (
                    <th key={i} style={thStyle}>{o.compagnie}<br/><span style={{ fontWeight: 500, color: T.textMuted, fontSize: 11 }}>{o.produit}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={trStyle}>
                  <td style={tdStyle}>Prime annuelle</td>
                  {offers.map((o, i) => (
                    <td key={i} style={{ ...tdStyle, fontWeight: 700, color: '#fff' }}>
                      {o.prime ? fmtEur(o.prime) : <span style={{ color: T.warning, fontWeight: 500 }}><AlertCircle size={11} style={{ verticalAlign: 'middle' }} /> Non dispo</span>}
                    </td>
                  ))}
                </tr>
                <tr style={trStyle}>
                  <td style={tdStyle}>Formules</td>
                  {offers.map((o, i) => <td key={i} style={tdStyle}>{o.formules || '—'}</td>)}
                </tr>
                <tr style={trStyle}>
                  <td style={tdStyle}>Franchise</td>
                  {offers.map((o, i) => <td key={i} style={tdStyle}>{typeof o.franchise === 'number' ? `${o.franchise} €` : (o.franchise || '—')}</td>)}
                </tr>
                <tr style={trStyle}>
                  <td style={tdStyle}>Points forts</td>
                  {offers.map((o, i) => (
                    <td key={i} style={tdStyle}>
                      {(o.plus || []).map(p => (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.success, fontSize: 11, marginBottom: 2 }}>
                          <CheckCircle2 size={10} /> {p}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr style={trStyle}>
                  <td style={tdStyle}>Points faibles</td>
                  {offers.map((o, i) => (
                    <td key={i} style={tdStyle}>
                      {(o.moins || []).map(p => (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.danger, fontSize: 11, marginBottom: 2 }}>
                          <XCircle size={10} /> {p}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </SimpleCard>

        {/* Synthèse */}
        {synthese && (
          <SimpleCard padding={20} style={{
            marginTop: 20,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(255,255,255,0.02))',
            border: '1px solid rgba(139,92,246,0.20)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkles size={14} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Synthèse IA
              </span>
            </div>
            <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, margin: 0 }}>{synthese}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={exportPdf} style={btnPrimary}>
                <FileText size={13} /> Export PDF
              </button>
            </div>
          </SimpleCard>
        )}
      </main>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: T.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: `1px solid ${T.cardBorder}`,
}
const tdStyle = {
  padding: '12px 16px',
  borderBottom: `1px solid ${T.cardBorder}`,
  color: T.textSecondary,
  verticalAlign: 'top',
}
const trStyle = {}

const btnPrimary = {
  padding: '8px 14px', borderRadius: 10,
  background: '#8B5CF6',
  color: '#fff', border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
}
const btnGhost = {
  padding: '8px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.10)',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
