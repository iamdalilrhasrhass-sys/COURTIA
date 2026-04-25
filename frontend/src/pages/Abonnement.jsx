import { useState } from 'react'
import { Check, Star, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import BubbleCard from '../components/BubbleCard'
import BubbleBadge from '../components/BubbleBadge'
import BubbleButton from '../components/BubbleButton'
import BubbleBackground from '../components/BubbleBackground'

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)', padding: '16px 0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>{q}</span>
        <ChevronDown
          size={18}
          style={{
            color: open ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s',
            flexShrink: 0,
          }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Testimonial Card ─────────────────────────────────────────────────────────
const getHash = (str) => { let hash = 0; for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash); return hash }
const getHSL = (str) => `hsl(${getHash(str) % 360}, 70%, 55%)`
const getGradient = (str) => `linear-gradient(135deg, ${getHSL(str)} 0%, hsl(${(getHash(str) + 40) % 360}, 80%, 65%) 100%)`

const TestimonialCard = ({ text, author, city }) => (
  <BubbleCard hover padding={22}>
    <div style={{ display: 'flex', gap: 2, marginBottom: 10 }}>
      {Array(5).fill(0).map((_, i) => (
        <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
      ))}
    </div>
    <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
      &ldquo;{text}&rdquo;
    </p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 13,
          color: '#fff',
          flexShrink: 0,
          background: getGradient(author),
        }}
      >
        {(author || '?').charAt(0)}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0a', margin: 0 }}>{author}</p>
        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', margin: 0 }}>{city}</p>
      </div>
    </div>
  </BubbleCard>
)

// ─── Plan Card ────────────────────────────────────────────────────────────────
const PLAN_FEATURES = {
  starter: ['5 clients max', 'Tableau de bord Indicateurs', 'ARK Chat basique', 'Gestion contrats', 'Support email'],
  pro: ['Clients illimités', 'ARK complet + analyses IA', 'Priorité support', 'ARK IA', 'Rapports avancés', '3 collaborateurs'],
  premium: ['Tout inclus Pro', 'API publique', 'Audit RGPD', 'Onboarding dédié', 'Account Manager', 'Collaborateurs illimités'],
}

