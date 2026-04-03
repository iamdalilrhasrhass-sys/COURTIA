import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useViewportScroll, useTransform } from 'framer-motion'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { Check, ArrowRight, Zap, Sparkles, BarChart3, Users, Lightbulb, Rocket, Crown, TrendingUp, MessageSquare, CheckCircle2, Clock, AlertCircle, Inbox } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const PREMIUM_EASE = [0.16, 1, 0.3, 1]
const SMOOTH_EASE = [0.25, 0.46, 0.45, 0.94]

export default function Landing() {
  const navigate = useNavigate()
  const [arkPhase, setArkPhase] = useState(0)
  const containerRef = useRef(null)
  const { scrollY } = useViewportScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, 180])

  // ARK demo simulation
  useEffect(() => {
    if (arkPhase > 0) {
      const timers = [
        setTimeout(() => setArkPhase(2), 1200),
        setTimeout(() => setArkPhase(3), 2400),
        setTimeout(() => setArkPhase(4), 3600)
      ]
      return () => timers.forEach(t => clearTimeout(t))
    }
  }, [arkPhase])

  return (
    <div ref={containerRef} style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#0a0a0a', overflow: 'hidden' }}>
      {/* NAVIGATION */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: SMOOTH_EASE }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.99)',
          borderBottom: '0.5px solid #e5e7eb',
          zIndex: 100,
          backdropFilter: 'blur(14px)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '4px', fontFamily: 'Arial, sans-serif' }}>COURTIA</div>
          <div style={{ display: 'flex', gap: '70px', fontSize: '12px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>
            {['Expérience', 'ARK IA', 'Tarifs'].map(link => (
              <motion.a key={link} href={`#${link.toLowerCase()}`} style={{ textDecoration: 'none', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }} whileHover={{ color: '#2563eb' }}>
                {link}
              </motion.a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '14px', fontFamily: 'Arial, sans-serif' }}>
            <motion.button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#0a0a0a', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }} whileHover={{ color: '#2563eb' }}>
              Connexion
            </motion.button>
            <motion.button onClick={() => navigate('/register')} style={{ padding: '11px 26px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }} whileHover={{ backgroundColor: '#2563eb', scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              Démarrer
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* HERO AVEC MOCKUP PREMIUM */}
      <section style={{ minHeight: '100vh', paddingTop: '100px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
        <motion.div animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }} style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '900px', height: '900px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <motion.div style={{ y: heroY }} style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 80px', width: '100%', position: 'relative', zIndex: 1, fontFamily: 'Arial, sans-serif' }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: PREMIUM_EASE }} style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '11px 20px', backgroundColor: '#f0fdf4', border: '0.5px solid #dcfce7', borderRadius: '26px', marginBottom: '50px', fontSize: '11px', color: '#166534', fontWeight: '600', fontFamily: 'Arial, sans-serif' }}>
            <Zap size={13} />
            Offre Fondateur — 31 places restantes
          </motion.div>

          <div style={{ marginBottom: '32px' }}>
            <motion.h1 initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.2, ease: PREMIUM_EASE }} style={{ fontSize: '72px', fontWeight: 'bold', letterSpacing: '-1.4px', margin: 0, fontFamily: 'Arial, sans-serif' }}>
              Le CRM qui
            </motion.h1>
            <motion.h1 initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.4, ease: PREMIUM_EASE }} style={{ fontSize: '72px', fontWeight: 'bold', color: '#2563eb', letterSpacing: '-1.4px', margin: '12px 0 0 0', fontFamily: 'Arial, sans-serif' }}>
              pense & agit
            </motion.h1>
            <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6, ease: SMOOTH_EASE }} style={{ fontSize: '72px', fontWeight: 'bold', letterSpacing: '-1.4px', margin: '12px 0 0 0', fontFamily: 'Arial, sans-serif' }}>
              avec vous
            </motion.h1>
          </div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8, ease: SMOOTH_EASE }} style={{ fontSize: '18px', color: '#64748b', lineHeight: '1.8', maxWidth: '720px', margin: '0 auto 60px', fontFamily: 'Arial, sans-serif' }}>
            ARK analyse. Détecte. Agit. Votre assistant IA natif qui transforme vos données en victoires commerciales.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1, ease: PREMIUM_EASE }} style={{ display: 'flex', gap: '18px', justifyContent: 'center', marginBottom: '120px', fontFamily: 'Arial, sans-serif' }}>
            <motion.button onClick={() => navigate('/register')} style={{ padding: '16px 44px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '11px', boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)', fontFamily: 'Arial, sans-serif' }} whileHover={{ backgroundColor: '#2563eb', scale: 1.04, boxShadow: '0 18px 48px rgba(37, 99, 235, 0.35)' }} whileTap={{ scale: 0.96 }}>
              Rejoindre — 69€/mois
              <ArrowRight size={17} />
            </motion.button>
            <motion.button style={{ padding: '16px 44px', backgroundColor: '#ffffff', color: '#0a0a0a', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }} whileHover={{ borderColor: '#0a0a0a', backgroundColor: '#f8f9fa', scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              Voir la démo
            </motion.button>
          </motion.div>

          {/* PREMIUM MOCKUP */}
          <PremiumMockup />
        </motion.div>
      </section>

      {/* EXPÉRIENCE DE TRAVAIL */}
      <WorkflowExperience />

      {/* ARK DÉMO RICHE */}
      <ARKDemoSection arkPhase={arkPhase} setArkPhase={setArkPhase} />

      {/* FEATURES */}
      <FeaturesSection />

      {/* PRICING */}
      <PricingSection navigate={navigate} />

      {/* FINAL CTA */}
      <FinalCTASection navigate={navigate} />

      {/* FOOTER */}
      <Footer />
    </div>
  )
}

