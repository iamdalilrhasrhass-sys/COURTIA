// Academy Dashboard — Progression, niveaux, cartes, cours
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, Award, BookOpen, Share2, Users, Target, Lock, Check, ArrowRight, Copy, Sparkles, BarChart } from 'lucide-react'
import SkillCard from '../components/SkillCard'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const LEVEL_NAMES = [
  'Découverte', 'Organisé', 'Courtier Actif', 'Pilote de Portefeuille',
  'Expert Relance', 'Chasseur d\'Opportunités', 'Stratège Commercial',
  'Courtier Augmenté', 'Architecte de Cabinet', 'Elite COURTIA'
]

export default function Academy() {
  const [tab, setTab] = useState('dashboard')
  const [progress, setProgress] = useState(null)
  const [cards, setCards] = useState([])
  const [courses, setCourses] = useState([])
  const [referral, setReferral] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [shareCard, setShareCard] = useState(null)
  const [rarityFilter, setRarityFilter] = useState('all')
  const [unlockFilter, setUnlockFilter] = useState('all')

  useEffect(() => {
    const t = localStorage.getItem('courtia_token') || localStorage.getItem('token') || ''
    setToken(t)
    if (!t) return
    loadData(t)
  }, [])

  async function loadData(t) {
    setLoading(true)
    try {
      const [progRes, cardsRes, coursesRes, refRes] = await Promise.all([
        fetch(`${API_URL}/api/academy/progress`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_URL}/api/academy/cards`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_URL}/api/academy/courses`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_URL}/api/academy/referral`, { headers: { Authorization: `Bearer ${t}` } }),
      ])
      if (progRes.ok) setProgress((await progRes.json()).data)
      if (cardsRes.ok) setCards((await cardsRes.json()).data)
      if (coursesRes.ok) setCourses((await coursesRes.json()).data)
      if (refRes.ok) setReferral((await refRes.json()).data)
    } catch (err) {
      console.error('Academy load error:', err)
    }
    setLoading(false)
  }

  async function handleUnlock(card) {
    toast.success(`Carte débloquée : ${card.title} !`)
    loadData(token)
  }

  async function handleShare(card) {
    const text = `Je viens de débloquer la compétence "${card.title}" sur COURTIA.\n\n${card.description}\n\nMon objectif : progresser chaque jour dans la maîtrise de mon portefeuille et de ma relation client.\n\n#Courtier #Assurance #CRM #COURTIA #Progression`
    try {
      await fetch(`${API_URL}/api/academy/cards/${card.id}/share`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
    } catch {}
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fcourtia.vercel.app&text=${encodeURIComponent(text)}`
    window.open(linkedinUrl, '_blank')
    toast.success('Texte copié – publication LinkedIn ouverte.')
  }

  const filteredCards = cards.filter(c => {
    if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false
    if (unlockFilter === 'unlocked' && !c.unlocked) return false
    if (unlockFilter === 'locked' && c.unlocked) return false
    return true
  })

  const rarityOrder = { bronze: 1, silver: 2, gold: 3, diamond: 4, epic: 5, legendary: 6 }
  const sortedCards = [...filteredCards].sort((a, b) => (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99))

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <p className="text-white/40">Connectez-vous pour accéder à l&apos;Academy.</p>
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard', label: 'Progression', icon: BarChart },
    { id: 'skills', label: 'Compétences', icon: Award },
    { id: 'courses', label: 'Formation', icon: BookOpen },
    { id: 'referral', label: 'Parrainage', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-5 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <Award size={22} className="text-purple-400" />
            <h1 className="text-xl font-bold">COURTIA Academy</h1>
          </div>
          <p className="text-sm text-white/40">Développez vos compétences de courtier, débloquez des cartes rares et pilotez votre progression.</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === t.id ? 'bg-purple-500/15 text-purple-200 border border-purple-400/20' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── DASHBOARD TAB ─── */}
            {tab === 'dashboard' && progress && (
              <div className="space-y-6">
                {/* Level card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-purple-500/[0.02] backdrop-blur-xl p-6"
                >
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500/8 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[11px] text-white/30 uppercase tracking-wider">Niveau</p>
                        <p className="text-2xl font-black mt-1">
                          <span className="text-purple-400">{progress.level}</span>
                          <span className="text-white/50 ml-2 text-lg font-normal">— {progress.levelName}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-white/30 uppercase tracking-wider">XP</p>
                        <p className="text-lg font-bold mt-1">
                          <span className="text-amber-400">{progress.xp}</span>
                          <span className="text-white/30 text-sm"> / {progress.nextLevelXp || 'MAX'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percent}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full"
                      />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Cartes débloquées', value: `${progress.unlockedCards}/${progress.totalCards}`, icon: Award },
                        { label: 'Cours terminés', value: `${progress.coursesDone}`, icon: BookOpen },
                        { label: 'Rang estimé', value: 'Profil avancé', icon: Target },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                          <stat.icon size={14} className="text-purple-400/60 mb-1.5" />
                          <p className="text-sm font-semibold">{stat.value}</p>
                          <p className="text-[10px] text-white/30">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Recent unlocks */}
                {cards.filter(c => c.unlocked).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 mb-3">Dernières compétences débloquées</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {cards.filter(c => c.unlocked).slice(0, 4).map(card => (
                        <SkillCard key={card.id} card={card} compact onShare={handleShare} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Next cards preview */}
                {cards.filter(c => !c.unlocked).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 mb-3">Compétences à débloquer</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {cards.filter(c => !c.unlocked).slice(0, 4).map(card => (
                        <SkillCard key={card.id} card={card} compact />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── SKILLS TAB ─── */}
            {tab === 'skills' && (
              <div>
                {/* Filters */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {['all', 'bronze', 'silver', 'gold', 'diamond', 'epic'].map(r => (
                    <button key={r}
                      onClick={() => setRarityFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        rarityFilter === r ? 'bg-purple-500/15 text-purple-200 border border-purple-400/20' : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/70'
                      }`}
                    >{r === 'all' ? 'Toutes' : r}</button>
                  ))}
                  <div className="w-px bg-white/[0.06] mx-1" />
                  {['all', 'unlocked', 'locked'].map(f => (
                    <button key={f}
                      onClick={() => setUnlockFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        unlockFilter === f ? 'bg-purple-500/15 text-purple-200 border border-purple-400/20' : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/70'
                      }`}
                    >{f === 'all' ? 'Tout' : f === 'unlocked' ? 'Débloquées' : 'Verrouillées'}</button>
                  ))}
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sortedCards.map(card => (
                    <SkillCard key={card.id} card={card} onShare={handleShare} />
                  ))}
                </div>
              </div>
            )}

            {/* ─── COURSES TAB ─── */}
            {tab === 'courses' && (
              <div className="space-y-4">
                {courses.map((course, i) => (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl p-4 hover:bg-white/[0.05] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-400/15">
                            {course.category}
                          </span>
                          <span className="text-[10px] text-white/30">{course.difficulty}</span>
                          <span className="text-[10px] text-white/30">{course.duration_minutes} min</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white/80">{course.title}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px] text-amber-400/60 flex items-center gap-1">
                            <Zap size={10} /> +{course.xp_reward} XP
                          </span>
                          <span className={`text-[11px] ${
                            course.progress?.status === 'termine' ? 'text-emerald-400' : 'text-white/30'
                          }`}>
                            {course.progress?.status === 'termine' ? '✅ Terminé' : '📖 À faire'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => openCourseDetail(course)}
                        className="shrink-0 px-4 py-2 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-400/20 hover:bg-purple-500/20 transition-all"
                      >
                        {course.progress?.status === 'termine' ? 'Revoir' : 'Commencer'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* ─── REFERRAL TAB ─── */}
            {tab === 'referral' && (
              <div className="space-y-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-purple-500/[0.02] backdrop-blur-xl p-6"
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <Users size={18} className="text-purple-400" />
                    <h2 className="text-base font-bold">Parrainez d&apos;autres courtiers</h2>
                  </div>
                  <p className="text-sm text-white/40 mb-4">Partagez votre lien et débloquez des récompenses exclusives.</p>

                  {/* Referral link */}
                  {referral && (
                    <div className="flex items-center gap-2 mb-5">
                      <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-white/50 truncate">
                        {referral.shareUrl}
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(referral.shareUrl); toast.success('Lien copié !') }}
                        className="p-2.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-400/20 hover:bg-purple-500/20 transition-all"
                      >
                        <Copy size={16} />
                      </button>
                      <button onClick={() => {
                        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referral.shareUrl)}&text=${encodeURIComponent('Découvrez COURTIA, le CRM intelligent pour courtiers en assurance.')}`
                        window.open(linkedinUrl, '_blank')
                      }}
                        className="p-2.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-400/20 hover:bg-blue-500/20 transition-all"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  )}

                  {/* Rewards */}
                  <h3 className="text-sm font-semibold text-white/70 mb-3">Récompenses de parrainage</h3>
                  <div className="space-y-2">
                    {[
                      { count: '1 filleul', reward: '+100 XP · Carte Argent "Ambassadeur"', color: 'text-slate-300' },
                      { count: '3 filleuls', reward: '+300 XP · Carte Or "Connecteur"', color: 'text-yellow-300' },
                      { count: '10 filleuls', reward: '+1 000 XP · Carte Épique "Leader de réseau"', color: 'text-purple-300' },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                          <Users size={12} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white/60">{r.count}</p>
                          <p className={`text-xs ${r.color}`}>{r.reward}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  {referral?.stats && (
                    <div className="mt-5 pt-4 border-t border-white/[0.06]">
                      <h3 className="text-sm font-semibold text-white/70 mb-2">Mes statistiques</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Invitations', value: referral.stats.envoye || 0 },
                          { label: 'Inscrits', value: referral.stats.inscrit || 0 },
                          { label: 'Converti', value: referral.stats.converti || 0 },
                        ].map((s, i) => (
                          <div key={i} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] text-center">
                            <p className="text-lg font-bold text-purple-400">{s.value}</p>
                            <p className="text-[10px] text-white/30">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Course detail modal
function openCourseDetail(course) {
  const API_URL = import.meta.env.VITE_API_URL || '/api'
  const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
  const courseSlug = course.slug || course.id

  // Navigate to course view (inline modal)
  const modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;'
  modal.innerHTML = `
    <div style="max-width:600px;width:100%;background:#121212;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:2rem;max-height:90vh;overflow-y:auto;color:#fff;font-family:system-ui,-apple-system,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
        <div>
          <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
            <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.2);">${course.category}</span>
            <span style="font-size:10px;color:rgba(255,255,255,0.3);">${course.difficulty}</span>
            <span style="font-size:10px;color:rgba(255,255,255,0.3);">${course.duration_minutes} min</span>
          </div>
          <h2 style="font-size:18px;font-weight:700;margin:0;">${course.title}</h2>
        </div>
        <button onclick="this.closest('[style*=\\'position:fixed\\']').remove()" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:20px;cursor:pointer;">✕</button>
      </div>
      <div style="white-space:pre-wrap;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:1.5rem;">${course.content}</div>
      <div style="border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:1rem;margin-bottom:1.5rem;background:rgba(255,255,255,0.02);">
        <p style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:0.75rem;">Points clés</p>
        ${(course.key_points || []).map(kp => `<div style="display:flex;align-items:flex-start;gap:0.5rem;margin-bottom:0.5rem;font-size:12px;color:rgba(255,255,255,0.6);"><span style="color:#a78bfa;">→</span>${kp}</div>`).join('')}
      </div>
      <button onclick="completeCourse(this, ${course.id}, '${courseSlug}')"
        style="width:100%;padding:12px;border:none;border-radius:12px;font-size:13px;font-weight:600;background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(59,130,246,0.15));color:#c4b5fd;border:1px solid rgba(139,92,246,0.25);cursor:pointer;">
        Marquer comme terminé (+${course.xp_reward} XP)
      </button>
      <p id="course-feedback" style="text-align:center;font-size:12px;margin-top:0.75rem;color:rgba(255,255,255,0.3);display:none;"></p>
    </div>
  `
  document.body.appendChild(modal)
}

window.completeCourse = async (btn, courseId, slug) => {
  const token = localStorage.getItem('courtia_token') || localStorage.getItem('token')
  const API_URL = import.meta.env.VITE_API_URL || '/api'
  try {
    const res = await fetch(`${API_URL}/api/academy/courses/${courseId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [] })
    })
    const data = await res.json()
    if (data.success) {
      btn.textContent = '✅ Terminé !'
      btn.style.background = 'rgba(16,185,129,0.15)'
      btn.style.color = '#6ee7b7'
      btn.style.border = '1px solid rgba(16,185,129,0.25)'
      btn.disabled = true
      document.getElementById('course-feedback').style.display = 'block'
      document.getElementById('course-feedback').textContent = `+${data.data?.xpGained || 0} XP gagnés !`
      // Reload page component in background
      setTimeout(() => {
        document.querySelector('[style*="position:fixed"]')?.remove()
        window.location.reload()
      }, 1500)
    }
  } catch (err) {
    document.getElementById('course-feedback').style.display = 'block'
    document.getElementById('course-feedback').textContent = 'Erreur lors de la validation.'
  }
}