function PlanCard({ plan, billingCycle, loadingPlan, onSelect }) {
  const isMonthly = billingCycle === 'monthly'
  const monthlyPrice = { starter: 39, pro: 79, premium: 129 }[plan]
  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.8)
  const displayPrice = isMonthly ? monthlyPrice : yearlyPrice
  const perLabel = isMonthly ? '/mois' : '/an'
  const isPro = plan === 'pro'
  const isPremium = plan === 'premium'
  const features = PLAN_FEATURES[plan]

  const planName = {
    starter: 'Starter',
    pro: 'Pro',
    premium: 'Premium',
  }[plan]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: isPro ? 0.15 : isPremium ? 0.25 : 0.05 }}
      style={{ position: 'relative' }}
    >
      <BubbleCard
        hover
        padding={28}
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: isPro ? '0.5px solid rgba(37,99,235,0.25)' : undefined,
          boxShadow: isPro ? '0 4px 8px rgba(37,99,235,0.06), 0 16px 40px rgba(37,99,235,0.1), 0 40px 80px rgba(37,99,235,0.05)' : undefined,
          transform: isPro ? 'scale(1.03)' : undefined,
          zIndex: isPro ? 2 : 1,
        }}
      >
        {/* "Recommandé" ribbon for Pro */}
        {isPro && (
          <div style={{
            position: 'absolute',
            top: 14,
            right: -36,
            transform: 'rotate(45deg)',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '4px 36px',
            letterSpacing: '0.5px',
          }}>
            RECOMMANDÉ
          </div>
        )}

        {/* Plan name + badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 18, color: '#0a0a0a', margin: 0 }}>
            {planName}
          </h3>
          {isPro && (
            <BubbleBadge color="#2563eb" size="sm" pulse>
              Populaire
            </BubbleBadge>
          )}
          {isPremium && (
            <BubbleBadge color="#7c3aed" size="sm">
              Premium
            </BubbleBadge>
          )}
        </div>

        {/* Price */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: '#0a0a0a', fontFamily: 'Arial, sans-serif' }}>
            {displayPrice}€
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.4)' }}>
            {perLabel}
          </span>
          {!isMonthly && (
            <div style={{ marginTop: 4 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#10b981',
                background: 'rgba(16,185,129,0.1)',
                padding: '2px 8px',
                borderRadius: 9999,
              }}>
                Économisez 20%
              </span>
            </div>
          )}
          {isMonthly && plan !== 'starter' && (
            <div style={{ marginTop: 4 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(0,0,0,0.3)',
              }}>
                Soit {yearlyPrice}€/an
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {features.map((f) => (
            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Check size={16} color="#10b981" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.7)', lineHeight: 1.4 }}>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div style={{ marginTop: 24 }}>
          <BubbleButton
            variant={isPro ? 'primary' : 'secondary'}
            size="md"
            onClick={() => onSelect(plan)}
            disabled={loadingPlan === plan}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loadingPlan === plan ? 'Redirection...' : 'Choisir ce plan'}
          </BubbleButton>
        </div>
      </BubbleCard>
    </motion.div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function Abonnement() {
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loadingPlan, setLoadingPlan] = useState(null)

  const handleCheckout = async (plan) => {
    setLoadingPlan(plan)
    try {
      const { data } = await api.post('/api/stripe/create-checkout-session', { plan, billingCycle })
      if (data.url) window.location.href = data.url
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la redirection vers Stripe.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <BubbleBackground intensity="rich" />

      <style>{`
        @media (max-width: 767px) {
          .abo-container { padding: 24px 16px !important; }
          .abo-title { font-size: 26px !important; }
          .abo-plan-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .abo-testimonial-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="abo-container" style={{ position: 'relative', zIndex: 1, padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <BubbleBadge color="#2563eb" size="md" style={{ marginBottom: 12 }}>
            Offre Fondateur &mdash; 50 places
          </BubbleBadge>
          <h1 className="abo-title" style={{
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: 36,
            color: '#0a0a0a',
            margin: '8px 0',
            letterSpacing: '-0.02em',
          }}>
            Choisissez votre plan
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', maxWidth: 500, margin: '0 auto' }}>
            Débloquez la puissance de l&rsquo;IA pour votre cabinet de courtage. Simple, transparent et sans engagement.
          </p>

          {/* Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 20,
            padding: 4,
            background: 'rgba(0,0,0,0.04)',
            borderRadius: 9999,
            border: '0.5px solid rgba(0,0,0,0.06)',
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                borderRadius: 9999,
                cursor: 'pointer',
                background: billingCycle === 'monthly' ? '#fff' : 'transparent',
                color: billingCycle === 'monthly' ? '#0a0a0a' : 'rgba(0,0,0,0.45)',
                boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle('annually')}
              style={{
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                borderRadius: 9999,
                cursor: 'pointer',
                background: billingCycle === 'annually' ? '#fff' : 'transparent',
                color: billingCycle === 'annually' ? '#0a0a0a' : 'rgba(0,0,0,0.45)',
                boxShadow: billingCycle === 'annually' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s',
                fontFamily: 'Arial, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Annuel
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16,185,129,0.12)',
                padding: '2px 6px',
                borderRadius: 9999,
              }}>
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="abo-plan-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}>
          {['starter', 'pro', 'premium'].map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              billingCycle={billingCycle}
              loadingPlan={loadingPlan}
              onSelect={handleCheckout}
            />
          ))}
        </div>

        {/* Testimonials */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: 22,
            color: '#0a0a0a',
            textAlign: 'center',
            margin: '0 0 24px 0',
          }}>
            Ils font confiance à COURTIA
          </h2>
          <div className="abo-testimonial-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}>
            <TestimonialCard
              text="COURTIA a transformé ma façon de gérer mon portefeuille. Les scores me font gagner un temps précieux."
              author="Julie Martin"
              city="Lyon"
            />
            <TestimonialCard
              text="L'interface est intuitive et l'IA est bluffante. Je ne pourrais plus m'en passer pour prioriser mes actions."
              author="Lucas Dubois"
              city="Marseille"
            />
            <TestimonialCard
              text="Enfin un CRM pensé pour les courtiers. Simple, efficace et orienté business. Je recommande à 100%."
              author="Chloé Petit"
              city="Paris"
            />
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 48, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={{
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: 22,
            color: '#0a0a0a',
            textAlign: 'center',
            margin: '0 0 20px 0',
          }}>
            Questions fréquentes
          </h2>
          <BubbleCard hover={false} padding={24}>
            <FAQItem q="Puis-je changer de plan plus tard ?" a="Absolument. Vous pouvez faire évoluer ou réduire votre plan à tout moment depuis vos paramètres de facturation." />
            <FAQItem q="Y a-t-il un engagement ?" a="Non, tous nos plans sont sans engagement. Vous pouvez annuler votre abonnement à tout moment, sans frais." />
            <FAQItem q="Comment fonctionne ARK ?" a="ARK est notre assistant IA intégré. Il analyse les données de vos clients pour générer des scores, identifier des opportunités et vous aider à prioriser vos actions. Dans le plan Pro, il peut aussi répondre à vos questions en langage naturel." />
            <FAQItem q="Mes données sont-elles sécurisées ?" a="La sécurité est notre priorité absolue. Vos données sont chiffrées (AES-256) et hébergées en Europe sur des serveurs conformes aux normes les plus strictes." />
            <FAQItem q="Puis-je annuler à tout moment ?" a="Oui. Vous pouvez annuler votre abonnement quand vous le souhaitez. Vous conserverez l'accès à votre plan jusqu'à la fin de la période de facturation en cours." />
          </BubbleCard>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, paddingBottom: 24 }}>
          <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.2)' }}>Rhasrhass®</p>
        </div>
      </div>
    </div>
  )
}
