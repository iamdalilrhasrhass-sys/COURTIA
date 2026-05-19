import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { applySeo } from '../lib/seo'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'
import CourtiaWordmark from '../components/brand/CourtiaWordmark'
import AuroraHalo from '../components/brand/AuroraHalo'
import RhasrhassSignature from '../components/brand/RhasrhassSignature'

export default function LandingPublic() {
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
              <Link className="aurora-button aurora-button-ghost" to="#tarifs">
                Voir les tarifs
              </Link>
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
                  <div className="lp-ark-step-icon">🌅</div>
                  <div><strong>Matin</strong> — ARK prépare les priorités du jour.</div>
                </div>
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon">📋</div>
                  <div><strong>Avant RDV</strong> — ARK résume le dossier client.</div>
                </div>
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon">✉️</div>
                  <div><strong>Après échange</strong> — ARK suggère une relance propre.</div>
                </div>
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon">💡</div>
                  <div><strong>Portefeuille</strong> — ARK détecte les opportunités utiles.</div>
                </div>
                <div className="lp-ark-step">
                  <div className="lp-ark-step-icon">🌙</div>
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
                  <div className="lp-cockpit-nav-item lp-cockpit-nav-active">📊 Cockpit</div>
                  <div className="lp-cockpit-nav-item">👥 Clients</div>
                  <div className="lp-cockpit-nav-item">📋 Devis</div>
                  <div className="lp-cockpit-nav-item">📄 Contrats</div>
                  <div className="lp-cockpit-nav-item">🔔 Relances</div>
                  <div className="lp-cockpit-nav-item">💡 Opportunités</div>
                  <div className="lp-cockpit-nav-item">📈 Rapports</div>
                  <div className="lp-cockpit-nav-item">⚙️ Paramètres</div>
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
                      <span>🔴 <strong>Karim B.</strong> — Devis Auto #247</span>
                      <span>Sans réponse · 7 j</span>
                    </div>
                    <div className="lp-cockpit-row">
                      <span>🟡 <strong>Dupont Jean</strong> — Contrat MRH</span>
                      <span>Échéance · 15 j</span>
                    </div>
                    <div className="lp-cockpit-row">
                      <span>🟢 <strong>Martin SARL</strong> — Flotte Pro</span>
                      <span>À signer · 2 j</span>
                    </div>
                    <div className="lp-cockpit-row">
                      <span>🔵 <strong>Sophie L.</strong> — Habitation</span>
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
}

.lp-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
  animation: lp-orb-drift 12s ease-in-out infinite;
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
}

@keyframes lp-stars-twinkle {
  0% { opacity: 0.6; }
  100% { opacity: 1; }
}

/* ─── HEADER ─── */
.lp-header {
  position: sticky;
  top: 12px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 24px;
  margin: 12px 24px;
  border-radius: 16px;
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
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
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
}

.lp-ark-step strong {
  color: #fff;
}

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
    margin: 6px 10px;
    padding: 8px 14px;
    flex-wrap: wrap;
    gap: 10px;
    border-radius: 14px;
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
    font-size: 12px;
  }

  .lp-header .aurora-button {
    font-size: 12px;
    padding: 8px 16px;
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
  }

  .lp-hero-cta .aurora-button {
    width: 100%;
    max-width: 280px;
    justify-content: center;
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
    transform: scale(0.55);
    transform-origin: center center;
    margin: -80px 0;
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
    margin: 4px 6px;
    padding: 6px 10px;
  }

  .lp-nav {
    gap: 6px;
  }

  .lp-nav a {
    font-size: 11px;
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
    transform: scale(0.45);
    margin: -100px 0;
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