// ===== PREMIUM MOCKUP COMPONENT =====
function PremiumMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.3, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
        border: '0.5px solid #e5e7eb',
        borderRadius: '18px',
        padding: '32px',
        boxShadow: '0 60px 120px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 40px rgba(37, 99, 235, 0.08)',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Browser Chrome */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '20px', borderBottom: '0.5px solid #e5e7eb', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', gap: '9px', fontFamily: 'Arial, sans-serif' }}>
          {['#ff5f57', '#ffbd2e', '#28c940'].map((color, idx) => (
            <motion.div key={color} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.6, delay: 1.35 + (idx * 0.12), ease: PREMIUM_EASE }} style={{ width: '14px', height: '14px', backgroundColor: color, borderRadius: '50%', fontFamily: 'Arial, sans-serif' }} />
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#999999', fontWeight: '500', flex: 1, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>courtia.app • Votre portefeuille</div>
        <div style={{ fontSize: '11px', color: '#999999', fontFamily: 'Arial, sans-serif' }}>🔒</div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', fontFamily: 'Arial, sans-serif' }}>
        {/* Sidebar Ultra Premium */}
        <motion.div
          initial={{ opacity: 0, x: -70 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 1.4, ease: PREMIUM_EASE }}
          style={{
            backgroundColor: '#0a0a0a',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.08)',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {[
            { name: 'Dashboard', icon: '📊', active: true },
            { name: 'Clients', icon: '👥', active: false },
            { name: 'Pipeline', icon: '🎯', active: false },
            { name: 'Calendrier', icon: '📅', active: false },
            { name: 'ARK', icon: '⚡', active: false }
          ].map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.5 + (idx * 0.1), ease: SMOOTH_EASE }}
              style={{
                fontSize: '11px',
                padding: '10px 14px',
                backgroundColor: item.active ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                color: item.active ? '#ffffff' : '#999999',
                borderRadius: '7px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <span>{item.icon}</span> {item.name}
            </motion.div>
          ))}
        </motion.div>

        {/* Right Content: Top Bar + Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Arial, sans-serif' }}>
          {/* Top Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.5, ease: SMOOTH_EASE }}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: '#f9fafb',
              border: '0.5px solid #e5e7eb',
              borderRadius: '8px',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>Tableau de bord</div>
            <div style={{ display: 'flex', gap: '8px', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ width: '24px', height: '24px', backgroundColor: '#2563eb', borderRadius: '50%', fontFamily: 'Arial, sans-serif' }} />
              <div style={{ width: '24px', height: '24px', backgroundColor: '#e5e7eb', borderRadius: '50%', fontFamily: 'Arial, sans-serif' }} />
            </div>
          </motion.div>

          {/* KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontFamily: 'Arial, sans-serif' }}>
            {[
              { label: 'Clients actifs', value: '2,847', trend: '+12%', icon: '👥' },
              { label: 'Contrats', value: '1,204', trend: '+8%', icon: '📋' },
              { label: 'Opportunités', value: '342', trend: '+24%', icon: '🎯', highlight: true },
              { label: 'Cette semaine', value: '94', trend: 'En cours', icon: '⚡' }
            ].map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.6 + (i * 0.1), ease: PREMIUM_EASE }}
                whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)' }}
                style={{
                  backgroundColor: kpi.highlight ? 'rgba(37, 99, 235, 0.08)' : '#f9fafb',
                  padding: '16px',
                  borderRadius: '9px',
                  border: kpi.highlight ? '1px solid #2563eb' : '0.5px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>
                  <span style={{ fontSize: '18px', fontFamily: 'Arial, sans-serif' }}>{kpi.icon}</span>
                  <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '600', fontFamily: 'Arial, sans-serif' }}>{kpi.trend}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#999999', marginBottom: '4px', fontFamily: 'Arial, sans-serif' }}>{kpi.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>{kpi.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Mini Clients Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.8, ease: SMOOTH_EASE }}
            style={{
              backgroundColor: '#f9fafb',
              border: '0.5px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #e5e7eb', fontSize: '10px', fontWeight: '600', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>Clients récents</div>
            {[
              { name: 'ABC Corp', status: 'Actif', value: '€45K' },
              { name: 'XYZ Insurance', status: 'En attente', value: '€12K' }
            ].map((client, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: i < 1 ? '0.5px solid #e5e7eb' : 'none', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666666', fontFamily: 'Arial, sans-serif' }}>
                <span style={{ fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>{client.name}</span>
                <span style={{ color: client.status === 'Actif' ? '#16a34a' : '#f97316', fontFamily: 'Arial, sans-serif' }}>●</span>
                <span style={{ fontWeight: '600', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>{client.value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

// ===== WORKFLOW EXPERIENCE SECTION =====
function WorkflowExperience() {
  return (
    <section id="expérience" style={{ minHeight: '140vh', backgroundColor: '#f5f5f5', padding: '160px 80px', fontFamily: 'Arial, sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, amount: 0.2 }} style={{ textAlign: 'center', marginBottom: '120px', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '22px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>EXPÉRIENCE DE TRAVAIL</p>
        <h2 style={{ fontSize: '56px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>Une histoire de travail intelligent</h2>
      </motion.div>

      {/* 6 Step Workflow */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', fontFamily: 'Arial, sans-serif' }}>
          {[
            { num: '1', title: 'Nouveau prospect', desc: 'Une fiche prospect arrive', icon: '📧', color: '#ff6b6b' },
            { num: '2', title: 'ARK l\'analyse', desc: 'Scoring, historique, potentiel', icon: '🔍', color: '#4ecdc4' },
            { num: '3', title: 'Opportunité détectée', desc: 'Renouvellement auto prévu', icon: '💡', color: '#ffd93d' },
            { num: '4', title: 'Email proposé', desc: 'ARK rédige un pitch personnalisé', icon: '✉️', color: '#6bcf7f' },
            { num: '5', title: 'Relance intelligente', desc: 'Rappel automatique planifié', icon: '⏰', color: '#a78bfa' },
            { num: '6', title: 'Vous gagnez du temps', desc: 'Passez à l\'affaire suivante', icon: '🎯', color: '#2563eb' }
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -16, boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12)' }}
              style={{
                padding: '40px 32px',
                backgroundColor: '#ffffff',
                border: '0.5px solid #e5e7eb',
                borderRadius: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
                fontFamily: 'Arial, sans-serif',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px', fontFamily: 'Arial, sans-serif' }}>{step.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: step.color, marginBottom: '12px', fontFamily: 'Arial, sans-serif' }}>#{step.num}</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px', margin: '0 0 10px 0', fontFamily: 'Arial, sans-serif' }}>{step.title}</h3>
              <p style={{ fontSize: '13px', color: '#666666', margin: 0, fontFamily: 'Arial, sans-serif' }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ===== ARK DÉMO RICHE =====
function ARKDemoSection({ arkPhase, setArkPhase }) {
  return (
    <section id="arkia" style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 80px', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ position: 'absolute', top: '50%', right: '-20%', transform: 'translateY(-50%)', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.9 }} viewport={{ once: true, amount: 0.3 }} style={{ maxWidth: '1000px', width: '100%', position: 'relative', zIndex: 1, fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '100px', fontFamily: 'Arial, sans-serif' }}>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: PREMIUM_EASE }} style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '22px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
            ARK — IA NATIVE
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.1, ease: PREMIUM_EASE }} style={{ fontSize: '60px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.15', fontFamily: 'Arial, sans-serif' }}>
            Votre assistant
            <br />
            <motion.span animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 3, repeat: Infinity }} style={{ color: '#2563eb', fontFamily: 'Arial, sans-serif' }}>
              opérant dans le système
            </motion.span>
          </motion.h2>
        </div>

        {/* Rich ARK Demo Chat */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.3 }}
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            backgroundColor: '#1a1a1a',
            border: '0.5px solid #333333',
            borderRadius: '18px',
            padding: '36px',
            minHeight: '420px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 0 100px rgba(37, 99, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            position: 'relative',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {/* Message 1: User input */}
          {arkPhase >= 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '14px 18px', borderRadius: '12px', maxWidth: '70%', fontSize: '13px', lineHeight: '1.6', fontWeight: '500', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)', fontFamily: 'Arial, sans-serif' }}>
                Analyse le portefeuille de ABC Corp
              </div>
            </motion.div>
          )}

          {/* Message 2: ARK analyzing state */}
          {arkPhase >= 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ display: 'flex', justifyContent: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ display: 'flex', gap: '12px', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', color: '#2563eb', padding: '14px 18px', borderRadius: '12px', maxWidth: '70%', fontSize: '13px', fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>
                    {[0, 1, 2].map(d => (
                      <motion.div key={d} animate={{ y: [0, -8, 0] }} transition={{ duration: 0.8, delay: d * 0.15, repeat: Infinity }} style={{ width: '6px', height: '6px', backgroundColor: '#2563eb', borderRadius: '50%', fontFamily: 'Arial, sans-serif' }} />
                    ))}
                  </div>
                  ARK analyse le portefeuille...
                </div>
              </div>
            </motion.div>
          )}

          {/* Message 3: Analysis result */}
          {arkPhase >= 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ display: 'flex', justifyContent: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#e5e7eb', padding: '16px 18px', borderRadius: '12px', maxWidth: '80%', fontSize: '13px', lineHeight: '1.7', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600', fontFamily: 'Arial, sans-serif' }}>
                  <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> Analyse complétée
                </div>
                📊 <strong>Score risque:</strong> 42/100 (excellent payeur)<br />
                💰 <strong>Opportunité:</strong> Renouvellement auto + complémentaire<br />
                ⏰ <strong>Action:</strong> Appeler avant 15 décembre
              </div>
            </motion.div>
          )}

          {/* Message 4: Action proposal */}
          {arkPhase >= 4 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ display: 'flex', justifyContent: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', color: '#e5e7eb', padding: '16px 18px', borderRadius: '12px', maxWidth: '80%', fontSize: '13px', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: '600', fontFamily: 'Arial, sans-serif' }}>
                  <Rocket size={16} style={{ color: '#2563eb' }} /> Suggestion d'action
                </div>
                <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '10px', fontFamily: 'Arial, sans-serif' }}>
                  ✉️ <strong>Email généré:</strong> "Bonjour, votre contrat auto expire le 15 décembre. Parlons de vos besoins actuels..."
                </div>
                <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', padding: '12px', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
                  📅 <strong>Relance:</strong> Programmée dans 3 jours si pas de réponse
                </div>
              </div>
            </motion.div>
          )}

          {arkPhase === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} style={{ textAlign: 'center', color: '#666666', fontSize: '13px', marginTop: '80px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
              <Sparkles size={16} style={{ marginRight: '10px' }} /> Cliquez pour voir ARK en action...
            </motion.div>
          )}
        </motion.div>

        {/* Demo Button */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: PREMIUM_EASE }} viewport={{ once: true, amount: 0.3 }} style={{ textAlign: 'center', marginTop: '64px', fontFamily: 'Arial, sans-serif' }}>
          <motion.button
            onClick={() => setArkPhase(arkPhase === 0 ? 1 : 0)}
            style={{
              padding: '15px 40px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 10px 32px rgba(37, 99, 235, 0.3)',
              fontFamily: 'Arial, sans-serif'
            }}
            whileHover={{ scale: 1.06, boxShadow: '0 16px 48px rgba(37, 99, 235, 0.5)' }}
            whileTap={{ scale: 0.94 }}
          >
            {arkPhase === 0 ? '▶️ Démarrer la démo' : '↻ Réinitialiser'}
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ===== FEATURES SECTION =====
function FeaturesSection() {
  return (
    <section style={{ minHeight: '100vh', backgroundColor: '#ffffff', padding: '160px 80px', display: 'flex', alignItems: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: PREMIUM_EASE }} viewport={{ once: true, amount: 0.3 }} style={{ textAlign: 'center', marginBottom: '100px', fontFamily: 'Arial, sans-serif' }}>
          <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '22px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
            FONCTIONNALITÉS
          </p>
          <h2 style={{ fontSize: '56px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>
            Tout ce dont un courtier a besoin
          </h2>
        </motion.div>

        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px', fontFamily: 'Arial, sans-serif' }}
          variants={{ animate: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } } }}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
        >
          {[
            { title: 'CRM métier', desc: 'Gestion clients intuitive avec scoring et historique', icon: '📊' },
            { title: 'Gestion contrats', desc: 'Suivi des polices, échéances et renouvellements', icon: '📋' },
            { title: 'Pipeline prospects', desc: 'Kanban drag-drop, scoring et automation', icon: '🎯' },
            { title: 'Calendrier échéances', desc: 'Rappels automatiques et briefs avant RDV', icon: '📅' },
            { title: 'Conformité DDA/RGPD', desc: 'Rapports auto-générés, audit trail complet', icon: '✅' },
            { title: 'ARK IA native', desc: 'Analyse, recommandations et emails en real-time', icon: '⚡' }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: PREMIUM_EASE }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: -14, boxShadow: '0 20px 48px rgba(0, 0, 0, 0.1)' }}
              style={{
                padding: '52px 40px',
                border: '0.5px solid #e5e7eb',
                borderRadius: '16px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '18px', fontFamily: 'Arial, sans-serif' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '19px', fontWeight: '700', marginBottom: '12px', margin: '0 0 12px 0', fontFamily: 'Arial, sans-serif' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#666666', lineHeight: '1.7', margin: 0, fontFamily: 'Arial, sans-serif' }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ===== PRICING SECTION =====
function PricingSection({ navigate }) {
  return (
    <section style={{ minHeight: '95vh', backgroundColor: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)', padding: '160px 80px', display: 'flex', alignItems: 'center', fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <motion.div animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity }} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '1000px', height: '600px', background: 'radial-gradient(ellipse, rgba(37, 99, 235, 0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1300px', width: '100%', margin: '0 auto', fontFamily: 'Arial, sans-serif', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: PREMIUM_EASE }} viewport={{ once: true, amount: 0.3 }} style={{ textAlign: 'center', marginBottom: '100px', fontFamily: 'Arial, sans-serif' }}>
          <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '22px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
            TARIFS EXCLUSIFS
          </p>
          <h2 style={{ fontSize: '56px', fontWeight: 'bold', margin: '0 0 16px 0', fontFamily: 'Arial, sans-serif' }}>
            Prix garantis à vie
          </h2>
          <p style={{ fontSize: '16px', color: '#666666', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            Rejoignez les fondateurs et bénéficiez de tarifs figés, quelle que soit l'évolution du produit.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', fontFamily: 'Arial, sans-serif' }}>
          {[
            { name: 'Start', old: '59€', price: '39€', features: ['CRM + 100 clients', 'ARK basique', 'Support email'], featured: false },
            { name: 'Pro', old: '99€', price: '69€', features: ['CRM + 500 clients', 'ARK complet', 'Support prioritaire', 'Automations illimitées'], featured: true },
            { name: 'Elite', old: '179€', price: '129€', features: ['CRM illimité', 'ARK + Opus', 'Onboarding perso', 'API access'], featured: false }
          ].map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: idx * 0.15, ease: PREMIUM_EASE }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={plan.featured ? { y: -20, scale: 1.03 } : { y: -12, scale: 1.01 }}
              style={{
                padding: '64px 48px',
                border: plan.featured ? '2px solid #0a0a0a' : '0.5px solid #d1d5db',
                borderRadius: '18px',
                backgroundColor: plan.featured ? '#0a0a0a' : '#ffffff',
                color: plan.featured ? '#ffffff' : '#0a0a0a',
                position: 'relative',
                boxShadow: plan.featured ? '0 60px 100px rgba(0, 0, 0, 0.25)' : '0 2px 16px rgba(0, 0, 0, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              {plan.featured && (
                <motion.div initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: PREMIUM_EASE }} viewport={{ once: true }} style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: '#ffffff', padding: '7px 18px', borderRadius: '18px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Arial, sans-serif', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)' }}>
                  <Crown size={12} /> Le meilleur choix
                </motion.div>
              )}

              <h3 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '24px', margin: plan.featured ? '16px 0 24px 0' : '0 0 24px 0', fontFamily: 'Arial, sans-serif' }}>
                {plan.name}
              </h3>

              <div style={{ marginBottom: '36px', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px', fontFamily: 'Arial, sans-serif' }}>
                  <span style={{ fontSize: '13px', opacity: 0.6, textDecoration: 'line-through', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>
                    {plan.old}
                  </span>
                  <span style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'Arial, sans-serif' }}>avant</span>
                </div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>
                  {plan.price}<span style={{ fontSize: '16px', opacity: 0.6, fontWeight: '500', marginLeft: '8px', fontFamily: 'Arial, sans-serif' }}>/mois</span>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '8px', fontFamily: 'Arial, sans-serif' }}>prix fondateur garanti à vie</div>
              </div>

              <ul style={{ marginBottom: '44px', gap: '16px', display: 'flex', flexDirection: 'column', padding: 0, listStyle: 'none', fontFamily: 'Arial, sans-serif' }}>
                {plan.features.map((feature, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 + (i * 0.08), ease: SMOOTH_EASE }} viewport={{ once: true }} style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>
                    <Check size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                    {feature}
                  </motion.li>
                ))}
              </ul>

              <motion.button
                onClick={() => navigate('/register')}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: plan.featured ? '#2563eb' : '#0a0a0a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: plan.featured ? '0 12px 36px rgba(37, 99, 235, 0.35)' : 'none',
                  fontFamily: 'Arial, sans-serif'
                }}
                whileHover={{ scale: 1.05, boxShadow: plan.featured ? '0 18px 48px rgba(37, 99, 235, 0.5)' : '0 8px 20px rgba(0,0,0,0.2)' }}
                whileTap={{ scale: 0.95 }}
              >
                {plan.featured ? '🚀 Réserver maintenant' : 'Commencer'}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ===== FINAL CTA SECTION =====
