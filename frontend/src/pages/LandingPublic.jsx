import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Sparkles, Zap, ArrowRight, Shield, BarChart3, FileText, Users, Calendar,
  TrendingUp, Star, Target, Bell, Clock, Check, Brain, Database,
  Search, AlertTriangle, LayoutDashboard, FileCheck2, Send,
  Menu, X, Bird, ChevronRight, User, Wallet, Heart, Image
} from 'lucide-react'
import { applySeo } from '../lib/seo'

// Tokens — identiques aux captures
const T = {
  desktop: {
    bg: 'radial-gradient(ellipse at 50% -10%, #1a1040 0%, #050510 60%, #02030c 100%)',
    text: '#FFFFFF', textSecondary: '#CBD5E1', textMuted: '#94A3B8',
    accent: '#7C3AED', accentGlow: 'rgba(124,58,237,0.35)',
    chipBg: 'rgba(255,255,255,0.06)', chipBorder: 'rgba(255,255,255,0.08)',
  },
  mobile: {
    bg: '#FFFFFF', text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
    accent: '#7C3AED', chipBg: '#F1F5F9', chipBorder: '#E2E8F0',
  }
}

// Data : Chips navigation
const navChips = [
  { icon: User, label: 'Profil Courtiers' },
  { icon: Wallet, label: 'Portefeuille Vivant' },
  { icon: Heart, label: 'Relations Intelligentes' },
  { icon: Image, label: 'ARK Image' },
]

