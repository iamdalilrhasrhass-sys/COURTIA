import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ChevronDown, Mail, ArrowRight, Star, Shield, Zap, Users } from 'lucide-react'

// ─── Feature Configuration ────────────────────────────────────────────────────

const featureLabels = {
  morning_brief: 'Morning Brief',
  client_score: 'Score Client ARK',
  tags_kanban: 'Tags & Kanban',
  generated_docs: 'Documents générés',
  dda_quiz: 'DDA Quiz',
  automations: 'Automations',
  newsletters: 'Newsletters',
  email_ia: 'Email IA',
  analytics: 'Analytiques avancées',
  compliance: 'Conformité & Rapports',
  api: 'API publique',
  white_label: 'Marque blanche',
  multi_agences: 'Multi-agences',
  support: 'Support',
  max_clients: 'Nombre de clients max'
}

const featureCategory = {
  morning_brief: 'Gestion quotidienne',
  client_score: 'Gestion quotidienne',
  tags_kanban: 'Gestion quotidienne',
  generated_docs: 'Productivité',
  dda_quiz: 'Productivité',
  automations: 'Automatisation',
  newsletters: 'Marketing',
  email_ia: 'IA & Assistance',
  analytics: 'Analytique',
  compliance: 'Conformité',
  api: 'Intégration',
  white_label: 'Personnalisation',
  multi_agences: 'Multi-agences',
  support: 'Service',
  max_clients: 'Capacité'
}

const featureRows = [
  { key: 'morning_brief', label: 'Morning Brief', type: 'bool' },
  { key: 'client_score', label: 'Score Client ARK', type: 'bool' },
  { key: 'tags_kanban', label: 'Tags & Kanban', type: 'bool' },
  { key: 'generated_docs', label: 'Documents générés', type: 'bool' },
  { key: 'dda_quiz', label: 'DDA Quiz', type: 'bool' },
  { key: 'automations', label: 'Automations', type: 'bool' },
  { key: 'newsletters', label: 'Newsletters', type: 'bool' },
  { key: 'email_ia', label: 'Email IA', type: 'bool' },
  { key: 'analytics', label: 'Analytiques avancées', type: 'bool' },
  { key: 'compliance', label: 'Conformité & Rapports', type: 'bool' },
  { key: 'api', label: 'API publique', type: 'bool' },
  { key: 'white_label', label: 'Marque blanche', type: 'bool' },
  { key: 'multi_agences', label: 'Multi-agences', type: 'bool' },
  { key: 'support', label: 'Support', type: 'text' },
  { key: 'max_clients', label: 'Nombre de clients max', type: 'text' }
]

const plans = [
  {
    name: 'Start',
    price: '39',
    desc: 'Pour courtier indépendant',
    popular: false,
    features: {
      morning_brief: true,
      client_score: true,
      tags_kanban: true,
      generated_docs: true,
      dda_quiz: true,
      automations: false,
      newsletters: false,
      email_ia: false,
      analytics: false,
      compliance: false,
      api: false,
      white_label: false,
      multi_agences: false,
      support: 'Standard',
      max_clients: '200'
    }
  },
  {
    name: 'Pro',
    price: '69',
    desc: 'Pour cabinet en croissance',
    popular: true,
    features: {
      morning_brief: true,
      client_score: true,
      tags_kanban: true,
      generated_docs: true,
      dda_quiz: true,
      automations: true,
      newsletters: true,
      email_ia: true,
      analytics: true,
      compliance: true,
      api: false,
      white_label: false,
      multi_agences: false,
      support: 'Prioritaire',
      max_clients: '1000'
    }
  },
  {
    name: 'Elite',
    price: '129',
    desc: 'Pour cabinet performant',
    popular: false,
    features: {
      morning_brief: true,
      client_score: true,
      tags_kanban: true,
      generated_docs: true,
      dda_quiz: true,
      automations: true,
      newsletters: true,
      email_ia: true,
      analytics: true,
      compliance: true,
      api: true,
      white_label: true,
      multi_agences: true,
      support: 'Manager dédié',
      max_clients: 'Illimité'
    }
  }
]

