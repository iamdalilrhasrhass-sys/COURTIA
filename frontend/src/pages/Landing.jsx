import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useViewportScroll, useTransform, useMotionValue } from 'framer-motion'
import { Check, ArrowRight, Zap, Sparkles } from 'lucide-react'

// Premium easing
const PREMIUM_EASE = [0.16, 1, 0.3, 1]
const SMOOTH_EASE = [0.25, 0.46, 0.45, 0.94]

export default function Landing() {
  const navigate = useNavigate()
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatTyping, setChatTyping] = useState(false)
  const scrollRef = useRef(null)
  const { scrollY } = useViewportScroll()

  // Parallax transforms
  const heroY = useTransform(scrollY, [0, 500], [0, 150])
  const mockupScale = useTransform(scrollY, [300, 800], [0.8, 1])
  const mockupOpacity = useTransform(scrollY, [300, 700], [0.3, 1])

  // ARK chat simulation
  useEffect(() => {
    if (showChat && chatMessages.length === 0) {
      setTimeout(() => {
        setChatMessages([{ role: 'user', text: 'Analyse du client ABC Corp' }])
        setTimeout(() => {
          setChatTyping(true)
          setTimeout(() => {
            setChatMessages(prev => [...prev, {
              role: 'ark',
              text: '📊 Score risque: 42/100 (bon payeur) | 💰 Opportunité: Renouvellement + complémentaire | ⏰ À faire: Appeler avant 15 déc'
            }])
            setChatTyping(false)
          }, 1200)
        }, 600)
      }, 400)
    }
  }, [showChat, chatMessages.length])

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: PREMIUM_EASE }
  }

  const fadeInDown = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: PREMIUM_EASE }
  }

  const staggerContainerPremium = {
    animate: {
      transition: { staggerChildren: 0.12, delayChildren: 0.15 }
    }
  }

  const cardHoverVariant = {
    initial: { y: 0 },
    whileHover: { y: -12, transition: { duration: 0.4, ease: SMOOTH_EASE } }
  }

  return (
    <div ref={scrollRef} style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#0a0a0a', overflow: 'hidden' }}>
      {/* NAVIGATION - Premium Fixed */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: SMOOTH_EASE }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderBottom: '0.5px solid #e5e7eb',
          zIndex: 100,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <motion.div
            style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '4px', cursor: 'pointer' }}
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            COURTIA
          </motion.div>

          <div style={{ display: 'flex', gap: '60px', fontSize: '12px', fontWeight: '500' }}>
            {['Fonctionnalités', 'ARK IA', 'Tarifs'].map((link) => (
              <motion.a
                key={link}
                href={`#${link.toLowerCase().replace(' ', '')}`}
                style={{ textDecoration: 'none', color: '#0a0a0a', cursor: 'pointer', position: 'relative' }}
                whileHover={{ color: '#2563eb' }}
                transition={{ duration: 0.3 }}
              >
                {link}
              </motion.a>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0a0a0a',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
              whileHover={{ color: '#2563eb' }}
            >
              Connexion
            </motion.button>
            <motion.button
              onClick={() => navigate('/register')}
              style={{
                padding: '10px 24px',
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              whileHover={{ backgroundColor: '#2563eb', scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Démarrer
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ===== HERO CINÉMATIQUE ===== */}
      <section style={{ minHeight: '100vh', paddingTop: '80px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <motion.div style={{ y: heroY }} style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 60px', textAlign: 'center', width: '100%', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: PREMIUM_EASE }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#f0fdf4',
              border: '0.5px solid #dcfce7',
              borderRadius: '24px',
              marginBottom: '40px',
              fontSize: '11px',
              color: '#166534',
              fontWeight: '600',
              backdropFilter: 'blur(8px)'
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap size={13} style={{ color: '#16a34a' }} />
            </motion.div>
            Offre Fondateur — 31 places restantes
          </motion.div>

          {/* H1 - Premium Split Animation */}
          <div style={{ marginBottom: '28px', lineHeight: '1.15' }}>
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.15, ease: PREMIUM_EASE }}
              style={{
                fontSize: '68px',
                fontWeight: 'bold',
                letterSpacing: '-1.2px',
                margin: 0
              }}
            >
              Le CRM qui pense
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.35, ease: PREMIUM_EASE }}
              style={{
                fontSize: '68px',
                fontWeight: 'bold',
                color: '#2563eb',
                letterSpacing: '-1.2px',
                margin: '8px 0 0 0'
              }}
            >
              à votre place
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.55, ease: SMOOTH_EASE }}
            style={{
              fontSize: '17px',
              color: '#64748b',
              marginBottom: '52px',
              lineHeight: '1.75',
              maxWidth: '680px',
              margin: '0 auto 52px',
              fontWeight: '400'
            }}
          >
            ARK analyse vos clients, détecte vos opportunités et rédige vos emails. En temps réel. Pendant que vous travaillez.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease: PREMIUM_EASE }}
            style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '100px' }}
          >
            <motion.button
              onClick={() => navigate('/register')}
              style={{
                padding: '15px 40px',
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)'
              }}
              whileHover={{ backgroundColor: '#2563eb', scale: 1.03, boxShadow: '0 15px 40px rgba(37, 99, 235, 0.3)' }}
              whileTap={{ scale: 0.96 }}
            >
              Rejoindre — 69€/mois
              <ArrowRight size={16} />
            </motion.button>
            <motion.button
              style={{
                padding: '15px 40px',
                backgroundColor: '#ffffff',
                color: '#0a0a0a',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              whileHover={{ borderColor: '#0a0a0a', backgroundColor: '#f8f9fa', scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
            >
              Voir la démo
            </motion.button>
          </motion.div>

          {/* Product Mockup - Reveal Progressive */}
          <motion.div
            style={{ scale: mockupScale, opacity: mockupOpacity }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.85, ease: PREMIUM_EASE }}
              style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                border: '0.5px solid #e5e7eb',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 40px 80px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                aspectRatio: '16/9',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Browser Chrome */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '0.5px solid #e5e7eb' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#ff5f57', '#ffbd2e', '#28c940'].map((color, idx) => (
                    <motion.div
                      key={color}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, delay: 1.1 + (idx * 0.1), ease: PREMIUM_EASE }}
                      style={{
                        width: '13px',
                        height: '13px',
                        backgroundColor: color,
                        borderRadius: '50%'
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#999999', flex: 1, textAlign: 'center', fontWeight: '500' }}>
                  courtia.local
                </div>
              </div>

              {/* Mockup Content Grid */}
              <div style={{ display: 'flex', flex: 1, gap: '20px' }}>
                {/* Sidebar */}
                <motion.div
                  initial={{ opacity: 0, x: -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.9, delay: 1.15, ease: PREMIUM_EASE }}
                  style={{
                    width: '220px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '10px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {['Dashboard', 'Clients', 'Pipeline', 'Calendrier', 'ARK'].map((item, idx) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 1.25 + (idx * 0.08), ease: SMOOTH_EASE }}
                      style={{
                        fontSize: '11px',
                        padding: '10px 14px',
                        backgroundColor: item === 'Dashboard' ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                        color: item === 'Dashboard' ? '#ffffff' : '#999999',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </motion.div>

                {/* KPI Cards Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.9, delay: 1.3, ease: PREMIUM_EASE }}
                  style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}
                >
                  {[
                    { label: 'Total clients', value: '2,847', delay: 1.4 },
                    { label: 'Contrats actifs', value: '1,204', delay: 1.5 },
                    { label: 'Opportunités', value: '342', delay: 1.6 },
                    { label: 'Taux conversion', value: '34%', delay: 1.7 }
                  ].map((kpi, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.75, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: kpi.delay, ease: PREMIUM_EASE }}
                      whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)' }}
                      style={{
                        backgroundColor: '#f8f9fa',
                        padding: '16px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '0.5px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ fontSize: '10px', color: '#999999', marginBottom: '6px', fontWeight: '500' }}>
                        {kpi.label}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0a0a0a' }}>
                        {kpi.value}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== ARK SECTION - Premium Dark ===== */}
      <section style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 60px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow background */}
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '0',
          transform: 'translateY(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, amount: 0.3 }}
          style={{ maxWidth: '1000px', width: '100%', position: 'relative', zIndex: 1 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '100px' }}>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: PREMIUM_EASE }}
              style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '20px', fontWeight: '600', textTransform: 'uppercase' }}
            >
              ARK — IA NATIVE
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: PREMIUM_EASE }}
              style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.2' }}
            >
              Votre bras droit digital.
              <br />
              <motion.span
                style={{ color: '#2563eb' }}
                animate={{ opacity: [1, 0.8, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Disponible 24h/24.
              </motion.span>
            </motion.h2>
          </div>

          {/* Chat Premium Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: PREMIUM_EASE }}
            viewport={{ once: true, amount: 0.3 }}
            style={{
              maxWidth: '700px',
              margin: '0 auto',
              backgroundColor: '#1a1a1a',
              border: '0.5px solid #333333',
              borderRadius: '16px',
              padding: '32px',
              minHeight: '350px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 0 60px rgba(37, 99, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              position: 'relative'
            }}
          >
            {/* Typing indicator */}
            {chatTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', gap: '6px', justifyContent: 'flex-start' }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#2563eb',
                      borderRadius: '50%'
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* Chat Messages */}
            <AnimatePresence>
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: SMOOTH_EASE }}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    backgroundColor: msg.role === 'user' ? '#2563eb' : 'rgba(37, 99, 235, 0.15)',
                    color: msg.role === 'user' ? '#ffffff' : '#e5e7eb',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    maxWidth: '75%',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    fontWeight: msg.role === 'user' ? '500' : '400',
                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
                  }}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {chatMessages.length === 0 && !chatTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                style={{ textAlign: 'center', color: '#666666', fontSize: '13px', marginTop: '60px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Sparkles size={16} style={{ marginRight: '8px' }} /> Cliquez pour voir ARK en action...
              </motion.div>
            )}
          </motion.div>

          {/* Demo Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: PREMIUM_EASE }}
            viewport={{ once: true, amount: 0.3 }}
            style={{ textAlign: 'center', marginTop: '56px' }}
          >
            <motion.button
              onClick={() => { setShowChat(!showChat); setChatMessages([]); }}
              style={{
                padding: '13px 32px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)'
              }}
              whileHover={{ scale: 1.05, boxShadow: '0 12px 32px rgba(37, 99, 235, 0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              {showChat ? 'Réinitialiser' : 'Démarrer la démo'}
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* ===== FONCTIONNALITÉS - Cascade ===== */}
      <section style={{ minHeight: '100vh', backgroundColor: '#ffffff', padding: '140px 60px', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: PREMIUM_EASE }}
            viewport={{ once: true, amount: 0.3 }}
            style={{ textAlign: 'center', marginBottom: '100px' }}
          >
            <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '20px', fontWeight: '600', textTransform: 'uppercase' }}>
              FONCTIONNALITÉS
            </p>
            <h2 style={{ fontSize: '52px', fontWeight: 'bold', margin: 0 }}>
              Tout ce dont un courtier a besoin
            </h2>
          </motion.div>

          {/* Features Grid - Cascade */}
          <motion.div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '36px' }}
            variants={staggerContainerPremium}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              { title: 'CRM métier', desc: 'Gestion clients intuitive avec scoring et historique complet', icon: '📊' },
              { title: 'Gestion contrats', desc: 'Suivi des polices, échéances et renouvellements', icon: '📋' },
              { title: 'Pipeline prospects', desc: 'Kanban drag-drop, scoring et automation', icon: '🎯' },
              { title: 'Calendrier échéances', desc: 'Rappels automatiques et briefs avant RDV', icon: '📅' },
              { title: 'Conformité DDA/RGPD', desc: 'Rapports auto-générés, audit trail complet', icon: '✅' },
              { title: 'ARK IA native', desc: 'Analyse, recommandations et emails en real-time', icon: '⚡' }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -12, transition: { duration: 0.4, ease: SMOOTH_EASE } }}
                style={{
                  padding: '48px 36px',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '14px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', margin: '0 0 12px 0' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#666666', lineHeight: '1.7', margin: 0 }}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section style={{ minHeight: '80vh', backgroundColor: '#f5f5f5', padding: '140px 60px', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: PREMIUM_EASE }}
            viewport={{ once: true, amount: 0.3 }}
            style={{ textAlign: 'center', marginBottom: '80px' }}
          >
            <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '3px', marginBottom: '20px', fontWeight: '600', textTransform: 'uppercase' }}>
              TARIFS FONDATEUR
            </p>
            <h2 style={{ fontSize: '52px', fontWeight: 'bold', margin: 0 }}>
              Prix garantis à vie
            </h2>
          </motion.div>

          {/* Pricing Cards - Cascade */}
          <motion.div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '36px' }}
            variants={staggerContainerPremium}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              { name: 'Start', old: '59€', price: '39€', features: ['CRM + 100 clients', 'ARK basique', 'Support email'], featured: false },
              { name: 'Pro', old: '99€', price: '69€', features: ['CRM + 500 clients', 'ARK complet', 'Support prioritaire', 'Automations illimitées'], featured: true },
              { name: 'Elite', old: '179€', price: '129€', features: ['CRM illimité', 'ARK + Opus', 'Onboarding perso', 'API access'], featured: false }
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={cardHoverVariant.whileHover}
                style={{
                  padding: '56px 40px',
                  border: plan.featured ? '1.5px solid #0a0a0a' : '0.5px solid #d1d5db',
                  borderRadius: '14px',
                  backgroundColor: plan.featured ? '#0a0a0a' : '#ffffff',
                  color: plan.featured ? '#ffffff' : '#0a0a0a',
                  position: 'relative',
                  boxShadow: plan.featured ? '0 30px 60px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {plan.featured && (
                  <div style={{
                    position: 'absolute',
                    top: '-13px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '5px 14px',
                    borderRadius: '14px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Le plus choisi
                  </div>
                )}
                <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '18px', margin: '0 0 18px 0' }}>
                  {plan.name}
                </h3>
                <div style={{ marginBottom: '28px' }}>
                  <span style={{ fontSize: '12px', opacity: 0.6, textDecoration: 'line-through', fontWeight: '500' }}>
                    {plan.old}
                  </span>
                  <div style={{ fontSize: '40px', fontWeight: 'bold', marginTop: '6px' }}>
                    {plan.price}<span style={{ fontSize: '15px', opacity: 0.6, fontWeight: '500', marginLeft: '4px' }}>/mois</span>
                  </div>
                </div>
                <ul style={{ marginBottom: '36px', gap: '14px', display: 'flex', flexDirection: 'column', padding: 0, listStyle: 'none' }}>
                  {plan.features.map((feature, i) => (
                    <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', fontWeight: '500' }}>
                      <Check size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <motion.button
                  onClick={() => navigate('/register')}
                  style={{
                    width: '100%',
                    padding: '13px 24px',
                    backgroundColor: plan.featured ? '#2563eb' : '#0a0a0a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: plan.featured ? '0 8px 24px rgba(37, 99, 235, 0.3)' : 'none'
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Commencer
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section style={{ minHeight: '60vh', backgroundColor: '#ffffff', padding: '140px 60px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: PREMIUM_EASE }}
          viewport={{ once: true, amount: 0.3 }}
          style={{ maxWidth: '900px' }}
        >
          <h2 style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '24px', lineHeight: '1.2' }}>
            Rejoignez les
            <motion.span
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ color: '#2563eb', display: 'block' }}
            >
              fondateurs
            </motion.span>
          </h2>

          {/* Progress Bar Animated */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: PREMIUM_EASE }}
            viewport={{ once: true, amount: 0.5 }}
            style={{ marginBottom: '56px' }}
          >
            <div style={{
              maxWidth: '400px',
              margin: '0 auto 20px',
              height: '2px',
              backgroundColor: '#e5e7eb',
              borderRadius: '1px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                transition={{ duration: 1.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                viewport={{ once: true, amount: 0.5 }}
                style={{
                  height: '100%',
                  width: '100%',
                  backgroundColor: '#0a0a0a',
                  transformOrigin: 'left'
                }}
              />
            </div>
            <p style={{ fontSize: '13px', color: '#666666', fontWeight: '500' }}>31 sur 50 places réservées</p>
          </motion.div>

          <motion.button
            onClick={() => navigate('/register')}
            style={{
              padding: '16px 48px',
              backgroundColor: '#0a0a0a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)'
            }}
            whileHover={{ backgroundColor: '#2563eb', scale: 1.05, boxShadow: '0 16px 40px rgba(37, 99, 235, 0.4)' }}
            whileTap={{ scale: 0.95 }}
          >
            Réserver ma place
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '80px 60px 50px',
        backgroundColor: '#ffffff',
        borderTop: '0.5px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '28px', letterSpacing: '3px', margin: '0 0 28px 0' }}>COURTIA</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '56px', marginBottom: '28px', fontSize: '12px', color: '#666666' }}>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.3s' }} onMouseEnter={(e) => e.target.style.color = '#2563eb'} onMouseLeave={(e) => e.target.style.color = '#666666'}>Mentions légales</a>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.3s' }} onMouseEnter={(e) => e.target.style.color = '#2563eb'} onMouseLeave={(e) => e.target.style.color = '#666666'}>Confidentialité</a>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'color 0.3s' }} onMouseEnter={(e) => e.target.style.color = '#2563eb'} onMouseLeave={(e) => e.target.style.color = '#666666'}>Contact</a>
        </div>
        <p style={{ fontSize: '12px', color: '#999999', margin: 0 }}>© 2026 COURTIA. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
