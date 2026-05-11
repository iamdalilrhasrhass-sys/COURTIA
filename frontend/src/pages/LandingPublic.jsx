import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useInView, animate } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Check, Brain, Eye, Mic, Menu, X,
  LayoutDashboard, FileSearch, PenTool, Receipt,
  ChevronDown, ShieldCheck, Sparkles
} from 'lucide-react'
import { applySeo } from '../lib/seo'
import {
  CosmosBackground,
  BubbleC,
  BubbleCMini,
  BubbleCMedium,
  BubbleCHero,
  Kicker,
  Headline,
  Tagline,
  Wordmark,
} from '../design'

/* ============================================================
   COURTIA · LA BULLE — Landing Public
   Refonte complète : Cosmos + BubbleC + Typographie signature.
   ============================================================ */

const arkPowers = [
  { icon: Eye,         title: 'ARK Watch',      subtitle: 'Surveillance proactive',   desc: 'Loi Hamon, Chatel, échéances critiques : ARK veille sur votre portefeuille 24/7 et déclenche les bons signaux au bon moment.', accent: '#80f0d8' },
  { icon: Mic,         title: 'Voice Intake',   subtitle: 'Appel → Fiche en 30s',     desc: 'Parlez. Raccrochez. La fiche client est créée, structurée, classée. ARK extrait les actions critiques sans une ligne tapée.', accent: '#a142f4' },
  { icon: FileSearch,  title: 'Doc Vision',     subtitle: 'OCR métier auto',          desc: 'Glissez un contrat PDF. ARK lit, comprend, range : garanties, exclusions, montants, échéances, IBAN — tout structuré.', accent: '#ff80e0' },
  { icon: PenTool,     title: 'ARK Compose',    subtitle: 'Docs légaux auto',         desc: 'DDA, IPID, devoir de conseil, lettre de résiliation : ARK rédige le bon document, au bon ton, à la bonne signature.', accent: '#fff080' },
  { icon: Receipt,     title: 'Quote Intel',    subtitle: 'Dispatch multi-compagnies', desc: 'Aurora, Novalia, Helios, Serenis : ARK envoie, compare, scoring, et vous recommande la meilleure offre pour le client.', accent: '#4285f4' },
]

const whyCourtia = [
  { title: "Un cockpit, pas un CRM.",          desc: "Construit avec et pour des courtiers. Chaque pixel répond à un geste terrain. Aucune sur-couche inutile, aucune fonction décorative." },
  { title: "ARK, votre compagnon IA.",         desc: "Une IA qui sait lire un contrat, écouter un appel, rédiger un courrier conforme et anticiper une résiliation. Pas un chatbot. Un coéquipier." },
  { title: "Conformité ORIAS native.",         desc: "DDA, IPID, devoir de conseil, archivage signé : la conformité n'est plus une corvée, c'est un automatisme silencieux." },
]

const beforeAfter = [
  { before: 'Excel + Post-it + mémoire',           after: "Tout centralisé, rien n'échappe" },
  { before: 'Relances oubliées, clients perdus',    after: 'Alertes proactives, opportunités saisies' },
  { before: 'Conformité fastidieuse',               after: 'Documents générés en 1 clic' },
  { before: 'Données dispersées',                   after: 'Vision 360° de chaque client' },
]

const pricingPlans = [
  { name: 'Starter',  price: '89',        period: '/mois HT', desc: 'Le courtier indépendant.',                features: ["Jusqu'à 200 clients", 'Cockpit ARK', 'ARK Watch (alertes)', 'Conformité ORIAS', 'Support email'], cta: 'Commencer', popular: false },
  { name: 'Pro',      price: '159',       period: '/mois HT', desc: 'Le courtier ambitieux.',                  features: ['Clients illimités', 'Tous les modules ARK', 'Voice Intake + Doc Vision', 'Multi-utilisateurs (3)', 'Intégrations avancées', 'Support prioritaire'], cta: 'Essai gratuit 7 jours', popular: true },
  { name: 'Cabinet',  price: 'Sur devis', period: '',         desc: 'Le cabinet structuré.',                   features: ['Utilisateurs illimités', 'Toutes fonctionnalités Pro', 'API & webhooks', 'SSO / SAML', 'Onboarding dédié', 'Account manager'], cta: 'Nous contacter', popular: false },
]