const frais = [
  { type: 'Mise en service', montant: '0€', desc: "Gratuit — pas de frais d'activation" },
  { type: 'Migration portefeuille', montant: '0€', desc: 'Import Excel/CSV gratuit, accompagné si nécessaire' },
  { type: 'Résiliation', montant: '0€', desc: 'Sans frais, résiliable à tout moment' },
  { type: 'Frais SMS/WhatsApp', montant: '0€', desc: 'Inclus dans tous les plans' }
]

const faq = [
  { q: 'Puis-je résilier à tout moment ?', a: "Oui, sans frais. Votre abonnement reste actif jusqu'à la fin de la période en cours." },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Hébergement sécurisé, chiffrement SSL, sauvegardes quotidiennes. Conforme RGPD.' },
  { q: 'Puis-je importer mes clients depuis un autre CRM ?', a: 'Oui. Format Excel/CSV supporté. ARK nettoie et dédoublonne automatiquement.' },
  { q: 'Combien de temps prend la mise en place ?', a: "5 minutes pour créer votre compte. L'import de votre portefeuille prend 2 minutes." },
  { q: "Est-ce que ARK remplace mon assistant ?", a: 'ARK automatise les tâches répétitives (envoi docs, relances, indexation). Vous gardez le contrôle.' }
]

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, index }) {
  const features = plan.features
  const featureList = [
    features.morning_brief && 'Morning Brief quotidien',
    features.client_score && 'Score Client ARK',
    features.tags_kanban && 'Tags & Kanban',
    features.generated_docs && 'Documents générés automatiquement',
    features.dda_quiz && 'DDA Quiz intégré',
    features.automations && 'Automations & workflows',
    features.newsletters && 'Newsletters & campagnes',
    features.email_ia && 'Email IA rédaction assistée',
    features.analytics && 'Analytiques avancées',
    features.compliance && 'Conformité & Rapports RGPD',
    features.api && 'API publique',
    features.white_label && 'Marque blanche',
    features.multi_agences && 'Multi-agences',
    `Support ${features.support}`,
    `Jusqu'à ${features.max_clients} clients`
  ].filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12 }}
      className={`relative flex flex-col rounded-2xl border bg-white p-8 transition-all duration-300 ${
        plan.popular
          ? 'border-[#534AB7] shadow-[0_0_0_1px_#534AB7,0_8px_32px_rgba(83,74,183,0.12)] scale-[1.02] z-10'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#534AB7] px-4 py-1 text-xs font-bold text-white shadow-lg">
            <Star size={12} className="fill-white" />
            Recommandé
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-[#0a0a0a]">{plan.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{plan.desc}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-extrabold text-[#0a0a0a]">{plan.price}€</span>
        <span className="ml-1 text-sm font-semibold text-gray-400">/mois</span>
      </div>

      <ul className="mb-8 flex flex-col gap-3">
        {featureList.slice(0, 6).map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
            <span className="text-sm text-gray-700">{f}</span>
          </li>
        ))}
        {featureList.length > 6 && (
          <li className="text-xs font-medium text-[#534AB7]">
            +{featureList.length - 6} fonctionnalités
          </li>
        )}
      </ul>

      <div className="mt-auto">
        <a
          href="mailto:contact@courtia.fr?subject=Je%20souhaite%20d%C3%A9marrer%20avec%20le%20plan%20Start"
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all duration-200 ${
            plan.popular
              ? 'bg-[#534AB7] text-white hover:bg-[#4639a6] shadow-lg shadow-[#534AB7]/20'
              : 'border-2 border-[#534AB7] text-[#534AB7] hover:bg-[#534AB7] hover:text-white'
          }`}
        >
          <Mail size={16} />
          Démarrer avec Dalil
          <ArrowRight size={16} />
        </a>
      </div>
    </motion.div>
  )
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 py-4 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="text-sm font-semibold text-[#0a0a0a]">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-all duration-300 ${
            open ? 'rotate-180 text-[#534AB7]' : 'text-gray-400'
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="mt-3 text-sm leading-relaxed text-gray-500">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonTable() {
  const categories = [...new Set(featureRows.map(r => featureCategory[r.key]))]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 pr-6 text-left text-xs font-bold uppercase tracking-wider text-gray-400">
              Fonctionnalité
            </th>
            {plans.map((plan) => (
              <th
                key={plan.name}
                className={`py-3 px-4 text-center text-xs font-bold uppercase tracking-wider ${
                  plan.popular ? 'text-[#534AB7]' : 'text-gray-500'
                }`}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <>
              <tr key={cat} className="border-b border-gray-100 bg-gray-50/50">
                <td
                  colSpan={4}
                  className="py-2.5 pr-6 text-xs font-bold text-[#534AB7]"
                >
                  {cat}
                </td>
              </tr>
              {featureRows
                .filter((r) => featureCategory[r.key] === cat)
                .map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                  >
                    <td className="py-3 pr-6 text-sm text-[#0a0a0a]">
                      {row.label}
                    </td>
                    {plans.map((plan) => {
                      const val = plan.features[row.key]
                      return (
                        <td
                          key={plan.name}
                          className="px-4 py-3 text-center"
                        >
                          {row.type === 'bool' ? (
                            val ? (
                              <Check
                                size={18}
                                className="mx-auto text-emerald-500"
                              />
                            ) : (
                              <X
                                size={18}
                                className="mx-auto text-gray-300"
                              />
                            )
                          ) : (
                            <span className="text-sm font-medium text-[#0a0a0a]">
                              {val}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Frais Card ───────────────────────────────────────────────────────────────

const fraisIcons = [Zap, Shield, X, Users]

function FraisCard({ item, index }) {
  const Icon = fraisIcons[index % fraisIcons.length]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="flex items-start gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#534AB7]/10 text-[#534AB7]">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-sm font-bold text-[#0a0a0a]">{item.type}</h4>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-600">
            {item.montant}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-500">{item.desc}</p>
      </div>
    </motion.div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export default function Tarifs() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-16 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#534AB7]/10 px-4 py-1.5 text-xs font-bold text-[#534AB7]">
            <Star size={12} />
            Transparence totale
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0a0a0a] sm:text-5xl">
            Des tarifs simples et clairs
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
            Pas de frais cachés, pas d'engagement. Choisissez le plan adapté à
            votre activité de courtage.
          </p>
        </motion.div>

        {/* ── Plan Cards ── */}
        <div className="mb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>

        {/* ── Comparison Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-20"
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-[#0a0a0a]">
            Comparez toutes les fonctionnalités
          </h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <ComparisonTable />
          </div>
        </motion.div>

        {/* ── Frais Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-20"
        >
          <h2 className="mb-2 text-center text-2xl font-bold text-[#0a0a0a]">
            Frais de mise en service
          </h2>
          <p className="mx-auto mb-8 max-w-md text-center text-sm text-gray-500">
            Zéro surprise. Tous les coûts sont inclus et transparents.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {frais.map((item, i) => (
              <FraisCard key={item.type} item={item} index={i} />
            ))}
          </div>
        </motion.div>

        {/* ── FAQ ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <h2 className="mb-8 text-center text-2xl font-bold text-[#0a0a0a]">
            Questions fréquentes
          </h2>
          <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {faq.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </motion.div>

        {/* ── Final CTA ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <div className="mx-auto max-w-lg rounded-2xl bg-[#534AB7]/5 border border-[#534AB7]/10 p-8">
            <h3 className="text-xl font-bold text-[#0a0a0a]">
              Prêt à passer à la vitesse supérieure ?
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Discutons de vos besoins et trouvons la formule idéale pour votre
              cabinet.
            </p>
            <a
              href="mailto:contact@courtia.fr"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#534AB7] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#534AB7]/20 transition-all hover:bg-[#4639a6] hover:shadow-xl hover:shadow-[#534AB7]/30"
            >
              <Mail size={18} />
              Démarrer avec Dalil
              <ArrowRight size={18} />
            </a>
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-300">Rhasrhass&reg;</p>
        </div>
      </div>
    </div>
  )
}
