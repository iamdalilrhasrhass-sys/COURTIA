import { motion } from 'framer-motion'
import { ArrowRight, AlertTriangle, ClipboardList, Bell, TrendingUp, Target, Sparkles, Zap, BarChart3, Clock, Users, FileSpreadsheet, Phone, Mail, Calendar } from 'lucide-react'

const panelVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.15 * i, ease: [0.25, 0.1, 0.25, 1] }
  })
}

const cardVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: 0.3 + 0.08 * i, ease: 'easeOut' }
  })
}

const counterVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: 0.5 + 0.12 * i, ease: 'easeOut' }
  })
}

const beforeItems = [
  {
    icon: <FileSpreadsheet size={16} />,
    title: 'Clients éparpillés',
    desc: 'Excel, téléphone, emails, agenda : aucune vue complète.'
  },
  {
    icon: <Bell size={16} />,
    title: 'Relances oubliées',
    desc: 'Les échéances passent, les prospects refroidissent.'
  },
  {
    icon: <Target size={16} />,
    title: 'Opportunités invisibles',
    desc: 'Multi-équipement, ventes croisées, clients dormants : tout reste manuel.'
  },
  {
    icon: <Clock size={16} />,
    title: 'Pilotage flou',
    desc: 'Impossible de savoir quoi faire en priorité aujourd\'hui.'
  }
]

const afterItems = [
  {
    icon: <BarChart3 size={16} />,
    title: 'Cockpit centralisé',
    desc: 'Clients, contrats, tâches, relances et notes au même endroit.'
  },
  {
    icon: <Zap size={16} />,
    title: 'Priorités du jour',
    desc: 'ARK détecte les clients à risque, les échéances et les actions utiles.'
  },
  {
    icon: <Sparkles size={16} />,
    title: 'Prospection structurée',
    desc: 'ARK REACH prépare les messages et suit les campagnes.'
  },
  {
    icon: <TrendingUp size={16} />,
    title: 'Croissance pilotée',
    desc: 'Le portefeuille devient un moteur commercial mesurable.'
  }
]

const beforeIndicators = [
  { label: '0 priorité claire', color: 'from-red-500/20 to-red-600/10', textColor: 'text-red-300' },
  { label: '12 relances oubliées', color: 'from-red-500/20 to-red-600/10', textColor: 'text-red-300' },
  { label: '3 opportunités perdues', color: 'from-red-500/20 to-red-600/10', textColor: 'text-red-300' }
]

const afterIndicators = [
  { label: '87/100 score portefeuille', color: 'from-emerald-500/20 to-emerald-600/10', textColor: 'text-emerald-300' },
  { label: '4 relances prêtes', color: 'from-emerald-500/20 to-emerald-600/10', textColor: 'text-emerald-300' },
  { label: '3 opportunités détectées', color: 'from-emerald-500/20 to-emerald-600/10', textColor: 'text-emerald-300' }
]

// Petit icône décoratif façon fichier / post-it
function DecorativeIcons({ type }) {
  const isBefore = type === 'before'
  const baseColor = isBefore ? 'text-white/10' : 'text-white/15'
  return (
    <div className={`absolute ${isBefore ? '-top-4 -right-4' : '-top-4 -right-4'} opacity-30 pointer-events-none`}>
      {isBefore ? (
        <div className="flex flex-col gap-1.5 rotate-6">
          <div className="w-12 h-1.5 rounded-full bg-white/15" />
          <div className="w-16 h-1.5 rounded-full bg-white/10" />
          <div className="w-10 h-1.5 rounded-full bg-white/12" />
        </div>
      ) : (
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-400/20" />
          <div className="w-3 h-3 rounded-full bg-blue-400/20" />
          <div className="w-3 h-3 rounded-full bg-purple-400/20" />
        </div>
      )}
    </div>
  )
}

