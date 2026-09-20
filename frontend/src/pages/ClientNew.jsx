import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, User, UserCheck, ChevronDown, Bot, Check, Briefcase, Heart, Users, Gem } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import api from '../api'
import { computeScores } from '../lib/scoring'
import { paysSuisse, contexteCourant } from '../lib/monnaie'

/* ─── Adresses : la bonne source selon le pays ────────────────────────────────
   POURQUOI : l'auto-complétion interrogeait TOUJOURS la Base Adresse Nationale
   française (api-adresse.data.gouv.fr). Un cabinet suisse qui saisissait
   « Lausanne » recevait donc des adresses françaises (« 13012 Marseille »),
   impossibles à enregistrer. On interroge la source du pays concerné :
     * Suisse  → Nominatim (OpenStreetMap), filtré sur `countrycodes=ch`, qui
       renvoie le NPA, la ville et le canton (ISO3166-2-lvl4, ex. CH-VD) ;
     * France  → la BAN, comme avant, source officielle et inchangée.
   Aucune adresse n'est inventée : si la source ne répond pas, la liste de
   suggestions reste vide et la saisie manuelle reste possible. */
const ADRESSE_SUISSE = 'https://nominatim.openstreetmap.org/search'
const ADRESSE_FRANCE = 'https://api-adresse.data.gouv.fr/search/'

function suggestionsFrance(features = []) {
  return features.map((f) => ({
    id: f.properties.id,
    label: f.properties.label,
    adresse: f.properties.name,
    postal_code: f.properties.postcode,
    city: f.properties.city,
    country: 'France',
  }))
}

function suggestionsSuisse(resultats = []) {
  return resultats.map((r) => {
    const a = r.address || {}
    const canton = String(a['ISO3166-2-lvl4'] || '').replace(/^CH-/, '')
    return {
      id: r.place_id,
      label: r.display_name,
      adresse: [a.house_number, a.road].filter(Boolean).join(' ') || a.road || r.name || '',
      postal_code: a.postcode || '',
      city: a.city || a.town || a.village || a.municipality || '',
      canton,
      country: 'Suisse',
    }
  })
}

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

