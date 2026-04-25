import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, User, UserCheck, ChevronDown, Bot, Check, Briefcase, Heart, Users, Gem } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import api from '../api'
import { computeScores } from '../lib/scoring'

const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-300 focus:border-[#2563eb] outline-none transition-all"
const labelClass = "block text-xs font-semibold text-gray-500 mb-1.5"

function ScoreGauge({ score = 0, label, color = '#2563eb' }) {
  const size = 60, strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
          <motion.circle
            cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth}
            fill="none" strokeDasharray={circumference} strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold" style={{ color }}>{Math.round(score)}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function ArkScorePreview({ clientData }) {
  const scores = useMemo(() => computeScores(clientData, []), [clientData])
  if (!scores) return null
  return (
    <div className="sticky top-8 w-full md:w-64 hidden md:block">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-blue-600" />
          <h4 className="text-sm font-bold text-gray-800">Aperçu du profil ARK</h4>
        </div>
        <div className="grid grid-cols-2 gap-y-4">
          <ScoreGauge score={scores.risque} label="Risque" color={scores.risque >= 70 ? '#ef4444' : scores.risque >= 40 ? '#f59e0b' : '#22c55e'} />
          <ScoreGauge score={scores.fidelite} label="Fidélité" color="#2563eb" />
          <ScoreGauge score={scores.opportunite} label="Opportunité" color="#8b5cf6" />
          <ScoreGauge score={scores.retention} label="Rétention" color="#14b8a6" />
        </div>
      </div>
    </div>
  )
}

