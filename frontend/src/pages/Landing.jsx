import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useViewportScroll, useTransform, useMotionValue } from 'framer-motion'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { Check, ArrowRight, Zap, Sparkles, BarChart3, Users, Lightbulb, Rocket, Crown, Gift } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

// Premium easing curves
const PREMIUM_EASE = [0.16, 1, 0.3, 1]
const SMOOTH_EASE = [0.25, 0.46, 0.45, 0.94]
const BOUNCE_EASE = [0.34, 1.56, 0.64, 1]

export default function Landing() {
  const navigate = useNavigate()
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const containerRef = useRef(null)
  const pricingRef = useRef(null)
  const { scrollY } = useViewportScroll()

  // Parallax transforms
  const heroY = useTransform(scrollY, [0, 600], [0, 180])
  const mockupScale = useTransform(scrollY, [400, 900], [0.75, 1])
  const mockupOpacity = useTransform(scrollY, [300, 800], [0.2, 1])

  // ARK chat simulation
  useEffect(() => {
    if (showChat && chatMessages.length === 0) {
      setTimeout(() => {
        setChatMessages([{ role: 'user', text: 'Analyse ABC Corp' }])
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            role: 'ark',
            text: '📊 Score: 42/100 | 💰 Opportunité: Renouvellement | ⏰ Appel avant 15 déc',
            thinking: true
          }])
          setTimeout(() => {
            setChatMessages(prev => [...prev.map((m, i) => i === prev.length - 1 ? { ...m, thinking: false } : m)])
          }, 1200)
        }, 600)
      }, 400)
    }
  }, [showChat, chatMessages.length])

  // GSAP ScrollTrigger for Pricing section
  useEffect(() => {
    if (pricingRef.current) {
      const cards = pricingRef.current.querySelectorAll('[data-pricing-card]')
      cards.forEach((card, i) => {
        gsap.to(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            end: 'top 20%',
            scrub: 0.5,
            markers: false
          },
          y: -30 + (i * 5),
          opacity: 1,
          duration: 1
        })
      })
    }
  }, [])

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 1, ease: PREMIUM_EASE }
  }

  const staggerContainerPremium = {
    animate: {
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  }

  return (
    <div ref={containerRef} style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#0a0a0a', overflow: 'x-hidden' }}>
      {/* ===== NAVIGATION ===== */}
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
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Arial, sans-serif' }}>
          <motion.div
            style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '4px', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            COURTIA
          </motion.div>

          <div style={{ display: 'flex', gap: '70px', fontSize: '12px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>
            {['Fonctionnalités', 'Workflow', 'ARK IA', 'Tarifs'].map((link) => (
              <motion.a
                key={link}
                href={`#${link.toLowerCase().replace(' ', '')}`}
                style={{ textDecoration: 'none', color: '#0a0a0a', cursor: 'pointer', position: 'relative', fontFamily: 'Arial, sans-serif' }}
                whileHover={{ color: '#2563eb' }}
                transition={{ duration: 0.3 }}
              >
                {link}
              </motion.a>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '14px', fontFamily: 'Arial, sans-serif' }}>
            <motion.button
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0a0a0a',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                fontFamily: 'Arial, sans-serif'
              }}
              whileHover={{ color: '#2563eb' }}
            >
              Connexion
            </motion.button>
            <motion.button
              onClick={() => navigate('/register')}
              style={{
                padding: '11px 26px',
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif'
              }}
              whileHover={{ backgroundColor: '#2563eb', scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Démarrer
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ===== HERO SPECTACULAIRE ===== */}
      <section style={{ minHeight: '100vh', paddingTop: '100px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
        {/* Glow background */}
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '900px',
            height: '900px',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <motion.div style={{ y: heroY, maxWidth: '1100px', margin: '0 auto', padding: '0 80px', textAlign: 'center', width: '100%', position: 'relative', zIndex: 1, fontFamily: 'Arial, sans-serif' }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: PREMIUM_EASE }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              padding: '11px 20px',
              backgroundColor: '#f0fdf4',
              border: '0.5px solid #dcfce7',
              borderRadius: '26px',
              marginBottom: '50px',
              fontSize: '11px',
              color: '#166534',
              fontWeight: '600',
              backdropFilter: 'blur(10px)',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
              <Zap size={13} style={{ color: '#16a34a' }} />
            </motion.div>
            Offre Fondateur — 31 places restantes
          </motion.div>

          {/* Hero Title */}
          <div style={{ marginBottom: '32px', lineHeight: '1.1' }}>
            <motion.h1
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.2, ease: PREMIUM_EASE }}
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                letterSpacing: '-1.4px',
                margin: 0,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              Le CRM qui
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: -60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.4, ease: PREMIUM_EASE }}
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#2563eb',
                letterSpacing: '-1.4px',
                margin: '12px 0 0 0',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              pense & agit
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease: SMOOTH_EASE }}
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                letterSpacing: '-1.4px',
                margin: '12px 0 0 0',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              avec vous
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8, ease: SMOOTH_EASE }}
            style={{
              fontSize: '18px',
              color: '#64748b',
              marginBottom: '60px',
              lineHeight: '1.8',
              maxWidth: '720px',
              margin: '0 auto 60px',
              fontWeight: '400',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            ARK analyse. Détecte. Agit. Votre assistant IA natif qui transforme vos données en victoires commerciales, en temps réel.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1, ease: PREMIUM_EASE }}
            style={{ display: 'flex', gap: '18px', justifyContent: 'center', marginBottom: '120px', fontFamily: 'Arial, sans-serif' }}
          >
            <motion.button
              onClick={() => navigate('/register')}
              style={{
                padding: '16px 44px',
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
                fontFamily: 'Arial, sans-serif'
              }}
              whileHover={{ backgroundColor: '#2563eb', scale: 1.04, boxShadow: '0 18px 48px rgba(37, 99, 235, 0.35)' }}
              whileTap={{ scale: 0.96 }}
            >
              Rejoindre — 69€/mois
              <ArrowRight size={17} />
            </motion.button>
            <motion.button
              style={{
                padding: '16px 44px',
                backgroundColor: '#ffffff',
                color: '#0a0a0a',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'Arial, sans-serif'
              }}
              whileHover={{ borderColor: '#0a0a0a', backgroundColor: '#f8f9fa', scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Voir la démo
            </motion.button>
          </motion.div>

          {/* Premium Product Mockup */}
          <motion.div
            style={{ scale: mockupScale, opacity: mockupOpacity }}
            transition={{ duration: 0.6 }}
          >
            <ProductMockup />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== WORKFLOW EXPERIENCE SECTION ===== */}
      <WorkflowSection />

      {/* ===== ARK SECTION ===== */}
      <ARKSection showChat={showChat} setShowChat={setShowChat} chatMessages={chatMessages} setChatMessages={setChatMessages} />

      {/* ===== FONCTIONNALITÉS ===== */}
      <FeaturesSection />

      {/* ===== PRICING PREMIUM ===== */}
      <PricingSection pricingRef={pricingRef} navigate={navigate} />

      {/* ===== FINAL CTA ULTRA-STRONG ===== */}
      <FinalCTASection navigate={navigate} />

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  )
}