export default function BeforeAfterPanel() {
  return (
    <div className="relative">
      {/* Desktop : côte à côte */}
      <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] gap-0 items-stretch">
        {/* PANEL AVANT */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={panelVariants}
          className="relative rounded-2xl border border-red-500/10 bg-gradient-to-br from-white/[0.02] to-white/[0.01] backdrop-blur-xl p-7 lg:p-8 overflow-hidden group"
        >
          {/* Subtle red glow */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          <DecorativeIcons type="before" />

          {/* Header */}
          <div className="relative z-10 mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <AlertTriangle size={18} className="text-red-400" />
              <h3 className="font-black text-lg text-white/70 tracking-tight">Avant COURTIA</h3>
            </div>
            <p className="text-sm text-white/30 leading-relaxed">
              Le portefeuille existe, mais il dort dans plusieurs outils.
            </p>
          </div>

          {/* Mini-blocs */}
          <div className="relative z-10 space-y-3 mb-6">
            {beforeItems.map((item, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariants}
                className="group/card relative rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5 hover:bg-white/[0.04] hover:border-red-500/10 transition-all duration-300 cursor-default"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 group-hover/card:bg-red-500/15 transition-colors">
                    <span className="text-red-400/70">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/50 group-hover/card:text-white/70 transition-colors">{item.title}</h4>
                    <p className="text-xs text-white/25 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Faux indicateurs négatifs */}
          <div className="relative z-10 flex flex-wrap gap-2">
            {beforeIndicators.map((ind, i) => (
              <motion.span
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={counterVariants}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${ind.textColor} bg-gradient-to-r ${ind.color} px-2.5 py-1 rounded-full border border-red-500/5`}
              >
                <AlertTriangle size={10} />
                {ind.label}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* FLECHE CENTRALE */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={panelVariants}
          className="flex items-center justify-center px-3"
        >
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-400/20 flex items-center justify-center backdrop-blur-sm">
            <ArrowRight size={18} className="text-purple-400" />
          </div>
        </motion.div>

        {/* PANEL AVEC */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={panelVariants}
          className="relative rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-white/[0.04] to-purple-500/[0.02] backdrop-blur-xl p-7 lg:p-8 overflow-hidden group"
        >
          {/* Glow violet-bleu */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-500/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/6 rounded-full blur-2xl pointer-events-none" />
          <DecorativeIcons type="after" />

          {/* Header */}
          <div className="relative z-10 mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <Sparkles size={18} className="text-emerald-400" />
              <h3 className="font-black text-lg text-white tracking-tight">Avec COURTIA</h3>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">
              ARK analyse, ARK REACH prépare, le courtier décide.
            </p>
          </div>

          {/* Mini-blocs */}
          <div className="relative z-10 space-y-3 mb-6">
            {afterItems.map((item, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariants}
                className="group/card relative rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 hover:bg-white/[0.06] hover:border-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-default"
              >
                {/* Subtle glow on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400/0 via-transparent to-purple-400/0 group-hover/card:from-emerald-400/5 group-hover/card:to-purple-400/5 transition-all duration-500 pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 group-hover/card:bg-emerald-500/25 transition-colors">
                    <span className="text-emerald-400/80">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/80 group-hover/card:text-white transition-colors">{item.title}</h4>
                    <p className="text-xs text-white/35 mt-0.5 leading-relaxed group-hover/card:text-white/45 transition-colors">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Faux indicateurs positifs - style mini dashboard */}
          <div className="relative z-10 flex flex-wrap gap-2">
            {afterIndicators.map((ind, i) => (
              <motion.span
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={counterVariants}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${ind.textColor} bg-gradient-to-r ${ind.color} px-2.5 py-1 rounded-full border border-emerald-500/10`}
              >
                <BarChart3 size={10} />
                {ind.label}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* MOBILE : colonne */}
      <div className="md:hidden space-y-6">
        {/* Avant */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={panelVariants}
          className="relative rounded-2xl border border-red-500/10 bg-gradient-to-br from-white/[0.02] to-white/[0.01] backdrop-blur-xl p-6 overflow-hidden"
        >
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="font-black text-base text-white/70">Avant COURTIA</h3>
            </div>
            <p className="text-xs text-white/30">Le portefeuille dort dans plusieurs outils.</p>
          </div>
          <div className="relative z-10 space-y-2.5 mb-5">
            {beforeItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-white/[0.03] bg-white/[0.02]">
                <div className="mt-0.5 w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <span className="text-red-400/70" style={{ fontSize: 12 }}>{item.icon}</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-white/50">{item.title}</h4>
                  <p className="text-[11px] text-white/25 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative z-10 flex flex-wrap gap-1.5">
            {beforeIndicators.map((ind, i) => (
              <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-medium ${ind.textColor} bg-gradient-to-r ${ind.color} px-2 py-0.5 rounded-full`}>
                <AlertTriangle size={8} />
                {ind.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Séparateur mobile */}
        <div className="flex items-center gap-3 justify-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
          <span className="text-[11px] font-medium text-purple-400/60 whitespace-nowrap">Puis COURTIA transforme tout ça</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        </div>

        {/* Avec */}
        <motion.div
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={panelVariants}
          className="relative rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-white/[0.04] to-purple-500/[0.02] backdrop-blur-xl p-6 overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-500/8 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-emerald-400" />
              <h3 className="font-black text-base text-white">Avec COURTIA</h3>
            </div>
            <p className="text-xs text-white/40">ARK analyse, ARK REACH prépare, le courtier décide.</p>
          </div>
          <div className="relative z-10 space-y-2.5 mb-5">
            {afterItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.03]">
                <div className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <span className="text-emerald-400/80" style={{ fontSize: 12 }}>{item.icon}</span>
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-white/80">{item.title}</h4>
                  <p className="text-[11px] text-white/35 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative z-10 flex flex-wrap gap-1.5">
            {afterIndicators.map((ind, i) => (
              <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-medium ${ind.textColor} bg-gradient-to-r ${ind.color} px-2 py-0.5 rounded-full`}>
                <BarChart3 size={8} />
                {ind.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Phrase finale sous les deux panneaux */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-center text-sm text-white/40 mt-8 max-w-2xl mx-auto leading-relaxed"
      >
        COURTIA ne remplace pas le courtier. Il lui donne une vision claire, des priorités et du temps pour vendre mieux.
      </motion.p>
    </div>
  )
}
