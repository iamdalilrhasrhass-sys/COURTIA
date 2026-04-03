import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const [scrollReveal, setScrollReveal] = useState({})

  useEffect(() => {
    const sections = document.querySelectorAll('[data-reveal]')
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setScrollReveal(prev => ({
              ...prev,
              [entry.target.id]: true
            }))
          }
        })
      },
      { threshold: 0.1 }
    )

    sections.forEach(section => observer.observe(section))
    return () => sections.forEach(section => observer.unobserve(section))
  }, [])

  const revealClass = (id) => scrollReveal[id] 
    ? 'opacity-100 translate-y-0' 
    : 'opacity-0 translate-y-5'

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#ffffff', color: '#0a0a0a' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e5e5',
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo */}
          <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '3px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            COURTIA
          </div>

          {/* Links Centre */}
          <div style={{ display: 'flex', gap: '40px', fontSize: '14px' }}>
            <a href="#features" style={{ textDecoration: 'none', color: '#0a0a0a', cursor: 'pointer' }}>Fonctionnalités</a>
            <a href="#ark" style={{ textDecoration: 'none', color: '#0a0a0a', cursor: 'pointer' }}>ARK IA</a>
            <a href="#pricing" style={{ textDecoration: 'none', color: '#0a0a0a', cursor: 'pointer' }}>Tarifs</a>
          </div>

          {/* Right Buttons */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0a0a0a',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Connexion
            </button>
            <button 
              onClick={() => navigate('/register')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'opacity 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Démarrer gratuitement
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 40px', textAlign: 'center' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #e0f2fe',
            borderRadius: '20px',
            marginBottom: '32px',
            fontSize: '13px',
            color: '#0369a1'
          }}>
            <div style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
            Offre Fondateur — 31 places restantes
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: '52px',
            fontWeight: 'bold',
            lineHeight: '1.2',
            marginBottom: '24px',
            letterSpacing: '-0.5px'
          }}>
            Le CRM qui pense à votre place
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '18px',
            color: '#666666',
            marginBottom: '40px',
            lineHeight: '1.6',
            maxWidth: '700px',
            margin: '0 auto 40px'
          }}>
            ARK analyse vos clients, détecte vos opportunités et rédige vos emails. En temps réel. Pendant que vous travaillez.
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '60px' }}>
            <button 
              onClick={() => navigate('/register')}
              style={{
                padding: '14px 32px',
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.3s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Rejoindre les fondateurs — 69€/mois
              <ArrowRight size={16} />
            </button>
            <button 
              style={{
                padding: '14px 32px',
                backgroundColor: '#ffffff',
                color: '#0a0a0a',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'border 0.3s'
              }}
              onMouseEnter={(e) => e.target.style.borderColor = '#0a0a0a'}
              onMouseLeave={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              Voir la démo
            </button>
          </div>

          {/* Dashboard Preview */}
          <div style={{
            backgroundColor: '#f8f8f8',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '20px',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999999',
            fontSize: '14px'
          }}>
            [Aperçu du dashboard avec sidebar #0a0a0a, KPIs, et chat ARK]
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" data-reveal style={{
        paddingTop: '100px',
        paddingBottom: '100px',
        backgroundColor: '#ffffff',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        transitionDuration: '0.6s',
        transform: scrollReveal.features ? 'translateY(0px)' : 'translateY(20px)',
        opacity: scrollReveal.features ? 1 : 0
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <p style={{ fontSize: '13px', color: '#666666', letterSpacing: '1px', marginBottom: '16px' }}>FONCTIONNALITÉS</p>
            <h2 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '24px' }}>
              Tout ce dont un courtier a besoin
            </h2>
          </div>

          {/* Features Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '40px'
          }}>
            {[
              { title: 'CRM métier', desc: 'Gestion clients intuitive avec scoring et historique complet' },
              { title: 'Gestion contrats', desc: 'Suivi des polices, échéances et renouvellements' },
              { title: 'Pipeline prospects', desc: 'Kanban drag-drop, scoring et automation' },
              { title: 'Calendrier échéances', desc: 'Rappels automatiques et briefs avant RDV' },
              { title: 'Conformité DDA/RGPD', desc: 'Rapports auto-générés, audit trail complet' },
              { title: 'ARK IA native', desc: 'Analyse, recommandations et emails en real-time' }
            ].map((feature, idx) => (
              <div key={idx} style={{
                padding: '32px',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                backgroundColor: '#ffffff'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#666666', lineHeight: '1.6' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARK Section */}
      <section id="ark" data-reveal style={{
        paddingTop: '100px',
        paddingBottom: '100px',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        transform: scrollReveal.ark ? 'translateY(0px)' : 'translateY(20px)',
        opacity: scrollReveal.ark ? 1 : 0
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <p style={{ fontSize: '13px', color: '#999999', letterSpacing: '1px', marginBottom: '16px' }}>ARK — IA NATIVE</p>
            <h2 style={{ fontSize: '42px', fontWeight: 'bold' }}>
              Votre bras droit digital. Disponible 24h/24.
            </h2>
          </div>

          {/* ARK Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
            {/* Left: Capabilities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {[
                { title: 'Analyse clients', desc: 'Scoring, risque, opportunités croisées' },
                { title: 'Détection opportunités', desc: 'Quand relancer, quoi proposer, à qui' },
                { title: 'Génération emails', desc: 'Tons adaptés, pitchs personnalisés, auto-envoi' },
                { title: 'Recommandations', desc: 'Next-best-action pour chaque prospect' }
              ].map((cap, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Check size={16} style={{ color: '#2563eb' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{cap.title}</h3>
                  </div>
                  <p style={{ fontSize: '14px', color: '#cccccc', marginLeft: '28px' }}>
                    {cap.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Right: Chat Simulation */}
            <div style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #333333',
              borderRadius: '8px',
              padding: '24px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ backgroundColor: '#2563eb', padding: '12px 16px', borderRadius: '8px', maxWidth: '80%' }}>
                  Analyse du client ABC Corp
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ backgroundColor: '#333333', padding: '12px 16px', borderRadius: '8px', maxWidth: '80%' }}>
                  📊 Score risque: 42/100 (bon payeur)<br/>💰 Opportunité: Renouvellement auto + complémentaire<br/>⏰ À faire: Appeler avant 15 déc
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ backgroundColor: '#2563eb', padding: '12px 16px', borderRadius: '8px', maxWidth: '80%' }}>
                  Génère un email de relance
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ backgroundColor: '#333333', padding: '12px 16px', borderRadius: '8px', maxWidth: '80%' }}>
                  ✉️ Email généré:<br/>"Bonjour, votre assurance auto expire le 15 décembre..."<br/>[copié au presse-papiers]
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" data-reveal style={{
        paddingTop: '100px',
        paddingBottom: '100px',
        backgroundColor: '#ffffff',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        transform: scrollReveal.pricing ? 'translateY(0px)' : 'translateY(20px)',
        opacity: scrollReveal.pricing ? 1 : 0
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <p style={{ fontSize: '13px', color: '#666666', letterSpacing: '1px', marginBottom: '16px' }}>TARIFS FONDATEUR</p>
            <h2 style={{ fontSize: '42px', fontWeight: 'bold' }}>
              Prix garantis à vie. 50 places disponibles.
            </h2>
          </div>

          {/* Pricing Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', marginBottom: '80px' }}>
            {[
              { name: 'Start', old: '59€', price: '39€', features: ['CRM + 100 clients', 'ARK basique', 'Support email'] },
              { name: 'Pro', old: '99€', price: '69€', features: ['CRM + 500 clients', 'ARK complet', 'Support prioritaire', 'Automations illimitées'], featured: true },
              { name: 'Elite', old: '179€', price: '129€', features: ['CRM illimité', 'ARK + Opus', 'Onboarding perso', 'API access'] }
            ].map((plan, idx) => (
              <div key={idx} style={{
                padding: '48px 32px',
                border: plan.featured ? '1.5px solid #0a0a0a' : '1px solid #e5e5e5',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                position: 'relative'
              }}>
                {plan.featured && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#0a0a0a',
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
                  <span style={{ fontSize: '12px', color: '#999999', textDecoration: 'line-through' }}>
                    {plan.old}
                  </span>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '4px' }}>
                    {plan.price}<span style={{ fontSize: '16px', color: '#666666', fontWeight: '500' }}>/mois</span>
                  </div>
                </div>
                <ul style={{ marginBottom: '32px', gap: '12px', display: 'flex', flexDirection: 'column' }}>
                  {plan.features.map((feature, i) => (
                    <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                      <Check size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button style={{
                  width: '100%',
                  padding: '12px 24px',
                  backgroundColor: plan.featured ? '#0a0a0a' : '#ffffff',
                  color: plan.featured ? '#ffffff' : '#0a0a0a',
                  border: `1px solid ${plan.featured ? '#0a0a0a' : '#d1d5db'}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.3s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
                onClick={() => navigate('/register')}
                >
                  Commencer gratuitement
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section data-reveal style={{
        paddingTop: '100px',
        paddingBottom: '100px',
        backgroundColor: '#ffffff',
        textAlign: 'center',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        transform: scrollReveal.cta ? 'translateY(0px)' : 'translateY(20px)',
        opacity: scrollReveal.cta ? 1 : 0
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 40px' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '48px' }}>
            Rejoignez les fondateurs
          </h2>

          {/* Progress Bar */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{
              width: '100%',
              height: '2px',
              backgroundColor: '#e5e5e5',
              borderRadius: '1px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <div style={{
                height: '100%',
                width: '62%',
                backgroundColor: '#0a0a0a'
              }}></div>
            </div>
            <p style={{ fontSize: '14px', color: '#666666' }}>31 sur 50 places réservées</p>
          </div>

          <button 
            onClick={() => navigate('/register')}
            style={{
              padding: '16px 48px',
              backgroundColor: '#0a0a0a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'opacity 0.3s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Réserver ma place
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        paddingTop: '60px',
        paddingBottom: '40px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e5e5',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 40px' }}>
          <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '24px', letterSpacing: '3px' }}>COURTIA</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '24px', fontSize: '13px' }}>
            <a href="#" style={{ textDecoration: 'none', color: '#666666' }}>Mentions légales</a>
            <a href="#" style={{ textDecoration: 'none', color: '#666666' }}>Politique de confidentialité</a>
            <a href="#" style={{ textDecoration: 'none', color: '#666666' }}>Contact</a>
          </div>
          <p style={{ fontSize: '13px', color: '#999999' }}>© 2026 COURTIA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
