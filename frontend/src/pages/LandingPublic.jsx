import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Sparkles, ArrowRight, Shield, BarChart3, Check, Brain, Eye, Mic,
  Menu, X, Bird, User, Wallet, Heart, Image, LayoutDashboard,
  FileSearch, PenTool, Receipt, CheckCircle2, XCircle
} from 'lucide-react'
import { applySeo } from '../lib/seo'

const T = {
  desktop: {
    bg: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 40%, #0a0a14 100%)',
    text: '#FFFFFF', textSecondary: '#CBD5E1', textMuted: '#64748B',
    accent: '#8B5CF6', accentAlt: '#06B6D4',
    accentGlow: 'rgba(139,92,246,0.4)', cyanGlow: 'rgba(6,182,212,0.3)',
    cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
    chipBg: 'rgba(255,255,255,0.05)', chipBorder: 'rgba(255,255,255,0.08)',
  },
  mobile: {
    bg: '#FFFFFF', text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
    accent: '#FB923C', accentAlt: '#7C3AED', accentGlow: 'rgba(251,146,60,0.3)',
    cardBg: '#F8FAFC', cardBorder: '#E2E8F0',
    chipBg: '#F1F5F9', chipBorder: '#E2E8F0',
  }
}

function CLogo3D({ size = 220, isMobile = false, style = {} }) {
  if (isMobile) {
    return (
      <div style={{ width: size * 0.72, height: size * 0.72, borderRadius: '50%', border: '3px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', ...style }}>
        <span style={{ fontSize: size * 0.4, fontWeight: 800, color: '#0F172A' }}>C</span>
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', ...style }}>
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: -80, background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(6,182,212,0.15) 40%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
      <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.7, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ position: 'absolute', inset: -40, background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      <motion.div animate={{ rotateY: [0, 5, 0, -5, 0], rotateX: [0, -3, 0, 3, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 30%, #06B6D4 70%, #14B8A6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(6,182,212,0.3), inset 0 -10px 30px rgba(0,0,0,0.2), inset 0 10px 30px rgba(255,255,255,0.1)', position: 'relative', transformStyle: 'preserve-3d', perspective: 1000 }}>
        <div style={{ position: 'absolute', top: 8, left: '15%', right: '15%', height: '30%', background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)', borderRadius: '50% 50% 50% 50% / 100% 100% 0% 0%', filter: 'blur(2px)' }} />
        <span style={{ color: 'white', fontSize: size * 0.45, fontWeight: 800, letterSpacing: '-3px', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>C</span>
        <Bird size={size * 0.16} color="white" style={{ position: 'absolute', top: size * 0.12, right: size * 0.12, opacity: 0.9, transform: 'rotate(-15deg)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
      </motion.div>
    </div>
  )
}

function FloatingCShapes({ count = 5, isMobile = false }) {
  if (isMobile) return null
  const shapes = Array.from({ length: count }, (_, i) => ({ id: i, size: 40 + Math.random() * 60, x: Math.random() * 100, y: 10 + Math.random() * 80, delay: Math.random() * 5, duration: 15 + Math.random() * 10, opacity: 0.03 + Math.random() * 0.04 }))
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {shapes.map(sh => (
        <motion.div key={sh.id} initial={{ y: 0, rotate: 0 }} animate={{ y: [0, -30, 0, 30, 0], rotate: [0, 10, 0, -10, 0] }} transition={{ duration: sh.duration, delay: sh.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', left: sh.x + '%', top: sh.y + '%', width: sh.size, height: sh.size, borderRadius: '50%', border: '2px solid rgba(139,92,246,' + (sh.opacity * 3) + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sh.opacity }}>
          <span style={{ color: 'rgba(139,92,246,0.3)', fontSize: sh.size * 0.5, fontWeight: 700 }}>C</span>
        </motion.div>
      ))}
    </div>
  )
}

function ScrollSection({ children, id }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [80, -80])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.95, 1, 1, 0.95])
  const springY = useSpring(y, { stiffness: 100, damping: 30 })
  const springOpacity = useSpring(opacity, { stiffness: 100, damping: 30 })
  const springScale = useSpring(scale, { stiffness: 100, damping: 30 })
  return <motion.section ref={ref} id={id} style={{ y: springY, opacity: springOpacity, scale: springScale, position: 'relative', zIndex: 1 }}>{children}</motion.section>
}

const navChips = [
  { icon: User, label: 'Profil Courtiers' },
  { icon: Wallet, label: 'Portefeuille Vivant' },
  { icon: Heart, label: 'Relations Intelligentes' },
  { icon: Image, label: 'ARK Image' },
]

const whyCourtia = [
  { icon: LayoutDashboard, title: 'Un cockpit métier, pas un CRM générique', desc: 'Conçu par des courtiers, pour des courtiers. Chaque fonctionnalité répond à un besoin terrain réel.' },
  { icon: Brain, title: 'ARK, votre copilote IA intégré', desc: 'Intelligence artificielle native qui analyse, recommande et agit. Pas un gadget, un vrai assistant.' },
  { icon: Shield, title: 'Conformité ORIAS automatique', desc: 'DDA, IPID, devoir de conseil : tous vos documents générés et archivés sans effort.' },
]

const arkPowers = [
  { icon: Eye, title: 'ARK Watch', subtitle: 'Surveillance proactive', desc: 'Loi Hamon, Chatel, échéances critiques : ARK veille sur votre portefeuille 24/7.', color: '#06B6D4' },
  { icon: Mic, title: 'ARK Voice', subtitle: 'Dictée intelligente', desc: 'Dictez vos notes client, ARK transcrit, structure et extrait les actions.', color: '#8B5CF6' },
  { icon: FileSearch, title: 'ARK Doc Vision', subtitle: 'Lecture automatique', desc: 'Déposez un contrat PDF, ARK extrait garanties, montants, dates.', color: '#EC4899' },
  { icon: PenTool, title: 'ARK Compose', subtitle: 'Rédaction assistée', desc: 'Emails, courriers, relances : ARK rédige avec le bon ton.', color: '#F59E0B' },
  { icon: Receipt, title: 'ARK Quote Intel', subtitle: 'Analyse comparative', desc: 'Comparez Aurora, Novalia, Helios, Serenis et recommandez.', color: '#10B981' },
]

const beforeAfter = [
  { before: 'Excel + Post-it + mémoire', after: "Tout centralisé, rien n'échappe" },
  { before: 'Relances oubliées, clients perdus', after: 'Alertes proactives, opportunités saisies' },
  { before: 'Conformité fastidieuse', after: 'Documents générés en 1 clic' },
  { before: 'Données dispersées', after: 'Vision 360° de chaque client' },
]

const pricingPlans = [
  { name: 'Starter', price: '89', period: '/mois', desc: 'Pour les courtiers indépendants', features: ["Jusqu'à 200 clients", 'Dashboard intelligent', 'ARK Watch (alertes)', 'Conformité ORIAS', 'Support email'], cta: 'Commencer', popular: false },
  { name: 'Pro', price: '159', period: '/mois', desc: 'Pour les courtiers ambitieux', features: ['Clients illimités', 'Tous les modules ARK', 'ARK Voice + Doc Vision', 'Multi-utilisateurs (3)', 'Intégrations avancées', 'Support prioritaire'], cta: 'Essai gratuit 7 jours', popular: true },
  { name: 'Cabinet', price: 'Sur devis', period: '', desc: 'Pour les cabinets de courtage', features: ['Utilisateurs illimités', 'Toutes fonctionnalités Pro', 'API & webhooks', 'SSO / SAML', 'Onboarding dédié', 'Account manager'], cta: 'Nous contacter', popular: false },
]

export default function LandingPublic() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    applySeo({
      title: 'COURTIA — Le cockpit intelligent des courtiers en assurance',
      description: 'COURTIA centralise vos clients, contrats, tâches et relances. ARK analyse votre portefeuille et transforme vos données en actions commerciales.',
    })
  }, [])

  const s = isMobile ? T.mobile : T.desktop

  return (
    <div ref={containerRef} style={{ minHeight: '100vh', background: s.bg, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', color: s.text, position: 'relative', overflowX: 'hidden' }}>
      <FloatingCShapes count={6} isMobile={isMobile} />

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 50 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: s.text }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: isMobile ? 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)' : 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isMobile ? 'none' : '0 0 20px rgba(139,92,246,0.4)' }}>
            <span style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>C</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>COURTIA</span>
        </Link>

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#produit" style={{ color: s.textSecondary, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Produit</a>
            <a href="#ark" style={{ color: s.textSecondary, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>ARK</a>
            <a href="#tarifs" style={{ color: s.textSecondary, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Tarifs</a>
            <Link to="/login" style={{ color: s.text, textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '10px 20px', border: '1px solid ' + s.chipBorder, borderRadius: 10 }}>Se connecter</Link>
            <Link to="/register" style={{ background: 'linear-gradient(135deg, ' + s.accent + ' 0%, ' + s.accentAlt + ' 100%)', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 600, padding: '10px 20px', borderRadius: 10, boxShadow: '0 4px 20px ' + s.accentGlow }}>Essai gratuit 7 jours</Link>
          </div>
        )}

        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: s.text, cursor: 'pointer', padding: 8 }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </nav>

      <AnimatePresence>
        {isMobile && menuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'fixed', top: 60, left: 0, right: 0, background: s.bg, padding: 24, zIndex: 100, borderBottom: '1px solid ' + s.cardBorder, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <a href="#produit" onClick={() => setMenuOpen(false)} style={{ color: s.text, textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>Produit</a>
            <a href="#ark" onClick={() => setMenuOpen(false)} style={{ color: s.text, textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>ARK</a>
            <a href="#tarifs" onClick={() => setMenuOpen(false)} style={{ color: s.text, textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>Tarifs</a>
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ color: s.text, textDecoration: 'none', fontSize: 16, fontWeight: 500 }}>Se connecter</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{ background: s.accent, color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 600, padding: '14px 24px', borderRadius: 12, textAlign: 'center' }}>Essai gratuit 7 jours</Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: isMobile ? '48px 20px 80px' : '100px 20px 140px', maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} style={{ marginBottom: isMobile ? 36 : 56 }}>
          <CLogo3D size={isMobile ? 160 : 220} isMobile={isMobile} />
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 24, background: isMobile ? 'rgba(124,58,237,0.08)' : 'rgba(139,92,246,0.1)', border: '1px solid ' + (isMobile ? 'rgba(124,58,237,0.15)' : 'rgba(139,92,246,0.2)'), marginBottom: 24, fontSize: 13, fontWeight: 600, color: isMobile ? '#7C3AED' : '#A78BFA' }}>
          <Sparkles size={14} />
          CRM ASSURANCE CONNECTÉ À ARK
        </motion.div>

        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.7 }} style={{ fontSize: isMobile ? 32 : 56, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', margin: '0 0 20px', maxWidth: 800, background: isMobile ? 'none' : 'linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)', WebkitBackgroundClip: isMobile ? 'unset' : 'text', WebkitTextFillColor: isMobile ? s.text : 'transparent' }}>
          Le cockpit intelligent des courtiers en assurance.
        </motion.h1>

        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} style={{ fontSize: isMobile ? 16 : 20, lineHeight: 1.6, color: s.textSecondary, maxWidth: 650, margin: '0 0 40px' }}>
          COURTIA centralise vos clients, contrats, tâches et relances. ARK analyse votre portefeuille, détecte les priorités et transforme vos données en actions commerciales concrètes.
        </motion.p>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.6 }} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
          <Link to="/register" style={{ background: isMobile ? s.accent : 'linear-gradient(135deg, ' + s.accent + ' 0%, ' + s.accentAlt + ' 100%)', color: 'white', textDecoration: 'none', padding: '16px 32px', borderRadius: 14, fontSize: 16, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px ' + s.accentGlow }}>
            Essai gratuit 7 jours <ArrowRight size={18} />
          </Link>
          <a href="#cockpit" style={{ background: s.chipBg, color: s.text, textDecoration: 'none', padding: '16px 32px', borderRadius: 14, fontSize: 16, fontWeight: 500, border: '1px solid ' + s.chipBorder, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            Voir le cockpit
          </a>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }} style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 10 : 14, justifyContent: 'center' }}>
          {navChips.map(chip => (
            <motion.div key={chip.label} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 28, background: s.chipBg, border: '1px solid ' + s.chipBorder, color: s.text, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              <chip.icon size={18} />
              {chip.label}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* POURQUOI COURTIA */}
      <ScrollSection id="produit">
        <div style={{ padding: isMobile ? '60px 20px' : '100px 20px', maxWidth: 1100, margin: '0 auto' }}>
          <motion.h2 initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, margin: '-100px' }} style={{ fontSize: isMobile ? 28 : 44, fontWeight: 800, textAlign: 'center', marginBottom: 16, letterSpacing: '-1px' }}>
            Pourquoi COURTIA ?
          </motion.h2>
          <motion.p initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} style={{ fontSize: isMobile ? 15 : 18, color: s.textSecondary, textAlign: 'center', maxWidth: 600, margin: '0 auto 56px' }}>
            Trois raisons qui font la différence avec les CRM traditionnels.
          </motion.p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24 }}>
            {whyCourtia.map((item, i) => (
              <motion.div key={item.title} initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} whileHover={{ y: -8, scale: 1.02 }} style={{ padding: 32, borderRadius: 20, background: s.cardBg, border: '1px solid ' + s.cardBorder, transition: 'all 0.3s' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: isMobile ? 'rgba(124,58,237,0.1)' : 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.1) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <item.icon size={28} color={isMobile ? '#7C3AED' : '#A78BFA'} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: s.textSecondary, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollSection>

      {/* LES 5 SUPER-POUVOIRS ARK */}
      <ScrollSection id="ark">
        <div style={{ padding: isMobile ? '60px 20px' : '100px 20px', maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 24, background: isMobile ? 'rgba(124,58,237,0.08)' : 'rgba(139,92,246,0.1)', marginBottom: 20, fontSize: 13, fontWeight: 600, color: isMobile ? '#7C3AED' : '#A78BFA' }}>
              <Brain size={16} />
              INTELLIGENCE ARTIFICIELLE
            </div>
            <h2 style={{ fontSize: isMobile ? 28 : 44, fontWeight: 800, letterSpacing: '-1px', marginBottom: 16 }}>
              Les 5 super-pouvoirs d'ARK
            </h2>
            <p style={{ fontSize: isMobile ? 15 : 18, color: s.textSecondary, maxWidth: 600, margin: '0 auto' }}>
              ARK n'est pas un chatbot. C'est votre copilote IA qui comprend le métier de courtier et agit pour vous.
            </p>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 20 }}>
            {arkPowers.map((power, i) => (
              <motion.div key={power.title} initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -8, boxShadow: isMobile ? '0 20px 60px rgba(0,0,0,0.1)' : '0 20px 60px ' + power.color + '22' }} style={{ padding: 28, borderRadius: 20, background: s.cardBg, border: '1px solid ' + s.cardBorder, transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: power.color, opacity: 0.8 }} />
                <div style={{ width: 48, height: 48, borderRadius: 14, background: power.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <power.icon size={24} color={power.color} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{power.title}</h3>
                <p style={{ fontSize: 13, fontWeight: 500, color: power.color, marginBottom: 12 }}>{power.subtitle}</p>
                <p style={{ fontSize: 14, color: s.textSecondary, lineHeight: 1.6, margin: 0 }}>{power.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollSection>

      {/* AVANT / APRES */}
      <ScrollSection id="transform">
        <div style={{ padding: isMobile ? '60px 20px' : '100px 20px', maxWidth: 900, margin: '0 auto' }}>
          <motion.h2 initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} style={{ fontSize: isMobile ? 28 : 44, fontWeight: 800, textAlign: 'center', letterSpacing: '-1px', marginBottom: 56 }}>
            Avant / Après COURTIA
          </motion.h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {beforeAfter.map((item, i) => (
              <motion.div key={i} initial={{ x: -30, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr', gap: isMobile ? 12 : 24, alignItems: 'center', padding: isMobile ? 20 : 28, borderRadius: 16, background: s.cardBg, border: '1px solid ' + s.cardBorder }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <XCircle size={20} color="#EF4444" />
                  <span style={{ fontSize: 15, color: s.textMuted, textDecoration: 'line-through', textDecorationColor: 'rgba(239,68,68,0.5)' }}>{item.before}</span>
                </div>
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 44, height: 44, borderRadius: '50%', background: isMobile ? 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)' : 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: isMobile ? '8px auto' : '0', boxShadow: isMobile ? 'none' : '0 0 30px rgba(139,92,246,0.4)' }}>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>C</span>
                </motion.div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CheckCircle2 size={20} color="#10B981" />
                  <span style={{ fontSize: 15, fontWeight: 600, color: s.text }}>{item.after}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollSection>

      {/* TARIFS */}
      <ScrollSection id="tarifs">
        <div style={{ padding: isMobile ? '60px 20px' : '100px 20px', maxWidth: 1100, margin: '0 auto' }}>
          <motion.h2 initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} style={{ fontSize: isMobile ? 28 : 44, fontWeight: 800, textAlign: 'center', letterSpacing: '-1px', marginBottom: 16 }}>
            Des tarifs transparents
          </motion.h2>
          <motion.p initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }} style={{ fontSize: isMobile ? 15 : 18, color: s.textSecondary, textAlign: 'center', maxWidth: 500, margin: '0 auto 56px' }}>
            Pas de frais cachés. Pas d'engagement annuel. Essai gratuit 7 jours sur tous les plans.
          </motion.p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24, alignItems: 'stretch' }}>
            {pricingPlans.map((plan, i) => (
              <motion.div key={plan.name} initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} whileHover={{ y: -8 }} style={{ padding: plan.popular ? 32 : 28, borderRadius: 24, background: plan.popular ? (isMobile ? 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)' : 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #06B6D4 100%)') : s.cardBg, border: plan.popular ? 'none' : '1px solid ' + s.cardBorder, color: plan.popular ? 'white' : s.text, position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: plan.popular ? '0 20px 60px rgba(139,92,246,0.3)' : 'none' }}>
                {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '6px 16px', borderRadius: 20, background: '#FCD34D', color: '#0F172A', fontSize: 12, fontWeight: 700 }}>⭐ POPULAIRE</div>}
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{plan.name}</h3>
                <p style={{ fontSize: 14, opacity: plan.popular ? 0.9 : 0.7, marginBottom: 20 }}>{plan.desc}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: plan.price === 'Sur devis' ? 28 : 48, fontWeight: 800, letterSpacing: '-2px' }}>{plan.price === 'Sur devis' ? plan.price : plan.price + '€'}</span>
                  {plan.period && <span style={{ fontSize: 16, opacity: 0.7 }}>{plan.period}</span>}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
                  {plan.features.map((f, fi) => <li key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 14 }}><Check size={18} color={plan.popular ? 'white' : '#10B981'} />{f}</li>)}
                </ul>
                <Link to={plan.name === 'Cabinet' ? '/contact' : '/register'} style={{ display: 'block', textAlign: 'center', padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: 'none', background: plan.popular ? 'white' : s.accent, color: plan.popular ? '#7C3AED' : 'white' }}>{plan.cta}</Link>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollSection>

      {/* CTA FINAL */}
      <ScrollSection id="final-cta">
        <div style={{ padding: isMobile ? '80px 20px' : '120px 20px', textAlign: 'center', position: 'relative' }}>
          {!isMobile && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, height: 400, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}><span style={{ fontSize: 200, fontWeight: 800, color: 'rgba(139,92,246,0.03)' }}>C</span></div>}
          <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: isMobile ? 32 : 52, fontWeight: 800, letterSpacing: '-2px', maxWidth: 700, margin: '0 auto 20px' }}>Prêt à transformer votre activité ?</h2>
            <p style={{ fontSize: isMobile ? 16 : 20, color: s.textSecondary, maxWidth: 500, margin: '0 auto 40px' }}>Rejoignez les courtiers qui ont adopté COURTIA et découvrez la puissance d'ARK.</p>
            <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: isMobile ? s.accent : 'linear-gradient(135deg, ' + s.accent + ' 0%, ' + s.accentAlt + ' 100%)', color: 'white', textDecoration: 'none', padding: '18px 40px', borderRadius: 16, fontSize: 18, fontWeight: 600, boxShadow: '0 8px 40px ' + s.accentGlow }}>Démarrer l'essai gratuit <ArrowRight size={22} /></Link>
          </motion.div>
        </div>
      </ScrollSection>

      {/* FOOTER */}
      <footer style={{ padding: isMobile ? '40px 20px 60px' : '60px 20px 80px', borderTop: '1px solid ' + s.cardBorder, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: isMobile ? 32 : 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: isMobile ? 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)' : 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>C</span></div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>COURTIA</span>
            </div>
            <p style={{ fontSize: 14, color: s.textMuted, lineHeight: 1.6, maxWidth: 240 }}>Le cockpit intelligent des courtiers en assurance. Propulsé par ARK.</p>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Produit</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{['Dashboard', 'ARK Watch', 'ARK Voice', 'ARK Doc Vision', 'Tarifs'].map(item => <li key={item} style={{ marginBottom: 10 }}><a href="#" style={{ color: s.textMuted, textDecoration: 'none', fontSize: 14 }}>{item}</a></li>)}</ul>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Ressources</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{['Academy', 'Aide', 'Changelog', 'Status', 'Contact'].map(item => <li key={item} style={{ marginBottom: 10 }}><a href="#" style={{ color: s.textMuted, textDecoration: 'none', fontSize: 14 }}>{item}</a></li>)}</ul>
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Légal</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>{['Mentions légales', 'CGV', 'Confidentialité', 'RGPD', 'Sécurité'].map(item => <li key={item} style={{ marginBottom: 10 }}><a href="#" style={{ color: s.textMuted, textDecoration: 'none', fontSize: 14 }}>{item}</a></li>)}</ul>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingTop: 24, borderTop: '1px solid ' + s.cardBorder }}>
          <p style={{ fontSize: 13, color: s.textMuted, margin: 0 }}>© {new Date().getFullYear()} COURTIA. Tous droits réservés.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: s.textMuted }}><span>Conçu avec</span><span style={{ color: '#EF4444' }}>♥</span><span>en France</span></div>
        </div>
      </footer>
    </div>
  )
}
