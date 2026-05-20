import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { applySeo } from '../lib/seo'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import CourtiaWordmark from '../components/brand/CourtiaWordmark'
import AuroraHalo from '../components/brand/AuroraHalo'
import RhasrhassSignature from '../components/brand/RhasrhassSignature'

export default function LandingPublic() {
  // ═══════════════════════════════════════
  // 3D MOUSE TRACKING — parallaxe profonde
  // ═══════════════════════════════════════
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let raf = null
    const onMove = (e) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        setMouse({
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
        })
      })
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        setScrollY(window.scrollY)
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Calculate 3D transforms from mouse position
  const orbX = (mouse.x - 0.5) * 24  // -12 to +12 px
  const orbY = (mouse.y - 0.5) * 24
  const orbRotX = (mouse.y - 0.5) * 8  // -4 to +4 deg
  const orbRotY = (mouse.x - 0.5) * 8
  const depthX = (mouse.x - 0.5) * 40
  const depthY = (mouse.y - 0.5) * 40

  useEffect(() => {
    applySeo({
      title: 'COURTIA — Le cockpit IA des courtiers',
      description:
        'Centralisez vos clients, contrats, relances et priorités avec COURTIA, le CRM IA conçu pour les courtiers français. ARK vous assiste, vous gardez la main.',
      canonicalPath: '/',
    })
  }, [])

  const features = [
    { title: 'Fiches clients enrichies', desc: 'Historique complet, documents, contrats liés, scoring automatique.' },
    { title: 'Pipeline devis & opportunités', desc: 'Suivez chaque affaire de la découverte à la signature.' },
    { title: 'Contrats & échéances', desc: 'Plus jamais une échéance oubliée. Relances automatiques.' },
    { title: 'Relances intelligentes', desc: 'ARK priorise vos relances selon le potentiel et l\'urgence.' },
    { title: 'Reporting cabinet', desc: 'Tableaux de bord, KPIs, commissions, rentabilité par client.' },
    { title: 'Espace documents', desc: 'Centralisez vos documents, contrats scannés, relevés d\'information.' },
    { title: 'Abonnement & facturation', desc: 'Gérez votre plan directement depuis le cockpit.' },
    { title: 'Assistant ARK intégré', desc: 'Brief matinal, préparation RDV, suggestions cross-sell.' },
    { title: 'Intégrations métier', desc: 'Connectez vos outils existants via API ou imports.' },
  ]

  const faq = [
    {
      q: 'COURTIA remplace-t-il mon logiciel métier ?',
      a: 'COURTIA peut compléter ou structurer votre opérationnel. Selon votre organisation, il peut coexister avec des outils déjà en place.',
    },
    {
      q: 'ARK peut-il décider à ma place ?',
      a: 'Non. ARK assiste, prépare et suggère. Le courtier garde la main sur chaque décision commerciale et contractuelle.',
    },
    {
      q: 'COURTIA est-il adapté à un petit cabinet ?',
      a: 'Oui. Le plan Starter est conçu pour les courtiers indépendants et les petites structures.',
    },
    {
      q: 'Peut-on demander une démo ?',
      a: 'Oui. Une démonstration guidée permet de voir les modules clients, devis, contrats, relances, ARK et reporting.',
    },
    {
      q: 'Comment fonctionnent les abonnements ?',
      a: 'Starter et Pro sont en abonnement mensuel HT. L\'offre Cabinet/Premium est étudiée sur devis.',
    },
    {
      q: 'Peut-on importer des clients ?',
      a: 'Oui. Un import portefeuille est disponible pour accélérer la mise en place.',
    },
    {
      q: 'Les données sont-elles sécurisées ?',
      a: 'Les accès et flux sont sécurisés. COURTIA est pensé pour des dossiers sensibles de courtage avec un contrôle humain permanent.',
    },
    {
      q: 'L\'offre Cabinet/Premium fonctionne comment ?',
      a: 'Elle est construite sur devis, avec cadrage des besoins équipe, accompagnement et paramétrage avancé.',
    },
  ]

  // V6: ScrollReveal via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('lp-revealed')
        }
      })
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
    
    const reveals = document.querySelectorAll('.lp-reveal')
    reveals.forEach(el => observer.observe(el))
    
    return () => observer.disconnect()
  }, [])

  // V7: 3D ENGINE — Parallax scroll + Mouse-tracking tilt + Depth staging
  useEffect(() => {
    let raf = null
    let mouseX = 0.5, mouseY = 0.5
    let targetX = 0.5, targetY = 0.5
    let scrollY = window.scrollY

    const onMouseMove = (e) => {
      targetX = e.clientX / window.innerWidth
      targetY = e.clientY / window.innerHeight
    }

    const onScroll = () => { scrollY = window.scrollY }

    const tick = () => {
      // Smooth mouse follow (aggressive — feels responsive)
      mouseX += (targetX - mouseX) * 0.06
      mouseY += (targetY - mouseY) * 0.06

      const root = document.querySelector('.lp-root')
      if (!root) { raf = requestAnimationFrame(tick); return }

      // ── PARALLAX: background layers move at different speeds ──
      const stars = root.querySelector('.lp-stars')
      const orbs = root.querySelector('.lp-orbs')
      const particles = root.querySelector('.lp-particles')
      const cosmosGrad = root.querySelector('.lp-cosmos-gradient')
      if (stars) stars.style.transform = `translateY(${scrollY * 0.08}px) translateZ(-100px)`
      if (orbs) orbs.style.transform = `translateY(${scrollY * 0.15}px) rotate(${scrollY * 0.02}deg) translateZ(-50px)`
      if (particles) particles.style.transform = `translateY(${scrollY * 0.25}px) translateZ(-30px)`
      if (cosmosGrad) cosmosGrad.style.transform = `translateY(${scrollY * 0.04}px) translateZ(-150px)`

      // ── ORB: 3D rotate + translate (follows mouse) ──
      const orbContainer = root.querySelector('.aurora-orb-container')
      if (orbContainer) {
        const ox = (mouseX - 0.5) * 60
        const oy = (mouseY - 0.5) * 40
        const rx = (mouseY - 0.5) * 12
        const ry = (mouseX - 0.5) * 12
        orbContainer.style.transform = `translate3d(${ox}px, ${oy}px, 20px) rotateX(${rx}deg) rotateY(${ry}deg)`
      }

      // ── HERO CONTENT: opposite parallax ──
      const heroContent = root.querySelector('.lp-hero-content')
      if (heroContent) {
        const hx = (mouseX - 0.5) * -20
        heroContent.style.transform = `translateY(${scrollY * 0.05}px) translateX(${hx}px) translateZ(10px)`
      }

      // ── 3D TILT on ALL depth cards (global mouse tracking) ──
      const cards = root.querySelectorAll('.courtia-depth-card')
      cards.forEach(card => {
        const rect = card.getBoundingClientRect()
        const cardCenterX = rect.left + rect.width / 2
        const cardCenterY = rect.top + rect.height / 2
        const distX = (targetX * window.innerWidth - cardCenterX) / (window.innerWidth * 0.4)
        const distY = (targetY * window.innerHeight - cardCenterY) / (window.innerHeight * 0.4)
        const inView = rect.top < window.innerHeight && rect.bottom > 0
        if (inView) {
          const tiltX = Math.max(-22, Math.min(22, distY * -22))
          const tiltY = Math.max(-22, Math.min(22, distX * 22))
          card.style.setProperty('--tilt-x', tiltX.toFixed(2))
          card.style.setProperty('--tilt-y', tiltY.toFixed(2))
          card.style.setProperty('--glow-x', `${(targetX * 100).toFixed(1)}%`)
          card.style.setProperty('--glow-y', `${(targetY * 100).toFixed(1)}%`)
        }
      })

      // ── HEADER: subtle float + depth ──
      const header = root.querySelector('.lp-header')
      if (header) {
        header.style.transform = `translateY(${Math.sin(scrollY * 0.003) * 3}px) translateZ(30px)`
      }

      // ── SECTIONS: staggered 3D depth parallax ──
      const sections = root.querySelectorAll('.lp-section')
      sections.forEach((sec, i) => {
        const rect = sec.getBoundingClientRect()
        const inView = rect.top < window.innerHeight * 1.3 && rect.bottom > -100
        if (inView) {
          const offset = (rect.top - window.innerHeight * 0.7) * 0.05 * (i % 3 + 1)
          const zDepth = (i % 3) * 10 - 10
          sec.style.transform = `translateY(${offset}px) translateZ(${zDepth}px)`
          sec.style.opacity = Math.min(1, 1 - Math.abs(offset) * 0.008)
        }
      })

      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // V6: FAQ accordion state
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="lp-root">
      <style>{styles}</style>

      {/* Fixed background */}
      <div className="lp-cosmos-bg" aria-hidden="true">
        <AuroraHalo />
        <div className="lp-stars" />
        <div className="lp-orbs" aria-hidden="true">
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-orb lp-orb-3" />
        </div>
        <div className="lp-particles" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="lp-particle" />
          ))}
        </div>
        <div className="lp-cosmos-gradient" />
      </div>

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="lp-header aurora-panel">
        <Link to="/" className="lp-header-brand" aria-label="COURTIA — Accueil">
          <CourtiaBubbleLogo size={32} animated={false} showHalo={false} showFoam={false} />
          <CourtiaWordmark size="18px" />
        </Link>
        <nav className="lp-nav">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#ark">ARK</a>
          <a href="#tarifs">Tarifs</a>
          <Link to="/demo">Démo</Link>
          <Link to="/login">Connexion</Link>
        </nav>
        <Link className="aurora-button aurora-button-primary" to="/demo">
          Demander une démo
        </Link>
      </header>

      <main>
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="lp-hero aurora-section">
          <div className="aurora-orb-container">
            <CourtiaBubbleLogo
              size={480}
              animated={true}
              showHalo={true}
              showFoam={true}
              showSpecular={true}
            />
          </div>
          <div className="lp-hero-content">
            <div className="aurora-badge">CRM IA pour courtiers</div>
            <h1 className="lp-hero-title">
              <span className="aurora-gradient-text">
                Le cockpit IA
              </span>
              <br />
              pensé pour les courtiers
            </h1>
            <p className="lp-hero-desc">
              COURTIA centralise vos clients, devis, contrats et relances.
              ARK vous aide à prioriser vos actions, préparer vos dossiers et
              détecter les opportunités — sans perdre la main.
            </p>
            <div className="lp-hero-cta">
              <Link className="aurora-button aurora-button-primary" to="/demo">
                Demander une démo
              </Link>
              <a className="aurora-button aurora-button-ghost" href="#tarifs" onClick={(e) => { e.preventDefault(); document.getElementById('tarifs')?.scrollIntoView({ behavior: 'smooth' }); }}>
                Voir les tarifs
              </a>
              <Link className="aurora-button aurora-button-ghost" to="/login">
                Se connecter
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════ PROBLEM/SOLUTION ═══════════════ */}
        <section className="lp-section aurora-section lp-reveal">
          <div className="lp-section-inner">
            <div className="aurora-grid-2">
              <article className="aurora-card courtia-depth-card">
                <div className="courtia-depth-card-inner" style={{ padding: 32 }}>
                  <h2 className="lp-card-title">
                    <span style={{ color: 'var(--aurora-rose-soft)' }}>▸</span> Le problème terrain
                  </h2>
                  <ul className="lp-card-list">
                    <li>Dossiers dispersés entre outils et emails</li>
                    <li>Relances oubliées et opportunités manquées</li>
                    <li>Contrats mal suivis dans le temps</li>
                    <li>Peu de vision globale sur le portefeuille</li>
                    <li>Trop de charge administrative quotidienne</li>
                  </ul>
                </div>
              </article>
              <article className="aurora-card courtia-depth-card">
                <div className="courtia-depth-card-inner" style={{ padding: 32 }}>
                  <h2 className="lp-card-title">
                    <span style={{ color: 'var(--aurora-emerald-soft)' }}>▸</span> La solution COURTIA
                  </h2>
                  <ul className="lp-card-list">
                    <li>Cockpit cabinet unifié</li>
                    <li>Pipeline devis et opportunités clair</li>
                    <li>Suivi contrats et échéances</li>
                    <li>Relances structurées et priorisées</li>
                    <li>Reporting activable au quotidien</li>
                  </ul>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ═══════════════ ARK ═══════════════ */}
        <section id="ark" className="lp-section aurora-section lp-reveal">
          <div className="lp-section-inner">
            <div className="aurora-section-header">
              <p className="aurora-section-kicker">Intelligence Artificielle</p>
              <h2 className="aurora-section-title">ARK au quotidien</h2>
              <p className="aurora-section-subtitle">
                Votre assistant IA qui prépare, suggère et priorise. Vous gardez le contrôle.
              </p>
            </div>
            <div className="aurora-panel" style={{ padding: 40 }}>
              <div className="lp-ark-steps">
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon"><span className="lp-step-indicator">AM</span></div>
                  <div><strong>Matin</strong> — ARK prépare les priorités du jour.</div>
                </div>
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon"><span className="lp-step-indicator lp-step-pre">PRE</span></div>
                  <div><strong>Avant RDV</strong> — ARK résume le dossier client.</div>
                </div>
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon"><span className="lp-step-indicator lp-step-post">POST</span></div>
                  <div><strong>Après échange</strong> — ARK suggère une relance propre.</div>
                </div>
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon"><span className="lp-step-indicator lp-step-scan">SCAN</span></div>
                  <div><strong>Portefeuille</strong> — ARK détecte les opportunités utiles.</div>
                </div>
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon"><span className="lp-step-indicator lp-step-pm">PM</span></div>
                  <div><strong>Fin de journée</strong> — ARK récap les actions restantes.</div>
                </div>
              </div>
              <p style={{
                marginTop: 24,
                fontSize: 14,
                color: 'var(--aurora-text-muted)',
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
                ARK assiste, prépare et suggère. Le courtier garde la main sur les décisions.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="fonctionnalites" className="lp-section aurora-section lp-reveal">
          <div className="lp-section-inner">
            <div className="aurora-section-header">
              <p className="aurora-section-kicker">Fonctionnalités</p>
              <h2 className="aurora-section-title">Tout votre cabinet dans un cockpit</h2>
            </div>
            <div className="lp-features-grid">
              {features.map((f, i) => (
                <article key={f.title} className={`aurora-card courtia-depth-card lp-card-3d lp-reveal lp-reveal-delay-${Math.min(i, 5)}`}>
                  <div className="courtia-depth-card-inner lp-card-3d-inner" style={{ padding: 28 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#fff' }}>
                      {f.title}
                    </h3>
                    <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--aurora-text-muted)', lineHeight: 1.6 }}>
                      {f.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ V6: MOCK COCKPIT PREVIEW ═══════════════ */}
        <section className="lp-section aurora-section lp-reveal">
          <div className="lp-section-inner">
            <div className="aurora-section-header">
              <p className="aurora-section-kicker">Interface</p>
              <h2 className="aurora-section-title">Un cockpit conçu pour le courtage</h2>
              <p className="aurora-section-subtitle" style={{ marginTop: 8 }}>
                Voici à quoi ressemble votre cockpit COURTIA au quotidien.
              </p>
            </div>
            <div className="lp-cockpit-preview">
              <div className="lp-cockpit-mock">
                <div className="lp-cockpit-sidebar">
                  <div className="lp-cockpit-nav-item lp-cockpit-nav-active">Cockpit</div>
                  <div className="lp-cockpit-nav-item">Clients</div>
                  <div className="lp-cockpit-nav-item">Devis</div>
                  <div className="lp-cockpit-nav-item">Contrats</div>
                  <div className="lp-cockpit-nav-item">Relances</div>
                  <div className="lp-cockpit-nav-item">Opportunités</div>
                  <div className="lp-cockpit-nav-item">Rapports</div>
                  <div className="lp-cockpit-nav-item">Paramètres</div>
                </div>
                <div className="lp-cockpit-main">
                  <div className="lp-cockpit-kpi-row">
                    <div className="lp-cockpit-kpi">
                      <div className="lp-cockpit-kpi-value">128</div>
                      <div className="lp-cockpit-kpi-label">Clients actifs</div>
                    </div>
                    <div className="lp-cockpit-kpi">
                      <div className="lp-cockpit-kpi-value">47</div>
                      <div className="lp-cockpit-kpi-label">Contrats en cours</div>
                    </div>
                    <div className="lp-cockpit-kpi">
                      <div className="lp-cockpit-kpi-value">12</div>
                      <div className="lp-cockpit-kpi-label">Relances aujourd'hui</div>
                    </div>
                    <div className="lp-cockpit-kpi">
                      <div className="lp-cockpit-kpi-value">8 420 €</div>
                      <div className="lp-cockpit-kpi-label">Commissions mois</div>
                    </div>
                  </div>
                  <div className="lp-cockpit-table">
                    <div className="lp-cockpit-row">
                      <span><span className="lp-cockpit-dot lp-dot-red"></span> <strong>Karim B.</strong> — Devis Auto #247</span>
                      <span>Sans réponse · 7 j</span>
                    </div>
                    <div className="lp-cockpit-row">
                      <span><span className="lp-cockpit-dot lp-dot-amber"></span> <strong>Dupont Jean</strong> — Contrat MRH</span>
                      <span>Échéance · 15 j</span>
                    </div>
                    <div className="lp-cockpit-row">
                      <span><span className="lp-cockpit-dot lp-dot-green"></span> <strong>Martin SARL</strong> — Flotte Pro</span>
                      <span>À signer · 2 j</span>
                    </div>
                    <div className="lp-cockpit-row">
                      <span><span className="lp-cockpit-dot lp-dot-blue"></span> <strong>Sophie L.</strong> — Habitation</span>
                      <span>Cross-sell · ARK</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ DEMO PREVIEW ═══════════════ */}
        <section className="lp-section aurora-section">
          <div className="lp-section-inner">
            <div className="aurora-panel" style={{ padding: 40, textAlign: 'center' }}>
              <h2 className="aurora-section-title" style={{ marginBottom: 16 }}>
                Ce que vous voyez en démo
              </h2>
              <div className="lp-chips">
                <span className="status-pill status-pill-active">Dashboard cabinet</span>
                <span className="status-pill status-pill-active">Fiche client</span>
                <span className="status-pill status-pill-active">Devis</span>
                <span className="status-pill status-pill-active">Relances</span>
                <span className="status-pill status-pill-active">Contrats</span>
                <span className="status-pill status-pill-active">ARK</span>
                <span className="status-pill status-pill-active">Reporting</span>
              </div>
              <div style={{ marginTop: 32 }}>
                <Link className="aurora-button aurora-button-primary" to="/demo">
                  Demander une démo
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ PRICING ═══════════════ */}
        <section id="tarifs" className="lp-section aurora-section">
          <div className="lp-section-inner">
            <div className="aurora-section-header">
              <p className="aurora-section-kicker">Tarifs</p>
              <h2 className="aurora-section-title">Un plan pour chaque cabinet</h2>
            </div>
            <div className="aurora-grid-3">
              {/* Starter */}
              <article className="aurora-card courtia-depth-card">
                <div className="courtia-depth-card-inner" style={{ padding: 32 }}>
                  <p className="lp-price-plan">Starter</p>
                  <p className="lp-price">89 € <small>HT/mois</small></p>
                  <hr className="aurora-divider" style={{ margin: '16px 0' }} />
                  <ul className="lp-card-list">
                    <li>Socle CRM courtage</li>
                    <li>Clients, devis, contrats, relances</li>
                    <li>Pilotage quotidien structuré</li>
                  </ul>
                  <div style={{ marginTop: 24 }}>
                    <Link className="aurora-button aurora-button-ghost" to="/register?plan=starter" style={{ width: '100%', justifyContent: 'center' }}>
                      Démarrer COURTIA
                    </Link>
                  </div>
                </div>
              </article>

              {/* Pro */}
              <article className="aurora-card courtia-depth-card" style={{
                borderColor: 'rgba(139, 92, 246, 0.6)',
                boxShadow: '0 0 0 1px rgba(139, 92, 246, 0.3), 0 18px 56px rgba(70, 47, 148, 0.35)'
              }}>
                <div className="courtia-depth-card-inner" style={{ padding: 32 }}>
                  <span className="aurora-badge" style={{ marginBottom: 12 }}>Offre principale</span>
                  <p className="lp-price-plan">Pro</p>
                  <p className="lp-price">199 € <small>HT/mois</small></p>
                  <hr className="aurora-divider" style={{ margin: '16px 0' }} />
                  <ul className="lp-card-list">
                    <li>Tout Starter</li>
                    <li>ARK plus avancé pour la priorisation</li>
                    <li>Relances et reporting renforcés</li>
                  </ul>
                  <div style={{ marginTop: 24 }}>
                    <Link className="aurora-button aurora-button-primary" to="/register?plan=pro" style={{ width: '100%', justifyContent: 'center' }}>
                      Démarrer COURTIA Pro
                    </Link>
                  </div>
                </div>
              </article>

              {/* Cabinet */}
              <article className="aurora-card courtia-depth-card">
                <div className="courtia-depth-card-inner" style={{ padding: 32 }}>
                  <p className="lp-price-plan">Cabinet</p>
                  <p className="lp-price">Sur devis</p>
                  <hr className="aurora-divider" style={{ margin: '16px 0' }} />
                  <ul className="lp-card-list">
                    <li>Besoin équipe et gouvernance</li>
                    <li>Paramétrage avancé</li>
                    <li>Accompagnement dédié</li>
                  </ul>
                  <div style={{ marginTop: 24 }}>
                    <Link className="aurora-button aurora-button-ghost" to="/demo" style={{ width: '100%', justifyContent: 'center' }}>
                      Demander une démo
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ═══════════════ SECURITY ═══════════════ */}
        <section className="lp-section aurora-section">
          <div className="lp-section-inner">
            <div className="aurora-panel" style={{ padding: 40, textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 300, color: '#fff' }}>
                Sécurité et contrôle
              </h2>
              <p style={{
                marginTop: 16,
                fontSize: 16,
                color: 'var(--aurora-text-secondary)',
                lineHeight: 1.7,
                maxWidth: 640,
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                COURTIA structure l'opérationnel du cabinet. ARK assiste la préparation,
                la détection et la priorisation. Il ne remplace pas le courtier et ne prend
                pas de décision légale ou contractuelle seul.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════ FAQ ═══════════════ */}
        <section className="lp-section aurora-section lp-reveal">
          <div className="lp-section-inner">
            <div className="aurora-section-header">
              <p className="aurora-section-kicker">Questions</p>
              <h2 className="aurora-section-title">FAQ</h2>
            </div>
            <div className="lp-faq">
              {faq.map((item, i) => {
                const isOpen = openFaq === i
                return (
                  <div key={item.q} className={`lp-faq-item-v6 ${isOpen ? 'lp-faq-open' : ''} lp-reveal lp-reveal-delay-${Math.min(i, 5)}`}>
                    <button
                      className="lp-faq-trigger"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>
                      <span className="lp-faq-chevron">▼</span>
                    </button>
                    <div className="lp-faq-answer-wrap">
                      <div className="lp-faq-answer">{item.a}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════ FINAL CTA ═══════════════ */}
        <section className="lp-section aurora-section">
          <div className="lp-section-inner">
            <div className="aurora-panel" style={{
              padding: 56,
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.05), rgba(6, 182, 212, 0.04))',
              border: '1px solid rgba(139, 92, 246, 0.15)'
            }}>
              <CourtiaBubbleLogo size={64} animated={true} showHalo={true} showFoam={false} showSpecular={false} />
              <h2 style={{
                margin: '20px 0 12px',
                fontSize: 'clamp(22px, 3vw, 36px)',
                fontWeight: 200,
                color: '#fff',
                letterSpacing: '-0.02em'
              }}>
                Structurez votre cabinet autour d'un cockpit IA clair,
                <br />
                sans perdre la main sur vos décisions.
              </h2>
              <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link className="aurora-button aurora-button-primary" to="/demo">
                  Demander une démo
                </Link>
                <Link className="aurora-button aurora-button-ghost" to="/login">
                  Se connecter
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="lp-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
          <CourtiaBubbleLogo size={22} animated={false} showHalo={false} showFoam={false} showSpecular={false} />
          <span style={{ fontWeight: 600, color: '#fff' }}>COURTIA</span>
        </div>
        <p style={{ margin: 0, color: 'var(--aurora-text-muted)', fontSize: 13 }}>
          CRM IA pour courtiers en assurance
        </p>
        <p style={{ margin: '6px 0 16px', color: 'var(--aurora-text-muted)', fontSize: 12 }}>
          Produit : COURTIA &nbsp;|&nbsp; Assistant IA : ARK &nbsp;|&nbsp; courtiark.fr
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <RhasrhassSignature compact />
        </div>
      </footer>
    </div>
  )
}

const styles = `
.lp-root {
  min-height: 100vh;
  color: var(--aurora-text-primary, #F8FAFC);
  background: var(--aurora-bg-deep, #050510);
  font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
  position: relative;
  overflow-x: hidden;
  perspective: 2000px;
  perspective-origin: 50% 50%;
  transform-style: preserve-3d;
}

/* ─── COSMOS BACKGROUND ─── */
.lp-cosmos-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

/* ─── V6: FLOATING ORBS (AuroraBubbles) ─── */
.lp-orbs {
  position: absolute;
  inset: 0;
  overflow: hidden;
  will-change: transform;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.lp-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  animation: lp-orb-drift 12s ease-in-out infinite;
  transform-style: preserve-3d;
}

.lp-orb-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(139,92,246,0.6), transparent 70%);
  top: -10%;
  left: -5%;
  animation-delay: 0s;
}

.lp-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(6,182,212,0.5), transparent 70%);
  top: 40%;
  right: -8%;
  animation-delay: -4s;
}

.lp-orb-3 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(236,72,153,0.4), transparent 70%);
  bottom: -5%;
  left: 30%;
  animation-delay: -8s;
}

@keyframes lp-orb-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -20px) scale(1.05); }
  50% { transform: translate(-15px, 25px) scale(0.95); }
  75% { transform: translate(-25px, -15px) scale(1.02); }
}

/* ─── V6: CSS PARTICLES ─── */
.lp-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  will-change: transform;
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

.lp-particle {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: rgba(255,255,255,0.6);
  animation: lp-particle-float 8s ease-in-out infinite;
}

.lp-particle:nth-child(1)  { top: 12%; left: 8%;  animation-delay: 0s; width: 2px; height: 2px; }
.lp-particle:nth-child(2)  { top: 22%; left: 25%; animation-delay: -1s; width: 3px; height: 3px; background: rgba(139,92,246, 0.7); }
.lp-particle:nth-child(3)  { top: 8%;  left: 45%; animation-delay: -2s; width: 1.5px; height: 1.5px; }
.lp-particle:nth-child(4)  { top: 35%; left: 65%; animation-delay: -3s; width: 2.5px; height: 2.5px; background: rgba(6,182,212, 0.6); }
.lp-particle:nth-child(5)  { top: 15%; left: 80%; animation-delay: -4s; width: 1.5px; height: 1.5px; }
.lp-particle:nth-child(6)  { top: 55%; left: 12%; animation-delay: -5s; width: 2px; height: 2px; }
.lp-particle:nth-child(7)  { top: 45%; left: 38%; animation-delay: -0.5s; width: 3px; height: 3px; background: rgba(236,72,153, 0.5); }
.lp-particle:nth-child(8)  { top: 68%; left: 55%; animation-delay: -2.5s; width: 2px; height: 2px; }
.lp-particle:nth-child(9)  { top: 72%; left: 78%; animation-delay: -6s; width: 1.5px; height: 1.5px; }
.lp-particle:nth-child(10) { top: 85%; left: 20%; animation-delay: -3.5s; width: 2.5px; height: 2.5px; background: rgba(139,92,246, 0.55); }
.lp-particle:nth-child(11) { top: 90%; left: 60%; animation-delay: -7s; width: 2px; height: 2px; }
.lp-particle:nth-child(12) { top: 28%; left: 92%; animation-delay: -1.5s; width: 1.5px; height: 1.5px; }

@keyframes lp-particle-float {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
  25% { transform: translate(8px, -15px) scale(1.5); opacity: 0.8; }
  50% { transform: translate(-5px, -25px) scale(1); opacity: 0.4; }
  75% { transform: translate(-10px, -8px) scale(1.3); opacity: 0.6; }
}

.lp-cosmos-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 560px at 18% -10%, rgba(139, 92, 246, 0.22), transparent 62%),
    radial-gradient(760px 460px at 88% 8%, rgba(59, 130, 246, 0.12), transparent 58%),
    radial-gradient(680px 460px at 50% 100%, rgba(236, 72, 153, 0.08), transparent 66%),
    linear-gradient(180deg, #050510 0%, #08061a 100%);
}

/* ─── STARS ─── */
.lp-stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,0.4), transparent),
    radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.3), transparent),
    radial-gradient(1.5px 1.5px at 40% 10%, rgba(255,255,255,0.5), transparent),
    radial-gradient(1px 1px at 55% 45%, rgba(255,255,255,0.25), transparent),
    radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.35), transparent),
    radial-gradient(1.5px 1.5px at 85% 55%, rgba(255,255,255,0.4), transparent),
    radial-gradient(1px 1px at 15% 65%, rgba(255,255,255,0.2), transparent),
    radial-gradient(1px 1px at 60% 75%, rgba(255,255,255,0.3), transparent),
    radial-gradient(1.5px 1.5px at 92% 85%, rgba(255,255,255,0.35), transparent),
    radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.2), transparent),
    radial-gradient(1px 1px at 78% 12%, rgba(255,255,255,0.45), transparent),
    radial-gradient(1px 1px at 48% 58%, rgba(255,255,255,0.3), transparent),
    radial-gradient(1.5px 1.5px at 8% 42%, rgba(255,255,255,0.35), transparent),
    radial-gradient(1px 1px at 22% 92%, rgba(255,255,255,0.2), transparent),
    radial-gradient(1px 1px at 65% 38%, rgba(255,255,255,0.25), transparent);
  animation: lp-stars-twinkle 4s ease-in-out infinite alternate;
  will-change: transform;
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes lp-stars-twinkle {
  0% { opacity: 0.6; }
  100% { opacity: 1; }
}

/* ─── HEADER ─── */
.lp-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 32px;
  margin: 0;
  border-radius: 0 0 20px 20px;
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease;
  will-change: transform;
  min-height: 56px;
  backdrop-filter: blur(32px) saturate(200%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  background: rgba(5, 3, 15, 0.94);
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-top: none;
  box-shadow:
    0 1px 0 rgba(139, 92, 246, 0.12),
    0 4px 32px rgba(0, 0, 0, 0.6),
    0 0 80px rgba(139, 92, 246, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

/* Accent glow line at bottom of header */
.lp-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  width: 80%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(139, 92, 246, 0.3),
    rgba(6, 182, 212, 0.4),
    rgba(139, 92, 246, 0.3),
    transparent
  );
  pointer-events: none;
}

.lp-header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.lp-nav {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  align-items: center;
}

.lp-nav a {
  color: var(--aurora-text-secondary, #CBD5E1);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  transition: color 0.2s, transform 0.2s;
  padding: 2px 0;
}

.lp-nav a:hover {
  color: #ffffff;
}

/* ─── HERO ─── */
.lp-hero {
  padding: 60px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
}

.lp-hero-content {
  margin-top: 20px;
  max-width: 720px;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  will-change: transform;
}

.lp-hero-title {
  font-size: clamp(32px, 5vw, 58px);
  font-weight: 200;
  line-height: 1.06;
  letter-spacing: -0.03em;
  margin: 16px 0 18px;
  color: #fff;
}

.lp-hero-desc {
  font-size: 17px;
  line-height: 1.65;
  color: var(--aurora-text-secondary, #CBD5E1);
  max-width: 600px;
  margin: 0 auto 28px;
}

.lp-hero-cta {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ─── SECTIONS ─── */
.lp-section {
  padding: 40px 20px;
  position: relative;
  z-index: 1;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.4s ease;
  will-change: transform, opacity;
}

.lp-section-inner {
  max-width: 1100px;
  margin: 0 auto;
}

.lp-card-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 16px;
}

.lp-card-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--aurora-text-secondary, #CBD5E1);
  font-size: 14px;
  line-height: 1.6;
}

/* ─── ARK STEPS ─── */
.lp-ark-steps {
  display: grid;
  gap: 16px;
}

.lp-ark-step {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 15px;
  color: var(--aurora-text-secondary, #CBD5E1);
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: all 0.3s;
}

.lp-ark-step:hover {
  background: rgba(139, 92, 246, 0.06);
  border-color: rgba(139, 92, 246, 0.15);
}

.lp-ark-step-icon {
  font-size: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.12);
}

.lp-step-indicator {
  font-family: var(--aurora-font-mono, 'SF Mono', 'JetBrains Mono', monospace);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--aurora-violet-soft, #A78BFA);
}

.lp-step-pre { color: var(--aurora-cyan-soft, #22D3EE); }
.lp-step-post { color: var(--aurora-emerald-soft, #34D399); }
.lp-step-scan { color: var(--aurora-amber-soft, #FBBF24); }
.lp-step-pm { color: var(--aurora-rose-soft, #FB7185); }

.lp-ark-step strong {
  color: #fff;
}

/* ─── COCKPIT MOCK DOTS ─── */
.lp-cockpit-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;
}
.lp-dot-red { background: #EF4444; box-shadow: 0 0 6px rgba(239,68,68,0.5); }
.lp-dot-amber { background: #F59E0B; box-shadow: 0 0 6px rgba(245,158,11,0.5); }
.lp-dot-green { background: #10B981; box-shadow: 0 0 6px rgba(16,185,129,0.5); }
.lp-dot-blue { background: #3B82F6; box-shadow: 0 0 6px rgba(59,130,246,0.5); }

/* ─── FEATURES GRID ─── */
.lp-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

@media (max-width: 900px) {
  .lp-features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .lp-features-grid {
    grid-template-columns: 1fr;
  }
}

/* ─── CHIPS ─── */
.lp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 12px;
}

/* ─── PRICING ─── */
.lp-price-plan {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.lp-price {
  font-size: 38px;
  font-weight: 800;
  color: #fff;
  margin: 8px 0 0;
}

.lp-price small {
  font-size: 14px;
  font-weight: 400;
  color: var(--aurora-text-muted);
}

/* ─── FAQ ─── */
.lp-faq {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  gap: 10px;
}

.lp-faq-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px 20px;
  transition: all 0.3s;
}

.lp-faq-item:hover {
  border-color: rgba(139, 92, 246, 0.2);
}

.lp-faq-item summary {
  cursor: pointer;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  list-style: none;
}

.lp-faq-item summary::-webkit-details-marker {
  display: none;
}

.lp-faq-item p {
  margin-top: 10px;
  color: var(--aurora-text-muted);
  font-size: 14px;
  line-height: 1.6;
}

/* ─── FOOTER ─── */
.lp-footer {
  position: relative;
  z-index: 1;
  padding: 40px 20px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* ─── V6: SCROLL REVEAL ─── */
.lp-reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.lp-reveal.lp-revealed {
  opacity: 1;
  transform: translateY(0);
}

.lp-reveal-delay-1 { transition-delay: 0.1s; }
.lp-reveal-delay-2 { transition-delay: 0.2s; }
.lp-reveal-delay-3 { transition-delay: 0.3s; }
.lp-reveal-delay-4 { transition-delay: 0.4s; }
.lp-reveal-delay-5 { transition-delay: 0.5s; }

/* ─── V7: 3D TILT + GLOW (mouse-tracking depth system) ─── */
/* Dynamic tilt via JS --tilt-x / --tilt-y CSS variables */
.courtia-depth-card {
  --tilt-x: 0;
  --tilt-y: 0;
  --glow-x: 50%;
  --glow-y: 50%;
  transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s ease !important;
  will-change: transform;
}

.courtia-depth-card:hover {
  transform: rotateX(calc(var(--tilt-x) * 1deg)) rotateY(calc(var(--tilt-y) * 1deg)) translateY(-6px) translateZ(20px) !important;
  box-shadow:
    0 32px 100px rgba(139, 92, 246, 0.3),
    0 12px 40px rgba(0, 0, 0, 0.7),
    0 4px 12px rgba(139, 92, 246, 0.2) !important;
}

.courtia-depth-card:hover .courtia-depth-card-inner {
  transform: rotateX(calc(var(--tilt-x) * 0.5deg)) rotateY(calc(var(--tilt-y) * 0.5deg)) translateZ(40px);
}

/* Mouse-follow glow on depth cards */
.courtia-depth-card::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: radial-gradient(
    800px circle at var(--glow-x) var(--glow-y),
    rgba(139, 92, 246, 0.25),
    rgba(236, 72, 153, 0.12),
    transparent 50%
  );
  opacity: 0;
  transition: opacity 0.5s;
  pointer-events: none;
  z-index: -1;
}

.courtia-depth-card:hover::after {
  opacity: 1;
}

/* 3D depth staging — translateZ layering */
.lp-depth-stage-near {
  transform: translateZ(20px);
  transform-style: preserve-3d;
}

.lp-depth-stage-mid {
  transform: translateZ(40px);
  transform-style: preserve-3d;
}

.lp-depth-stage-far {
  transform: translateZ(60px);
  transform-style: preserve-3d;
}

/* Floating 3D badges — natural buoyancy */
.lp-float-3d {
  animation: lp-3d-buoy 7s ease-in-out infinite;
  transform-style: preserve-3d;
}

@keyframes lp-3d-buoy {
  0%, 100% { transform: translateY(0) translateZ(0); }
  33% { transform: translateY(-6px) translateZ(10px); }
  66% { transform: translateY(2px) translateZ(-5px); }
}

/* Aurora orb container — smooth mouse follow */
.aurora-orb-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  will-change: transform;
  transform-style: preserve-3d;
}

/* Hero section — depth layering */
.lp-hero {
  padding: 60px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
  transform-style: preserve-3d;
}

/* ─── V6: 3D CARD TILT ─── */
.lp-card-3d {
  perspective: 1200px;
  transform-style: preserve-3d;
}

.lp-card-3d-inner {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transform-style: preserve-3d;
}

.lp-card-3d:hover .lp-card-3d-inner {
  transform: rotateX(2deg) rotateY(-3deg) translateZ(10px);
}

/* ─── V6: GLOW PULSE ON HERO ORB ─── */
@keyframes lp-orb-pulse {
  0%, 100% { filter: drop-shadow(0 0 30px rgba(139,92,246,0.3)); }
  50% { filter: drop-shadow(0 0 60px rgba(139,92,246,0.5)); }
}

.aurora-orb-container {
  animation: lp-orb-pulse 4s ease-in-out infinite;
}

/* ─── V6: HOVER DEPTH ON CARDS ─── */
.courtia-depth-card {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
}

.courtia-depth-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 48px rgba(70, 47, 148, 0.2), 0 0 0 1px rgba(139, 92, 246, 0.12);
}

/* ─── V6: ANIMATED ACCORDION ─── */
.lp-faq-item-v6 {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.lp-faq-item-v6:hover {
  border-color: rgba(139, 92, 246, 0.2);
}

.lp-faq-item-v6.lp-faq-open {
  border-color: rgba(139, 92, 246, 0.25);
  background: rgba(139, 92, 246, 0.04);
}

.lp-faq-trigger {
  width: 100%;
  background: none;
  border: none;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  text-align: left;
  font-family: inherit;
}

.lp-faq-chevron {
  flex-shrink: 0;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 12px;
  color: var(--aurora-text-muted);
}

.lp-faq-open .lp-faq-chevron {
  transform: rotate(180deg);
}

.lp-faq-answer-wrap {
  overflow: hidden;
  transition: max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
  max-height: 0;
  opacity: 0;
}

.lp-faq-open .lp-faq-answer-wrap {
  max-height: 400px;
  opacity: 1;
}

.lp-faq-answer {
  padding: 0 22px 18px;
  color: var(--aurora-text-muted);
  font-size: 14px;
  line-height: 1.7;
}

/* ─── V6: MOCK COCKPIT PREVIEW ─── */
.lp-cockpit-preview {
  background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.04), rgba(236,72,153,0.03));
  border: 1px solid rgba(139,92,246,0.12);
  border-radius: 20px;
  padding: 32px;
  position: relative;
  overflow: hidden;
}

.lp-cockpit-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(600px 300px at 20% 30%, rgba(139,92,246,0.08), transparent 70%);
  pointer-events: none;
}

.lp-cockpit-mock {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 20px;
  position: relative;
  z-index: 1;
}

.lp-cockpit-sidebar {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lp-cockpit-nav-item {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--aurora-text-muted);
  transition: all 0.2s;
}

.lp-cockpit-nav-item.lp-cockpit-nav-active {
  background: rgba(139,92,246,0.15);
  color: #fff;
}

.lp-cockpit-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lp-cockpit-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.lp-cockpit-kpi {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.lp-cockpit-kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
}

.lp-cockpit-kpi-label {
  font-size: 11px;
  color: var(--aurora-text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lp-cockpit-table {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 16px;
}

.lp-cockpit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 13px;
  color: var(--aurora-text-muted);
}

.lp-cockpit-row:last-child {
  border-bottom: none;
}

.lp-cockpit-row strong {
  color: #fff;
}

/* ─── RESPONSIVE ─── */
@media (max-width: 768px) {
  .lp-header {
    margin: 0;
    padding: 14px 20px;
    padding-top: max(14px, env(safe-area-inset-top, 0px));
    flex-wrap: wrap;
    gap: 12px;
    border-radius: 0 0 16px 16px;
    min-height: 52px;
    top: env(safe-area-inset-top, 0px);
  }

  .lp-header-brand {
    gap: 6px;
  }

  .lp-nav {
    order: 3;
    width: 100%;
    justify-content: center;
    gap: 10px;
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,0.04);
  }

  .lp-nav a {
    font-size: 14px;
    padding: 4px 0;
  }

  .lp-header .aurora-button {
    font-size: 13px;
    padding: 10px 20px;
  }

  .lp-hero {
    padding: 30px 14px 24px;
  }

  .lp-hero-title {
    font-size: 28px;
  }

  .lp-hero-desc {
    font-size: 14px;
    padding: 0 8px;
  }

  .lp-hero-cta {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .lp-hero-cta .aurora-button {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }

  .lp-hero-content {
    transform: none !important; /* kill 3D X-shift on mobile */
  }

  .lp-section {
    padding: 24px 14px;
  }

  .lp-card-title {
    font-size: 18px;
  }

  .lp-card-list li {
    font-size: 13px;
  }

  .lp-ark-step {
    font-size: 13px;
    padding: 10px 12px;
  }

  .lp-ark-step-icon {
    font-size: 18px;
  }

  .lp-price {
    font-size: 30px;
  }

  .lp-price-plan {
    font-size: 16px;
  }

  .lp-faq-item {
    padding: 12px 14px;
  }

  .lp-faq-item summary {
    font-size: 13px;
  }

  .lp-footer {
    padding: 30px 14px;
  }

  /* Scale down the orb on mobile */
  .aurora-orb-container > div {
    transform: scale(0.35) !important;
    margin: -120px 0 -60px 0;
    transform-origin: center center;
  }

  /* Full-width cards */
  .aurora-panel {
    padding: 24px !important;
  }

  /* Pricing full width */
  .aurora-grid-3 {
    gap: 12px;
  }
}

@media (max-width: 400px) {
  .lp-header {
    margin: 0;
    padding: 10px 16px;
    min-height: 48px;
    border-radius: 0 0 14px 14px;
  }

  .lp-nav {
    gap: 8px;
  }

  .lp-nav a {
    font-size: 13px;
  }

  .lp-hero {
    padding: 20px 10px 20px;
  }

  .lp-hero-title {
    font-size: 24px;
  }

  .lp-hero-desc {
    font-size: 13px;
  }

  .lp-section {
    padding: 20px 10px;
  }

  .aurora-orb-container > div {
    transform: scale(0.28) !important;
    margin: -140px 0 -80px 0;
  }

  .lp-price {
    font-size: 26px;
  }

  .lp-cockpit-mock {
    grid-template-columns: 1fr;
  }

  .lp-cockpit-kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .lp-cockpit-sidebar {
    display: none;
  }
}
`