function FinalCTASection({ navigate }) {
  return (
    <section style={{ minHeight: '85vh', backgroundColor: '#ffffff', padding: '160px 80px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      <motion.div animate={{ opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 12, repeat: Infinity }} style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(ellipse, rgba(37, 99, 235, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 70 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: PREMIUM_EASE }} viewport={{ once: true, amount: 0.4 }} style={{ maxWidth: '1000px', position: 'relative', zIndex: 1, fontFamily: 'Arial, sans-serif' }}>
        <motion.h2 initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.1, ease: PREMIUM_EASE }} viewport={{ once: true, amount: 0.4 }} style={{ fontSize: '64px', fontWeight: 'bold', marginBottom: '28px', lineHeight: '1.2', fontFamily: 'Arial, sans-serif' }}>
          Rejoignez les courtiers
          <motion.span animate={{ opacity: [1, 0.6, 1], color: ['#2563eb', '#1e40af', '#2563eb'] }} transition={{ duration: 3.5, repeat: Infinity }} style={{ color: '#2563eb', display: 'block', marginTop: '12px', fontFamily: 'Arial, sans-serif' }}>
            du futur
          </motion.span>
        </motion.h2>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2, ease: SMOOTH_EASE }} viewport={{ once: true, amount: 0.4 }} style={{ fontSize: '17px', color: '#666666', marginBottom: '60px', lineHeight: '1.8', maxWidth: '700px', margin: '0 auto 60px', fontFamily: 'Arial, sans-serif' }}>
          L'offre fondateur se ferme rapidement. Ceux qui rejoignent maintenant bénéficieront de tarifs garantis à vie, avec accès à toutes les futures évolutions du produit.
        </motion.p>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3, ease: PREMIUM_EASE }} viewport={{ once: true, amount: 0.4 }} style={{ display: 'inline-block', padding: '20px 40px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '12px', marginBottom: '56px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: '13px', color: '#166534', fontWeight: '600', marginBottom: '6px', fontFamily: 'Arial, sans-serif' }}>
            PLACES FONDATEUR RESTANTES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
            <motion.span animate={{ color: ['#0a0a0a', '#2563eb', '#0a0a0a'] }} transition={{ duration: 2.5, repeat: Infinity }}>
              31
            </motion.span> / 50
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4, ease: PREMIUM_EASE }} viewport={{ once: true, amount: 0.4 }} style={{ marginBottom: '60px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ maxWidth: '500px', margin: '0 auto 16px', height: '3px', backgroundColor: '#e5e7eb', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} transition={{ duration: 2, delay: 0.5, ease: SMOOTH_EASE }} viewport={{ once: true, amount: 0.4 }} style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #2563eb 0%, #1e40af 100%)', transformOrigin: 'left', boxShadow: '0 0 16px rgba(37, 99, 235, 0.5)' }} />
          </div>
          <p style={{ fontSize: '12px', color: '#666666', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>62% des places réservées</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease: PREMIUM_EASE }} viewport={{ once: true, amount: 0.4 }}>
          <motion.button onClick={() => navigate('/register')} style={{ padding: '20px 56px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '9px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '14px', boxShadow: '0 20px 48px rgba(0, 0, 0, 0.2)', fontFamily: 'Arial, sans-serif' }} whileHover={{ backgroundColor: '#2563eb', scale: 1.07, boxShadow: '0 28px 64px rgba(37, 99, 235, 0.45)' }} whileTap={{ scale: 0.93 }}>
            Réserver ma place fondateur
            <ArrowRight size={20} />
          </motion.button>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.7, ease: SMOOTH_EASE }} viewport={{ once: true, amount: 0.4 }} style={{ fontSize: '12px', color: '#999999', marginTop: '48px', fontFamily: 'Arial, sans-serif' }}>
          ✓ Aucune carte de crédit requise • Accès immédiat au produit • Support prioritaire inclus
        </motion.p>
      </motion.div>
    </section>
  )
}

