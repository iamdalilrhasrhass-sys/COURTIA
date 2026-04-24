import { motion } from 'framer-motion'
import { Clock, ArrowRight } from 'lucide-react'

// Helpers
const fmtEur = (v) => (v === null || v === undefined) ? '—' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v))
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const ContratStatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase()
  let config = { label: 'Inconnu', classes: 'bg-gray-100 text-gray-600' }
  if (s === 'actif') config = { label: 'Actif', classes: 'bg-green-100 text-green-700' }
  else if (['résilié', 'resilié', 'perdu'].includes(s)) config = { label: 'Résilié', classes: 'bg-red-100 text-red-600' }
  else if (['en attente', 'suspendu'].includes(s)) config = { label: 'En attente', classes: 'bg-amber-100 text-amber-600' }
  return <span className={`px-2 py-0.5 text-xs font-bold rounded-full inline-block ${config.classes}`}>{config.label}</span>
};

const ContratEcheanceIndicator = ({ date }) => {
  if (!date) return <div className="text-sm text-gray-400">—</div>
  const d = new Date(date)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
  
  if (daysLeft < 0) return <div className="text-sm font-medium text-gray-500">Expiré</div>
  
  let config = { label: `J-${daysLeft}`, classes: 'text-emerald-600 bg-emerald-50' } // Vert
  if (daysLeft <= 30) config = { label: `J-${daysLeft}`, classes: 'text-red-600 bg-red-50 font-semibold' } // Rouge
  else if (daysLeft <= 90) config = { label: `J-${daysLeft}`, classes: 'text-amber-600 bg-amber-50' } // Orange

  return (
    <div className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md ${config.classes}`}>
        <Clock size={14} />
        <span>{config.label}</span>
    </div>
  )
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function ContratsTab({ contrats, clientId, navigate }) {
  if (!contrats || contrats.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-white/50 backdrop-blur-lg border border-slate-200/50 rounded-2xl shadow-sm">
        <p className="font-semibold text-gray-600">Aucun contrat associé</p>
        <p className="mt-1 text-sm text-gray-400">Ce client n'a pas encore de contrat actif.</p>
        <button 
          onClick={() => navigate(`/contrats/new?clientId=${clientId}`)} 
          className="mt-6 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-[1.02]"
        >
          Nouveau contrat
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4">
      {contrats.map(contrat => {
        const echeance = contrat.date_echeance ? new Date(contrat.date_echeance) : null
        const daysLeft = echeance ? Math.ceil((echeance - new Date()) / (1000 * 60 * 60 * 24)) : Infinity;
        
        return (
          <motion.div 
            key={contrat.id} 
            variants={cardVariants}
            whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.15), 0 8px 10px -6px rgba(37, 99, 235, 0.1)' }}
            className="bg-white/60 backdrop-blur-lg border border-slate-200/50 rounded-2xl p-5 transition-all duration-300 group"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(12px) saturate(150%)',
              WebkitBackdropFilter: 'blur(12px) saturate(150%)',
            }}
            >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-900">{contrat.type_contrat}</p>
                <p className="text-sm text-gray-400 mt-0.5">{contrat.compagnie}</p>
              </div>
              <ContratStatusBadge status={contrat.statut} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-4 items-end">
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prime</p>
                    <p className="text-2xl font-black text-blue-600 leading-none">
                        {fmtEur(contrat.prime_annuelle)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">N° Contrat</p>
                    <p className="text-sm font-semibold text-gray-600">{contrat.id}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Date d'effet</p>
                    <p className="text-sm font-semibold text-purple-600">{fmtDate(contrat.date_effet)}</p>
                </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider text-left mb-1">Échéance</p>
                <ContratEcheanceIndicator date={contrat.date_echeance} />
              </div>

              {daysLeft < 60 && daysLeft > 0 &&
                <motion.div
                  initial={{ boxShadow: 'none' }}
                  animate={{ boxShadow: '0 0 20px rgba(37, 99, 235, 0.5)' }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                  className="rounded-lg"
                >
                  <button 
                    onClick={() => navigate(`/contrats/new?clientId=${clientId}`)} 
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#2563eb] rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Renouveler
                  </button>
                </motion.div>
              }
               <button className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                Détails <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