const stats = [
  { value: 124, suffix: '',     label: 'courtiers à bord' },
  { value: 3,   suffix: 'h',    label: 'gagnées par semaine' },
  { value: 98,  suffix: '%',    label: 'de satisfaction' },
]

/* ----------- helpers ----------- */

function CTAButton({ to, children, primary = false, ...rest }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 28px',
        borderRadius: 14,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 500,
        fontSize: 15,
        letterSpacing: '0.02em',
        textDecoration: 'none',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s cubic-bezier(.2,.8,.2,1)',
        background: primary
          ? 'linear-gradient(90deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%)'
          : 'rgba(255,255,255,0.04)',
        color: primary ? '#ffffff' : 'rgba(255,255,255,0.85)',
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.15)',
        boxShadow: primary ? '0 12px 40px rgba(161,66,244,0.35)' : 'none',
        backdropFilter: primary ? 'none' : 'blur(8px)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
      {...rest}
    >
      {children}
    </Link>
  )
}

function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.6, duration: 0.8 }}
      style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      <Kicker dot={false}>SCROLL</Kicker>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown size={20} color="rgba(255,255,255,0.4)" />
      </motion.div>
    </motion.div>
  )
}

/* Animated counter that fires when the section enters the viewport */
function AnimatedNumber({ value, suffix = '' }) {
  const ref = useRef(null)
  const [display, setDisplay] = useState(0)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v * 10) / 10),
    })
    return () => controls.stop()
  }, [inView, value])

  return (
    <span ref={ref}>
      {Number.isInteger(value) ? Math.round(display) : display}{suffix}
    </span>
  )
}