// ===== PRODUCT MOCKUP =====
function ProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.3, delay: 1.2, ease: PREMIUM_EASE }}
      style={{
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        border: '0.5px solid #e5e7eb',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: '0 50px 100px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        aspectRatio: '16/9',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        perspective: 1000
      }}
    >
      {/* Browser Chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '0.5px solid #e5e7eb', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', gap: '9px' }}>
          {['#ff5f57', '#ffbd2e', '#28c940'].map((color, idx) => (
            <motion.div
              key={color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 1.35 + (idx * 0.12), ease: PREMIUM_EASE }}
              style={{
                width: '14px',
                height: '14px',
                backgroundColor: color,
                borderRadius: '50%'
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#999999', flex: 1, textAlign: 'center', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>
          courtia.app
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ display: 'flex', flex: 1, gap: '24px', fontFamily: 'Arial, sans-serif' }}>
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -70 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 1.4, ease: PREMIUM_EASE }}
          style={{
            width: '240px',
            backgroundColor: '#0a0a0a',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.08)',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {['Dashboard', 'Clients', 'Pipeline', 'Calendrier', 'ARK'].map((item, idx) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.5 + (idx * 0.1), ease: SMOOTH_EASE }}
              style={{
                fontSize: '12px',
                padding: '11px 16px',
                backgroundColor: item === 'Dashboard' ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                color: item === 'Dashboard' ? '#ffffff' : '#999999',
                borderRadius: '7px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                fontFamily: 'Arial, sans-serif'
              }}
            />
          ))}
        </motion.div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontFamily: 'Arial, sans-serif' }}>
          {[
            { label: 'Total clients', value: '2,847', icon: '👥' },
            { label: 'Contrats actifs', value: '1,204', icon: '📋' },
            { label: 'Opportunités', value: '342', icon: '🎯' },
            { label: 'Taux conversion', value: '34%', icon: '📈' }
          ].map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.6 + (i * 0.12), ease: PREMIUM_EASE }}
              whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)' }}
              style={{
                backgroundColor: '#f8f9fa',
                padding: '18px',
                borderRadius: '10px',
                textAlign: 'center',
                border: '0.5px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>{kpi.icon}</div>
              <div style={{ fontSize: '10px', color: '#999999', marginBottom: '6px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: '19px', fontWeight: 'bold', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
                {kpi.value}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ===== WORKFLOW SECTION =====
function WorkflowSection() {
  return (
    <section style={{ minHeight: '120vh', backgroundColor: '#f5f5f5', padding: '160px 80px', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: PREMIUM_EASE }}
        viewport={{ once: true, amount: 0.2 }}
        style={{ textAlign: 'center', marginBottom: '120px', fontFamily: 'Arial, sans-serif' }}
      >
        <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '22px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
          WORKFLOW INTELLIGENT
        </p>
        <h2 style={{ fontSize: '56px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>
          Voir COURTIA en action
        </h2>
      </motion.div>

      {/* Workflow Steps */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '28px', fontFamily: 'Arial, sans-serif' }}
          variants={{
            animate: {
              transition: { staggerChildren: 0.2, delayChildren: 0.1 }
            }
          }}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.2 }}
        >
          {[
            { step: '01', title: 'Un client arrive', desc: 'Nouveau contact détecté automatiquement', icon: Users },
            { step: '02', title: 'ARK l\'analyse', desc: 'Scoring, historique, opportunités', icon: BarChart3 },
            { step: '03', title: 'Intelligence appliquée', desc: 'Recommandations en temps réel', icon: Lightbulb },
            { step: '04', title: 'Action suggérée', desc: 'Email rédigé, relance programmée', icon: Rocket }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: PREMIUM_EASE }}
              viewport={{ once: true, amount: 0.3 }}
              whileHover={{ y: -16, boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12)' }}
              style={{
                padding: '48px 32px',
                backgroundColor: '#ffffff',
                border: '0.5px solid #e5e7eb',
                borderRadius: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.4s ease',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', marginBottom: '16px', fontFamily: 'Arial, sans-serif' }}>
                {item.step}
              </div>
              <item.icon size={32} style={{ color: '#2563eb', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '10px', margin: '0 0 10px 0', fontFamily: 'Arial, sans-serif' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#666666', lineHeight: '1.6', margin: 0, fontFamily: 'Arial, sans-serif' }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ===== ARK SECTION =====
function ARKSection({ showChat, setShowChat, chatMessages, setChatMessages }) {
  return (
    <section style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '100px 80px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: '-20%',
        transform: 'translateY(-50%)',
        width: '700px',
        height: '700px',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.9 }}
        viewport={{ once: true, amount: 0.3 }}
        style={{ maxWidth: '1000px', width: '100%', position: 'relative', zIndex: 1, fontFamily: 'Arial, sans-serif' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '100px', fontFamily: 'Arial, sans-serif' }}>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: PREMIUM_EASE }}
            style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '22px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}
          >
            ARK — IA NATIVE
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: PREMIUM_EASE }}
            style={{ fontSize: '60px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.15', fontFamily: 'Arial, sans-serif' }}
          >
            Votre assistant
            <br />
            <motion.span
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ color: '#2563eb', fontFamily: 'Arial, sans-serif' }}
            >
              opérant dans le système
            </motion.span>
          </motion.h2>
        </div>

        {/* Chat Premium */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.3 }}
          style={{
            maxWidth: '750px',
            margin: '0 auto',
            backgroundColor: '#1a1a1a',
            border: '0.5px solid #333333',
            borderRadius: '18px',
            padding: '36px',
            minHeight: '380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 0 80px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
            position: 'relative',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          <AnimatePresence>
            {chatMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: SMOOTH_EASE }}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                <div style={{
                  backgroundColor: msg.role === 'user' ? '#2563eb' : 'rgba(37, 99, 235, 0.12)',
                  color: msg.role === 'user' ? '#ffffff' : '#e5e7eb',
                  padding: '16px 20px',
                  borderRadius: '13px',
                  maxWidth: '75%',
                  fontSize: '13px',
                  lineHeight: '1.7',
                  fontWeight: msg.role === 'user' ? '500' : '400',
                  boxShadow: msg.role === 'user' ? '0 6px 16px rgba(37, 99, 235, 0.3)' : 'none',
                  fontFamily: 'Arial, sans-serif'
                }}>
                  {msg.thinking && (
                    <motion.div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      {[0, 1, 2].map((d) => (
                        <motion.div
                          key={d}
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.8, delay: d * 0.15, repeat: Infinity }}
                          style={{
                            width: '6px',
                            height: '6px',
                            backgroundColor: '#2563eb',
                            borderRadius: '50%'
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {chatMessages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              style={{ textAlign: 'center', color: '#666666', fontSize: '13px', marginTop: '80px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}
            >
              <Sparkles size={16} style={{ marginRight: '10px' }} /> Cliquez pour voir ARK analyser un client...
            </motion.div>
          )}
        </motion.div>

        {/* Demo Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.3 }}
          style={{ textAlign: 'center', marginTop: '64px', fontFamily: 'Arial, sans-serif' }}
        >
          <motion.button
            onClick={() => { setShowChat(!showChat); setChatMessages([]); }}
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
            {showChat ? 'Réinitialiser' : 'Voir la démo'}
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
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.3 }}
          style={{ textAlign: 'center', marginBottom: '100px', fontFamily: 'Arial, sans-serif' }}
        >
          <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '22px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
            FONCTIONNALITÉS
          </p>
          <h2 style={{ fontSize: '56px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>
            Tout ce dont un courtier a besoin
          </h2>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px', fontFamily: 'Arial, sans-serif' }}
          variants={{
            animate: {
              transition: { staggerChildren: 0.15, delayChildren: 0.1 }
            }
          }}
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

// ===== PRICING PREMIUM ENHANCED =====
function PricingSection({ pricingRef, navigate }) {
  return (
    <section ref={pricingRef} id="tarifs" style={{ minHeight: '95vh', backgroundColor: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)', padding: '160px 80px', display: 'flex', alignItems: 'center', fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle background glow */}
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '1000px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(37, 99, 235, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ maxWidth: '1300px', width: '100%', margin: '0 auto', fontFamily: 'Arial, sans-serif', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.3 }}
          style={{ textAlign: 'center', marginBottom: '100px', fontFamily: 'Arial, sans-serif' }}
        >
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

        {/* Pricing Cards with enhanced styling */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', fontFamily: 'Arial, sans-serif' }}>
          {[
            { name: 'Start', old: '59€', price: '39€', features: ['CRM + 100 clients', 'ARK basique', 'Support email'], featured: false },
            { name: 'Pro', old: '99€', price: '69€', features: ['CRM + 500 clients', 'ARK complet', 'Support prioritaire', 'Automations illimitées'], featured: true },
            { name: 'Elite', old: '179€', price: '129€', features: ['CRM illimité', 'ARK + Opus', 'Onboarding perso', 'API access'], featured: false }
          ].map((plan, idx) => (
            <motion.div
              key={idx}
              data-pricing-card
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
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3, ease: PREMIUM_EASE }}
                  viewport={{ once: true }}
                  style={{
                    position: 'absolute',
                    top: '-18px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                    color: '#ffffff',
                    padding: '7px 18px',
                    borderRadius: '18px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'Arial, sans-serif',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  <Crown size={12} /> Le meilleur choix
                </motion.div>
              )}

              {/* Plan Name */}
              <h3 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '24px', margin: plan.featured ? '16px 0 24px 0' : '0 0 24px 0', fontFamily: 'Arial, sans-serif' }}>
                {plan.name}
              </h3>

              {/* Price */}
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

              {/* Features List */}
              <ul style={{ marginBottom: '44px', gap: '16px', display: 'flex', flexDirection: 'column', padding: 0, listStyle: 'none', fontFamily: 'Arial, sans-serif' }}>
                {plan.features.map((feature, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + (i * 0.08), ease: SMOOTH_EASE }}
                    viewport={{ once: true }}
                    style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}
                  >
                    <Check size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                    {feature}
                  </motion.li>
                ))}
              </ul>

              {/* CTA Button */}
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

// ===== FINAL CTA ULTRA-PREMIUM =====
function FinalCTASection({ navigate }) {
  return (
    <section style={{ minHeight: '85vh', backgroundColor: '#ffffff', padding: '160px 80px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      {/* Subtle glow */}
      <motion.div
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 12, repeat: Infinity }}
        style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(37, 99, 235, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 70 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: PREMIUM_EASE }}
        viewport={{ once: true, amount: 0.4 }}
        style={{ maxWidth: '1000px', position: 'relative', zIndex: 1, fontFamily: 'Arial, sans-serif' }}
      >
        {/* Main CTA Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.4 }}
          style={{ fontSize: '64px', fontWeight: 'bold', marginBottom: '28px', lineHeight: '1.2', fontFamily: 'Arial, sans-serif' }}
        >
          Rejoignez les courtiers
          <motion.span
            animate={{ opacity: [1, 0.6, 1], color: ['#2563eb', '#1e40af', '#2563eb'] }}
            transition={{ duration: 3.5, repeat: Infinity }}
            style={{ color: '#2563eb', display: 'block', marginTop: '12px', fontFamily: 'Arial, sans-serif' }}
          >
            du futur
          </motion.span>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: SMOOTH_EASE }}
          viewport={{ once: true, amount: 0.4 }}
          style={{ fontSize: '17px', color: '#666666', marginBottom: '60px', lineHeight: '1.8', maxWidth: '700px', margin: '0 auto 60px', fontFamily: 'Arial, sans-serif' }}
        >
          L'offre fondateur se ferme rapidement. Ceux qui rejoignent maintenant bénéficieront de tarifs garantis à vie, avec accès à toutes les futures évolutions du produit.
        </motion.p>

        {/* Exclusivity Counter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.4 }}
          style={{
            display: 'inline-block',
            padding: '20px 40px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #dcfce7',
            borderRadius: '12px',
            marginBottom: '56px',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          <div style={{ fontSize: '13px', color: '#166534', fontWeight: '600', marginBottom: '6px', fontFamily: 'Arial, sans-serif' }}>
            PLACES FONDATEUR RESTANTES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
            <motion.span
              animate={{ color: ['#0a0a0a', '#2563eb', '#0a0a0a'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              31
            </motion.span> / 50
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.4 }}
          style={{ marginBottom: '60px', fontFamily: 'Arial, sans-serif' }}
        >
          <div style={{
            maxWidth: '500px',
            margin: '0 auto 16px',
            height: '3px',
            backgroundColor: '#e5e7eb',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              transition={{ duration: 2, delay: 0.5, ease: SMOOTH_EASE }}
              viewport={{ once: true, amount: 0.4 }}
              style={{
                height: '100%',
                width: '100%',
                background: 'linear-gradient(90deg, #2563eb 0%, #1e40af 100%)',
                transformOrigin: 'left',
                boxShadow: '0 0 16px rgba(37, 99, 235, 0.5)'
              }}
            />
          </div>
          <p style={{ fontSize: '12px', color: '#666666', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>62% des places réservées</p>
        </motion.div>

        {/* Main CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.button
            onClick={() => navigate('/register')}
            style={{
              padding: '20px 56px',
              backgroundColor: '#0a0a0a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.2)',
              fontFamily: 'Arial, sans-serif'
            }}
            whileHover={{ backgroundColor: '#2563eb', scale: 1.07, boxShadow: '0 28px 64px rgba(37, 99, 235, 0.45)' }}
            whileTap={{ scale: 0.93 }}
          >
            <Gift size={20} />
            Réserver ma place fondateur
            <ArrowRight size={20} />
          </motion.button>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: SMOOTH_EASE }}
          viewport={{ once: true, amount: 0.4 }}
          style={{ fontSize: '12px', color: '#999999', marginTop: '48px', fontFamily: 'Arial, sans-serif' }}
        >
          ✓ Aucune carte de crédit requise • Accès immédiat au produit • Support prioritaire inclus
        </motion.p>
      </motion.div>
    </section>
  )
}

// ===== FOOTER =====
function Footer() {
  return (
    <footer style={{
      padding: '100px 80px 60px',
      backgroundColor: '#ffffff',
      borderTop: '0.5px solid #e5e7eb',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
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
