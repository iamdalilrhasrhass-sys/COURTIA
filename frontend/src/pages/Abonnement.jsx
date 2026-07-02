import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, CheckCircle2, CreditCard, ShieldCheck, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import CourtiaBubbleLogo from '../components/brand/CourtiaBubbleLogo'

const plans = [
  {
    code: 'starter',
    name: 'Starter',
    price: '89 €',
    suffix: 'HT/mois',
    icon: CreditCard,
    text: 'Pour structurer le suivi cabinet et poser les fondamentaux CRM IA.',
    cta: 'Voir le billing',
    features: ['Fiches clients', 'Suivi devis', 'Relances essentielles', 'Documents structurés'],
  },
  {
    code: 'pro',
    name: 'Pro',
    price: '159 €',
    suffix: 'HT/mois',
    icon: Sparkles,
    featured: true,
    text: 'L’offre principale pour exploiter ARK, piloter les priorités et exécuter les relances au quotidien.',
    cta: 'Démarrer Pro',
    features: ['ARK quotidien', 'Priorités & relances', 'Reporting portefeuille', 'Pilotage commercial du cabinet'],
  },
  {
    code: 'cabinet',
    name: 'Cabinet',
    price: 'Sur devis',
    suffix: '',
    icon: Building2,
    text: 'Pour équipe, besoins avancés, accompagnement et configuration personnalisée.',
    cta: 'Demander une démo',
    features: ['Multi-utilisateur', 'Configuration avancée', 'Accompagnement', 'Déploiement progressif'],
  },
]

const faqs = [
  [
    'Pourquoi Pro est-il mis en avant ?',
    'Parce que la valeur de COURTIA se révèle surtout quand ARK devient un vrai cockpit quotidien : priorités, relances, opportunités, reporting et actions à valider. Starter structure les bases, Pro porte le pilotage.',
  ],
  [
    'Comment fonctionne l’offre Cabinet ?',
    'Cabinet concerne les structures avec plusieurs utilisateurs, un besoin de configuration plus précis ou un accompagnement spécifique. Elle se traite sur devis pour éviter de vendre une formule standard à une organisation qui demande un déploiement sur mesure.',
  ],
  [
    'ARK décide-t-il à la place du courtier ?',
    'Non. ARK prépare, détecte, suggère et priorise. Le courtier garde la main sur les décisions métier, commerciales et contractuelles.',
  ],
]

function PlanCard({ plan, index, onSelect }) {
  const Icon = plan.icon
  return (
    <motion.article
      className={`abo6-plan courtia-depth-card ${plan.featured ? 'is-featured' : ''}`}
      initial={{ opacity: 0, y: 18, rotateX: 4 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.42, delay: index * 0.06 }}
    >
      {plan.featured ? <span className="abo6-recommended">Recommandé</span> : null}
      <div className="abo6-plan-head">
        <span className="abo6-icon"><Icon size={21} /></span>
        <h2>{plan.name}</h2>
      </div>
      <div className="abo6-price">
        <strong>{plan.price}</strong>
        {plan.suffix ? <span>{plan.suffix}</span> : null}
      </div>
      <p>{plan.text}</p>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}><CheckCircle2 size={15} /> {feature}</li>
        ))}
      </ul>
      <button className={`abo6-button ${plan.featured ? 'is-primary' : ''}`} onClick={() => onSelect(plan.code)}>
        {plan.cta} <ArrowRight size={15} />
      </button>
    </motion.article>
  )
}

