import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { BubbleC } from '../design/BubbleC';
import '../design/tokens.css';

/**
 * LandingPublic — La Bulle V2 PHOTO-RÉALISTE.
 * Hero : réplique EXACTE de la référence HTML V2 (cosmos discret + 40 étoiles
 * twinkle, kicker JetBrains Mono, bulle 480, wordmark, tagline,
 * animations fade-in séquentielles, pas de grid floor, pas de particules drift).
 *
 * Sections additionnelles (manifeste, powers, proof, pricing, footer) inchangées.
 */
export default function LandingPublic() {
  // Étoiles V2 — 40 étoiles fines twinkle ease-in-out 3-8s, size 0.5-1.7px
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        size: 0.5 + Math.random() * 1.2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: 3 + Math.random() * 5,
        delay: -Math.random() * 7,
      })),
    []
  );

  return (
    <>
      <style>{styles}</style>

      {/* COSMOS BACKGROUND V2 — très discret */}
      <div className="cosmos" />

      {/* ÉTOILES V2 — 40 fines twinkle */}
      <div className="stars" aria-hidden>
        {stars.map((s, i) => (
          <span
            key={i}
            className="star"
            style={{
              width: `${s.size}px`,
              height: `${s.size}px`,
              left: `${s.left}vw`,
              top: `${s.top}vh`,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* STAGE V2 — flex column space-between, padding 42px, full-screen */}
      <section className="stage">
        <div className="kicker">
          Courtia <span className="pulse-dot" /> L'IA Compagnon
        </div>

        <div className="bubble-frame">
          <div className="bubble-hero">
            <BubbleC size={480} />
          </div>
        </div>

        <div className="bottom-block">
          <h1 className="wordmark">
            courtia<em>.</em>
          </h1>
          <p className="tagline">Une bulle d'intelligence pour celui qui protège.</p>
          <div className="cta-row">
            <Link to="/register" className="cta-primary">
              Essai gratuit 7 jours
              <span className="arrow">→</span>
            </Link>
            <Link to="/login" className="cta-ghost">Voir le cockpit</Link>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Manifeste */}
      <ManifesteSection />

      {/* SECTION 3 — Les 5 super-pouvoirs */}
      <PowersSection />

      {/* SECTION 4 — Chiffres */}
      <ProofSection />

      {/* SECTION 5 — Tarifs */}
      <PricingSection />

      {/* SECTION 6 — Footer */}
      <FooterSection />
    </>
  );
}

/* ─────────────────────────────────────────── */
/* SECTIONS ADDITIONNELLES                     */
/* ─────────────────────────────────────────── */

function ManifesteSection() {
  return (
    <section className="band">
      <div className="band-inner">
        <div className="band-kicker">
          <span className="dot" /> Le manifeste
        </div>
        <h2 className="band-title">
          Le courtage <em>mérite</em><br />une bulle d'intelligence.
        </h2>
        <p className="band-text">
          Pendant des années, le courtier d'assurance a porté son métier seul.
          Mille tâches invisibles. Mille relances oubliées. Mille opportunités
          perdues dans le silence.
        </p>
        <p className="band-text">
          COURTIA n'est pas un CRM. C'est <em>un compagnon</em>.
          Une présence calme qui veille, comprend, et agit.
        </p>
      </div>
    </section>
  );
}

function PowersSection() {
  const powers = [
    {
      tag: '01',
      title: 'ARK Watch',
      desc: "Surveille votre portefeuille 24/7. Détecte les opportunités Hamon, Chatel, les silences anormaux. Vous appelez au bon moment.",
    },
    {
      tag: '02',
      title: 'Voice Intake',
      desc: "Un appel. Une transcription. Une fiche client complétée. Le CRM se remplit pendant que vous parlez.",
    },
    {
      tag: '03',
      title: 'Doc Vision',
      desc: "RIB, CG, attestations. Photographiez. ARK lit, classe, injecte. Vous ne saisissez plus rien.",
    },
    {
      tag: '04',
      title: 'ARK Compose',
      desc: "IPID, DDA, devoir de conseil. Un clic. Le PDF conforme est généré. Quinze minutes deviennent une seconde.",
    },
    {
      tag: '05',
      title: 'Quote Intel',
      desc: "Dispatch automatique de devis à dix compagnies. Mails personnalisés. Vous choisissez la meilleure offre.",
    },
  ];

  return (
    <section className="powers">
      <div className="band-inner">
        <div className="band-kicker">
          <span className="dot" /> Les cinq pouvoirs
        </div>
        <h2 className="band-title">
          ARK, votre <em>compagnon</em><br />d'intelligence.
        </h2>
      </div>
      <div className="powers-grid">
        {powers.map((p, i) => (
          <PowerCard key={i} {...p} index={i} />
        ))}
      </div>
    </section>
  );
}

function PowerCard({ tag, title, desc, index }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [80, -80]), { stiffness: 80, damping: 20 });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <motion.div ref={ref} className="power-card" style={{ y, opacity }}>
      <div className="power-bubble">
        <BubbleC size={100} showHalo={false} />
      </div>
      <div className="power-tag">{tag}</div>
      <h3 className="power-title">{title}</h3>
      <p className="power-desc">{desc}</p>
    </motion.div>
  );
}