/* 3D card that rotates on scroll */
function Scroll3DCard({ children, index = 0 }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [25, 0, -10])
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0.4])
  const y = useTransform(scrollYProgress, [0, 1], [60, -40])
  const springRot = useSpring(rotateX, { stiffness: 80, damping: 20 })
  const springY = useSpring(y, { stiffness: 80, damping: 20 })
  return (
    <motion.div
      ref={ref}
      style={{
        rotateX: springRot,
        y: springY,
        opacity,
        transformPerspective: 1200,
        transformStyle: 'preserve-3d',
      }}
      transition={{ delay: index * 0.05 }}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPublic() {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    applySeo({
      title: 'COURTIA — Une bulle d’intelligence pour le courtier.',
      description: "COURTIA est le cockpit IA des courtiers. ARK Watch, Voice Intake, Doc Vision, ARK Compose et Quote Intel : une bulle d'intelligence pour celui qui protège.",
    })
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: '#020108',
        color: 'rgba(255,255,255,0.95)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {/* Fixed cosmos background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <CosmosBackground />
      </div>

      {/* ───────────────────────── NAV ───────────────────────── */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 28px',
          maxWidth: 1280,
          margin: '0 auto',
          position: 'relative',
          zIndex: 50,
        }}
      >
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <BubbleC size={36} animated={false} glow={false} />
          <Wordmark size={22} />
        </Link>

        <div className="lb-nav-links" style={{ display: 'none', alignItems: 'center', gap: 32 }}>
          <a href="#why"     style={navLinkStyle}>Pourquoi</a>
          <a href="#powers"  style={navLinkStyle}>ARK</a>
          <a href="#proof"   style={navLinkStyle}>Preuves</a>
          <a href="#pricing" style={navLinkStyle}>Tarifs</a>
        </div>

        <div className="lb-nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/login" style={{ ...navLinkStyle, padding: '8px 14px' }}>Connexion</Link>
          <CTAButton to="/register" primary>
            Essai 7 jours <ArrowRight size={16} />
          </CTAButton>
        </div>

        <button
          className="lb-nav-burger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{
              position: 'fixed',
              top: 72,
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'rgba(8,5,26,0.92)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <a href="#why"     onClick={() => setMenuOpen(false)} style={navLinkStyle}>Pourquoi</a>
            <a href="#powers"  onClick={() => setMenuOpen(false)} style={navLinkStyle}>ARK</a>
            <a href="#proof"   onClick={() => setMenuOpen(false)} style={navLinkStyle}>Preuves</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} style={navLinkStyle}>Tarifs</a>
            <CTAButton to="/register" primary>Essai 7 jours <ArrowRight size={16} /></CTAButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────── 1. HERO ─────────────────────── */}
      <section
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px 100px',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ marginBottom: 32 }}
        >
          <Kicker>Courtia · L'IA Compagnon des Courtiers</Kicker>
        </motion.div>

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 28 }}
        >
          <div className="lb-hero-bubble">
            <BubbleCHero />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          style={{ marginBottom: 14 }}
        >
          <Wordmark size={72} />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          style={{ maxWidth: 720, marginBottom: 40 }}
        >
          <Tagline size={22} align="center">
            Une bulle d'intelligence pour celui qui protège.
          </Tagline>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <CTAButton to="/register" primary>
            Essai gratuit 7 jours <ArrowRight size={16} />
          </CTAButton>
          <CTAButton to="/login">Voir le cockpit</CTAButton>
        </motion.div>

        <ScrollIndicator />
      </section>

      {/* ──────────── 2. POURQUOI COURTIA (scroll 3D) ──────────── */}
      <section
        id="why"
        style={{
          position: 'relative',
          padding: '120px 24px',
          zIndex: 1,
          background: 'linear-gradient(180deg, transparent 0%, #08051A 50%, transparent 100%)',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            style={{ textAlign: 'center', marginBottom: 72 }}
          >
            <Kicker>Pourquoi courtia ?</Kicker>
            <div style={{ height: 16 }} />
            <Headline size="lg" align="center">
              Trois certitudes. <br/>Aucun compromis.
            </Headline>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
            {whyCourtia.map((item, i) => (
              <Scroll3DCard key={item.title} index={i}>
                <div
                  className="la-bulle-iris-border"
                  style={{
                    padding: 36,
                    borderRadius: 24,
                    background: 'rgba(8,5,26,0.65)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    minHeight: 320,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                  }}
                >
                  <BubbleCMini size={64} />
                  <h3 style={{
                    fontFamily: "'Fraunces', serif",
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontSize: 28,
                    lineHeight: 1.15,
                    margin: 0,
                    color: '#ffffff',
                    letterSpacing: '-0.01em',
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: 'rgba(255,255,255,0.6)',
                    margin: 0,
                  }}>
                    {item.desc}
                  </p>
                </div>
              </Scroll3DCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── 3. 5 SUPER-POUVOIRS ARK (horizontal snap) ─────────── */}
      <section
        id="powers"
        style={{
          position: 'relative',
          padding: '120px 0',
          zIndex: 1,
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', marginBottom: 56 }}>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ textAlign: 'center' }}
          >
            <Kicker>Les 5 super-pouvoirs ARK</Kicker>
            <div style={{ height: 16 }} />
            <Headline size="lg" align="center">
              L'intelligence,<br/>au bon endroit, au bon moment.
            </Headline>
            <div style={{ height: 18 }} />
            <Tagline align="center">Cinq modules. Une seule mission : faire disparaître la friction.</Tagline>
          </motion.div>
        </div>

        <div
          className="lb-powers-scroll"
          style={{
            display: 'flex',
            gap: 24,
            padding: '24px max(24px, calc((100vw - 1232px) / 2)) 40px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {arkPowers.map((power, i) => {
            const Icon = power.icon
            return (
              <motion.div
                key={power.title}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.1, duration: 0.7 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                style={{
                  flex: '0 0 360px',
                  scrollSnapAlign: 'center',
                  perspective: 1200,
                }}
              >
                <div
                  className="la-bulle-iris-border"
                  style={{
                    padding: 32,
                    borderRadius: 28,
                    background: 'linear-gradient(180deg, rgba(8,5,26,0.85) 0%, rgba(2,1,8,0.95) 100%)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    minHeight: 440,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    transformStyle: 'preserve-3d',
                    boxShadow: `0 30px 80px rgba(0,0,0,0.4), 0 0 40px ${power.accent}22`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <BubbleCMini size={56} />
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: `${power.accent}18`,
                      border: `1px solid ${power.accent}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={20} color={power.accent} />
                    </div>
                  </div>

                  <Kicker dot={false} color={power.accent}>{power.subtitle}</Kicker>

                  <h3 style={{
                    fontFamily: "'Fraunces', serif",
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontSize: 36,
                    margin: 0,
                    color: '#fff',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}>
                    {power.title}
                  </h3>

                  <p style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'rgba(255,255,255,0.65)',
                    margin: 0,
                    flex: 1,
                  }}>
                    {power.desc}
                  </p>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    color: power.accent,
                  }}>
                    0{i + 1} / 05
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ─────────── 4. SOCIAL PROOF (compteurs animés) ─────────── */}
      <section
        id="proof"
        style={{
          position: 'relative',
          padding: '120px 24px',
          zIndex: 1,
          background: 'linear-gradient(180deg, transparent 0%, rgba(15,10,40,0.7) 50%, transparent 100%)',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ textAlign: 'center', marginBottom: 64 }}
          >
            <Kicker>Preuves de terrain</Kicker>
            <div style={{ height: 16 }} />
            <Headline size="md" align="center">Les chiffres ne mentent pas.</Headline>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 40 }}>
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.7 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  fontFamily: "'Fraunces', serif",
                  fontStyle: 'italic',
                  fontWeight: 300,
                  fontSize: 'clamp(64px, 9vw, 128px)',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(135deg, #ff80e0 0%, #c080ff 50%, #80a8ff 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                  marginBottom: 12,
                }}>
                  <AnimatedNumber value={s.value} suffix={s.suffix} />
                </div>
                <Kicker dot={false}>{s.label}</Kicker>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── 5. AVANT / APRÈS (split 3D) ─────────── */}
      <section
        id="transform"
        style={{ position: 'relative', padding: '120px 24px', zIndex: 1 }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ textAlign: 'center', marginBottom: 72 }}
          >
            <Kicker>Avant / Après</Kicker>
            <div style={{ height: 16 }} />
            <Headline size="lg" align="center">
              Sortez du tableur.<br/>Entrez dans la bulle.
            </Headline>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {beforeAfter.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 24,
                  alignItems: 'center',
                  padding: '24px 32px',
                  borderRadius: 18,
                  background: 'rgba(8,5,26,0.55)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.35)',
                  textDecoration: 'line-through',
                  textDecorationColor: 'rgba(239,68,68,0.4)',
                }}>
                  {item.before}
                </div>
                <BubbleCMini size={32} animated={false} glow={false} />
                <div style={{
                  fontFamily: "'Fraunces', serif",
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 20,
                  color: '#fff',
                  letterSpacing: '-0.01em',
                }}>
                  {item.after}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── 6. TARIFS (glassmorphism) ─────────── */}
      <section
        id="pricing"
        style={{
          position: 'relative',
          padding: '120px 24px',
          zIndex: 1,
          background: 'linear-gradient(180deg, transparent 0%, rgba(15,10,40,0.7) 50%, transparent 100%)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ textAlign: 'center', marginBottom: 72 }}
          >
            <Kicker>Tarifs transparents</Kicker>
            <div style={{ height: 16 }} />
            <Headline size="lg" align="center">Choisissez votre orbite.</Headline>
            <div style={{ height: 18 }} />
            <Tagline align="center">Sans engagement. 7 jours pour tester en conditions réelles.</Tagline>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, alignItems: 'stretch' }}>
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ y: 40, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.7 }}
                whileHover={{ y: -8 }}
                className={plan.popular ? 'la-bulle-iris-border' : ''}
                style={{
                  padding: 36,
                  borderRadius: 28,
                  background: plan.popular
                    ? 'linear-gradient(180deg, rgba(20,12,40,0.85) 0%, rgba(8,5,26,0.95) 100%)'
                    : 'rgba(8,5,26,0.55)',
                  backdropFilter: 'blur(20px)',
                  border: plan.popular ? '1px solid transparent' : '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  position: 'relative',
                  minHeight: 540,
                  boxShadow: plan.popular ? '0 30px 90px rgba(161,66,244,0.25)' : 'none',
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '6px 16px',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '3px',
                    fontWeight: 500,
                    color: 'white',
                  }}>
                    LE PRÉFÉRÉ
                  </div>
                )}

                <Kicker dot={false}>{plan.name}</Kicker>
                <Tagline size={15}>{plan.desc}</Tagline>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{
                    fontFamily: "'Fraunces', serif",
                    fontStyle: 'italic',
                    fontWeight: 300,
                    fontSize: plan.price === 'Sur devis' ? 36 : 64,
                    letterSpacing: '-0.03em',
                    color: '#fff',
                    lineHeight: 1,
                  }}>
                    {plan.price === 'Sur devis' ? plan.price : `${plan.price} €`}
                  </span>
                  {plan.period && (
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.45)',
                    }}>{plan.period}</span>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {plan.features.map((f, fi) => (
                    <li key={fi} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.75)',
                    }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'rgba(128,240,216,0.12)',
                        border: '1px solid rgba(128,240,216,0.3)',
                      }}>
                        <Check size={12} color="#80f0d8" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <CTAButton to={plan.name === 'Cabinet' ? '/contact' : '/register'} primary={plan.popular}>
                  {plan.cta} <ArrowRight size={14} />
                </CTAButton>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── 7. CTA FINAL ─────────── */}
      <section
        style={{
          position: 'relative',
          padding: '140px 24px',
          zIndex: 1,
          textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 32, display: 'inline-block' }}
        >
          <BubbleCMedium size={300} />
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7 }}
          style={{ maxWidth: 700, margin: '0 auto' }}
        >
          <Headline size="lg" align="center">
            Rejoignez les premiers<br/>courtiers de demain.
          </Headline>
          <div style={{ height: 24 }} />
          <Tagline align="center">7 jours d'essai. Aucune carte bancaire. La bulle vous attend.</Tagline>
          <div style={{ height: 36 }} />
          <CTAButton to="/register" primary>
            Démarrer l'essai gratuit <ArrowRight size={18} />
          </CTAButton>
        </motion.div>
      </section>

      {/* ─────────── 8. FOOTER ─────────── */}
      <footer
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '64px 24px 48px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(2,1,8,0.85)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 40,
            marginBottom: 48,
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <BubbleC size={32} animated={false} glow={false} />
                <Wordmark size={20} />
              </div>
              <Tagline size={13}>L'IA compagnon du courtier. Conçue à Paris, propulsée par ARK.</Tagline>
            </div>
            <FooterCol title="Produit"  links={['ARK Watch', 'Voice Intake', 'Doc Vision', 'ARK Compose', 'Quote Intel']} />
            <FooterCol title="Cabinet"  links={['Tarifs', 'Sécurité', 'Conformité ORIAS', 'API', 'Status']} />
            <FooterCol title="Légal"    links={['Mentions légales', 'CGV', 'Confidentialité', 'RGPD', 'DPA']} />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.35)', margin: 0, textTransform: 'uppercase' }}>
              © 2026 COURTIA — Tous droits réservés
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={14} color="#80f0d8" />
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                Hébergé en France · ORIAS conforme
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Responsive helpers — embedded so the file stays self-contained */}
      <style>{`
        @media (min-width: 900px) {
          .lb-nav-links { display: flex !important; }
        }
        @media (max-width: 899px) {
          .lb-nav-cta   { display: none !important; }
          .lb-nav-burger { display: inline-flex !important; }
        }
        @media (max-width: 720px) {
          .lb-hero-bubble svg { width: 320px !important; height: 320px !important; }
        }
        .lb-powers-scroll::-webkit-scrollbar { height: 6px; }
        .lb-powers-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .lb-powers-scroll::-webkit-scrollbar-thumb { background: rgba(180,100,255,0.25); border-radius: 3px; }
      `}</style>
    </div>
  )
}

const navLinkStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: '0.02em',
  color: 'rgba(255,255,255,0.7)',
  textDecoration: 'none',
  transition: 'color 0.2s',
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: 4,
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        marginBottom: 18,
      }}>
        {title}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map((l) => (
          <li key={l}>
            <a href="#" style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
              textDecoration: 'none',
            }}>
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