export default function Abonnement() {
  const navigate = useNavigate()

  function handleSelect(planCode) {
    if (planCode === 'cabinet') {
      navigate('/demo')
      return
    }
    navigate(`/billing?plan=${planCode}`)
  }

  return (
    <main className="abo6-page">
      <style>{`
        .abo6-page {
          min-height: 100vh;
          color: #f5f3ff;
          padding: clamp(24px, 4vw, 52px);
          position: relative;
          overflow: hidden;
        }
        .abo6-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 16% 4%, rgba(255, 128, 224, 0.16), transparent 24rem),
            radial-gradient(circle at 86% 14%, rgba(34, 211, 238, 0.13), transparent 28rem),
            radial-gradient(circle at 50% 76%, rgba(139, 92, 246, 0.16), transparent 34rem);
        }
        .abo6-shell {
          width: min(1240px, 100%);
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .abo6-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(260px, 0.45fr);
          gap: clamp(22px, 4vw, 52px);
          align-items: center;
          margin-bottom: clamp(28px, 5vw, 58px);
        }
        .abo6-brand-orb {
          display: grid;
          place-items: center;
          width: min(330px, 52vw);
          aspect-ratio: 1;
          justify-self: center;
          border-radius: 42%;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(245,243,255,0.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 100px rgba(139,92,246,0.28);
          transform: rotate(-8deg);
        }
        .abo6-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(139,92,246,0.34);
          border-radius: 999px;
          background: rgba(139,92,246,0.12);
          color: #ddd6fe;
          padding: 8px 12px;
          font-size: 0.76rem;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .abo6-hero h1 {
          margin: 20px 0 14px;
          max-width: 900px;
          font-size: clamp(3rem, 8vw, 6.9rem);
          line-height: 0.86;
          letter-spacing: -0.085em;
          color: #fff;
        }
        .abo6-hero p {
          max-width: 760px;
          color: rgba(245,243,255,0.72);
          font-size: clamp(1rem, 1.8vw, 1.22rem);
          line-height: 1.7;
        }
        .abo6-plan-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(16px, 2vw, 24px);
          align-items: stretch;
          perspective: 1400px;
        }
        .abo6-plan {
          min-height: 100%;
          padding: clamp(22px, 3vw, 30px);
          border-radius: 30px !important;
          transform-style: preserve-3d;
        }
        .abo6-plan.is-featured {
          border-color: rgba(139,92,246,0.54) !important;
          transform: translateY(-10px) scale(1.035);
          box-shadow: 0 38px 120px rgba(139,92,246,0.22), 0 0 0 1px rgba(245,243,255,0.08) inset !important;
        }
        .abo6-recommended {
          display: inline-flex;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(139,92,246,0.95), rgba(34,211,238,0.52));
          color: #fff;
          padding: 7px 12px;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 18px;
          box-shadow: 0 0 40px rgba(139,92,246,0.32);
        }
        .abo6-plan-head {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .abo6-icon {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 17px;
          border: 1px solid rgba(245,243,255,0.12);
          background: radial-gradient(circle at 30% 20%, rgba(34,211,238,0.2), transparent 40%), rgba(255,255,255,0.065);
          color: #c4b5fd;
        }
        .abo6-plan h2 {
          margin: 0;
          font-size: 1.35rem;
        }
        .abo6-price {
          display: flex;
          align-items: baseline;
          gap: 9px;
          margin: 24px 0 14px;
        }
        .abo6-price strong {
          font-size: clamp(2.35rem, 4.6vw, 4rem);
          letter-spacing: -0.07em;
        }
        .abo6-price span,
        .abo6-plan p,
        .abo6-plan li,
        .abo6-faq p {
          color: rgba(245,243,255,0.66);
        }
        .abo6-plan p {
          line-height: 1.58;
          min-height: 74px;
        }
        .abo6-plan ul {
          display: grid;
          gap: 10px;
          list-style: none;
          padding: 0;
          margin: 22px 0;
        }
        .abo6-plan li {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 0.92rem;
        }
        .abo6-plan li svg {
          color: #5de3a1;
          flex-shrink: 0;
        }
        .abo6-button {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          border-radius: 16px;
          border: 1px solid rgba(245,243,255,0.14);
          background: rgba(255,255,255,0.06);
          color: #f5f3ff;
          font-weight: 850;
          cursor: pointer;
          transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }
        .abo6-button:hover {
          transform: translateY(-2px);
          border-color: rgba(34,211,238,0.38);
          box-shadow: 0 0 42px rgba(34,211,238,0.12);
        }
        .abo6-button.is-primary {
          border-color: rgba(139,92,246,0.62);
          background: linear-gradient(135deg, #8b5cf6, #6d5dfb 54%, #22d3ee);
          box-shadow: 0 0 54px rgba(139,92,246,0.34);
        }
        .abo6-control {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 22px;
          margin-top: clamp(34px, 5vw, 64px);
        }
        .abo6-faq,
        .abo6-note {
          padding: clamp(22px, 3vw, 30px);
          border-radius: 30px !important;
        }
        .abo6-note h2,
        .abo6-faq h2 {
          margin: 0 0 14px;
          font-size: clamp(1.35rem, 3vw, 2rem);
        }
        .abo6-note p {
          color: rgba(245,243,255,0.68);
          line-height: 1.7;
        }
        .abo6-note ul {
          display: grid;
          gap: 10px;
          padding: 0;
          margin: 18px 0 0;
          list-style: none;
        }
        .abo6-note li {
          display: flex;
          gap: 10px;
          align-items: center;
          color: rgba(245,243,255,0.72);
        }
        .abo6-faq details {
          border: 1px solid rgba(245,243,255,0.1);
          border-radius: 18px;
          background: rgba(255,255,255,0.035);
          padding: 16px 18px;
        }
        .abo6-faq details + details { margin-top: 10px; }
        .abo6-faq summary {
          cursor: pointer;
          color: #fff;
          font-weight: 850;
        }
        .abo6-faq p {
          margin: 10px 0 0;
          line-height: 1.65;
        }
        @media (max-width: 980px) {
          .abo6-hero,
          .abo6-plan-grid,
          .abo6-control { grid-template-columns: 1fr; }
          .abo6-plan.is-featured { transform: none; }
          .abo6-brand-orb { width: min(270px, 70vw); }
        }
      `}</style>

      <div className="abo6-shell">
        <section className="abo6-hero">
          <div>
            <span className="abo6-kicker"><Sparkles size={14} /> Billing COURTIA</span>
            <h1>Un cockpit IA premium, une grille claire.</h1>
            <p>
              Starter pose les fondamentaux. Pro est l’offre principale pour piloter le cabinet avec ARK. Cabinet se traite sur devis lorsque l’organisation demande un accompagnement plus précis.
            </p>
          </div>
          <div className="abo6-brand-orb" aria-hidden="true">
            <CourtiaBubbleLogo size="86%" animated showHalo showFoam showSpecular />
          </div>
        </section>

        <section className="abo6-plan-grid" aria-label="Plans COURTIA">
          {plans.map((plan, index) => (
            <PlanCard key={plan.code} plan={plan} index={index} onSelect={handleSelect} />
          ))}
        </section>

        <section className="abo6-control">
          <div className="abo6-note courtia-depth-card">
            <h2>Sécurité et contrôle</h2>
            <p>
              Le paiement est géré via le parcours billing sécurisé. COURTIA structure les informations du cabinet, mais le courtier garde la main sur les validations métier.
            </p>
            <ul>
              {['Accès sécurisés', 'Actions sensibles suivies', 'ARK suggère, le courtier valide'].map((item) => (
                <li key={item}><ShieldCheck size={16} /> {item}</li>
              ))}
            </ul>
          </div>

          <div className="abo6-faq courtia-depth-card">
            <h2>Questions utiles</h2>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