function ProofSection() {
  const stats = [
    { value: '+3h', label: 'gagnées par semaine' },
    { value: '98%', label: 'de satisfaction' },
    { value: '124', label: 'clients pilotes' },
  ];
  return (
    <section className="proof">
      <div className="proof-inner">
        {stats.map((s, i) => (
          <div className="proof-stat" key={i}>
            <div className="proof-value">{s.value}</div>
            <div className="proof-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      name: 'Starter',
      price: '89',
      desc: 'L\'essentiel pour les courtiers indépendants',
      features: ['Portefeuille jusqu\'à 200 clients', 'ARK Watch + Doc Vision', 'Support email'],
    },
    {
      name: 'Pro',
      price: '159',
      desc: 'La puissance complète d\'ARK',
      features: ['Portefeuille illimité', 'Tous les pouvoirs ARK', 'Voice Intake + Quote Intel', 'Support prioritaire'],
      featured: true,
    },
    {
      name: 'Cabinet',
      price: 'Sur devis',
      desc: 'Pour les cabinets multi-courtiers',
      features: ['Multi-utilisateurs', 'API publique', 'Onboarding dédié', 'SLA garanti'],
    },
  ];

  return (
    <section className="pricing">
      <div className="band-inner">
        <div className="band-kicker">
          <span className="dot" /> Tarifs
        </div>
        <h2 className="band-title">
          Une bulle, <em>trois</em> formules.
        </h2>
      </div>
      <div className="pricing-grid">
        {plans.map((p, i) => (
          <div className={`pricing-card ${p.featured ? 'featured' : ''}`} key={i}>
            {p.featured && <div className="pricing-badge">Le choix de la sérénité</div>}
            <h3 className="pricing-name">{p.name}</h3>
            <div className="pricing-price">
              {p.price === 'Sur devis' ? (
                <span className="pricing-custom">Sur devis</span>
              ) : (
                <>
                  <span className="pricing-currency">€</span>
                  <span className="pricing-amount">{p.price}</span>
                  <span className="pricing-period">HT/mois</span>
                </>
              )}
            </div>
            <p className="pricing-desc">{p.desc}</p>
            <ul className="pricing-features">
              {p.features.map((f, j) => <li key={j}>{f}</li>)}
            </ul>
            <Link to="/register" className={p.featured ? 'cta-primary' : 'cta-ghost'}>
              {p.featured ? 'Commencer maintenant' : 'Choisir'}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="footer">
      <div className="footer-bubble">
        <BubbleC size={60} animated={false} showHalo={false} />
      </div>
      <div className="footer-wordmark">courtia<em>.</em></div>
      <p className="footer-tagline">Une bulle d'intelligence pour celui qui protège.</p>
      <div className="footer-links">
        <Link to="/legal">Mentions légales</Link>
        <Link to="/cgu">CGU</Link>
        <Link to="/contact">Contact</Link>
      </div>
      <div className="footer-copy">© 2026 COURTIA — Tous droits réservés.</div>
    </footer>
  );
}

/* ─────────────────────────────────────────── */
/* STYLES — Exacts de la référence + sections  */
/* ─────────────────────────────────────────── */
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500&family=Fraunces:opsz,wght@9..144,300;9..144,400&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400&display=swap');

:root {
  --bg-deep: #020108;
  --bg-mid: #08051A;
}

html, body, #root {
  background: var(--bg-deep);
  color: #fff;
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}

/* ─── COSMIC BACKGROUND V2 — très discret ─── */
.cosmos {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 45%, rgba(90,40,180,0.10) 0%, transparent 50%),
    radial-gradient(ellipse at 30% 80%, rgba(220,60,160,0.05) 0%, transparent 55%),
    linear-gradient(180deg, #020108 0%, #06031A 50%, #020108 100%);
  z-index: 0;
  pointer-events: none;
}

/* ─── STARS V2 — 40 étoiles fines twinkle ─── */
.stars { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
.star {
  position: absolute;
  background: #fff;
  border-radius: 50%;
  animation: twinkle ease-in-out infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.08; }
  50% { opacity: 0.45; }
}

/* ─── HERO STAGE V2 — space-between full-screen ─── */
.stage {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 42px;
  pointer-events: none;
}
.stage > * { pointer-events: auto; }

/* KICKER V2 — JetBrains 10px letter-spacing 7px, dot 5px gradient + pulse */
.kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 7px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.38);
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 14px;
  opacity: 0;
  animation: fadeIn 1.5s 0.6s forwards;
}
.kicker .pulse-dot {
  display: inline-block;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4d9d, #a142f4);
  box-shadow: 0 0 6px rgba(255,77,157,0.6);
  animation: pulse 2.4s ease-in-out infinite;
}
/* Dot legacy pour les autres band-kicker (sections) */
.band-kicker .dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4d9d, #a142f4);
  margin: 0 10px;
  vertical-align: middle;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.4); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* BUBBLE FRAME V2 — center 480 max */
.bubble-frame {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 0 20px;
}
.bubble-hero {
  width: 100%;
  max-width: 480px;
  aspect-ratio: 1 / 1;
  position: relative;
  opacity: 0;
  animation: bubbleIn 1.8s 0.3s cubic-bezier(.2,.7,.3,1) forwards;
}
.bubble-hero > .bubble-wrap,
.bubble-hero > div {
  width: 100% !important;
  height: 100% !important;
}
@keyframes bubbleIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}

