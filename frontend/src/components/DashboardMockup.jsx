import React from 'react'
import { motion } from 'framer-motion'
import { Brain, TrendingUp, Clock, Sparkles, Zap, Shield, Bell } from 'lucide-react'

/**
 * DashboardMockup — Mockup 3D glassmorphism du cockpit COURTIA
 * Affiche les KPIs clés, le Morning Brief et des cartes flottantes
 * avec perspective 3D et effet flottant
 */
export default function DashboardMockup({ className = '' }) {
  return (
    <div className={`relative ${className}`} style={{ perspective: '1200px' }}>
      {/* Carte principale avec rotation 3D */}
      <motion.div
        className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateY(-3deg) rotateX(2deg)',
        }}
        animate={{
          y: [0, -8, 0],
          rotateY: [-3, -1, -3],
          rotateX: [2, 1, 2],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Fond glassmorphism */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/85 to-gray-900/90 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Top bar */}
        <div className="relative px-5 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-[11px]">C</span>
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">COURTIA</span>
            <span className="hidden sm:inline text-[9px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full font-medium">
              Demo
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 border-2 border-gray-800"
                />
              ))}
            </div>
            <div className="text-[10px] text-white/50 bg-white/5 px-2.5 py-1 rounded-lg font-medium">
              Bonjour, David
            </div>
          </div>
        </div>

        {/* Dashboard grid */}
        <div className="relative p-4 grid grid-cols-6 gap-2.5">
          {/* Score card */}
          <div className="col-span-2 bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/5">
            <p className="text-[9px] text-white/40 font-medium uppercase tracking-wider mb-1">
              Score Portefeuille
            </p>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-white">87</span>
              <span className="text-[10px] font-medium text-green-400">/100</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '87%' }}
                transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingUp size={8} className="text-green-400" />
              <span className="text-[8px] text-green-400/80">+5 pts ce mois</span>
            </div>
          </div>

          {/* Morning Brief */}
          <div className="col-span-4 bg-gradient-to-br from-purple-600/20 to-blue-600/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-1.5 mb-1.5">
              <Brain size={10} className="text-purple-300" />
              <span className="text-[9px] font-semibold text-purple-200 uppercase tracking-wider">
                Morning Brief ARK
              </span>
            </div>
            <p className="text-[9px] text-white/70 leading-relaxed">
              3 clients à relancer aujourd'hui — 2 contrats expirent dans 30 jours — 1 opportunité multi-équipement détectée
            </p>
          </div>

          {/* KPI Cards */}
          <div className="col-span-2 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/5 border-l-2 border-l-red-400/60">
            <div className="flex items-center gap-1.5 mb-1">
              <Bell size={8} className="text-red-400" />
              <span className="text-[8px] text-white/40 uppercase tracking-wider">À relancer</span>
            </div>
            <motion.span
              className="text-lg font-bold text-white"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              4
            </motion.span>
            <span className="text-[8px] text-red-400/60 block mt-0.5">urgent</span>
          </div>

          <div className="col-span-2 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/5 border-l-2 border-l-amber-400/60">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={8} className="text-amber-400" />
              <span className="text-[8px] text-white/40 uppercase tracking-wider">Échéances</span>
            </div>
            <motion.span
              className="text-lg font-bold text-white"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              7
            </motion.span>
            <span className="text-[8px] text-amber-400/60 block mt-0.5">3 450 € en jeu</span>
          </div>

          <div className="col-span-2 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/5 border-l-2 border-l-emerald-400/60">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={8} className="text-emerald-400" />
              <span className="text-[8px] text-white/40 uppercase tracking-wider">Opportunités</span>
            </div>
            <motion.span
              className="text-lg font-bold text-white"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              5
            </motion.span>
            <span className="text-[8px] text-emerald-400/60 block mt-0.5">+ 2 800 € estimé</span>
          </div>

          {/* Client list */}
          <div className="col-span-6 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">
                Clients à contacter
              </span>
              <span className="text-[8px] text-purple-300 font-semibold">Voir tout →</span>
            </div>
            {[
              { name: 'SARL Dubois Construction', reason: 'Renouvellement RC Pro', priority: 'haute', score: 92 },
              { name: 'Mme Petit', reason: 'Devis multirisque habitation', priority: 'moyenne', score: 78 },
              { name: 'EARL Martin', reason: 'Proposition flotte agricole', priority: 'basse', score: 65 },
            ].map((c, i) => (
              <motion.div
                key={i}
                className="flex items-center justify-between py-1.5 border-t border-white/5 first:border-t-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.8 + i * 0.15 }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      c.priority === 'haute'
                        ? 'bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.5)]'
                        : c.priority === 'moyenne'
                          ? 'bg-amber-400'
                          : 'bg-blue-400'
                    }`}
                  />
                  <div>
                    <span className="text-[9px] text-white/80 font-medium">{c.name}</span>
                    <span className="text-[7px] text-white/30 ml-2">Score {c.score}</span>
                  </div>
                </div>
                <span className="text-[8px] text-white/40">{c.reason}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Carte flottante ARK (au-dessus, légèrement décalée) */}
      <motion.div
        className="absolute -top-4 -right-3 w-28 sm:w-36 bg-gradient-to-br from-purple-600/80 to-blue-600/80 backdrop-blur-xl rounded-xl p-3 border border-white/20 shadow-xl hidden sm:block"
        style={{ transformStyle: 'preserve-3d', zIndex: 5 }}
        animate={{
          y: [0, -10, 0],
          rotate: [2, -1, 2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap size={8} className="text-yellow-300" />
          <span className="text-[8px] font-semibold text-white/90">ARK Actif</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[7px] text-white/60">3 alertes en cours</span>
        </div>
      </motion.div>

      {/* Carte flottante sécurité (en bas à gauche) */}
      <motion.div
        className="absolute -bottom-3 -left-4 w-24 sm:w-32 bg-white/10 backdrop-blur-xl rounded-xl p-2.5 border border-white/10 shadow-xl hidden sm:block"
        style={{ zIndex: 5 }}
        animate={{
          y: [0, 8, 0],
          rotate: [-1, 2, -1],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Shield size={8} className="text-emerald-400" />
          <span className="text-[7px] font-semibold text-white/80">Sécurisé</span>
        </div>
        <span className="text-[6px] text-white/40">TLS • RGPD • France</span>
      </motion.div>
    </div>
  )
}
