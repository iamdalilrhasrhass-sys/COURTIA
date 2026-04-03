import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useViewportScroll, useTransform } from 'framer-motion'
import { Check, ArrowRight, Zap, Crown } from 'lucide-react'

const PREMIUM_EASE = [0.16, 1, 0.3, 1]
const SMOOTH_EASE = [0.25, 0.46, 0.45, 0.94]

export default function Landing() {
  const navigate = useNavigate()
  const [arkPhase, setArkPhase] = useState(0)
  const { scrollY } = useViewportScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, 180])

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#0a0a0a' }}>
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
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '4px', fontFamily: 'Arial, sans-serif' }}>COURTIA</div>
          <div style={{ display: 'flex', gap: '50px', fontSize: '12px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>
            {['Expérience', 'ARK IA', 'Tarifs'].map(link => (
              <a key={link} href={`#${link.toLowerCase()}`} style={{ textDecoration: 'none', color: '#0a0a0a', fontFamily: 'Arial, sans-serif', cursor: 'pointer' }}>{link}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '14px', fontFamily: 'Arial, sans-serif' }}>
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#0a0a0a', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'Arial, sans-serif' }}>Connexion</button>
            <motion.button onClick={() => navigate('/register')} style={{ padding: '10px 24px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }} whileHover={{ backgroundColor: '#2563eb', scale: 1.02 }}>
              Démarrer
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section style={{ minHeight: '90vh', paddingTop: '80px', paddingBottom: '60px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontFamily: 'Arial, sans-serif' }}>
        <motion.div animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity }} style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <motion.div style={{ y: heroY, maxWidth: '1100px', margin: '0 auto', padding: '0 40px', width: '100%', position: 'relative', zIndex: 1, fontFamily: 'Arial, sans-serif' }}>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: PREMIUM_EASE }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#f0fdf4', border: '0.5px solid #dcfce7', borderRadius: '24px', marginBottom: '32px', fontSize: '11px', color: '#166534', fontWeight: '600', fontFamily: 'Arial, sans-serif' }}>
            <Zap size={12} />
            Offre Fondateur — 31 places
          </motion.div>

          <div style={{ marginBottom: '24px' }}>
            <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2, ease: PREMIUM_EASE }} style={{ fontSize: '56px', fontWeight: 'bold', letterSpacing: '-1px', margin: 0, fontFamily: 'Arial, sans-serif' }}>
              Le CRM qui
            </motion.h1>
            <motion.h1 initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.35, ease: PREMIUM_EASE }} style={{ fontSize: '56px', fontWeight: 'bold', color: '#2563eb', letterSpacing: '-1px', margin: '8px 0 0 0', fontFamily: 'Arial, sans-serif' }}>
              pense & agit
            </motion.h1>
            <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5, ease: SMOOTH_EASE }} style={{ fontSize: '56px', fontWeight: 'bold', letterSpacing: '-1px', margin: '8px 0 0 0', fontFamily: 'Arial, sans-serif' }}>
              avec vous
            </motion.h1>
          </div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.65, ease: SMOOTH_EASE }} style={{ fontSize: '16px', color: '#64748b', lineHeight: '1.7', maxWidth: '600px', margin: '0 auto 40px', fontFamily: 'Arial, sans-serif' }}>
            ARK analyse. Détecte. Agit. Votre assistant IA natif qui transforme vos données en victoires commerciales.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.8, ease: PREMIUM_EASE }} style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '80px', fontFamily: 'Arial, sans-serif' }}>
            <motion.button onClick={() => navigate('/register')} style={{ padding: '14px 36px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)', fontFamily: 'Arial, sans-serif' }} whileHover={{ backgroundColor: '#2563eb', scale: 1.03 }} whileTap={{ scale: 0.96 }}>
              Rejoindre — 69€/mois
              <ArrowRight size={15} />
            </motion.button>
            <button style={{ padding: '14px 36px', backgroundColor: '#ffffff', color: '#0a0a0a', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
              Voir la démo
            </button>
          </motion.div>

          {/* MOCKUP */}
          <PremiumMockup />
        </motion.div>
      </section>

      {/* WORKFLOW */}
      <section id="expérience" style={{ backgroundColor: '#f5f5f5', padding: '80px 40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px', fontFamily: 'Arial, sans-serif' }}>
          <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '2px', marginBottom: '16px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>EXPÉRIENCE</p>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>Une histoire de travail intelligent</h2>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', fontFamily: 'Arial, sans-serif' }}>
          {[
            { num: '1', title: 'Prospect', icon: '📧' },
            { num: '2', title: 'ARK analyse', icon: '🔍' },
            { num: '3', title: 'Opportunité', icon: '💡' },
            { num: '4', title: 'Email', icon: '✉️' },
            { num: '5', title: 'Relance', icon: '⏰' },
            { num: '6', title: 'Vous gagnez', icon: '🎯' }
          ].map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              viewport={{ once: false, amount: 0.3 }}
              style={{
                padding: '24px 16px',
                backgroundColor: '#ffffff',
                border: '0.5px solid #e5e7eb',
                borderRadius: '12px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '10px', fontFamily: 'Arial, sans-serif' }}>{step.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb', marginBottom: '6px', fontFamily: 'Arial, sans-serif' }}>{step.num}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>{step.title}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ARK */}
      <section id="arkia" style={{ backgroundColor: '#0a0a0a', color: '#ffffff', padding: '80px 40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px', fontFamily: 'Arial, sans-serif' }}>
          <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '2px', marginBottom: '16px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>ARK IA</p>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>Votre assistant opérant</h2>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: false, amount: 0.3 }}
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#1a1a1a',
            border: '0.5px solid #333333',
            borderRadius: '14px',
            padding: '24px',
            minHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 0 60px rgba(37, 99, 235, 0.2)',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {arkPhase >= 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '10px 14px', borderRadius: '10px', maxWidth: '70%', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                Analyse ABC Corp
              </div>
            </div>
          )}

          {arkPhase >= 2 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', padding: '10px 14px', borderRadius: '10px', maxWidth: '70%', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                ARK analyse...
              </div>
            </div>
          )}

          {arkPhase >= 3 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#e5e7eb', padding: '10px 14px', borderRadius: '10px', maxWidth: '80%', fontSize: '12px', lineHeight: '1.5', fontFamily: 'Arial, sans-serif' }}>
                <strong>✓ Analyse:</strong> Score 42/100 | 💰 Renouvellement | ⏰ Appeler avant 15 déc
              </div>
            </div>
          )}

          {arkPhase >= 4 && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#e5e7eb', padding: '10px 14px', borderRadius: '10px', maxWidth: '80%', fontSize: '12px', lineHeight: '1.5', fontFamily: 'Arial, sans-serif' }}>
                <strong>✉️ Email:</strong> "Bonjour, votre contrat..." | <strong>📅</strong> Dans 3 jours
              </div>
            </div>
          )}

          {arkPhase === 0 && (
            <div style={{ textAlign: 'center', color: '#666666', fontSize: '12px', marginTop: '40px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
              Cliquez pour voir ARK...
            </div>
          )}
        </motion.div>

        <div style={{ textAlign: 'center', marginTop: '40px', fontFamily: 'Arial, sans-serif' }}>
          <button
            onClick={() => setArkPhase(arkPhase === 0 ? 1 : 0)}
            style={{
              padding: '12px 32px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            {arkPhase === 0 ? '▶️ Démarrer' : '↻ Réinitialiser'}
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px', fontFamily: 'Arial, sans-serif' }}>
          <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '2px', marginBottom: '16px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>FONCTIONNALITÉS</p>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>Tout ce dont vous avez besoin</h2>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '24px', fontFamily: 'Arial, sans-serif' }}>
          {[
            { title: 'CRM', icon: '📊' },
            { title: 'Contrats', icon: '📋' },
            { title: 'Pipeline', icon: '🎯' },
            { title: 'Calendrier', icon: '📅' },
            { title: 'Conformité', icon: '✅' },
            { title: 'ARK IA', icon: '⚡' }
          ].map((f, i) => (
            <div key={i} style={{ padding: '32px 20px', backgroundColor: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '12px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', fontFamily: 'Arial, sans-serif' }}>{f.icon}</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, fontFamily: 'Arial, sans-serif' }}>{f.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ backgroundColor: '#f5f5f5', padding: '80px 40px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px', fontFamily: 'Arial, sans-serif' }}>
          <p style={{ fontSize: '11px', color: '#999999', letterSpacing: '2px', marginBottom: '16px', fontWeight: '600', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>TARIFS</p>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, sans-serif' }}>Prix garantis à vie</h2>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', fontFamily: 'Arial, sans-serif' }}>
          {[
            { name: 'Start', price: '39€', featured: false },
            { name: 'Pro', price: '69€', featured: true },
            { name: 'Elite', price: '129€', featured: false }
          ].map((plan, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              style={{
                padding: '40px 24px',
                border: plan.featured ? '2px solid #0a0a0a' : '0.5px solid #d1d5db',
                borderRadius: '12px',
                backgroundColor: plan.featured ? '#0a0a0a' : '#ffffff',
                color: plan.featured ? '#ffffff' : '#0a0a0a',
                position: 'relative',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              {plan.featured && (
                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2563eb', color: '#ffffff', padding: '4px 12px', borderRadius: '12px', fontSize: '9px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Crown size={10} /> BEST
                </div>
              )}
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', margin: plan.featured ? '12px 0 16px 0' : '0 0 16px 0', fontFamily: 'Arial, sans-serif' }}>{plan.name}</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Arial, sans-serif' }}>
                {plan.price}<span style={{ fontSize: '12px', opacity: 0.6, marginLeft: '4px', fontFamily: 'Arial, sans-serif' }}>/mois</span>
              </div>
              <button onClick={() => navigate('/register')} style={{ width: '100%', padding: '10px 16px', backgroundColor: plan.featured ? '#2563eb' : '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}>
                Commencer
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ backgroundColor: '#ffffff', padding: '80px 40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '24px', fontFamily: 'Arial, sans-serif' }}>
          Rejoignez les courtiers<br/>
          <span style={{ color: '#2563eb', fontFamily: 'Arial, sans-serif' }}>du futur</span>
        </h2>

        <div style={{ display: 'inline-block', padding: '16px 32px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '10px', marginBottom: '32px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '4px', fontFamily: 'Arial, sans-serif' }}>PLACES RESTANTES</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>31 / 50</div>
        </div>

        <motion.button onClick={() => navigate('/register')} style={{ padding: '14px 40px', backgroundColor: '#0a0a0a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Arial, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '8px' }} whileHover={{ backgroundColor: '#2563eb', scale: 1.05 }}>
          Réserver ma place
          <ArrowRight size={17} />
        </motion.button>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '60px 40px 40px', backgroundColor: '#ffffff', borderTop: '0.5px solid #e5e7eb', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '20px', letterSpacing: '3px', fontFamily: 'Arial, sans-serif' }}>COURTIA</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '20px', fontSize: '11px', color: '#666666', fontFamily: 'Arial, sans-serif' }}>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', fontFamily: 'Arial, sans-serif' }}>Mentions légales</a>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', fontFamily: 'Arial, sans-serif' }}>Confidentialité</a>
          <a href="#" style={{ textDecoration: 'none', color: 'inherit', fontFamily: 'Arial, sans-serif' }}>Contact</a>
        </div>
        <p style={{ fontSize: '11px', color: '#999999', margin: 0, fontFamily: 'Arial, sans-serif' }}>© 2026 COURTIA • Créé par <strong>RHASRHASS Dalil ⊗ ARK</strong></p>
      </footer>
    </div>
  )
}

function PremiumMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
        border: '0.5px solid #e5e7eb',
        borderRadius: '14px',
        padding: '20px',
        boxShadow: '0 40px 80px rgba(0, 0, 0, 0.12), 0 0 30px rgba(37, 99, 235, 0.08)',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* Browser Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '0.5px solid #e5e7eb', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ display: 'flex', gap: '6px', fontFamily: 'Arial, sans-serif' }}>
          {['#ff5f57', '#ffbd2e', '#28c940'].map(color => (
            <div key={color} style={{ width: '10px', height: '10px', backgroundColor: color, borderRadius: '50%', fontFamily: 'Arial, sans-serif' }} />
          ))}
        </div>
        <div style={{ fontSize: '10px', color: '#999999', flex: 1, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>courtia.app</div>
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontFamily: 'Arial, sans-serif' }}>
        {/* Sidebar */}
        <div style={{ backgroundColor: '#0a0a0a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'Arial, sans-serif' }}>
          {['Dashboard', 'Clients', 'Pipeline', 'ARK'].map((item, i) => (
            <div key={item} style={{ fontSize: '10px', padding: '8px 12px', backgroundColor: i === 0 ? '#2563eb' : 'rgba(255,255,255,0.08)', color: i === 0 ? '#ffffff' : '#999999', borderRadius: '5px', fontFamily: 'Arial, sans-serif' }}>
              {item}
            </div>
          ))}
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: 'Arial, sans-serif' }}>
          {[
            { label: 'Clients', value: '2,847' },
            { label: 'Contrats', value: '1,204' },
            { label: 'Opportunités', value: '342' },
            { label: 'Cette semaine', value: '94' }
          ].map((kpi, i) => (
            <div key={i} style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ fontSize: '9px', color: '#999999', marginBottom: '3px', fontFamily: 'Arial, sans-serif' }}>{kpi.label}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
