/**
 * CommissionsCalculator — calcul de commissions en temps réel.
 * Route : /commissions/calculator
 *
 * - Sélection compagnie + produit + prime annuelle → commission instantanée
 * - Barèmes par compagnie (Aurora, Novalia, Helios, Serenis, Atlas, Oria, Nivalis, Solenys)
 * - Export PDF / CSV
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calculator, FileSpreadsheet, FileText, Download, Euro, Building2, Plus, Sparkles,
  TrendingUp, Settings2, Save,
} from 'lucide-react'
import { VibeBackdrop, VibeHeader, Vibe3DCard, VibeScrollSection } from '../components/vibe'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.08)',
  accent: '#8B5CF6', success: '#22C55E', warning: '#F59E0B',
}

const COMPAGNIES = ['Aurora', 'Novalia', 'Helios', 'Serenis', 'Atlas', 'Oria', 'Nivalis', 'Solenys']
const PRODUITS = ['Auto', 'Habitation', 'Santé', 'Prévoyance', 'RC Pro', 'Flotte Auto', 'MRH', 'Cyber', 'Décennale', 'PJ']

// Barèmes (en %) fictifs cohérents avec le marché
const BAREMES = {
  Aurora:   { Auto: 12, Habitation: 14, Santé: 8,  Prévoyance: 18, 'RC Pro': 16, 'Flotte Auto': 11, MRH: 13, Cyber: 20, Décennale: 15, PJ: 22 },
  Novalia:  { Auto: 11, Habitation: 13, Santé: 9,  Prévoyance: 17, 'RC Pro': 15, 'Flotte Auto': 12, MRH: 14, Cyber: 19, Décennale: 14, PJ: 20 },
  Helios:   { Auto: 10, Habitation: 15, Santé: 7,  Prévoyance: 16, 'RC Pro': 14, 'Flotte Auto': 10, MRH: 12, Cyber: 18, Décennale: 13, PJ: 19 },
  Serenis:  { Auto: 13, Habitation: 12, Santé: 10, Prévoyance: 19, 'RC Pro': 17, 'Flotte Auto': 13, MRH: 15, Cyber: 21, Décennale: 16, PJ: 23 },
  Atlas:    { Auto: 12, Habitation: 13, Santé: 8,  Prévoyance: 17, 'RC Pro': 18, 'Flotte Auto': 12, MRH: 14, Cyber: 22, Décennale: 15, PJ: 21 },
  Oria:     { Auto: 11, Habitation: 14, Santé: 9,  Prévoyance: 16, 'RC Pro': 15, 'Flotte Auto': 11, MRH: 13, Cyber: 19, Décennale: 14, PJ: 20 },
  Nivalis:  { Auto: 12, Habitation: 13, Santé: 8,  Prévoyance: 18, 'RC Pro': 16, 'Flotte Auto': 12, MRH: 14, Cyber: 20, Décennale: 17, PJ: 22 },
  Solenys:  { Auto: 10, Habitation: 12, Santé: 10, Prévoyance: 15, 'RC Pro': 13, 'Flotte Auto': 9,  MRH: 11, Cyber: 17, Décennale: 12, PJ: 18 },
}

const RECURRENCE_FACTOR = {
  'Première année': 1,
  'Récurrente (année N+)': 0.6,
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(Number(v || 0))
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`

function downloadBlob(name, mime, content) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CommissionsCalculator() {
  const navigate = useNavigate()
  const [compagnie, setCompagnie] = useState('Aurora')
  const [produit, setProduit] = useState('Auto')
  const [prime, setPrime] = useState(1200)
  const [recurrence, setRecurrence] = useState('Première année')
  const [tableau, setTableau] = useState([])

  const taux = useMemo(() => {
    return BAREMES[compagnie]?.[produit] ?? 10
  }, [compagnie, produit])

  const commission = useMemo(() => {
    const factor = RECURRENCE_FACTOR[recurrence] ?? 1
    return (Number(prime || 0) * taux * factor) / 100
  }, [prime, taux, recurrence])

  const commissionMensuelle = commission / 12

  function addToTableau() {
    setTableau(prev => [
      ...prev,
      {
        id: Date.now(),
        compagnie, produit,
        prime: Number(prime || 0),
        recurrence,
        taux,
        commission,
      },
    ])
  }

  function exportCsv() {
    const header = 'Compagnie;Produit;Prime annuelle (€);Récurrence;Taux (%);Commission (€)'
    const lines = tableau.length
      ? tableau.map(r => `${r.compagnie};${r.produit};${r.prime};${r.recurrence};${r.taux};${r.commission.toFixed(2)}`)
      : [`${compagnie};${produit};${prime};${recurrence};${taux};${commission.toFixed(2)}`]
    const csv = [header, ...lines].join('\n')
    downloadBlob(`commissions-${Date.now()}.csv`, 'text/csv;charset=utf-8', '﻿' + csv)
  }

  function exportPdf() {
    // Génère un HTML imprimable que l'utilisateur peut sauver en PDF via Cmd/Ctrl+P
    const rows = tableau.length ? tableau : [{ id: 0, compagnie, produit, prime, recurrence, taux, commission }]
    const total = rows.reduce((s, r) => s + Number(r.commission || 0), 0)
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Commissions COURTIA</title>
<style>
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0F172A;margin:32px;}
h1{font-family:'Fraunces',serif;font-style:italic;font-weight:500;font-size:28px;margin:0 0 4px;}
.kicker{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7C3AED;}
table{width:100%;border-collapse:collapse;margin-top:24px;font-size:13px}
th,td{padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:left}
th{background:#F8FAFC;font-size:11px;text-transform:uppercase;color:#64748B}
.total{font-weight:700;color:#0F172A}
.footer{margin-top:28px;font-size:11px;color:#94A3B8}
</style></head><body>
<div class="kicker">COURTIA · CALCULATEUR</div>
<h1>Calcul de commissions</h1>
<p style="color:#475569;font-size:13px">Détail des commissions estimées par produit / compagnie.</p>
<table>
<thead><tr><th>Compagnie</th><th>Produit</th><th>Prime annuelle</th><th>Récurrence</th><th>Taux</th><th>Commission</th></tr></thead>
<tbody>
${rows.map(r => `<tr><td>${r.compagnie}</td><td>${r.produit}</td><td>${fmtEur(r.prime)}</td><td>${r.recurrence}</td><td>${fmtPct(r.taux)}</td><td class="total">${fmtEur(r.commission)}</td></tr>`).join('')}
<tr><td colspan="5" class="total" style="text-align:right">Total estimé</td><td class="total">${fmtEur(total)}</td></tr>
</tbody></table>
<div class="footer">Document généré par COURTIA — ${new Date().toLocaleString('fr-FR')}</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close() }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 60px', color: T.text, perspective: 1400 }}>
      <VibeBackdrop intensity={0.85} color="#8B5CF6" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>

        <VibeHeader
          kicker="OUTILS COURTIER"
          title="Calculateur de commissions"
          subtitle="Estimez en temps réel vos commissions par compagnie et produit. Exportez en PDF ou CSV."
          bubbleSize={56}
          actions={(
            <>
              <button onClick={() => navigate('/commissions')} style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <Settings2 size={13} /> Mes commissions
              </button>
            </>
          )}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* INPUTS */}
          <VibeScrollSection delay={0.05} parallax={10}>
            <Vibe3DCard background={T.cardBg} borderColor={T.cardBorder} radius={16} padding={22} depth={6} glow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calculator size={18} color={T.accent} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Paramètres</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Choisissez compagnie, produit et prime</div>
                </div>
              </div>

              <Field label="Compagnie">
                <select value={compagnie} onChange={e => setCompagnie(e.target.value)} style={selectStyle}>
                  {COMPAGNIES.map(c => <option key={c} value={c} style={{ background: '#0a0a18' }}>{c}</option>)}
                </select>
              </Field>

              <Field label="Produit">
                <select value={produit} onChange={e => setProduit(e.target.value)} style={selectStyle}>
                  {PRODUITS.map(p => <option key={p} value={p} style={{ background: '#0a0a18' }}>{p}</option>)}
                </select>
              </Field>

              <Field label="Prime annuelle (€)">
                <input type="number" min={0} step={50} value={prime} onChange={e => setPrime(Number(e.target.value))} style={inputStyle} />
              </Field>

              <Field label="Année">
                <select value={recurrence} onChange={e => setRecurrence(e.target.value)} style={selectStyle}>
                  {Object.keys(RECURRENCE_FACTOR).map(r => <option key={r} value={r} style={{ background: '#0a0a18' }}>{r}</option>)}
                </select>
              </Field>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={addToTableau} style={btnPrimary}>
                  <Plus size={13} /> Ajouter au tableau
                </button>
              </div>
            </Vibe3DCard>
          </VibeScrollSection>

          {/* RESULT */}
          <VibeScrollSection delay={0.1} parallax={10}>
            <Vibe3DCard
              background="linear-gradient(135deg, rgba(139,92,246,0.10), rgba(34,211,238,0.06))"
              borderColor="rgba(139,92,246,0.30)"
              glowColor="#8B5CF6"
              radius={16}
              padding={22}
              depth={6}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Sparkles size={16} color={T.accent} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.16em', color: '#A78BFA', textTransform: 'uppercase' }}>Estimation en temps réel</span>
              </div>

              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{compagnie} · {produit} · {recurrence}</div>
              <div style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(36px, 5vw, 52px)',
                lineHeight: 1,
                color: '#fff',
                marginBottom: 6,
              }}>
                {fmtEur(commission)}
              </div>
              <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 18 }}>
                soit <strong style={{ color: '#fff' }}>{fmtEur(commissionMensuelle)}</strong> / mois
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
                <Metric label="Taux" value={fmtPct(taux)} accent="#A78BFA" />
                <Metric label="Prime base" value={fmtEur(prime)} accent="#22D3EE" />
                <Metric label="Facteur" value={`×${RECURRENCE_FACTOR[recurrence]}`} accent="#22C55E" />
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={exportPdf} style={btnGhost}><FileText size={13} /> Export PDF</button>
                <button onClick={exportCsv} style={btnGhost}><FileSpreadsheet size={13} /> Export CSV</button>
              </div>
            </Vibe3DCard>
          </VibeScrollSection>
        </div>

        {/* TABLEAU */}
        {tableau.length > 0 && (
          <VibeScrollSection delay={0.05} parallax={12}>
            <Vibe3DCard background={T.cardBg} borderColor={T.cardBorder} radius={16} padding={18} depth={4} glow={false}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={14} color={T.accent} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Comparatif sauvegardé</span>
                </div>
                <button onClick={() => setTableau([])} style={{ ...btnGhost, padding: '6px 10px' }}>Vider</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: T.textMuted, fontSize: 11, textTransform: 'uppercase' }}>
                      {['Compagnie', 'Produit', 'Prime', 'Récurrence', 'Taux', 'Commission'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${T.cardBorder}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableau.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                        <td style={{ padding: '8px 10px', color: T.text }}>{r.compagnie}</td>
                        <td style={{ padding: '8px 10px', color: T.text }}>{r.produit}</td>
                        <td style={{ padding: '8px 10px', color: T.textSecondary }}>{fmtEur(r.prime)}</td>
                        <td style={{ padding: '8px 10px', color: T.textSecondary }}>{r.recurrence}</td>
                        <td style={{ padding: '8px 10px', color: '#A78BFA' }}>{fmtPct(r.taux)}</td>
                        <td style={{ padding: '8px 10px', color: T.success, fontWeight: 700 }}>{fmtEur(r.commission)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={5} style={{ padding: '12px 10px', textAlign: 'right', color: T.textMuted, fontWeight: 700 }}>Total estimé</td>
                      <td style={{ padding: '12px 10px', color: '#fff', fontWeight: 800 }}>
                        {fmtEur(tableau.reduce((s, r) => s + r.commission, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Vibe3DCard>
          </VibeScrollSection>
        )}

        {/* BAREME GRID */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.16em', color: '#A78BFA', textTransform: 'uppercase', marginBottom: 8 }}>Barèmes de référence</div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 500, fontSize: 22, margin: 0, marginBottom: 14, color: '#fff' }}>
            Tous nos partenaires
          </h2>
          <VibeScrollSection parallax={10}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14,
            }}>
              {COMPAGNIES.map((c, i) => (
                <motion.div
                  key={c}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16,1,0.3,1] }}
                  whileHover={{ rotateX: 3, rotateY: -3, y: -2 }}
                  style={{
                    background: T.cardBg,
                    border: `1px solid ${T.cardBorder}`,
                    borderRadius: 14,
                    padding: 14,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Building2 size={14} color={T.accent} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                    {PRODUITS.map(p => (
                      <div key={p} style={{ display: 'flex', justifyContent: 'space-between', color: T.textSecondary }}>
                        <span>{p}</span>
                        <span style={{ color: '#A78BFA', fontWeight: 600 }}>{BAREMES[c][p]}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </VibeScrollSection>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: accent || '#fff' }}>{value}</div>
    </div>
  )
}

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.10)',
  fontSize: 13,
  outline: 'none',
  appearance: 'none',
}

const inputStyle = {
  ...selectStyle,
  appearance: 'auto',
}

const btnPrimary = {
  padding: '10px 16px', borderRadius: 10,
  background: 'linear-gradient(135deg, #8B5CF6, #5B4DF5)',
  color: '#fff', border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 10px 30px rgba(139,92,246,0.25)',
}

const btnGhost = {
  padding: '8px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.10)',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
