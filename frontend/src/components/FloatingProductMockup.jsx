import { motion } from 'framer-motion'
import { Brain, TrendingUp, Sparkles, Bell, Clock, Zap, Shield } from 'lucide-react'

/**
 * FloatingProductMockup — Mockup cockpit 3D premium du dashboard COURTIA
 * Version améliorée avec perspective plus forte, plus de détails, cartes flottantes
 */
export default function FloatingProductMockup({ className = '' }) {
  return (
    <div className={`relative ${className}`} style={{ perspective: '1400px' }}>
      {/* Carte principale avec rotation 3D */}
      <motion.div
        className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/20"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateY(-4deg) rotateX(2deg)',
        }}
        animate={{
          y: [0, -6, 0],
          rotateY: [-4, -1, -4],
          rotateX: [2, 1, 2],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Fond glassmorphism sombre */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-gray-900/95 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.12),transparent_50%)]" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Top bar */}
        <div className="relative px-6 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-black text-sm">C</span>
            </div>
            <div>
              <span className="text-white font-bold text-sm tracking-tight">COURTIA</span>
              <span className="text-[9px] text-white/40 ml-2">cockpit</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              Portefeuille sous contrôle
            </div>
            <div className="flex -space-x-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 border-2 border-gray-800"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard grid */}
        <div className="relative p-5 grid grid-cols-12 gap-3">
          {/* Score portefeuille - large card */}
          <div className="col-span-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-white/5">
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider mb-2">Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">87</span>
              <span className="text-xs font-medium text-emerald-400">/100</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '87%' }}
                transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={10} className="text-green-400" />
              <span className="text-[9px] text-green-400/80">+12 pts ce mois-ci</span>
            </div>
          </div>

          {/* Morning Brief ARK - large */}
          <div className="col-span-5 bg-gradient-to-br from-purple-600/20 to-blue-600/10 rounded-xl p-4 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain size={12} className="text-purple-300" />
                <span className="text-[10px] font-semibold text-purple-200 uppercase tracking-wider">Brief du matin ARK</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                3 clients à relancer aujourd'hui — 2 contrats expirent dans 30 jours — 1 opportunité multi-équipement détectée chez SARL Dubois
              </p>
              <div className="flex gap-2 mt-3">
                {['3 priorités', '2 échéances', '1 opportunité'].map((tag, i) => (
                  <span key={i} className="text-[8px] bg-white/5 text-white/50 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* KPI cards - right column */}
          <div className="col-span-2 bg-white/5 rounded-xl p-3 border border-white/5 border-l-2 border-l-red-400/60">
            <div className="flex items-center gap-1.5 mb-1">
              <Bell size={9} className="text-red-400" />
              <span className="text-[9px] text-white/40 uppercase">À relancer</span>
            </div>
            <span className="text-xl font-bold text-white">4</span>
            <span className="text-[8px] text-red-400/60 block mt-0.5">urgent</span>
          </div>

          <div className="col-span-2 bg-white/5 rounded-xl p-3 border border-white/5 border-l-2 border-l-amber-400/60">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={9} className="text-amber-400" />
              <span className="text-[9px] text-white/40 uppercase">Échéances</span>
            </div>
            <span className="text-xl font-bold text-white">7</span>
            <span className="text-[8px] text-amber-400/60 block mt-0.5">3 450 € en jeu</span>
          </div>

          {/* Client list - full width */}
          <div className="col-span-12 bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Clients à contacter</span>
              <span className="text-[9px] text-purple-300 font-semibold">Voir tout →</span>
            </div>
            {[
              { name: 'SARL Dubois Construction', reason: 'Renouvellement RC Pro', priority: 'haute', score: 92, amount: '1 450€' },
              { name: 'Mme Petit', reason: 'Devis multirisque habitation', priority: 'moyenne', score: 78, amount: '890€' },
              { name: 'EARL Martin', reason: 'Proposition flotte agricole', priority: 'basse', score: 65, amount: '2 400€' },
              { name: 'SCI Lefebvre', reason: 'Opportunité multi-équipement', priority: 'moyenne', score: 88, amount: '3 200€' },
            ].map((c, i) => (
              <motion.div
                key={i}
                className="flex items-center justify-between py-1.5 border-t border-white/5 first:border-t-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + i * 0.12 }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      c.priority === 'haute'
                        ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]'
                        : c.priority === 'moyenne'
                          ? 'bg-amber-400'
                          : 'bg-blue-400'
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/80 font-medium">{c.name}</span>
                    <span className="text-[8px] text-white/30">Score {c.score}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-white/50">{c.reason}</span>
                  <span className="text-[10px] font-semibold text-emerald-400">{c.amount}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Carte flottante ARK (top-right) */}
      <motion.div
        className="absolute -top-6 -right-4 w-32 bg-gradient-to-br from-purple-600/80 to-blue-600/80 backdrop-blur-xl rounded-xl p-3 border border-white/20 shadow-xl"
        style={{ transformStyle: 'preserve-3d', zIndex: 5 }}
        animate={{ y: [0, -12, 0], rotate: [2, -1, 2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap size={10} className="text-yellow-300" />
          <span className="text-[9px] font-semibold text-white/90">ARK Actif</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[8px] text-white/60">3 alertes en cours</span>
        </div>
      </motion.div>

      {/* Carte flottante REACH (bottom-left) */}
      <motion.div
        className="absolute -bottom-5 -left-5 w-28 bg-white/10 backdrop-blur-xl rounded-xl p-2.5 border border-white/10 shadow-xl"
        style={{ zIndex: 5 }}
        animate={{ y: [0, 8, 0], rotate: [-1, 2, -1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Shield size={9} className="text-emerald-400" />
          <span className="text-[8px] font-semibold text-white/80">REACH</span>
        </div>
        <span className="text-[7px] text-white/40">5 messages à valider</span>
      </motion.div>

      {/* Carte flottante sécurité (top-left) */}
      <motion.div
        className="absolute -top-3 -left-3 w-24 bg-gradient-to-br from-emerald-500/20 to-transparent backdrop-blur-xl rounded-xl p-2.5 border border-white/10 shadow-xl"
        style={{ zIndex: 5 }}
        animate={{ y: [0, -6, 0], rotate: [-1, 1, -1] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <Shield size={8} className="text-emerald-400" />
          <span className="text-[7px] font-semibold text-white/70">Sécurisé</span>
        </div>
        <span className="text-[6px] text-white/30">TLS • RGPD • France</span>
      </motion.div>

      {/* Badge opportunité flottant (right) */}
      <motion.div
        className="absolute -right-6 bottom-20 bg-amber-500/20 backdrop-blur-xl rounded-xl p-2 border border-amber-500/20 shadow-xl"
        style={{ zIndex: 5 }}
        animate={{ y: [0, -5, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      >
        <span className="text-[7px] font-semibold text-amber-300">4 opportunités cachées</span>
      </motion.div>
    </div>
  )
}
