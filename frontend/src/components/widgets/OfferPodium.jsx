// OfferPodium.jsx
// Les offres comparées disposées en podium olympique.
// Hauteur proportionnelle au score ARK. Animation de montée au chargement.
// Props :
//   offers {Array} — [{id, partnerName, totalScore, monthlyPrice, commissionRate, recommended}]
//   onSelect {function(offer)}
//   profile {'client'|'cabinet'}
//   onProfileChange {function(profile)}

import { useEffect, useState } from 'react'

const PODIUM_COLORS = {
  0: { bar: '#F59E0B', text: '#F59E0B', bg: 'rgba(245,158,11,0.12)', badge: '🥇' },
  1: { bar: '#6B7280', text: '#9CA3AF', bg: 'rgba(255,255,255,0.06)', badge: '🥈' },
  2: { bar: '#EF4444', text: '#EF4444', bg: 'rgba(239,68,68,0.12)', badge: '🥉' },
}

const DEFAULT_OFFERS = [
  { id: '1', partnerName: 'April',   totalScore: 91, monthlyPrice: 38.50, commissionRate: 18, recommended: true },
  { id: '2', partnerName: 'Wakam',   totalScore: 78, monthlyPrice: 34.20, commissionRate: 15, recommended: false },
  { id: '3', partnerName: 'Allianz', totalScore: 65, monthlyPrice: 42.00, commissionRate: 12, recommended: false },
  { id: '4', partnerName: 'MAAF',    totalScore: 55, monthlyPrice: 29.90, commissionRate: 10, recommended: false },
]

function PodiumBar({ offer, rank, maxScore, animate, isSelected, onClick }) {
  const [height, setHeight] = useState(0)
  const targetH = Math.round((offer.totalScore / 100) * 120)
  const col = PODIUM_COLORS[rank] ?? { bar: '#8B5CF6', text: '#A78BFA', bg: 'rgba(139,92,246,0.12)', badge: '' }

  useEffect(() => {
    if (!animate) { setHeight(targetH); return }
    const timer = setTimeout(() => {
      let h = 0
      const step = () => {
        h = Math.min(h + 3, targetH)
        setHeight(h)
        if (h < targetH) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, rank * 120)
    return () => clearTimeout(timer)
  }, [animate, targetH, rank])

  return (
    <button
      className={`flex flex-col items-center gap-1 transition-all ${isSelected ? 'scale-105' : 'hover:scale-102'}`}
      onClick={() => onClick(offer)}
      style={{ width: 80 }}
    >
      {/* Recommended badge */}
      {offer.recommended && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
          ★ ARK
        </span>
      )}

      {/* Score */}
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {offer.totalScore}
      </span>

      {/* Bar */}
      <div
        className="w-full rounded-t-lg transition-all duration-75 flex items-end justify-center pb-2"
        style={{
          height,
          backgroundColor: col.bar,
          opacity: isSelected ? 1 : 0.85,
          boxShadow: isSelected ? `0 0 0 2px ${col.bar}` : 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>{col.badge}</span>
      </div>

      {/* Base */}
      <div
        className="w-full rounded-sm py-2 px-1 text-center"
        style={{ backgroundColor: col.bg }}
      >
        <span className="text-xs font-medium block truncate" style={{ color: col.bar }}>
          {offer.partnerName}
        </span>
        <span className="text-xs text-slate-500 block">
          {offer.monthlyPrice.toFixed(2)} €/m
        </span>
      </div>
    </button>
  )
}

export default function OfferPodium({
  offers = DEFAULT_OFFERS,
  onSelect,
  profile = 'client',
  onProfileChange,
}) {
  const [selected, setSelected] = useState(null)
  const [animated, setAnimated] = useState(false)
  const [currentProfile, setCurrentProfile] = useState(profile)

  useEffect(() => {
    setTimeout(() => setAnimated(true), 100)
  }, [])

  const sorted = [...offers].sort((a, b) => b.totalScore - a.totalScore)

  // Podium order : 2nd, 1st, 3rd (olympic display)
  const podiumOrder =
    sorted.length >= 3
      ? [sorted[1], sorted[0], sorted[2], ...sorted.slice(3)]
      : sorted

  const handleSelect = (offer) => {
    setSelected(offer)
    onSelect?.(offer)
  }

  const handleProfile = (p) => {
    setCurrentProfile(p)
    onProfileChange?.(p)
    setAnimated(false)
    setTimeout(() => setAnimated(true), 50)
  }

  const winner = sorted[0]

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Podium ARK</p>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {['client', 'cabinet'].map(p => (
            <button
              key={p}
              className={`text-xs px-3 py-1 transition-colors ${
                currentProfile === p
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => handleProfile(p)}
            >
              {p === 'client' ? 'Profil client' : 'Profil cabinet'}
            </button>
          ))}
        </div>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 pt-2">
        {podiumOrder.slice(0, 3).map((offer, displayRank) => {
          const actualRank = sorted.findIndex(o => o.id === offer.id)
          return (
            <PodiumBar
              key={offer.id}
              offer={offer}
              rank={actualRank}
              maxScore={sorted[0]?.totalScore ?? 100}
              animate={animated}
              isSelected={selected?.id === offer.id}
              onClick={handleSelect}
            />
          )
        })}
      </div>

      {/* Other offers */}
      {sorted.length > 3 && (
        <div className="flex flex-col gap-1 border-t border-slate-100 dark:border-slate-800 pt-3">
          {sorted.slice(3).map((offer, i) => (
            <button
              key={offer.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                selected?.id === offer.id ? 'bg-slate-50 dark:bg-slate-800' : ''
              }`}
              onClick={() => handleSelect(offer)}
            >
              <span className="text-xs text-slate-400 w-4">{i + 4}</span>
              <span className="flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">{offer.partnerName}</span>
              <span className="text-xs text-slate-400">{offer.totalScore} pts</span>
              <span className="text-xs text-slate-400">{offer.monthlyPrice.toFixed(2)} €/m</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected detail */}
      {selected && (
        <div className="rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.partnerName}</p>
            <p className="text-xs text-slate-400">
              {selected.monthlyPrice.toFixed(2)} €/mois · {selected.commissionRate}% comm.
            </p>
          </div>
          <button className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
            Voir offre complète →
          </button>
        </div>
      )}
    </div>
  )
}
