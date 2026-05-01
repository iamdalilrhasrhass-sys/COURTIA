// SkillCard — Composant carte compétence premium
import { motion } from 'framer-motion'
import { Lock, Share2, Star, Zap, Users, Bell, Target, Layers, Award, Sparkles, Cpu, BarChart, Upload, CheckSquare, Repeat, UserPlus, Building, Layout, GitBranch, TrendingUp, ClipboardList } from 'lucide-react'

const ICONS = {
  'user-plus': UserPlus, 'building': Building, 'check-square': CheckSquare, 'bell': Bell,
  'users': Users, 'clipboard-list': ClipboardList, 'upload': Upload, 'layout': Layout,
  'repeat': Repeat, 'zap': Zap, 'target': Target, 'layers': Layers,
  'bar-chart': BarChart, 'trending-up': TrendingUp, 'git-branch': GitBranch, 'cpu': Cpu,
  'award': Award, 'sparkles': Sparkles, 'share-2': Share2, 'star': Star,
}

const RARITY_STYLES = {
  bronze: {
    gradient: 'from-amber-700/30 to-amber-900/20',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/10',
    text: 'text-amber-300',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
  },
  silver: {
    gradient: 'from-slate-300/20 to-slate-400/10',
    border: 'border-slate-300/20',
    glow: 'shadow-slate-300/10',
    text: 'text-slate-200',
    badge: 'bg-slate-300/10 text-slate-200 border-slate-300/20',
    iconBg: 'bg-slate-300/15',
    iconColor: 'text-slate-300',
  },
  gold: {
    gradient: 'from-yellow-400/25 to-yellow-600/10',
    border: 'border-yellow-400/25',
    glow: 'shadow-yellow-400/15',
    text: 'text-yellow-300',
    badge: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/25',
    iconBg: 'bg-yellow-400/20',
    iconColor: 'text-yellow-400',
  },
  diamond: {
    gradient: 'from-cyan-300/25 to-blue-500/15',
    border: 'border-cyan-300/25',
    glow: 'shadow-cyan-300/15',
    text: 'text-cyan-200',
    badge: 'bg-cyan-300/15 text-cyan-200 border-cyan-300/25',
    iconBg: 'bg-cyan-300/20',
    iconColor: 'text-cyan-300',
  },
  epic: {
    gradient: 'from-purple-400/30 via-pink-400/15 to-blue-400/15',
    border: 'border-purple-400/25',
    glow: 'shadow-purple-400/20',
    text: 'text-purple-200',
    badge: 'bg-purple-400/15 text-purple-200 border-purple-400/25',
    iconBg: 'bg-purple-400/20',
    iconColor: 'text-purple-300',
  },
}

export default function SkillCard({ card, onShare, compact }) {
  const s = RARITY_STYLES[card.rarity] || RARITY_STYLES.bronze
  const Icon = ICONS[card.icon] || Star
  const showLocked = !card.unlocked

  if (compact) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className={`relative rounded-xl border ${showLocked ? 'border-white/[0.04] bg-white/[0.02]' : `${s.border} bg-gradient-to-br ${s.gradient}`} backdrop-blur-xl p-3 ${s.glow} transition-all duration-300 cursor-default group`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${showLocked ? 'bg-white/5' : s.iconBg} flex items-center justify-center shrink-0`}>
            {showLocked ? <Lock size={13} className="text-white/20" /> : <Icon size={14} className={s.iconColor} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${showLocked ? 'text-white/30' : 'text-white/80'}`}>{card.title}</p>
            <span className={`text-[10px] ${s.text} opacity-70`}>{card.rarity}</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      className={`relative rounded-2xl border ${showLocked ? 'border-white/[0.04] bg-white/[0.02]' : `${s.border} bg-gradient-to-br ${s.gradient}`} backdrop-blur-xl p-5 ${s.glow} transition-all duration-300 cursor-default group overflow-hidden`}
    >
      {/* Glow effect */}
      {!showLocked && (
        <div className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${s.gradient} rounded-full blur-3xl opacity-20 pointer-events-none`} />
      )}

      {/* Rarity badge */}
      <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${s.badge} mb-3`}>
        {card.rarity}
      </div>

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl ${showLocked ? 'bg-white/5' : s.iconBg} flex items-center justify-center mb-3`}>
        {showLocked ? <Lock size={16} className="text-white/20" /> : <Icon size={18} className={s.iconColor} />}
      </div>

      {/* Title */}
      <h3 className={`font-semibold text-sm mb-1 ${showLocked ? 'text-white/30' : 'text-white/90'}`}>
        {card.title}
      </h3>

      {/* Description */}
      <p className={`text-xs leading-relaxed mb-3 ${showLocked ? 'text-white/15' : 'text-white/40'}`}>
        {showLocked ? 'Débloquez cette compétence en complétant l\'action associée.' : card.description}
      </p>

      {/* XP */}
      {!showLocked && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-400/70 mb-3">
          <Zap size={11} />
          <span>+{card.xp_reward} XP</span>
        </div>
      )}

      {/* Share button */}
      {!showLocked && onShare && (
        <button
          onClick={(e) => { e.stopPropagation(); onShare(card); }}
          className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          <Share2 size={11} />
          Partager sur LinkedIn
        </button>
      )}
    </motion.div>
  )
}