/* BOTTOM BLOCK V2 — wordmark + tagline + CTA, fade-in 1.3s */
.bottom-block {
  text-align: center;
  margin-bottom: 24px;
  opacity: 0;
  animation: fadeIn 1.5s 1.3s forwards;
}

.wordmark {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 200;
  font-size: clamp(46px, 7vw, 72px);
  letter-spacing: -3px;
  line-height: 1;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.65) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 14px;
}
.wordmark em {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  background: linear-gradient(90deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: clamp(14px, 1.5vw, 18px);
  color: rgba(255,255,255,0.52);
  letter-spacing: -0.1px;
  max-width: 440px;
  margin: 0 auto 28px;
}

/* CTA Row */
.cta-row {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
}
.cta-primary, .cta-ghost {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 400;
  font-size: 14px;
  letter-spacing: 0.2px;
  padding: 14px 28px;
  border-radius: 999px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.cta-primary {
  background: linear-gradient(90deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%);
  color: #fff;
  box-shadow: 0 8px 32px rgba(161, 66, 244, 0.35);
}
.cta-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(161, 66, 244, 0.5); }
.cta-primary .arrow { transition: transform 0.3s ease; }
.cta-primary:hover .arrow { transform: translateX(4px); }
.cta-ghost {
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.85);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(20px);
}
.cta-ghost:hover { background: rgba(255,255,255,0.08); }

