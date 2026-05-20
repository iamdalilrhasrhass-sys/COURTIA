     1|import { useState, useMemo, useEffect } from 'react'
     2|import { useParams, useNavigate } from 'react-router-dom'
     3|import { motion, AnimatePresence } from 'framer-motion'
     4|import {
     5|  ArrowLeft, Mail, Phone, MapPin, Calendar, Send, Plus,
     6|  Shield, FileText, Clock, Euro, CheckCircle, User, Sparkles,
     7|  AlertTriangle, TrendingUp, FileSignature, FolderOpen, Activity,
     8|  ChevronRight, Target, Bell, Zap, Heart, PackageCheck, Scale, FolderSearch, Briefcase,
     9|} from 'lucide-react'
    10|import { VibeBackdrop } from '../components/vibe'
    11|import { Particles, ScrollGlow } from '../components/vibe/VibePage'
    12|import DocumentIntelligence from '../components/intel/DocumentIntelligence'
    13|import SmartRelances from '../components/relances/SmartRelances'
    14|
    15|// ─── Aurora tokens ────────────────────────────────────────────
    16|const T = {
    17|  text: '#FFFFFF',
    18|  textSecondary: '#9CA3AF',
    19|  textMuted: '#6B7280',
    20|  textDim: '#4B5563',
    21|  cardBg: 'rgba(255,255,255,0.03)',
    22|  cardBgHover: 'rgba(255,255,255,0.06)',
    23|  cardBorder: 'rgba(255,255,255,0.06)',
    24|  cardBorderLight: 'rgba(255,255,255,0.10)',
    25|  accent: '#5B4DF5',
    26|  ark: '#8B5CF6',
    27|  arkBg: 'rgba(139,92,246,0.08)',
    28|  arkBorder: 'rgba(139,92,246,0.25)',
    29|  cyan: '#22D3EE',
    30|  blue: '#3B82F6',
    31|  success: '#22C55E',
    32|  warning: '#F59E0B',
    33|  danger: '#EF4444',
    34|}
    35|
    36|const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))
    37|
    38|// ─── Demo client 360° ─────────────────────────────────────────
    39|const DEMO_CLIENT = {
    40|  id: 'martin-conseil',
    41|  prenom: 'Martin',
    42|  nom: 'Conseil',
    43|  type: 'Professionnel',
    44|  statut: 'actif',
    45|  email: 'm.conseil@martinconseil.fr',
    46|  telephone: '06 12 34 56 78',
    47|  city: 'Lyon',
    48|  siret: '812 345 678 00021',
    49|  created_at: '2021-03-15T10:00:00.000Z',
    50|  last_contact: '2026-04-29T14:30:00.000Z',
    51|  portfolio_value: 15880,
    52|  score: 89,
    53|  risque: 'Faible',
    54|}
    55|
    56|const DEMO_CONTRACTS = [
    57|  { id: 'c1', type: 'RC Pro',      compagnie: 'Aurora',  prime: 2800,  echeance: '01 juin 2026', alert: true,  jours: 21,  statut: 'actif' },
    58|  { id: 'c2', type: 'Flotte Auto', compagnie: 'Novalia', prime: 12400, echeance: '01 janv 2027', alert: false, jours: 236, statut: 'actif' },
    59|  { id: 'c3', type: 'MRH',         compagnie: 'Helios',  prime: 680,   echeance: '01 sept 2026', alert: false, jours: 113, statut: 'actif' },
    60|]
    61|
    62|const DEMO_DEVIS = [
    63|  { id: 'd1', ref: '#247', produit: 'Prévoyance TNS', montant: 520, envoye: '20 avr', statut: 'en_attente' },
    64|  { id: 'd2', ref: '#240', produit: 'PJ',             montant: 1200,envoye: '15 mars',statut: 'signe' },
    65|]
    66|
    67|const DEMO_DOCS = [
    68|  { id: 1, name: 'CGV RC Pro 2026.pdf',      type: 'pdf', when: '15 mai' },
    69|  { id: 2, name: 'Attestation Aurora.pdf',   type: 'pdf', when: '12 mai' },
    70|  { id: 3, name: 'Devis Prévoyance #247.pdf',type: 'pdf', when: '20 avr' },
    71|]
    72|
    73|const DEMO_TASKS = [
    74|  { id: 1, label: 'Vérifier renouvellement RC Pro',          due: 'Demain',     priority: 'haute' },
    75|  { id: 2, label: 'Appel suivi devis Prévoyance #247',       due: 'Cette sem.', priority: 'moyenne' },
    76|]
    77|
    78|const DEMO_RELANCES = [
    79|  { id: 1, motif: 'Devis Prévoyance #247 sans réponse',     since: '23 j',  level: 'haute' },
    80|]
    81|
    82|const DEMO_HISTORY = [
    83|  { id: 1, label: 'ARK : Cross-sell PJ détecté',          date: '02 mai 2026', color: T.ark,     icon: Sparkles },
    84|  { id: 2, label: 'Devis Prévoyance TNS envoyé',          date: '20 avr 2026', color: T.warning, icon: FileSignature },
    85|  { id: 3, label: 'Appel commercial — RC Pro',            date: '15 avr 2026', color: T.blue,    icon: Phone },
    86|  { id: 4, label: 'Contrat MRH souscrit (Helios)',        date: '01 sept 2025',color: T.success, icon: Shield },
    87|  { id: 5, label: 'Contrat Flotte Auto souscrit (Novalia)',date: '01 janv 2024',color: T.success, icon: FileText },
    88|  { id: 6, label: 'Client créé',                          date: '15 mars 2021',color: T.textMuted, icon: User },
    89|]
    90|
    91|const STATUS = {
    92|  actif:      { label: 'Actif',     color: T.success },
    93|  prospect:   { label: 'Prospect',  color: T.blue },
    94|  a_risque:   { label: 'À risque',  color: T.danger },
    95|  silencieux: { label: 'Silencieux',color: T.warning },
    96|}
    97|
    98|const getInitials = (c) => ((c?.prenom || '').charAt(0) + (c?.nom || '').charAt(0)).toUpperCase() || '?'
    99|
   100|const daysAgo = (d) => {
   101|  if (!d) return null
   102|  const diff = Date.now() - new Date(d).getTime()
   103|  return Math.floor(diff / (1000 * 60 * 60 * 24))
   104|}
   105|
   106|// ─── Aurora card ────────────────────────────────────────────
   107|function Card({ children, padding = 16, accent, onClick, style }) {
   108|  return (
   109|    <div onClick={onClick} style={{
   110|      background: T.cardBg,
   111|      border: `1px solid ${T.cardBorder}`,
   112|      borderRadius: 12,
   113|      padding,
   114|      backdropFilter: 'blur(12px)',
   115|      position: 'relative',
   116|      overflow: 'hidden',
   117|      cursor: onClick ? 'pointer' : 'default',
   118|      transition: 'all 0.15s',
   119|      ...style,
   120|    }}
   121|    onMouseEnter={e => {
   122|      if (onClick) { e.currentTarget.style.background = T.cardBgHover; e.currentTarget.style.borderColor = T.cardBorderLight }
   123|    }}
   124|    onMouseLeave={e => {
   125|      if (onClick) { e.currentTarget.style.background = T.cardBg; e.currentTarget.style.borderColor = T.cardBorder }
   126|    }}>
   127|      {accent && (
   128|        <div style={{
   129|          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
   130|          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.6,
   131|        }} />
   132|      )}
   133|      {children}
   134|    </div>
   135|  )
   136|}
   137|
   138|// ─── Tabs ────────────────────────────────────────────────────
   139|function TabButton({ label, active, onClick, badge }) {
   140|  return (
   141|    <button onClick={onClick} style={{
   142|      padding: '11px 16px', background: 'transparent', border: 'none',
   143|      cursor: 'pointer', fontSize: 13, fontWeight: 600,
   144|      color: active ? T.text : T.textMuted,
   145|      borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
   146|      transition: 'all 0.15s',
   147|      display: 'inline-flex', alignItems: 'center', gap: 6,
   148|    }}
   149|    onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.text }}
   150|    onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.textMuted }}
   151|    >
   152|      {label}
   153|      {badge != null && (
   154|        <span style={{
   155|          fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 6,
   156|          background: T.arkBg, color: T.ark,
   157|        }}>{badge}</span>
   158|      )}
   159|    </button>
   160|  )
   161|}
   162|
   163|// ─── Vue 360° ────────────────────────────────────────────────
   164|function Vue360Tab({ client, contracts, devis, docs, tasks, history, navigate }) {
   165|  const st = STATUS[client.statut] || STATUS.actif
   166|  return (
   167|    <motion.div
   168|      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
   169|      transition={{ duration: 0.2 }}
   170|      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}
   171|    >
   172|      {/* Identité */}
   173|      <Card padding={16} accent={T.accent}>
   174|        <SectionTitle icon={User} title="Informations" iconColor={T.accent} />
   175|        <InfoRow icon={Mail}     label="Email"           value={client.email} />
   176|        <InfoRow icon={Phone}    label="Téléphone"       value={client.telephone} />
   177|        <InfoRow icon={MapPin}   label="Ville"           value={client.city} />
   178|        <InfoRow icon={FileText} label="SIRET"           value={client.siret} />
   179|        <InfoRow icon={Calendar} label="Client depuis"   value={new Date(client.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} />
   180|        <InfoRow icon={Clock}    label="Dernier contact" value={`il y a ${daysAgo(client.last_contact)} jours`} last />
   181|      </Card>
   182|
   183|      {/* Contrats actifs */}
   184|      <Card padding={16} accent={T.blue}>
   185|        <SectionTitle
   186|          icon={Shield} title={`Contrats actifs (${contracts.length})`}
   187|          iconColor={T.blue}
   188|          cta="Tous" onCta={() => navigate('/contrats')}
   189|        />
   190|        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
   191|          {contracts.map(c => (
   192|            <div key={c.id} style={{
   193|              padding: '10px 12px', borderRadius: 9,
   194|              background: 'rgba(255,255,255,0.02)',
   195|              border: `1px solid ${T.cardBorder}`,
   196|              borderLeft: `2px solid ${c.alert ? T.warning : T.success}`,
   197|            }}>
   198|              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
   199|                <div>
   200|                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.type}</div>
   201|                  <div style={{ fontSize: 10, color: T.textMuted }}>{c.compagnie}</div>
   202|                </div>
   203|                <div style={{ textAlign: 'right' }}>
   204|                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmtEur(c.prime)}</div>
   205|                  <div style={{ fontSize: 10, color: c.alert ? T.warning : T.textMuted, fontWeight: 600 }}>
   206|                    {c.alert ? `J-${c.jours}` : c.echeance}
   207|                  </div>
   208|                </div>
   209|              </div>
   210|            </div>
   211|          ))}
   212|        </div>
   213|      </Card>
   214|
   215|      {/* Devis en cours */}
   216|      <Card padding={16} accent={T.warning}>
   217|        <SectionTitle icon={FileSignature} title={`Devis (${devis.length})`} iconColor={T.warning} />
   218|        {devis.length === 0 ? (
   219|          <div style={{ fontSize: 12, color: T.textMuted, padding: '10px 0' }}>Aucun devis en cours.</div>
   220|        ) : (
   221|          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
   222|            {devis.map(d => (
   223|              <div key={d.id} style={{
   224|                padding: '10px 12px', borderRadius: 9,
   225|                background: 'rgba(255,255,255,0.02)',
   226|                border: `1px solid ${T.cardBorder}`,
   227|              }}>
   228|                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
   229|                  <div>
   230|                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Devis {d.ref}</div>
   231|                    <div style={{ fontSize: 10, color: T.textMuted }}>{d.produit} • envoyé le {d.envoye}</div>
   232|                  </div>
   233|                  <div style={{ textAlign: 'right' }}>
   234|                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{fmtEur(d.montant)}</div>
   235|                    <span style={{
   236|                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
   237|                      background: d.statut === 'signe' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
   238|                      color: d.statut === 'signe' ? T.success : T.warning,
   239|                    }}>{d.statut === 'signe' ? 'Signé' : 'En attente'}</span>
   240|                  </div>
   241|                </div>
   242|              </div>
   243|            ))}
   244|          </div>
   245|        )}
   246|      </Card>
   247|
   248|      {/* Tâches + Relances */}
   249|      <Card padding={16} accent={T.danger}>
   250|        <SectionTitle icon={Bell} title="Actions à venir" iconColor={T.danger} />
   251|        <div style={{ marginBottom: 12 }}>
   252|          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
   253|            Tâches ({tasks.length})
   254|          </div>
   255|          {tasks.map(t => (
   256|            <div key={t.id} style={{
   257|              display: 'flex', alignItems: 'center', gap: 8,
   258|              padding: '7px 0', borderTop: `1px solid ${T.cardBorder}`,
   259|            }}>
   260|              <span style={{
   261|                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
   262|                background: t.priority === 'haute' ? T.danger : T.warning,
   263|              }} />
   264|              <span style={{ flex: 1, fontSize: 12, color: T.text }}>{t.label}</span>
   265|              <span style={{ fontSize: 10, color: T.textMuted }}>{t.due}</span>
   266|            </div>
   267|          ))}
   268|        </div>
   269|        <div>
   270|          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
   271|            Relances ({DEMO_RELANCES.length})
   272|          </div>
   273|          {DEMO_RELANCES.map(r => (
   274|            <div key={r.id} style={{
   275|              display: 'flex', alignItems: 'center', gap: 8,
   276|              padding: '7px 0', borderTop: `1px solid ${T.cardBorder}`,
   277|            }}>
   278|              <AlertTriangle size={11} color={T.danger} />
   279|              <span style={{ flex: 1, fontSize: 12, color: T.text }}>{r.motif}</span>
   280|              <span style={{ fontSize: 10, color: T.danger, fontWeight: 600 }}>{r.since}</span>
   281|            </div>
   282|          ))}
   283|        </div>
   284|      </Card>
   285|
   286|      {/* Documents */}
   287|      <Card padding={16} accent={T.cyan}>
   288|        <SectionTitle icon={FolderOpen} title={`Documents (${docs.length})`} iconColor={T.cyan} />
   289|        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
   290|          {docs.map((d, i) => (
   291|            <div key={d.id} style={{
   292|              display: 'flex', alignItems: 'center', gap: 8,
   293|              padding: '8px 0',
   294|              borderBottom: i < docs.length - 1 ? `1px solid ${T.cardBorder}` : 'none',
   295|            }}>
   296|              <FileText size={12} color={T.textMuted} />
   297|              <span style={{ flex: 1, fontSize: 12, color: T.text }}>{d.name}</span>
   298|              <span style={{ fontSize: 10, color: T.textMuted }}>{d.when}</span>
   299|            </div>
   300|          ))}
   301|        </div>
   302|      </Card>
   303|
   304|      {/* Activité récente */}
   305|      <Card padding={16} accent={T.ark}>
   306|        <SectionTitle icon={Activity} title="Activité récente" iconColor={T.ark} />
   307|        <div>
   308|          {history.slice(0, 5).map((e, i) => (
   309|            <div key={e.id} style={{
   310|              display: 'flex', alignItems: 'flex-start', gap: 10,
   311|              padding: '8px 0',
   312|              borderBottom: i < 4 ? `1px solid ${T.cardBorder}` : 'none',
   313|            }}>
   314|              <div style={{
   315|                width: 22, height: 22, borderRadius: '50%',
   316|                background: `${e.color}15`, border: `1px solid ${e.color}30`,
   317|                display: 'flex', alignItems: 'center', justifyContent: 'center',
   318|                flexShrink: 0, marginTop: 2,
   319|              }}>
   320|                <e.icon size={10} color={e.color} />
   321|              </div>
   322|              <div style={{ flex: 1, minWidth: 0 }}>
   323|                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.3 }}>{e.label}</div>
   324|                <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{e.date}</div>
   325|              </div>
   326|            </div>
   327|          ))}
   328|        </div>
   329|      </Card>
   330|    </motion.div>
   331|  )
   332|}
   333|
   334|function SectionTitle({ icon: Icon, title, iconColor, cta, onCta }) {
   335|  return (
   336|    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
   337|      <Icon size={14} color={iconColor || T.accent} />
   338|      <h3 style={{ fontSize: 12, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
   339|      {cta && (
   340|        <button onClick={onCta} style={{
   341|          marginLeft: 'auto', background: 'transparent', border: 'none',
   342|          color: T.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
   343|          display: 'inline-flex', alignItems: 'center', gap: 3,
   344|        }}>{cta} <ChevronRight size={10} /></button>
   345|      )}
   346|    </div>
   347|  )
   348|}
   349|
   350|function InfoRow({ icon: Icon, label, value, last }) {
   351|  return (
   352|    <div style={{
   353|      display: 'flex', alignItems: 'center', gap: 10,
   354|      padding: '8px 0',
   355|      borderBottom: last ? 'none' : `1px solid ${T.cardBorder}`,
   356|    }}>
   357|      <Icon size={12} color={T.textMuted} />
   358|      <div style={{ fontSize: 11, color: T.textMuted, flex: 1 }}>{label}</div>
   359|      <div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{value || '—'}</div>
   360|    </div>
   361|  )
   362|}
   363|
   364|// ─── Onglet Dossier Prêt à Tarifer ───────────────────────────
   365|function DossierTab({ clientId, apiUrl, token, onCreerDossier, navigate }) {
   366|  const [dossier, setDossier] = useState(null)
   367|  const [loading, setLoading] = useState(true)
   368|  const [error, setError] = useState(null)
   369|  const [creating, setCreating] = useState(false)
   370|
   371|  useEffect(() => {
   372|    let cancelled = false
   373|    async function load() {
   374|      setLoading(true)
   375|      setError(null)
   376|      try {
   377|        const res = await fetch(`${apiUrl}/clients/${clientId}/dossier`, {
   378|          headers: { 'Authorization': `Bearer ${token}` }
   379|        })
   380|        const data = await res.json()
   381|        if (!cancelled) {
   382|          if (data.success) setDossier(data.dossier)
   383|          else setError(data.error || 'Erreur inconnue')
   384|        }
   385|      } catch (e) {
   386|        if (!cancelled) setError(e.message)
   387|      }
   388|      if (!cancelled) setLoading(false)
   389|    }
   390|    load()
   391|    return () => { cancelled = true }
   392|  }, [clientId, apiUrl, token])
   393|
   394|  // ── Loading ──
   395|  if (loading) {
   396|    return (
   397|      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   398|        style={{ padding: 40, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
   399|        <Sparkles size={24} color={T.ark} style={{ marginBottom: 12 }} />
   400|        <div>Analyse du dossier en cours...</div>
   401|      </motion.div>
   402|    )
   403|  }
   404|
   405|  // ── Error ──
   406|  if (error) {
   407|    return (
   408|      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   409|        style={{ padding: 30, textAlign: 'center', color: T.danger }}>
   410|        <AlertTriangle size={20} style={{ marginBottom: 8 }} />
   411|        <div style={{ fontSize: 13 }}>Impossible de charger le dossier</div>
   412|        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{error}</div>
   413|        <button onClick={() => window.location.reload()} style={{
   414|          marginTop: 12, padding: '6px 14px', borderRadius: 6,
   415|          background: T.cardBgHover, color: T.text, border: `1px solid ${T.cardBorder}`,
   416|          cursor: 'pointer', fontSize: 11,
   417|        }}>Réessayer</button>
   418|      </motion.div>
   419|    )
   420|  }
   421|
   422|  const score = dossier?.completion_rate || 0
   423|  const scoreColor = score >= 80 ? T.success : score >= 50 ? T.warning : T.danger
   424|
   425|  return (
   426|    <motion.div
   427|      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
   428|      transition={{ duration: 0.2 }}
   429|      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}
   430|    >
   431|      {/* Score complétude */}
   432|      <Card padding={20} accent={score >= 80 ? T.success : T.ark} style={{
   433|        background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(91,77,245,0.03))'
   434|      }}>
   435|        <SectionTitle icon={PackageCheck} title="Score Complétude" iconColor={T.ark} />
   436|        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8 }}>
   437|          <div style={{
   438|            width: 80, height: 80, borderRadius: '50%',
   439|            background: `conic-gradient(${scoreColor} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
   440|            display: 'flex', alignItems: 'center', justifyContent: 'center',
   441|            position: 'relative',
   442|          }}>
   443|            <div style={{
   444|              width: 64, height: 64, borderRadius: '50%',
   445|              background: 'rgba(5,5,16,0.95)',
   446|              display: 'flex', alignItems: 'center', justifyContent: 'center',
   447|            }}>
   448|              <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor }}>{score}%</span>
   449|            </div>
   450|          </div>
   451|          <div style={{ flex: 1 }}>
   452|            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>
   453|              {score >= 80 ? 'Dossier prêt' : score >= 50 ? 'En bonne voie' : 'À compléter'}
   454|            </div>
   455|            <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>
   456|              {dossier?.pieces_manquantes?.length || 0} document{dossier?.pieces_manquantes?.length !== 1 ? 's' : ''} manquant{dossier?.pieces_manquantes?.length !== 1 ? 's' : ''}
   457|            </div>
   458|          </div>
   459|        </div>
   460|
   461|        {/* Pièces manquantes */}
   462|        {dossier?.pieces_manquantes?.length > 0 && (
   463|          <div style={{ marginTop: 16 }}>
   464|            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
   465|              Documents à fournir
   466|            </div>
   467|            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
   468|              {[...dossier.pieces_manquantes].slice(0, 4).map((p, idx) => (
   469|                <div key={idx} style={{
   470|                  display: 'flex', alignItems: 'center', gap: 8,
   471|                  padding: '6px 10px', borderRadius: 6,
   472|                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
   473|                }}>
   474|                  <FileText size={11} color={T.warning} />
   475|                  <span style={{ fontSize: 11, color: T.text }}>{typeof p === 'string' ? p : p.label || p}</span>
   476|                </div>
   477|              ))}
   478|            </div>
   479|          </div>
   480|        )}
   481|      </Card>
   482|
   483|      {/* Risques & Alertes */}
   484|      <Card padding={16} accent={T.danger}>
   485|        <SectionTitle icon={Scale} title="Risques & Alertes" iconColor={T.danger} />
   486|        {dossier?.risques?.length > 0 ? (
   487|          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
   488|            {dossier.risques.map((r, i) => (
   489|              <div key={i} style={{
   490|                display: 'flex', alignItems: 'center', gap: 8,
   491|                padding: '8px 10px', borderRadius: 6,
   492|                background: r.severity === 'high' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.06)',
   493|                border: `1px solid ${r.severity === 'high' ? 'rgba(239,68,68,0.20)' : 'rgba(245,158,11,0.15)'}`,
   494|              }}>
   495|                <AlertTriangle size={11} color={r.severity === 'high' ? T.danger : T.warning} />
   496|                <span style={{ fontSize: 11, color: T.text, lineHeight: 1.4 }}>{typeof r === 'string' ? r : r.label || r}</span>
   497|              </div>
   498|            ))}
   499|          </div>
   500|        ) : (
   501|          <div style={{ fontSize: 12, color: T.textMuted, padding: '12px 0' }}>
   502|            <CheckCircle size={14} color={T.success} style={{ display: 'inline', marginRight: 6 }} />
   503|            Aucun risque détecté
   504|          </div>
   505|        )}
   506|      </Card>
   507|
   508|      {/* Partenaires recommandés */}
   509|      <Card padding={16} accent={T.blue}>
   510|        <SectionTitle icon={Briefcase} title="Partenaires Recommandés" iconColor={T.blue} />
   511|        {dossier?.partenaires?.length > 0 ? (
   512|          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
   513|            {dossier.partenaires.map((p, i) => (
   514|              <div key={i} style={{
   515|                display: 'flex', alignItems: 'center', gap: 10,
   516|                padding: '8px 10px', borderRadius: 6,
   517|                background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
   518|              }}>
   519|                <div style={{
   520|                  width: 28, height: 28, borderRadius: 6,
   521|                  background: 'rgba(59,130,246,0.15)',
   522|                  display: 'flex', alignItems: 'center', justifyContent: 'center',
   523|                }}>
   524|                  <FolderSearch size={13} color={T.blue} />
   525|                </div>
   526|                <div style={{ flex: 1 }}>
   527|                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>
   528|                    {typeof p === 'string' ? p : p.nom || p.label || ''}
   529|                  </div>
   530|                  <div style={{ fontSize: 10, color: T.textMuted }}>
   531|                    {typeof p === 'object' ? p.type || p.access_type || '' : ''}
   532|                  </div>
   533|                </div>
   534|                <button onClick={() => navigate('/partenaires')} style={{
   535|                  padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600,
   536|                  background: 'rgba(59,130,246,0.12)', color: T.blue, border: 'none', cursor: 'pointer',
   537|                }}>Détails</button>
   538|              </div>
   539|            ))}
   540|          </div>
   541|        ) : (
   542|          <div style={{ fontSize: 12, color: T.textMuted, padding: '12px 0' }}>
   543|            Aucun partenaire recommandé
   544|          </div>
   545|        )}
   546|      </Card>
   547|
   548|      {/* Actions */}
   549|      <Card padding={16} accent={T.success} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
   550|        <SectionTitle icon={Target} title="Actions" iconColor={T.success} />
   551|        <button onClick={async () => {
   552|          setCreating(true)
   553|          await onCreerDossier()
   554|          setCreating(false)
   555|        }} disabled={creating} style={{
   556|          padding: '12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
   557|          background: creating ? 'rgba(34,197,94,0.15)' : T.success,
   558|          color: creating ? T.success : '#fff',
   559|          border: 'none', cursor: creating ? 'default' : 'pointer',
   560|          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
   561|          transition: 'all 0.2s',
   562|        }}>
   563|          <PackageCheck size={15} />
   564|          {creating ? 'Création...' : 'Créer un dossier de tarification'}
   565|        </button>
   566|        <button onClick={() => navigate(`/comparateur?client_id=${clientId}`)} style={{
   567|          padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
   568|          background: T.cardBgHover, color: T.text, border: `1px solid ${T.cardBorderLight}`,
   569|          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
   570|        }}>
   571|          <Scale size={13} /> Comparateur ARK
   572|        </button>
   573|        <button onClick={() => navigate('/partenaires')} style={{
   574|          padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
   575|          background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
   576|          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
   577|        }}>
   578|          <FolderSearch size={13} /> Gérer les accès partenaires
   579|        </button>
   580|      </Card>
   581|    </motion.div>
   582|  )
   583|}
   584|
   585|// ─── Onglet Activité (timeline complète) ────────────────────
   586|function ActiviteTab({ history }) {
   587|  return (
   588|    <motion.div
   589|      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
   590|      transition={{ duration: 0.2 }}
   591|      style={{ position: 'relative', maxWidth: 700 }}
   592|    >
   593|      {history.map((event, i) => (
   594|        <div key={event.id} style={{
   595|          position: 'relative', display: 'flex', gap: 14,
   596|          paddingBottom: i < history.length - 1 ? 20 : 0,
   597|        }}>
   598|          {i < history.length - 1 && (
   599|            <div style={{
   600|              position: 'absolute', left: 14, top: 32,
   601|              width: 2, bottom: 0, background: 'rgba(255,255,255,0.06)',
   602|            }} />
   603|          )}
   604|          <div style={{
   605|            flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
   606|            background: `${event.color}20`, border: `2px solid ${event.color}40`,
   607|            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
   608|          }}>
   609|            <event.icon size={13} color={event.color} />
   610|          </div>
   611|          <div style={{ paddingTop: 4 }}>
   612|            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{event.label}</div>
   613|            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{event.date}</div>
   614|          </div>
   615|        </div>
   616|      ))}
   617|    </motion.div>
   618|  )
   619|}
   620|
   621|// ─── MAIN ───────────────────────────────────────────────────
   622|export default function ClientDetail() {
   623|  const { id } = useParams()
   624|  const navigate = useNavigate()
   625|  const [tab, setTab] = useState('vue360')
   626|
   627|  const client = useMemo(() => DEMO_CLIENT, [id])
   628|  const status = STATUS[client.statut] || STATUS.actif
   629|  const totalPrime = DEMO_CONTRACTS.reduce((s, c) => s + c.prime, 0)
   630|  const API_BASE = import.meta.env.VITE_API_URL || '/api'
   631|  const token = localStorage.getItem('courtia_token') || ''
   632|
   633|  const handleCreerDossier = async () => {
   634|    try {
   635|      const res = await fetch(`${API_BASE}/comparator/quote-request`, {
   636|        method: 'POST',
   637|        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
   638|        body: JSON.stringify({
   639|          client_id: parseInt(id),
   640|          product_type: 'Auto',
   641|          normalized_data: { source: 'dossier_completion' }
   642|        })
   643|      })
   644|      const data = await res.json()
   645|      if (data.success) {
   646|        navigate(`/comparateur?client_id=${clientId}`)
   647|      } else {
   648|        alert('Erreur : ' + (data.error || 'Inconnue'))
   649|      }
   650|    } catch (e) {
   651|      alert('Erreur réseau : ' + e.message)
   652|    }
   653|  }
   654|
   655|  return (
   656|    <div style={{ minHeight: '100vh', color: T.text, padding: '20px 24px 48px' }}>
   657|      <VibeBackdrop intensity={0.7} />
   658|      <Particles count={35} />
   659|      <ScrollGlow />
   660|      <div style={{
   661|        position: 'fixed', width: 500, height: 500, borderRadius: '50%',
   662|        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
   663|        top: -150, right: -100, pointerEvents: 'none', zIndex: 0,
   664|      }} />
   665|
   666|      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>
   667|
   668|        {/* Retour */}
   669|        <button onClick={() => navigate('/clients')} style={{
   670|          display: 'inline-flex', alignItems: 'center', gap: 6,
   671|          padding: '6px 12px', borderRadius: 8,
   672|          background: 'rgba(255,255,255,0.04)',
   673|          border: `1px solid ${T.cardBorder}`,
   674|          color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
   675|          marginBottom: 18,
   676|        }}>
   677|          <ArrowLeft size={13} /> Clients
   678|        </button>
   679|
   680|        {/* HEADER 360° */}
   681|        <header style={{
   682|          display: 'flex', alignItems: 'center', gap: 16,
   683|          marginBottom: 20, flexWrap: 'wrap',
   684|        }}>
   685|          <div style={{
   686|            width: 64, height: 64, borderRadius: '50%',
   687|            background: `linear-gradient(135deg, ${T.ark}, ${T.accent})`,
   688|            border: `1px solid rgba(139,92,246,0.3)`,
   689|            display: 'flex', alignItems: 'center', justifyContent: 'center',
   690|            fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0,
   691|            boxShadow: '0 8px 32px rgba(139,92,246,0.3), inset 0 1px 2px rgba(255,255,255,0.2)',
   692|            position: 'relative',
   693|          }}>
   694|            {getInitials(client)}
   695|            <div style={{
   696|              position: 'absolute', top: 8, left: 16,
   697|              width: 14, height: 8, borderRadius: '50%',
   698|              background: 'rgba(255,255,255,0.35)', filter: 'blur(2px)',
   699|            }} />
   700|          </div>
   701|
   702|          <div style={{ flex: 1, minWidth: 0 }}>
   703|            <h1 style={{
   704|              fontFamily: "'Plus Jakarta Sans', sans-serif",
   705|              fontWeight: 700, fontSize: 28, letterSpacing: '-0.025em',
   706|              color: T.text, margin: 0, lineHeight: 1.2,
   707|            }}>{client.prenom} {client.nom}</h1>
   708|            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
   709|              <span style={{
   710|                padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
   711|                background: `${status.color}15`, color: status.color,
   712|              }}>{status.label}</span>
   713|              <span style={{
   714|                padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
   715|                background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
   716|                display: 'inline-flex', alignItems: 'center', gap: 3,
   717|              }}><Heart size={10} /> Score {client.score}%</span>
   718|              <span style={{
   719|                padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
   720|                background: 'rgba(59,130,246,0.10)', color: T.blue,
   721|              }}>{DEMO_CONTRACTS.length} contrats • {fmtEur(totalPrime)}/an</span>
   722|              <span style={{ fontSize: 12, color: T.textMuted }}>{client.type} • {client.city}</span>
   723|            </div>
   724|          </div>
   725|
   726|          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
   727|            <button onClick={() => navigate(`/devis/new?client=${client.id}`)} style={btnPrimary}>
   728|              <Plus size={13} /> Nouveau devis
   729|            </button>
   730|            <button onClick={() => navigate('/taches')} style={btnGhost}>
   731|              <CheckCircle size={13} /> Ajouter tâche
   732|            </button>
   733|            <button onClick={() => window.location.href = `mailto:${client.email}`} style={btnGhost}>
   734|              <Send size={13} /> Contacter
   735|            </button>
   736|          </div>
   737|        </header>
   738|
   739|        {/* ARK Insight banner */}
   740|        <div style={{
   741|          marginBottom: 18,
   742|          padding: 16,
   743|          borderRadius: 12,
   744|          background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(91,77,245,0.04))',
   745|          border: `1px solid rgba(139,92,246,0.20)`,
   746|          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
   747|        }}>
   748|          <div style={{
   749|            width: 40, height: 40, borderRadius: 10,
   750|            background: T.arkBg, border: `1px solid ${T.arkBorder}`,
   751|            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
   752|          }}>
   753|            <Sparkles size={18} color={T.ark} />
   754|          </div>
   755|          <div style={{ flex: 1, minWidth: 240 }}>
   756|            <div style={{
   757|              fontSize: 10, fontWeight: 700, color: T.ark,
   758|              textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 4,
   759|            }}>ARK Insight</div>
   760|            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>
   761|              Renouvellement RC Pro J-21. Préparer comparatif Aurora / Novalia. Opportunité PJ détectée (potentiel 1 200€).
   762|            </div>
   763|          </div>
   764|          <div style={{ display: 'flex', gap: 8 }}>
   765|            <button onClick={() => navigate(`/comparateur?client_id=${clientId}`)} style={{
   766|              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
   767|              background: T.arkBg, color: T.ark, border: `1px solid ${T.arkBorder}`,
   768|              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
   769|            }}>
   770|              <Target size={12} /> Comparer
   771|            </button>
   772|            <button onClick={() => navigate(`/devis/new?client=${client.id}`)} style={{
   773|              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
   774|              background: T.ark, color: '#fff', border: 'none',
   775|              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
   776|            }}>
   777|              <Zap size={12} /> Créer devis PJ
   778|            </button>
   779|          </div>
   780|        </div>
   781|
   782|        {/* TABS */}
   783|        <div style={{
   784|          display: 'flex', gap: 0, borderBottom: `1px solid ${T.cardBorder}`,
   785|          marginBottom: 18, overflowX: 'auto',
   786|        }}>
   787|          <TabButton label="Vue 360°"  active={tab === 'vue360'}    onClick={() => setTab('vue360')} />
   788|          <TabButton label="Contrats"  active={tab === 'contrats'}  onClick={() => setTab('contrats')}  badge={DEMO_CONTRACTS.length} />
   789|          <TabButton label="Devis"     active={tab === 'devis'}     onClick={() => setTab('devis')}     badge={DEMO_DEVIS.length} />
   790|          <TabButton label="Dossier"   active={tab === 'dossier'}   onClick={() => setTab('dossier')} />
   791|          <TabButton label="Documents" active={tab === 'documents'} onClick={() => setTab('documents')} badge={DEMO_DOCS.length} />
   792|          <TabButton label="Activité"  active={tab === 'activite'}  onClick={() => setTab('activite')} />
   793|          <TabButton label="ARK"       active={tab === 'ark'}       onClick={() => setTab('ark')} />
   794|          <TabButton label="Relances" active={tab === 'relances'}  onClick={() => setTab('relances')} />
   795|        </div>
   796|
   797|        {/* TAB CONTENT */}
   798|        <AnimatePresence mode="wait">
   799|          {tab === 'vue360' && (
   800|            <Vue360Tab key="vue360" client={client}
   801|              contracts={DEMO_CONTRACTS} devis={DEMO_DEVIS}
   802|              docs={DEMO_DOCS} tasks={DEMO_TASKS} history={DEMO_HISTORY}
   803|              navigate={navigate}
   804|            />
   805|          )}
   806|          {tab === 'contrats' && (
   807|            <motion.div key="ct" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
   808|              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
   809|                {DEMO_CONTRACTS.map(c => (
   810|                  <Card key={c.id} padding={14} onClick={() => navigate('/contrats')}>
   811|                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
   812|                      <div>
   813|                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.type}</div>
   814|                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{c.compagnie} • Échéance {c.echeance}</div>
   815|                      </div>
   816|                      <div style={{ textAlign: 'right' }}>
   817|                        <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{fmtEur(c.prime)}</div>
   818|                        <div style={{ fontSize: 11, color: c.alert ? T.warning : T.success, fontWeight: 600 }}>
   819|                          {c.alert ? `Renouv. J-${c.jours}` : `Actif`}
   820|                        </div>
   821|                      </div>
   822|                    </div>
   823|                  </Card>
   824|                ))}
   825|              </div>
   826|            </motion.div>
   827|          )}
   828|          {tab === 'devis' && (
   829|            <motion.div key="dv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
   830|              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
   831|                {DEMO_DEVIS.map(d => (
   832|                  <Card key={d.id} padding={14}>
   833|                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
   834|                      <div>
   835|                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Devis {d.ref} — {d.produit}</div>
   836|                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Envoyé le {d.envoye}</div>
   837|                      </div>
   838|                      <div style={{ textAlign: 'right' }}>
   839|                        <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{fmtEur(d.montant)}</div>
   840|                        <span style={{
   841|                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
   842|                          background: d.statut === 'signe' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
   843|                          color: d.statut === 'signe' ? T.success : T.warning,
   844|                        }}>{d.statut === 'signe' ? 'Signé' : 'En attente'}</span>
   845|                      </div>
   846|                    </div>
   847|                  </Card>
   848|                ))}
   849|              </div>
   850|            </motion.div>
   851|          )}
   852|          {tab === 'dossier' && (
   853|            <DossierTab
   854|              key="dossier"
   855|              clientId={id}
   856|              apiUrl={API_BASE}
   857|              token={token}
   858|              navigate={navigate}
   859|              onCreerDossier={handleCreerDossier}
   860|            />
   861|          )}
   862|          {tab === 'documents' && (
   863|            <motion.div key="dc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
   864|              <DocumentIntelligence
   865|                clientId={id}
   866|                apiBase="/api/killer"
   867|                authToken={localStorage.getItem('courtia_token')}
   868|              />
   869|            </motion.div>
   870|          )}
   871|          {tab === 'activite' && <ActiviteTab key="act" history={DEMO_HISTORY} />}
   872|          {tab === 'ark' && (
   873|            <motion.div key="ark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
   874|              <Card padding={20} accent={T.ark} style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(91,77,245,0.03))' }}>
   875|                <SectionTitle icon={Sparkles} title="Recommandations ARK" iconColor={T.ark} />
   876|                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>
   877|                  <p><strong style={{ color: T.text }}>🎯 Cross-sell PJ</strong> — Profil idéal pour Protection Juridique. Potentiel <strong style={{ color: T.success }}>1 200€/an</strong>.</p>
   878|                  <p><strong style={{ color: T.text }}>⚠️ Renouvellement RC Pro J-21</strong> — Préparer comparatif Aurora / Novalia. La prime actuelle (2 800€) est <strong style={{ color: T.warning }}>au-dessus du marché</strong>.</p>
   879|                  <p><strong style={{ color: T.text }}>💡 Multi-équipement</strong> — 3 contrats, mais pas de Santé ni Prévoyance. Suggérer un bilan complet.</p>
   880|                </div>
   881|              </Card>
   882|            </motion.div>
   883|          )}
   884|          {tab === 'relances' && (
   885|            <motion.div key="rel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
   886|              <SmartRelances
   887|                clientId={id}
   888|                apiBase="/api/killer"
   889|                authToken={localStorage.getItem('courtia_token')}
   890|              />
   891|            </motion.div>
   892|          )}
   893|        </AnimatePresence>
   894|      </main>
   895|    </div>
   896|  )
   897|}
   898|
   899|const btnPrimary = {
   900|  padding: '9px 14px', background: T.accent, color: '#fff', border: 'none',
   901|  borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600,
   902|  display: 'inline-flex', alignItems: 'center', gap: 6,
   903|  boxShadow: '0 4px 14px rgba(91,77,245,0.25)',
   904|}
   905|
   906|const btnGhost = {
   907|  padding: '9px 14px', background: 'rgba(255,255,255,0.04)', color: T.text,
   908|  border: `1px solid ${T.cardBorderLight}`, borderRadius: 9, cursor: 'pointer',
   909|  fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
   910|}
   911|