// ===== FOOTER =====
function Footer() {
  return (
    <footer style={{ padding: '100px 80px 60px', backgroundColor: '#ffffff', borderTop: '0.5px solid #e5e7eb', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '32px', letterSpacing: '3px', margin: '0 0 32px 0', fontFamily: 'Arial, sans-serif' }}>COURTIA</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '64px', marginBottom: '32px', fontSize: '12px', color: '#666666', fontFamily: 'Arial, sans-serif' }}>
        <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.3s', fontFamily: 'Arial, sans-serif' }} onMouseEnter={(e) => e.target.style.color = '#2563eb'} onMouseLeave={(e) => e.target.style.color = '#666666'}>Mentions légales</a>
        <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.3s', fontFamily: 'Arial, sans-serif' }} onMouseEnter={(e) => e.target.style.color = '#2563eb'} onMouseLeave={(e) => e.target.style.color = '#666666'}>Confidentialité</a>
        <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.3s', fontFamily: 'Arial, sans-serif' }} onMouseEnter={(e) => e.target.style.color = '#2563eb'} onMouseLeave={(e) => e.target.style.color = '#666666'}>Contact</a>
      </div>
      <div style={{ borderTop: '0.5px solid #e5e7eb', paddingTop: '32px', marginTop: '32px', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '12px', color: '#999999', marginBottom: '10px', fontFamily: 'Arial, sans-serif' }}>© 2026 COURTIA. Tous droits réservés.</p>
        <p style={{ fontSize: '11px', color: '#999999', fontWeight: '500', letterSpacing: '0.5px', margin: 0, fontFamily: 'Arial, sans-serif' }}>
          Créé par <span style={{ fontWeight: '700', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>RHASRHASS Dalil</span> <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '13px', display: 'inline-block', marginLeft: '4px', marginRight: '4px', fontFamily: 'Arial, sans-serif' }}>⊗</span> <span style={{ fontWeight: '700', color: '#0a0a0a', letterSpacing: '2px', fontFamily: 'Arial, sans-serif' }}>ARK</span>
        </p>
      </div>
    </footer>
  )
}