// Classes statiques (les classes dynamiques `border-${color}-500` sont purgées par Tailwind au build)
const RADIO_COLORS = {
  blue:   { border: 'border-blue-500',   bg: 'bg-blue-500/10',   icon: 'text-blue-400',   text: 'text-blue-300' },
  green:  { border: 'border-green-500',  bg: 'bg-green-500/10',  icon: 'text-green-400',  text: 'text-green-300' },
  gray:   { border: 'border-gray-400',   bg: 'bg-gray-500/10',   icon: 'text-gray-300',   text: 'text-gray-300' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-500/10', icon: 'text-purple-400', text: 'text-purple-300' },
  amber:  { border: 'border-amber-500',  bg: 'bg-amber-500/10',  icon: 'text-amber-400',  text: 'text-amber-300' },
}

const RadioButton = ({ id, name, value, label, icon: Icon, checked, onChange, color }) => {
  const c = RADIO_COLORS[color] || RADIO_COLORS.blue
  return (
    <div className="relative">
        <input type="radio" id={id} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
        <label htmlFor={id} className={`flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${checked ? `shadow-lg scale-105 ${c.border} ${c.bg}` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <Icon size={24} className={checked ? c.icon : 'text-gray-400'} />
            <span className={`text-sm font-semibold ${checked ? c.text : 'text-gray-600'}`}>{label}</span>
        </label>
    </div>
  )
}

export default function ClientNew() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitState, setSubmitState] = useState('idle') // idle, submitting, success
  const [pageLoading, setPageLoading] = useState(!!id)
  const [isEditMode] = useState(!!id)
  const [showInsurance, setShowInsurance] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState([])
  // Pays du CABINET (profil de session) : un cabinet suisse saisit des adresses
  // suisses par défaut. Il sert de repli tant que le pays du client n'est pas
  // choisi, et n'écrase jamais un pays explicitement sélectionné.
  const cabinetSuisse = paysSuisse(contexteCourant().pays)
  const [dialCode, setDialCode] = useState(cabinetSuisse ? '+41' : '+33') // +33 FR / +41 CH

  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    adresse: '', postal_code: '', city: '', country: '',
    statut: 'prospect', segment: 'particulier',
    bonus_malus: 1.0, nb_sinistres_3ans: 0, annees_permis: '',
    zone_geographique: '', situation_familiale: '', profession: '', notes: ''
  })

  // Le pays qui pilote l'auto-complétion d'adresse : celui du client s'il est
  // renseigné, sinon celui du cabinet.
  const paysAdresse = form.country || (cabinetSuisse ? 'Suisse' : 'France')
  const adresseEnSuisse = paysSuisse(paysAdresse)

  useEffect(() => {
    if (id) {
      setPageLoading(true)
      api.get(`/clients/${id}`)
        .then(res => setForm(f => ({ ...f, ...res.data, prenom: res.data.prenom || '', nom: res.data.nom || '', bonus_malus: res.data.bonus_malus || 1.0, nb_sinistres_3ans: res.data.nb_sinistres_3ans || 0 })))
        .catch(() => toast.error('Impossible de charger les données du client.'))
        .finally(() => setPageLoading(false))
    }
  }, [id])

  useEffect(() => {
    if (form.adresse.length < 3) { setAddressSuggestions([]); return }
    // Le délai est plus long côté suisse : la politique d'usage de Nominatim
    // demande au plus une requête par seconde. La source française supporte 300 ms.
    const delai = adresseEnSuisse ? 700 : 300
    const handler = setTimeout(() => {
      if (adresseEnSuisse) {
        axios.get(ADRESSE_SUISSE, {
          params: {
            q: form.adresse,
            format: 'jsonv2',
            addressdetails: 1,
            countrycodes: 'ch',
            limit: 5,
          },
          headers: { Accept: 'application/json' },
          timeout: 8000,
        })
          .then(res => setAddressSuggestions(suggestionsSuisse(res.data)))
          .catch(() => setAddressSuggestions([]))
        return
      }
      axios.get(`${ADRESSE_FRANCE}?q=${encodeURIComponent(form.adresse)}&limit=5`)
        .then(res => setAddressSuggestions(suggestionsFrance(res.data.features)))
        .catch(() => setAddressSuggestions([]))
    }, delai)
    return () => clearTimeout(handler)
  }, [form.adresse, adresseEnSuisse])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Normalise en E.164 selon l'indicatif choisi (+33 FR / +41 CH)
  const normalizeTelephone = (raw, dial = dialCode) => {
    if (!raw) return raw
    let p = String(raw).replace(/[\s.\-()]/g, '')
    if (p.startsWith('+')) return p
    if (p.startsWith('00')) return '+' + p.slice(2)
    if (p.startsWith('0')) return dial + p.slice(1)   // 06… → +336…  /  079… → +4179…
    if (/^\d{6,}$/.test(p)) return dial + p
    return p
  }

  const handleAddressSelect = (suggestion) => {
    // Les deux sources renvoient la MÊME forme (adresse / NPA ou code postal /
    // ville / pays) : la sélection remplit les champs et fixe le pays, ce qui
    // bascule aussi le format de téléphone attendu.
    set('adresse', suggestion.adresse || suggestion.label)
    set('postal_code', suggestion.postal_code || '')
    set('city', suggestion.city || '')
    if (suggestion.country) {
      set('country', suggestion.country)
      setDialCode(paysSuisse(suggestion.country) ? '+41' : '+33')
    }
    setAddressSuggestions([])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.prenom?.trim() || !form.nom?.trim()) { toast.error('Le prénom et le nom sont obligatoires.'); return }
    setLoading(true); setSubmitState('submitting')
    try {
      const payload = { ...form, telephone: normalizeTelephone(form.telephone) }
      const { data } = isEditMode
        ? await api.put(`/clients/${id}`, payload)
        : await api.post('/clients', payload)
      setSubmitState('success')
      toast.success(`Client ${isEditMode ? 'mis à jour' : 'créé'} !`)
      setTimeout(() => navigate(isEditMode ? `/clients/${id}` : `/clients/${data.id}`), 1200)
    } catch (err) {
      toast.error(err.response?.data?.error || `Erreur lors de la ${isEditMode ? 'mise à jour' : 'création'}`)
      setSubmitState('idle')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#2563eb] rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen font-sans p-4 md:p-8">
      <style>{`
        @keyframes borderRotate { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .animated-border::before { content: ''; position: absolute; inset: -2px; z-index: -1;
          background: conic-gradient(#2563eb, #7c3aed, #10b981, #2563eb);
          animation: borderRotate 3s linear infinite;
        }
      `}</style>
      <header className="max-w-3xl mx-auto mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors mb-4"><ArrowLeft size={16} /> Retour</button>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{isEditMode ? 'Modifier le client' : 'Nouveau client'}</h1>
        <p className="text-gray-500 mt-1">Remplissez les informations de base. Les détails peuvent être ajoutés plus tard.</p>
      </header>
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start gap-4 md:gap-8">
        <form onSubmit={handleSubmit} className="flex-1 max-w-3xl">
          <div className="relative animated-border rounded-2xl overflow-hidden">
            <div className="bg-white rounded-[18px] p-4 md:p-8 space-y-4 md:space-y-8">
              <section>
                <h2 className="font-bold text-gray-800 mb-4">Identité</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Prénom *</label><input value={form.prenom} onChange={e => set('prenom', e.target.value)} required className={inputClass} /></div>
                  <div><label className={labelClass}>Nom *</label><input value={form.nom} onChange={e => set('nom', e.target.value)} required className={inputClass} /></div>
                  <div><label className={labelClass}>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Téléphone</label><div className="relative flex"><select value={dialCode} onChange={e => setDialCode(e.target.value)} className="px-2 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-300"><option value="+33">🇫🇷 +33</option><option value="+41">🇨🇭 +41</option></select><input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="6 12 34 56 78" className={`${inputClass} rounded-l-none`} /></div></div>
                </div>
                <div className="mt-4 relative">
                  <label className={labelClass}>Adresse</label>
                  <input value={form.adresse} onChange={e => set('adresse', e.target.value)} className={inputClass}
                    placeholder={adresseEnSuisse ? 'Rue, NPA, localité (Suisse)' : 'N°, rue'} />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Suggestions : {adresseEnSuisse
                      ? 'adresses suisses (OpenStreetMap, NPA + canton)'
                      : 'Base Adresse Nationale française'} — saisie manuelle toujours possible.
                  </p>
                  <AnimatePresence>
                    {addressSuggestions.length > 0 && (
                      <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {addressSuggestions.map(s => <li key={s.id} onClick={() => handleAddressSelect(s)} className="p-3 text-sm hover:bg-gray-50 cursor-pointer">{s.label}</li>)}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Le pays pilote la source d'adresse ET le format du numéro :
                      un cabinet suisse ne se voit plus proposer d'adresses françaises. */}
                  <div>
                    <label className={labelClass}>Pays</label>
                    <select value={form.country} onChange={e => { const v = e.target.value; set('country', v); if (v) setDialCode(paysSuisse(v) ? '+41' : '+33') }} className={inputClass}>
                      <option value="">Non précisé</option>
                      <option value="France">France</option>
                      <option value="Suisse">Suisse</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>{adresseEnSuisse ? 'NPA' : 'Code Postal'}</label><input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} className={inputClass} /></div>
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
                  <RadioButton id="segment-vip" name="segment" value="vip" label="VIP" icon={Gem} checked={form.segment === 'vip'} onChange={e => set('segment', e.target.value)} color="amber" />
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
                      <div><label className={labelClass}>Années de permis</label><input type="number" min="0" value={form.annees_permis} onChange={e => set('annees_permis', parseInt(e.target.value, 10) || '')} className={inputClass} /></div>
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
          <div className="mt-4 md:mt-8">
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
    </div>
  )
}
