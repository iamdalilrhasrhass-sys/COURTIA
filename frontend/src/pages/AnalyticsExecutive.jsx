import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { TrendingUp, Users, FileText, Percent } from 'lucide-react'
import api from '../api'

const Skeleton = ({ className }) => <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />

function AnimatedNumber({ value, format = 'number' }) {
    const motionValue = useMotionValue(0)
    const transform = useTransform(motionValue, (v) => {
        if (format === 'currency') return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
        if (format === 'percent') return `${v.toFixed(1)}%`
        return Math.round(v).toLocaleString('fr-FR')
    })
    const [displayValue, setDisplayValue] = useState('0')

    useEffect(() => {
        const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' })
        const unsubscribe = transform.onChange(setDisplayValue)
        return () => {
            controls.stop()
            unsubscribe()
        }
    }, [value, format, motionValue, transform])

    return <span>{displayValue}</span>
}

const KPICard = ({ icon: Icon, title, value, format = 'number', loading, iconBg, iconColor, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
        <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
        </div>
        {loading ? <Skeleton className="w-3/4 h-10" /> : (
            <p className="text-4xl font-black text-gray-900 tracking-tight">
                <AnimatedNumber value={value} format={format} />
            </p>
        )}
    </motion.div>
)

export default function AnalyticsExecutive() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true)
                const { data } = await api.get('/api/dashboard/stats')
                setStats(data)
            } catch (err) {
                console.error("Impossible de charger les statistiques:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    const activeClients = stats?.clientsParStatut?.actif || 0
    const prospects = stats?.clientsParStatut?.prospect || 0
    const conversionRate = (activeClients + prospects > 0) ? (activeClients / (activeClients + prospects)) * 100 : 0

    return (
        <div className="p-8 max-w-5xl mx-auto font-sans">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Analytics Executive</h1>
                <p className="text-gray-500 mt-1">Vue d'ensemble et indicateurs clés de votre portefeuille.</p>
            </motion.header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <KPICard title="CA Total (Primes)" value={stats?.primeTotale || 0} format="currency" icon={TrendingUp} loading={loading} index={0} iconBg="bg-blue-50" iconColor="text-[#2563eb]" />
                <KPICard title="Clients Actifs" value={activeClients} icon={Users} loading={loading} index={1} iconBg="bg-emerald-50" iconColor="text-[#10b981]" />
                <KPICard title="Contrats en cours" value={stats?.contratsActifs || 0} icon={FileText} loading={loading} index={2} iconBg="bg-purple-50" iconColor="text-[#7c3aed]" />
                <KPICard title="Taux de Transformation" value={conversionRate} format="percent" icon={Percent} loading={loading} index={3} iconBg="bg-amber-50" iconColor="text-[#f59e0b]" />
            </div>
            
            { !loading && !stats &&
                <div className="mt-8 text-center bg-white p-12 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800">Données non disponibles</h3>
                    <p className="text-gray-500 mt-2">Nous ne pouvons pas afficher les analyses pour le moment. Veuillez réessayer plus tard ou contacter le support.</p>
                </div>
            }
        </div>
    )
}