/* ─── BAND (sections) ─── */
.band, .powers, .proof, .pricing {
  position: relative;
  z-index: 2;
  padding: 140px 40px;
}
.band-inner {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}
.band-kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  margin-bottom: 40px;
}
.band-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 200;
  font-size: clamp(34px, 5vw, 64px);
  letter-spacing: -2px;
  line-height: 1.05;
  margin-bottom: 40px;
  background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.band-title em {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  background: linear-gradient(90deg, #ff4d9d 0%, #a142f4 50%, #4285f4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.band-text {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 22px;
  line-height: 1.6;
  color: rgba(255,255,255,0.6);
  margin-bottom: 28px;
}
.band-text em {
  background: linear-gradient(90deg, #ff4d9d, #a142f4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ─── POWERS GRID ─── */
.powers-grid {
  max-width: 1280px;
  margin: 80px auto 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}
.power-card {
  position: relative;
  background: rgba(8, 5, 26, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
}
.power-bubble {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.power-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 4px;
  color: rgba(255,255,255,0.3);
  margin-bottom: 8px;
}
.power-title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 300;
  font-size: 22px;
  letter-spacing: -0.5px;
  margin-bottom: 12px;
  color: #fff;
}
.power-desc {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 15px;
  line-height: 1.55;
  color: rgba(255,255,255,0.55);
}

/* ─── PROOF ─── */
.proof-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 60px;
}
.proof-stat { text-align: center; }
.proof-value {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  font-size: clamp(56px, 8vw, 96px);
  background: linear-gradient(135deg, #ff80e0, #c080ff, #80a8ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
  margin-bottom: 12px;
}
.proof-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.45);
}

/* ─── PRICING ─── */
.pricing-grid {
  max-width: 1100px;
  margin: 80px auto 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.pricing-card {
  position: relative;
  background: rgba(8, 5, 26, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 24px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
}
.pricing-card.featured {
  border: 1px solid transparent;
  background:
    linear-gradient(rgba(8,5,26,0.7), rgba(8,5,26,0.7)) padding-box,
    linear-gradient(135deg, #ff4d9d, #a142f4, #4285f4) border-box;
}
.pricing-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 3px;
  text-transform: uppercase;
  background: linear-gradient(90deg, #ff4d9d, #a142f4);
  padding: 6px 14px;
  border-radius: 999px;
  color: #fff;
}
.pricing-name {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 300;
  font-size: 28px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #fff, rgba(255,255,255,0.6));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.pricing-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 16px;
}
.pricing-currency {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 200;
  font-size: 24px;
  color: rgba(255,255,255,0.7);
}
.pricing-amount {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 200;
  font-size: 64px;
  letter-spacing: -2px;
  color: #fff;
}
.pricing-period, .pricing-custom {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 15px;
  color: rgba(255,255,255,0.5);
}
.pricing-custom {
  font-size: 32px;
  color: #fff;
}
.pricing-desc {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 15px;
  color: rgba(255,255,255,0.55);
  margin-bottom: 28px;
}
.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
  flex: 1;
}
.pricing-features li {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 300;
  font-size: 14px;
  color: rgba(255,255,255,0.75);
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

/* ─── FOOTER ─── */
.footer {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 100px 40px 60px;
  border-top: 1px solid rgba(255,255,255,0.04);
}
.footer-bubble {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}
.footer-wordmark {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 200;
  font-size: 32px;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #fff, rgba(255,255,255,0.6));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 6px;
}
.footer-wordmark em {
  font-family: 'Fraunces', serif;
  font-style: italic;
  background: linear-gradient(90deg, #ff4d9d, #a142f4, #4285f4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.footer-tagline {
  font-family: 'Instrument Serif', serif;
  font-style: italic;
  font-size: 15px;
  color: rgba(255,255,255,0.4);
  margin-bottom: 40px;
}
.footer-links {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 32px;
}
.footer-links a {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  text-decoration: none;
}
.footer-links a:hover { color: rgba(255,255,255,0.8); }
.footer-copy {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(255,255,255,0.25);
}

@media (max-width: 600px) {
  .kicker { font-size: 9px; letter-spacing: 5px; gap: 10px; }
  .band-kicker { font-size: 9px; letter-spacing: 4px; margin-bottom: 32px; }
  .stage { padding: 24px; }
  .bubble-frame { padding: 0; }
  .band, .powers, .proof, .pricing { padding: 80px 24px; }
  .cta-row { flex-direction: column; width: 100%; }
  .cta-primary, .cta-ghost { justify-content: center; }
  .footer-links { flex-direction: column; gap: 16px; }
}
`;
