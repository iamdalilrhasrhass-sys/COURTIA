import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  { q: 'COURTIA est-il réservé aux courtiers en assurance ?', a: 'Oui, COURTIA est conçu spécifiquement pour les courtiers en assurance. Notre CRM, notre IA ARK et notre module REACH sont pensés pour votre métier et vos besoins.' },
  { q: 'ARK remplace-t-il le courtier ?', a: 'Non. ARK analyse, prépare et suggère. Il ne décide jamais à votre place. Vous validez chaque action avant qu\'elle ne soit exécutée. C\'est un copilote, pas un pilote automatique.' },
  { q: 'REACH envoie-t-il automatiquement des messages ?', a: 'Non. REACH prépare les messages, mais ne les envoie jamais sans votre validation. Le mode dry-run par défaut vous permet de tester sans aucun risque.' },
  { q: 'Peut-on importer ses clients ?', a: 'Oui. L\'import CSV avec preview, mapping des colonnes et détection des doublons vous permet de transférer votre portefeuille en quelques minutes.' },
  { q: 'Les données sont-elles sécurisées ?', a: 'Absolument. COURTIA respecte la RGPD. Vos données sont hébergées en Europe, chiffrées en transit et au repos. Aucun partage avec des tiers.' },
  { q: 'Pourquoi choisir l\'offre Pro ?', a: 'L\'offre Pro débloque ARK complet, REACH, les automatisations, le scoring portefeuille et les rapports avancés. C\'est le vrai cockpit IA qui transforme votre quotidien.' },
  { q: 'Peut-on commencer seul ?', a: 'COURTIA est conçu pour être opérationnel immédiatement. L\'offre Premium inclut un accompagnement dédié si vous préférez être guidé.' },
  { q: 'COURTIA est-il adapté aux petits cabinets ?', a: 'Oui. L\'offre Starter est parfaite pour les courtiers solo. L\'offre Pro convient aux cabinets de 2-5 personnes. Premium est pour les structures plus importantes.' },
]

export default function FAQPremium({ dark = false }) {
  const [open, setOpen] = useState(null)
  const bgClass = dark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-white/20'
  const textClass = dark ? 'text-white/80' : 'text-gray-900'
  const answerClass = dark ? 'text-white/50' : 'text-gray-500'

  return (
    <div className="space-y-3">
      {faqs.map((item, i) => (
        <div key={i} className={`rounded-2xl border ${bgClass} backdrop-blur-xl overflow-hidden`}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className={`w-full flex items-center justify-between p-5 text-left ${textClass}`}
          >
            <span className="font-semibold text-sm pr-4">{item.q}</span>
            <ChevronDown
              size={16}
              className={`text-gray-400 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className={`px-5 pb-5 text-sm leading-relaxed ${answerClass}`}>{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
