/**
 * Comparateur — Compare 2-3 produits assurance avec analyse IA (ARK).
 * Route : /comparateur
 *
 * - Sélection produit + compagnie pour chaque colonne
 * - Synthèse comparative générée (fallback déterministe si /api/ark/* indispo)
 * - Export PDF avec branding cabinet
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitCompareArrows, Sparkles, Plus, X, FileText, Star, ShieldCheck, Euro, Send,
  CheckCircle2, XCircle, AlertCircle, Building2,
} from 'lucide-react'
import { VibeBackdrop, VibeHeader, Vibe3DCard, VibeScrollSection } from '../components/vibe'
import api from '../api'

const T = {
  text: '#FFFFFF', textSecondary: '#9CA3AF', textMuted: '#6B7280',
  cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.08)',
  accent: '#8B5CF6', success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
}

const COMPAGNIES = ['Aurora', 'Novalia', 'Helios', 'Serenis', 'Atlas', 'Oria', 'Nivalis', 'Solenys']
const PRODUITS = ['Auto', 'Habitation', 'Santé', 'Prévoyance', 'RC Pro', 'Flotte Auto', 'MRH', 'Cyber', 'Décennale', 'PJ']

// Catalogue fictif réaliste
const CATALOG = {
  Auto: {
    Aurora:  { prime: 580,  formules: 'Tiers / Tiers+ / TR', plafondRC: '∞', franchise: 250, plus: ['Assistance 0 km', 'Prêt véhicule 15j'], moins: ['Conducteur novice non couvert'] },
    Novalia: { prime: 620,  formules: 'Tiers / TR', plafondRC: '∞', franchise: 200, plus: ['Bris de glace illimité', 'Assistance 24/7'], moins: ['Pas de garantie effets perso'] },
    Helios:  { prime: 540,  formules: 'Tiers / Tiers+ / TR', plafondRC: '∞', franchise: 300, plus: ['Tarif jeune conducteur'], moins: ['Franchise élevée', 'Assistance > 50 km'] },
    Solenys: { prime: 660,  formules: 'TR uniquement', plafondRC: '∞', franchise: 150, plus: ['Tout risque inclus', 'Véhicule remplacement 30j'], moins: ['Prime plus élevée'] },
  },
  Habitation: {
    Aurora:  { prime: 240, formules: 'Confort / Essentiel', plafondRC: '7,5 M€', franchise: 150, plus: ['Vol & vandalisme', 'RC vie privée'], moins: ['Pas de garantie piscine'] },
    Helios:  { prime: 210, formules: 'Confort', plafondRC: '5 M€', franchise: 200, plus: ['Bris de glace inclus'], moins: ['Limites objets précieux'] },
    Atlas:   { prime: 280, formules: 'Premium', plafondRC: '10 M€', franchise: 100, plus: ['Couverture famille', 'Multi-résidence'], moins: ['Prime supérieure'] },
  },
  Santé: {
    Novalia: { prime: 720, formules: 'Equilibre / Confort / Premium', plafondRC: 'N/A', franchise: 0, plus: ['Hospitalisation 200%', 'Optique forte'], moins: ['Délai carence dentaire'] },
    Helios:  { prime: 650, formules: 'Standard / Confort', plafondRC: 'N/A', franchise: 0, plus: ['Réseau partenaires important'], moins: ['Plafond optique modéré'] },
    Oria:    { prime: 880, formules: 'Premium', plafondRC: 'N/A', franchise: 0, plus: ['Médecine douce 500€', 'Dentaire 300%'], moins: ['Tarif élevé'] },
  },
  'RC Pro': {
    Aurora:  { prime: 1200, formules: 'Essentiel / Pro / Pro+', plafondRC: '5 M€', franchise: 500, plus: ['Cybercriminalité 50k€'], moins: ['Décennale en option'] },
    Atlas:   { prime: 1400, formules: 'Pro / Pro+', plafondRC: '10 M€', franchise: 800, plus: ['Plafond élevé', 'Défense pénale'], moins: ['Franchise élevée'] },
    Serenis: { prime: 1100, formules: 'Pro Standard', plafondRC: '5 M€', franchise: 1000, plus: ['Tarif compétitif'], moins: ['Pas de cyber inclus'] },
  },
  Prévoyance: {
    Aurora:  { prime: 480, formules: 'TNS Confort', plafondRC: 'N/A', franchise: 'J0 hospi', plus: ['Indemnités journalières 100€/j', 'Capital décès 200k€'], moins: ['Carence 30j accident'] },
    Novalia: { prime: 520, formules: 'TNS Premium', plafondRC: 'N/A', franchise: 'J0 hospi', plus: ['Capital décès 300k€', 'Rente conjoint'], moins: ['Tarif un peu plus haut'] },
    Solenys: { prime: 440, formules: 'TNS Standard', plafondRC: 'N/A', franchise: 'J7 hospi', plus: ['Tarif d\'appel'], moins: ['Carence plus longue'] },
  },
}

function getOffer(produit, compagnie) {
  return CATALOG[produit]?.[compagnie] || null
}

const fmtEur = (v) => typeof v === 'number' ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v) : (v || '—')

function defaultSelection() {
  return [
    { produit: 'Auto', compagnie: 'Aurora' },
    { produit: 'Auto', compagnie: 'Helios' },
    { produit: 'Auto', compagnie: 'Novalia' },
  ]
}

function buildSyntheseFallback(selections) {
  const offers = selections.map(s => ({ ...s, ...getOffer(s.produit, s.compagnie) || {} }))
  const valid = offers.filter(o => o.prime)
  if (!valid.length) return "Sélectionnez au moins deux offres avec un produit + compagnie disponibles pour générer la synthèse."
  const cheapest = valid.reduce((a, b) => (a.prime < b.prime ? a : b))
  const mostCover = valid.reduce((a, b) => ((a.plus?.length || 0) > (b.plus?.length || 0) ? a : b))
  return `
**Recommandation ARK** — Pour votre client, l'offre **${cheapest.compagnie}** (${cheapest.produit}) est la plus avantageuse côté tarif (${fmtEur(cheapest.prime)}/an). Cependant, **${mostCover.compagnie}** propose la couverture la plus complète (${(mostCover.plus || []).slice(0, 2).join(', ')}). 

Conseil métier : si votre client recherche un équilibre prix/couverture, privilégiez ${valid[0].compagnie}. Pour un profil exigeant, orientez vers ${mostCover.compagnie}.

Points de vigilance : ${valid.map(v => `${v.compagnie} → ${(v.moins || [])[0] || 'aucune réserve majeure'}`).join(' · ')}.
`.trim()
}

export default function Comparateur() {
  const navigate = useNavigate()
  const [selections, setSelections] = useState(defaultSelection())
  const [synthese, setSynthese] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  async function generateSynthese() {
    setLoading(true); setError(null)
    try {
      const prompt = `En tant qu'expert assurance, compare ces ${validCount} offres et fais une recommandation factuelle :\n\n${
        offers.filter(o => o.prime).map(o => `- ${o.compagnie} ${o.produit}: prime ${o.prime}€, formules ${o.formules}, franchise ${o.franchise}, plafond RC ${o.plafondRC}. Points forts: ${(o.plus||[]).join(', ')}. Points faibles: ${(o.moins||[]).join(', ')}.`).join('\n')
      }`
      const res = await api.post('/ark/ask', { question: prompt, context: 'comparateur_produits' }).catch(() => null)
      const text = res?.data?.answer || res?.data?.response || res?.data?.text
      setSynthese(text || buildSyntheseFallback(selections))
    } catch (err) {
      setError('IA temporairement indisponible — synthèse heuristique générée.')
      setSynthese(buildSyntheseFallback(selections))
    } finally {
      setLoading(false)
    }
  }

  function exportPdf() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comparatif COURTIA</title>
<style>
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0F172A;margin:32px;}
h1{font-family:'Fraunces',serif;font-style:italic;font-weight:500;font-size:28px;margin:0 0 4px;}
.kicker{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7C3AED;}
.grid{display:grid;grid-template-columns:repeat(${offers.length},1fr);gap:14px;margin-top:20px}
.card{border:1px solid #E2E8F0;border-radius:12px;padding:14px;font-size:12px}
.card h3{margin:0 0 6px;font-size:14px;color:#0F172A}
.card .price{font-family:'Fraunces',serif;font-style:italic;font-size:22px;color:#7C3AED;margin:6px 0}
.synthese{margin-top:24px;padding:16px;border-left:3px solid #8B5CF6;background:#F8FAFC;font-size:13px;line-height:1.6;white-space:pre-wrap}
.footer{margin-top:28px;font-size:11px;color:#94A3B8}
</style></head><body>
<div class="kicker">COURTIA · COMPARATEUR</div>
<h1>Comparatif d'offres</h1>
<p style="color:#475569;font-size:13px">Analyse multi-compagnies générée par ARK.</p>
<div class="grid">
${offers.map(o => `<div class="card"><h3>${o.compagnie} · ${o.produit}</h3><div class="price">${fmtEur(o.prime)}/an</div><div><strong>Formules</strong> : ${o.formules || '—'}</div><div><strong>Plafond RC</strong> : ${o.plafondRC || '—'}</div><div><strong>Franchise</strong> : ${o.franchise || '—'}</div><div style="color:#22C55E;margin-top:6px"><strong>+</strong> ${(o.plus||[]).join(' · ')}</div><div style="color:#EF4444"><strong>–</strong> ${(o.moins||[]).join(' · ')}</div></div>`).join('')}
</div>
<div class="synthese"><strong>Synthèse ARK</strong>\n\n${(synthese || buildSyntheseFallback(selections)).replace(/\*\*/g,'')}</div>
<div class="footer">Document généré par COURTIA — ${new Date().toLocaleString('fr-FR')}</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close() }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 20px 60px', color: T.text, perspective: 1400 }}>
      <VibeBackdrop intensity={0.85} color="#8B5CF6" />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto' }}>

        <VibeHeader
          kicker="ARK · IA"
          title="Comparateur d'offres"
          subtitle="Comparez 2 à 4 produits multi-compagnies et générez une synthèse ARK exportable en PDF."
          bubbleSize={56}
          actions={(
            <>
              <button onClick={addColumn} disabled={selections.length >= 4} style={{ ...btnGhost, opacity: selections.length >= 4 ? 0.4 : 1 }}>
                <Plus size={13} /> Ajouter
              </button>
              <button onClick={generateSynthese} disabled={loading || validCount < 2} style={{ ...btnPrimary, opacity: validCount < 2 ? 0.5 : 1 }}>
                <Sparkles size={13} /> {loading ? 'Analyse…' : 'Analyser avec ARK'}
              </button>
              <button onClick={exportPdf} style={btnGhost}>
                <FileText size={13} /> PDF
              </button>
            </>
          )}
        />

        <VibeScrollSection delay={0.05} parallax={10}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${selections.length}, minmax(260px, 1fr))`,
              gap: 14,
              marginBottom: 24,
            }}
          >
            <AnimatePresence>
              {selections.map((sel, i) => {
                const offer = getOffer(sel.produit, sel.compagnie)
                return (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16,1,0.3,1] }}
                  >
                    <Vibe3DCard
                      borderColor={T.cardBorder}
                      background={T.cardBg}
                      glowColor="#8B5CF6"
                      depth={6}
                      radius={16}
                      padding={16}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.16em', color: '#A78BFA', textTransform: 'uppercase' }}>Offre #{i + 1}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <Building2 size={14} color={T.accent} />
                            <span style={{ fontSize: 14, fontWeight: 800 }}>{sel.compagnie}</span>
                          </div>
                        </div>
                        {selections.length > 2 && (
                          <button onClick={() => removeColumn(i)} title="Retirer" style={{ background: 'transparent', border: 'none', color: T.textMuted, cursor: 'pointer' }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      <Field label="Produit">
                        <select value={sel.produit} onChange={e => updateSel(i, 'produit', e.target.value)} style={selectStyle}>
                          {PRODUITS.map(p => <option key={p} value={p} style={{ background: '#0a0a18' }}>{p}</option>)}
                        </select>
                      </Field>
                      <Field label="Compagnie">
                        <select value={sel.compagnie} onChange={e => updateSel(i, 'compagnie', e.target.value)} style={selectStyle}>
                          {COMPAGNIES.map(c => <option key={c} value={c} style={{ background: '#0a0a18' }}>{c}</option>)}
                        </select>
                      </Field>

                      <div style={{ marginTop: 10, padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                        {offer ? (
                          <>
                            <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 26, fontWeight: 500, color: '#fff', marginBottom: 4 }}>
                              {fmtEur(offer.prime)}<small style={{ fontSize: 12, color: T.textMuted }}> /an</small>
                            </div>
                            <Row label="Formules" value={offer.formules} />
                            <Row label="Plafond RC" value={offer.plafondRC} />
                            <Row label="Franchise" value={typeof offer.franchise === 'number' ? `${offer.franchise} €` : offer.franchise} />
                            <div style={{ marginTop: 10 }}>
                              {(offer.plus || []).map(p => (
                                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.success, marginBottom: 4 }}>
                                  <CheckCircle2 size={11} /> {p}
                                </div>
                              ))}
                              {(offer.moins || []).map(m => (
                                <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.danger, marginBottom: 4 }}>
                                  <XCircle size={11} /> {m}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.warning, fontSize: 12 }}>
                            <AlertCircle size={14} /> Aucune offre {sel.produit} chez {sel.compagnie} dans notre catalogue.
                          </div>
                        )}
                      </div>
                    </Vibe3DCard>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </VibeScrollSection>

        {/* SYNTHESE */}
        <VibeScrollSection delay={0.1} parallax={10}>
          <Vibe3DCard
            background="linear-gradient(135deg, rgba(139,92,246,0.10), rgba(34,211,238,0.06))"
            borderColor="rgba(139,92,246,0.30)"
            glowColor="#8B5CF6"
            radius={16}
            padding={22}
            depth={4}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Sparkles size={16} color={T.accent} />
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.16em', color: '#A78BFA', textTransform: 'uppercase' }}>Analyse ARK</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Synthèse comparative</div>
              </div>
            </div>
            {error && <div style={{ fontSize: 11, color: T.warning, marginBottom: 8 }}>{error}</div>}
            <div style={{
              fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)',
              whiteSpace: 'pre-wrap',
              minHeight: 60,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {synthese ? synthese.split('**').map((part, idx) => idx % 2 ? <strong key={idx} style={{ color: '#fff' }}>{part}</strong> : <span key={idx}>{part}</span>) : (
                <span style={{ color: T.textMuted }}>Cliquez sur <strong style={{ color: '#A78BFA' }}>Analyser avec ARK</strong> pour générer une recommandation factuelle pour votre client.</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={exportPdf} style={btnPrimary}><FileText size={13} /> Export PDF avec branding</button>
              <button onClick={() => navigate('/devis')} style={btnGhost}><Send size={13} /> Créer un devis</button>
            </div>
          </Vibe3DCard>
        </VibeScrollSection>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
      <span style={{ color: '#9CA3AF' }}>{label}</span>
      <span style={{ color: '#fff', fontWeight: 600 }}>{value || '—'}</span>
    </div>
  )
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

const btnPrimary = {
  padding: '8px 14px', borderRadius: 10,
  background: 'linear-gradient(135deg, #8B5CF6, #5B4DF5)',
  color: '#fff', border: 'none', cursor: 'pointer',
  fontSize: 12, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: '0 8px 24px rgba(139,92,246,0.25)',
}

const btnGhost = {
  padding: '8px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.10)',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
