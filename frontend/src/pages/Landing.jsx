import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight, Zap } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([])

  // Simulate ARK chat
  useEffect(() => {
    if (showChat && chatMessages.length === 0) {
      setTimeout(() => {
        setChatMessages([
          { role: 'user', text: 'Analyse du client ABC Corp' }
        ])
        setTimeout(() => {
          setChatMessages(prev => [...prev, { 
            role: 'ark', 
            text: '📊 Score risque: 42/100 (bon payeur) | 💰 Opportunité: Renouvellement + complémentaire | ⏰ À faire: Appeler avant 15 déc'
          }])
        }, 1500)
      }, 500)
    }
  }, [showChat])

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: 'easeOut' }
  }

  const staggerContainer = {
    animate: {
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#0a0a0a' }}>
      {/* NAVIGATION */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderBottom: '1px solid #e5e7eb',
          zIndex: 100,
          backdropFilter: 'blur(12px)'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <motion.div 
            style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '4px', cursor: 'pointer' }}
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
          >
            COURTIA
          </motion.div>

          <div style={{ display: 'flex', gap: '60px', fontSize: '13px' }}>
            {['Fonctionnalités', 'ARK IA', 'Tarifs'].map((link) => (
              <motion.a
                key={link}
                href={`#${link.toLowerCase().replace(' ', '')}`}
                style={{ textDecoration: 'none', color: '#0a0a0a', cursor: 'pointer', position: 'relative' }}
                whileHover={{ color: '#2563eb' }}
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
                fontSize: '13px',
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
                fontSize: '13px',
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

      {/* HERO */}
      <section style={{ minHeight: '100vh', paddingTop: '80px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 60px', textAlign: 'center', width: '100%' }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #dcfce7',
              borderRadius: '20px',
              marginBottom: '32px',
              fontSize: '12px',
              color: '#166534',
              fontWeight: '500'
            }}
          >
            <Zap size={14} style={{ color: '#16a34a' }} />
            Offre Fondateur — 31 places restantes
          </motion.div>

          {/* H1 - Animated per line */}
          <div style={{ marginBottom: '24px', lineHeight: '1.1' }}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              style={{ fontSize: '64px', fontWeight: 'bold', letterSpacing: '-1px' }}
            >
              Le CRM qui pense
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4 }}
              style={{ fontSize: '64px', fontWeight: 'bold', color: '#2563eb', letterSpacing: '-1px' }}
            >
              à votre place
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              fontSize: '17px',
              color: '#64748b',
              marginBottom: '48px',
              lineHeight: '1.7',
              maxWidth: '650px',
              margin: '0 auto 48px'
            }}
          >
            ARK analyse vos clients, détecte vos opportunités et rédige vos emails. En temps réel. Pendant que vous travaillez.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '80px' }}
          >
            <motion.button 
              onClick={() => navigate('/register')}
              style={{
                padding: '14px 36px',
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              whileHover={{ backgroundColor: '#2563eb', scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Rejoindre — 69€/mois
              <ArrowRight size={16} />
            </motion.button>
            <motion.button 
              style={{
                padding: '14px 36px',
                backgroundColor: '#ffffff',
                color: '#0a0a0a',
                border: '1.5px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              whileHover={{ borderColor: '#0a0a0a', scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Voir la démo
            </motion.button>
          </motion.div>

          {/* Product Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
              aspectRatio: '16/9',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Fake Browser Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#ff5f57', '#ffbd2e', '#28c940'].map((color) => (
                  <div key={color} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '50%' }} />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#999999', flex: 1, textAlign: 'center' }}>
                courtia.local
              </div>
            </div>

            {/* Mockup Content */}
            <div style={{ display: 'flex', flex: 1, gap: '16px' }}>
              {/* Sidebar */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                style={{
                  width: '200px',
                  backgroundColor: '#0a0a0a',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {['Dashboard', 'Clients', 'Pipeline', 'Calendrier', 'ARK'].map((item) => (
                  <div key={item} style={{ fontSize: '11px', padding: '8px 12px', backgroundColor: item === 'Dashboard' ? '#2563eb' : 'transparent', borderRadius: '4px', color: item === 'Dashboard' ? '#ffffff' : '#999999', cursor: 'pointer' }}>
                    {item}
                  </div>
                ))}
              </motion.div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.4 }}
                style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
              >
                {[
                  { label: 'Total clients', value: '2,847' },
                  { label: 'Contrats actifs', value: '1,204' },
                  { label: 'Opportunités', value: '342' },
                  { label: 'Taux conversion', value: '34%' }
                ].map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 1.5 + (i * 0.1) }}
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '6px',
                      textAlign: 'center',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#999999', marginBottom: '4px' }}>{kpi.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0a0a0a' }}>{kpi.value}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ARK SECTION - Premium Dark */}
      <section style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px'
      }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '100px' }}>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{ fontSize: '12px', color: '#999999', letterSpacing: '2px', marginBottom: '16px', fontWeight: '500' }}
            >
              ARK — IA NATIVE
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '24px' }}
            >
              Votre bras droit digital.
              <br />
              Disponible 24h/24.
            </motion.h2>
          </div>

          {/* Chat Premium */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
              borderRadius: '12px',
              padding: '24px',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 0 40px rgba(37, 99, 235, 0.15)'
            }}
          >
            <AnimatePresence>
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    backgroundColor: msg.role === 'user' ? '#2563eb' : '#333333',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    maxWidth: '70%',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {chatMessages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                style={{ textAlign: 'center', color: '#999999', fontSize: '13px', marginTop: '40px' }}
              >
                Tapez votre question pour voir ARK en action...
              </motion.div>
            )}
          </motion.div>

          {/* Demo Button */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: 'center', marginTop: '48px' }}
          >
            <motion.button
              onClick={() => setShowChat(!showChat)}
              style={{
                padding: '12px 28px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showChat ? 'Réinitialiser' : 'Démarrer la démo'}
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section style={{ minHeight: '100vh', backgroundColor: '#ffffff', padding: '120px 60px', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: 'center', marginBottom: '100px' }}
          >
            <p style={{ fontSize: '12px', color: '#999999', letterSpacing: '2px', marginBottom: '16px', fontWeight: '500' }}>
              FONCTIONNALITÉS
            </p>
            <h2 style={{ fontSize: '48px', fontWeight: 'bold' }}>
              Tout ce dont un courtier a besoin
            </h2>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              { title: 'CRM métier', desc: 'Gestion clients intuitive avec scoring et historique complet' },
              { title: 'Gestion contrats', desc: 'Suivi des polices, échéances et renouvellements' },
              { title: 'Pipeline prospects', desc: 'Kanban drag-drop, scoring et automation' },
              { title: 'Calendrier échéances', desc: 'Rappels automatiques et briefs avant RDV' },
              { title: 'Conformité DDA/RGPD', desc: 'Rapports auto-générés, audit trail complet' },
              { title: 'ARK IA native', desc: 'Analyse, recommandations et emails en real-time' }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                style={{
                  padding: '40px 32px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Check size={20} style={{ color: '#2563eb' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                    {feature.title}
                  </h3>
                </div>
                <p style={{ fontSize: '14px', color: '#666666', lineHeight: '1.6' }}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ minHeight: '60vh', backgroundColor: '#f5f5f5', padding: '120px 60px', display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: 'center', marginBottom: '80px' }}
          >
            <p style={{ fontSize: '12px', color: '#999999', letterSpacing: '2px', marginBottom: '16px', fontWeight: '500' }}>
              TARIFS FONDATEUR
            </p>
            <h2 style={{ fontSize: '48px', fontWeight: 'bold' }}>
              Prix garantis à vie
            </h2>
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}
            variants={staggerContainer}
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
                whileHover={{ y: -12, scale: 1.02 }}
                style={{
                  padding: '48px 32px',
                  border: plan.featured ? '2px solid #0a0a0a' : '1px solid #d1d5db',
                  borderRadius: '12px',
                  backgroundColor: plan.featured ? '#0a0a0a' : '#ffffff',
                  color: plan.featured ? '#ffffff' : '#0a0a0a',
                  position: 'relative',
                  boxShadow: plan.featured ? '0 20px 40px rgba(0, 0, 0, 0.15)' : 'none'
                }}
              >
                {plan.featured && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    LE PLUS CHOISI
                  </div>
                )}
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                  {plan.name}
                </h3>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '12px', opacity: 0.6, textDecoration: 'line-through' }}>
                    {plan.old}
                  </span>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '4px' }}>
                    {plan.price}<span style={{ fontSize: '14px', opacity: 0.6, fontWeight: '500' }}>/mois</span>
                  </div>
                </div>
                <ul style={{ marginBottom: '32px', gap: '12px', display: 'flex', flexDirection: 'column' }}>
                  {plan.features.map((feature, i) => (
                    <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                      <Check size={16} style={{ color: plan.featured ? '#2563eb' : '#2563eb', flexShrink: 0 }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <motion.button
                  onClick={() => navigate('/register')}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: plan.featured ? '#2563eb' : '#0a0a0a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
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

      {/* FINAL CTA */}
      <section style={{ minHeight: '60vh', backgroundColor: '#ffffff', padding: '120px 60px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ maxWidth: '800px' }}
        >
          <h2 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '48px' }}>
            Rejoignez les fondateurs
          </h2>

          {/* Progress Bar */}
          <div style={{ marginBottom: '48px' }}>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              transition={{ duration: 1.2 }}
              style={{
                height: '2px',
                backgroundColor: '#0a0a0a',
                borderRadius: '1px',
                marginBottom: '16px',
                transformOrigin: 'left',
                maxWidth: '62%',
                margin: '0 auto 16px'
              }}
            />
            <p style={{ fontSize: '13px', color: '#666666' }}>31 sur 50 places réservées</p>
          </div>

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
              gap: '8px'
            }}
            whileHover={{ backgroundColor: '#2563eb', scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Réserver ma place
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '60px 60px 40px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '24px', letterSpacing: '3px' }}>COURTIA</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '24px', fontSize: '12px', color: '#666666' }}>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>Mentions légales</a>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>Confidentialité</a>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>Contact</a>
        </div>
        <p style={{ fontSize: '12px', color: '#999999' }}>© 2026 COURTIA. Tous droits réservés.</p>
      </footer>
    </div>
  )
}