const RadioButton = ({ id, name, value, label, icon: Icon, checked, onChange, color }) => (
    <div className="relative">
        <input type="radio" id={id} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
        <label htmlFor={id} className={`flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${checked ? `shadow-lg scale-105 border-${color}-500 bg-${color}-50` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <Icon size={24} className={checked ? `text-${color}-600` : 'text-gray-400'} />
            <span className={`text-sm font-semibold ${checked ? `text-${color}-700` : 'text-gray-600'}`}>{label}</span>
        </label>
    </div>
)

export default function ClientNew() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitState, setSubmitState] = useState('idle') // idle, submitting, success
  const [pageLoading, setPageLoading] = useState(!!id)
  const [isEditMode] = useState(!!id)
  const [showInsurance, setShowInsurance] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState([])
  
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    adresse: '', postal_code: '', city: '',
    statut: 'prospect', segment: 'particulier',
    bonus_malus: 1.0, nb_sinistres_3ans: 0, annees_permis: '',
    zone_geographique: '', situation_familiale: '', profession: '', notes: ''
  })

  useEffect(() => {
    if (id) {
      setPageLoading(true)
      api.get(`/api/clients/${id}`)
        .then(res => setForm(f => ({ ...f, ...res.data, prenom: res.data.prenom || '', nom: res.data.nom || '', bonus_malus: res.data.bonus_malus || 1.0, nb_sinistres_3ans: res.data.nb_sinistres_3ans || 0 })))
        .catch(() => toast.error('Impossible de charger les données du client.'))
        .finally(() => setPageLoading(false))
    }
  }, [id])

  useEffect(() => {
    if (form.adresse.length < 3) { setAddressSuggestions([]); return }
    const handler = setTimeout(() => {
      axios.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(form.adresse)}&limit=5`)
        .then(res => setAddressSuggestions(res.data.features))
        .catch(console.error)
    }, 300)
    return () => clearTimeout(handler)
  }, [form.adresse])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAddressSelect = (suggestion) => {
    set('adresse', suggestion.properties.name)
    set('postal_code', suggestion.properties.postcode)
    set('city', suggestion.properties.city)
    setAddressSuggestions([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.prenom?.trim() || !form.nom?.trim()) return
    setLoading(true); setSubmitState('submitting')
    try {
      const { data } = isEditMode
        ? await api.put(`/api/clients/${id}`, form)
        : await api.post('/api/clients', form)
      setSubmitState('success')
      toast.success(`Client ${isEditMode ? 'mis à jour' : 'créé'} !`)
      setTimeout(() => navigate(isEditMode ? `/client/${id}` : `/client/${data.id}`), 1200)
    } catch (err) {
      toast.error(err.response?.data?.error || `Erreur lors de la ${isEditMode ? 'mise à jour' : 'création'}`)
      setSubmitState('idle')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans p-4 md:p-8">
      <style>{`
        @keyframes borderRotate { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .animated-border::before { content: ''; position: absolute; inset: -2px; z-index: -1;
          background: conic-gradient(#2563eb, #7c3aed, #10b981, #2563eb);
          animation: borderRotate 3s linear infinite;
        }
      `}</style>
      <header className="max-w-3xl mx-auto mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors mb-4"><ArrowLeft size={16} /> Retour</button>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{isEditMode ? 'Modifier le client' : 'Nouveau client'}</h1>
        <p className="text-gray-500 mt-1">Remplissez les informations de base. Les détails peuvent être ajoutés plus tard.</p>
      </header>
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start gap-8">
        <form onSubmit={handleSubmit} className="flex-1 max-w-3xl">
          <div className="relative animated-border rounded-2xl overflow-hidden">
            <div className="bg-white rounded-[18px] p-8 space-y-8">
              <section>
                <h2 className="font-bold text-gray-800 mb-4">Identité</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Prénom *</label><input value={form.prenom} onChange={e => set('prenom', e.target.value)} required className={inputClass} /></div>
                  <div><label className={labelClass}>Nom *</label><input value={form.nom} onChange={e => set('nom', e.target.value)} required className={inputClass} /></div>
                  <div><label className={labelClass}>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Téléphone</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">+33</span><input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)} className={`${inputClass} pl-10`} /></div></div>
                </div>
                <div className="mt-4 relative">
                  <label className={labelClass}>Adresse</label>
                  <input value={form.adresse} onChange={e => set('adresse', e.target.value)} className={inputClass} />
                  <AnimatePresence>
                    {addressSuggestions.length > 0 && (
                      <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {addressSuggestions.map(s => <li key={s.properties.id} onClick={() => handleAddressSelect(s)} className="p-3 text-sm hover:bg-gray-50 cursor-pointer">{s.properties.label}</li>)}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div><label className={labelClass}>Code Postal</label><input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Ville</label><input value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} /></div>
                </div>
                <div className="mt-6"><label className={labelClass}>Statut</label><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <RadioButton id="statut-prospect" name="statut" value="prospect" label="Prospect" icon={User} checked={form.statut === 'prospect'} onChange={e => set('statut', e.target.value)} color="blue" />
                  <RadioButton id="statut-actif" name="statut" value="actif" label="Actif" icon={UserCheck} checked={form.statut === 'actif'} onChange={e => set('statut', e.target.value)} color="green" />
                  <RadioButton id="statut-inactif" name="statut" value="résilié" label="Inactif" icon={User} checked={form.statut === 'résilié'} onChange={e => set('statut', e.target.value)} color="gray" />
                </div></div>
                 <div className="mt-6"><label className={labelClass}>Segment</label><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <RadioButton id="segment-particulier" name="segment" value="particulier" label="Particulier" icon={Users} checked={form.segment === 'particulier'} onChange={e => set('segment', e.target.value)} color="blue" />
                  <RadioButton id="segment-pro" name="segment" value="professionnel" label="Professionnel" icon={Briefcase} checked={form.segment === 'professionnel'} onChange={e => set('segment', e.target.value)} color="purple" />
                  <RadioButton id="segment-premium" name="segment" value="premium" label="Premium" icon={Gem} checked={form.segment === 'premium'} onChange={e => set('segment', e.target.value)} color="amber" />
                </div></div>
              </section>

              <section>
                <button type="button" onClick={() => setShowInsurance(!showInsurance)} className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                  <ChevronDown size={16} className={`transform transition-transform ${showInsurance ? 'rotate-180' : ''}`} />
                  Ajouter le profil d'assurance (recommandé)
                </button>
                <AnimatePresence>
                  {showInsurance && <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '24px' }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                      <div>
                        <label className={labelClass}>Bonus-Malus ({Number(form.bonus_malus).toFixed(2)})</label>
                        <input type="range" min="0.5" max="3.5" step="0.01" value={form.bonus_malus} onChange={e => set('bonus_malus', parseFloat(e.target.value))} className="w-full" />
                      </div>
                      <div><label className={labelClass}>Sinistres (3 ans)</label><input type="number" min="0" max="10" value={form.nb_sinistres_3ans} onChange={e => set('nb_sinistres_3ans', parseInt(e.target.value, 10))} className={inputClass} /></div>
                      <div><label className={labelClass}>Années de permis</label><input type="number" min="0" value={form.annees_permis} onChange={e => set('annees_permis', e.target.value)} className={inputClass} /></div>
                      <div><label className={labelClass}>Zone géographique</label><select value={form.zone_geographique} onChange={e => set('zone_geographique', e.target.value)} className={inputClass}><option value="">Non spécifié</option><option value="urbain">Urbaine 🏙️</option><option value="périurbain">Périurbaine 🏘️</option><option value="rural">Rurale 🌾</option></select></div>
                      <div><label className={labelClass}>Situation familiale</label><select value={form.situation_familiale} onChange={e => set('situation_familiale', e.target.value)} className={inputClass}><option value="">Non spécifié</option><option value="célibataire">Célibataire</option><option value="marié">Marié(e)</option><option value="pacsé">Pacsé(e)</option><option value="divorcé">Divorcé(e)</option><option value="veuf">Veuf/veuve</option></select></div>
                      <div><label className={labelClass}>Profession</label><input value={form.profession} onChange={e => set('profession', e.target.value)} className={inputClass} /></div>
                      <div className="col-span-2"><label className={labelClass}>Notes ({form.notes.length}/500)</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows="3" maxLength="500" className={`${inputClass} min-h-[80px]`}></textarea></div>
                    </div>
                  </motion.div>}
                </AnimatePresence>
              </section>
            </div>
          </div>
          <div className="mt-8">
            <motion.button type="submit" disabled={loading || submitState === 'success'} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white rounded-xl text-base font-semibold transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <AnimatePresence mode="wait">
                {submitState === 'idle' && <motion.span key="idle" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>{isEditMode ? 'Sauvegarder les modifications' : 'Créer le client'}</motion.span>}
                {submitState === 'submitting' && <motion.span key="submitting" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>Sauvegarde...</motion.span>}
                {submitState === 'success' && <motion.div key="success" initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}}><Check size={24}/></motion.div>}
              </AnimatePresence>
            </motion.button>
          </div>
        </form>
        <ArkScorePreview clientData={form} />
      </div>
      <footer className="text-center py-12"><p className="text-xs text-gray-300">Rhasrhass®</p></footer>
    </div>
  )
}