export default function LandingPublic() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    applySeo({
      title: 'COURTIA — Le cockpit intelligent des courtiers en assurance',
      description: 'COURTIA centralise vos clients, contrats, tâches et relances. ARK analyse votre portefeuille, détecte les priorités et transforme vos données en actions commerciales concrètes.',
    })
  }, [])

  // Styles inline pour éviter d'impacter le CSS global
  const s = isMobile ? T.mobile : T.desktop

  return (
    <div style={{
      minHeight: '100vh',
      background: s.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: s.text,
      position: 'relative',
      overflowX: 'hidden',
      transition: 'background 0.3s',
    }}>
      {/* ── Navbar ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 20,
      }}>
        {/* Logo gauche */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: s.text }}>
            {/* C logo */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="url(#cGradNav)"/>
              <defs>
                <linearGradient id="cGradNav" x1="0" y1="0" x2="28" y2="28">
                  <stop stopColor="#7C3AED"/><stop offset="1" stopColor="#3B82F6"/>
                </linearGradient>
              </defs>
              <text x="14" y="20" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">C</text>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>
              COURTIA
            </span>
          </Link>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="#produit" style={{ color: s.textSecondary, textDecoration: 'none', fontSize: 14 }}>Produit</a>
            <a href="#ark" style={{ color: s.textSecondary, textDecoration: 'none', fontSize: 14 }}>ARK</a>
            <a href="#tarifs" style={{ color: s.textSecondary, textDecoration: 'none', fontSize: 14 }}>Tarifs</a>
            <Link to="/login" style={{
              color: s.text, textDecoration: 'none', fontSize: 14,
              border: `1px solid ${s.chipBorder}`, borderRadius: 8, padding: '8px 16px',
            }}>Se connecter</Link>
            <Link to="/register" style={{
              background: s.accent, color: 'white', textDecoration: 'none',
              fontSize: 14, borderRadius: 8, padding: '8px 16px', fontWeight: 600,
            }}>Essai gratuit 7 jours</Link>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: 'none', border: 'none', color: s.text, cursor: 'pointer', padding: 8,
          }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        padding: isMobile ? '40px 20px 60px' : '80px 20px 100px',
        maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1,
      }}>
        {/* Desktop: Grand C avec colombe */}
        {!isMobile && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ position: 'relative', marginBottom: 48 }}
          >
            {/* Halo flou externe */}
            <div style={{
              position: 'absolute', inset: -60,
              background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
              borderRadius: '50%', filter: 'blur(40px)',
            }} />
            {/* Cercle principal */}
            <div style={{
              width: 220, height: 220, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 50%, #06B6D4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 80px rgba(124,58,237,0.4), 0 0 200px rgba(59,130,246,0.2)',
              position: 'relative',
            }}>
              {/* C blanc à l'intérieur */}
              <span style={{
                color: 'white', fontSize: 100, fontWeight: 800,
                fontFamily: 'sans-serif', letterSpacing: '-4px',
              }}>C</span>
              {/* Colombe (lucide Bird) */}
              <Bird size={36} color="white" style={{
                position: 'absolute', top: 30, right: 30,
                opacity: 0.9, transform: 'rotate(-15deg)',
              }} />
            </div>
          </motion.div>
        )}

        {/* Mobile: Cercle blanc */}
        {isMobile && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{
              width: 160, height: 160, borderRadius: '50%',
              border: '2px solid #D1D5DB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            <span style={{
              fontSize: 72, fontWeight: 800, color: '#0F172A',
              fontFamily: 'sans-serif',
            }}>C</span>
          </motion.div>
        )}

        {/* Badge ARK */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20,
            background: isMobile ? 'rgba(124,58,237,0.06)' : 'rgba(139,92,246,0.08)',
            border: `1px solid ${isMobile ? 'rgba(124,58,237,0.12)' : 'rgba(139,92,246,0.12)'}`,
            marginBottom: 20, fontSize: 12, fontWeight: 500, color: isMobile ? '#7C3AED' : '#A78BFA',
          }}
        >
          <Sparkles size={12} />
          CRM ASSURANCE CONNECTÉ À ARK
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            fontSize: isMobile ? 28 : 48, fontWeight: 800,
            lineHeight: 1.15, letterSpacing: '-1.5px',
            margin: '0 0 16px', maxWidth: 700,
          }}
        >
          Le cockpit intelligent des courtiers en assurance.
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{
            fontSize: isMobile ? 15 : 18, lineHeight: 1.6,
            color: s.textSecondary, maxWidth: 600, margin: '0 0 32px',
          }}
        >
          COURTIA centralise vos clients, contrats, tâches et relances. ARK analyse votre
          portefeuille, détecte les priorités et transforme vos données en actions
          commerciales concrètes.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 }}
        >
          <Link to="/register" style={{
            background: s.accent, color: 'white', textDecoration: 'none',
            padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: `0 4px 20px ${T.desktop.accentGlow}`,
          }}>
            Essai gratuit 7 jours <ArrowRight size={18} />
          </Link>
          <a href="#cockpit" style={{
            background: s.chipBg, color: s.text, textDecoration: 'none',
            padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 500,
            border: `1px solid ${s.chipBorder}`, display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Voir le cockpit
          </a>
        </motion.div>

        {/* Navigation Chips (mobile + desktop) */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: isMobile ? 8 : 12,
            justifyContent: 'center',
          }}
        >
          {navChips.map((chip, i) => (
            <motion.button
              key={chip.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 24,
                background: s.chipBg, border: `1px solid ${s.chipBorder}`,
                color: s.text, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <chip.icon size={16} />
              {chip.label}
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* ── Features Grid ── */}
      <section style={{
        padding: '60px 20px', maxWidth: 1100, margin: '0 auto',
        position: 'relative', zIndex: 1,
      }}>
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          style={{
            fontSize: isMobile ? 24 : 36, fontWeight: 700, textAlign: 'center',
            marginBottom: 48, letterSpacing: '-0.5px',
          }}
        >
          Un cockpit métier, pas une vitrine de gadgets
        </motion.h2>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 20,
        }}>
          {[
            { icon: LayoutDashboard, title: 'Dashboard intelligent', desc: 'Vue 360° de votre portefeuille. Clients, contrats, échéances et opportunités en un regard.' },
            { icon: Brain, title: 'ARK, votre copilote IA', desc: 'ARK détecte les priorités du jour, recommande les prochaines actions et relie chaque insight au client concerné.' },
            { icon: FileCheck2, title: 'Devis & relances', desc: 'Générez des devis comparatifs, programmez des relances intelligentes et suivez vos opportunités.' },
            { icon: Shield, title: 'Conformité ORIAS', desc: 'DDA, IPID, devoir de conseil : tous vos documents réglementaires générés et archivés automatiquement.' },
            { icon: BarChart3, title: 'Analyses proactives', desc: 'Loi Hamon, résiliation Chatel, échéances : ARK Watch surveille votre portefeuille 24/7.' },
            { icon: Target, title: 'Acquisition intelligente', desc: 'Ciblage, scoring et recommandations pour développer votre portefeuille sans prospection aveugle.' },
          ].map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{
                padding: 28, borderRadius: 14,
                background: s.chipBg, border: `1px solid ${s.chipBorder}`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = s.chipBorder }}
            >
              <feat.icon size={24} color={s.accent} style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 8px' }}>{feat.title}</h3>
              <p style={{ fontSize: 14, color: s.textSecondary, lineHeight: 1.5, margin: 0 }}>{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer minimal ── */}
      <footer style={{
        padding: '40px 20px', textAlign: 'center',
        borderTop: `1px solid ${s.chipBorder}`,
        color: s.textMuted, fontSize: 13,
      }}>
        © {new Date().getFullYear()} COURTIA. Tous droits réservés.
      </footer>
    </div>
  )
}
